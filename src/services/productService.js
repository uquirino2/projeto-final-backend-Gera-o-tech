const { Op, Sequelize } = require('sequelize');
const {
  sequelize,
  Product,
  Category,
  ProductImage,
  ProductOption,
  ProductCategory,
} = require('../models');
const imageService = require('./imageService');
const AppError = require('../utils/AppError');
const {
  isNonEmptyString,
  parsePositiveInt,
  parsePagination,
  parseFields,
  parseCategoryIdsQuery,
  parsePriceRangeQuery,
  parseOptionFiltersQuery,
  parseRadius,
  normalizeOptionValues,
} = require('../utils/validators');

const ALLOWED_PRODUCT_FIELDS = [
  'id',
  'enabled',
  'name',
  'slug',
  'use_in_menu',
  'stock',
  'description',
  'price',
  'price_with_discount',
  'category_ids',
  'images',
  'options',
];

const VALID_SHAPES = ['square', 'circle'];
const VALID_OPTION_TYPES = ['text', 'color'];

/**
 * Formata uma instância de Product (com associações) para o formato de resposta da API.
 * Quando `selectedFields` é informado, retorna apenas os campos solicitados.
 *
 * @param {Object} product
 * @param {string[]|null} [selectedFields=null]
 * @returns {Object}
 */
function formatProductResponse(product, selectedFields = null) {
  const full = {
    id: product.id,
    enabled: Boolean(product.enabled),
    name: product.name,
    slug: product.slug,
    use_in_menu: Boolean(product.use_in_menu),
    stock: product.stock ?? 0,
    description: product.description ?? null,
    price: Number(product.price),
    price_with_discount: Number(product.price_with_discount),
    category_ids: (product.categories || [])
      .map((cat) => cat.id)
      .sort((a, b) => a - b),
    images: (product.images || [])
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((img) => ({
        id: img.id,
        content: imageService.resolveImageUrl(img.path),
      })),
    options: (product.options || [])
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((opt) => ({
        id: opt.id,
        title: opt.title,
        shape: opt.shape,
        radius: opt.radius,
        type: opt.type,
        values: opt.values
          ? opt.values
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean)
          : [],
      })),
  };

  if (!selectedFields) {
    return full;
  }

  const projected = {};
  for (const field of selectedFields) {
    projected[field] = full[field];
  }
  return projected;
}

/**
 * Monta os `include` necessários do Sequelize com base nos campos solicitados,
 * evitando JOINs desnecessários quando o cliente limita `fields`.
 *
 * @param {string[]|null} selectedFields
 * @returns {Array<Object>}
 */
function buildProductIncludes(selectedFields = null) {
  const includes = [];
  const needsCategories = !selectedFields || selectedFields.includes('category_ids');
  const needsImages = !selectedFields || selectedFields.includes('images');
  const needsOptions = !selectedFields || selectedFields.includes('options');

  if (needsCategories) {
    includes.push({
      model: Category,
      as: 'categories',
      attributes: ['id'],
      through: { attributes: [] },
    });
  }

  if (needsImages) {
    includes.push({
      model: ProductImage,
      as: 'images',
      attributes: ['id', 'enabled', 'path'],
    });
  }

  if (needsOptions) {
    includes.push({
      model: ProductOption,
      as: 'options',
      attributes: ['id', 'title', 'shape', 'radius', 'type', 'values'],
    });
  }

  return includes;
}

/**
 * Resolve interseção de conjuntos de IDs de produtos para filtros relacionais.
 * @param {Set<number>|null} currentSet
 * @param {number[]} nextIds
 * @returns {Set<number>}
 */
function intersectProductIds(currentSet, nextIds) {
  const nextSet = new Set(nextIds);
  if (currentSet === null) {
    return nextSet;
  }
  const result = new Set();
  for (const id of currentSet) {
    if (nextSet.has(id)) {
      result.add(id);
    }
  }
  return result;
}

/**
 * Busca produtos com suporte completo a paginação, seleção de campos e filtros:
 * `limit`, `page`, `fields`, `match`, `category_ids`, `price-range` e `option[ID]=v1,v2`.
 *
 * Utiliza consulta em duas etapas (IDs paginados + hidratação das relações)
 * para garantir contagem exata, paginação correta e retorno completo das relações.
 *
 * @param {Object} query
 */
async function searchProducts(query = {}) {
  const { limit, page } = parsePagination(query);
  const selectedFields = parseFields(query.fields, ALLOWED_PRODUCT_FIELDS);
  const categoryIdsFilter = parseCategoryIdsQuery(query.category_ids);
  const priceRangeFilter = parsePriceRangeQuery(query['price-range']);
  const optionFilters = parseOptionFiltersQuery(query.option);

  const whereConditions = [];

  // Filtro textual por nome ou descrição (case-insensitive)
  if (query.match !== undefined && query.match !== '') {
    if (typeof query.match !== 'string') {
      throw new AppError('O parâmetro "match" deve ser um texto.', 400);
    }
    const term = query.match.trim().toLowerCase();
    if (term.length > 0) {
      const likePattern = `%${term}%`;
      whereConditions.push({
        [Op.or]: [
          Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('Product.name')), {
            [Op.like]: likePattern,
          }),
          Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('Product.description')), {
            [Op.like]: likePattern,
          }),
        ],
      });
    }
  }

  // Filtro de janela de preços (inclusive)
  if (priceRangeFilter) {
    whereConditions.push({
      price: {
        [Op.between]: [priceRangeFilter.min, priceRangeFilter.max],
      },
    });
  }

  // Resolução eficiente dos filtros relacionais (category_ids e option[id])
  let candidateProductIds = null;

  if (categoryIdsFilter) {
    const links = await ProductCategory.findAll({
      where: { category_id: { [Op.in]: categoryIdsFilter } },
      attributes: ['product_id'],
      raw: true,
    });
    candidateProductIds = intersectProductIds(
      candidateProductIds,
      links.map((link) => link.product_id)
    );
  }

  if (optionFilters) {
    const requestedOptionIds = optionFilters.map((f) => f.optionId);
    const matchingOptions = await ProductOption.findAll({
      where: { id: { [Op.in]: requestedOptionIds } },
      attributes: ['id', 'product_id', 'values'],
      raw: true,
    });

    const optionsById = new Map();
    for (const opt of matchingOptions) {
      optionsById.set(opt.id, opt);
    }

    for (const filter of optionFilters) {
      const opt = optionsById.get(filter.optionId);
      if (!opt) {
        candidateProductIds = new Set();
        break;
      }

      const storedValues = opt.values
        .split(',')
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);

      const requestedLower = filter.values.map((v) => v.toLowerCase());
      const hasMatch = requestedLower.some((reqVal) => storedValues.includes(reqVal));

      candidateProductIds = intersectProductIds(
        candidateProductIds,
        hasMatch ? [opt.product_id] : []
      );
    }
  }

  // Curto-circuito se nenhum produto atendeu aos filtros relacionais
  if (candidateProductIds !== null && candidateProductIds.size === 0) {
    return {
      data: [],
      total: 0,
      limit,
      page: limit === -1 ? 1 : page,
    };
  }

  if (candidateProductIds !== null) {
    whereConditions.push({
      id: { [Op.in]: [...candidateProductIds] },
    });
  }

  const where = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};

  // Etapa 1: contagem exata e busca dos IDs paginados
  const idQueryOptions = {
    where,
    attributes: ['id'],
    order: [['id', 'ASC']],
  };

  if (limit !== -1) {
    idQueryOptions.limit = limit;
    idQueryOptions.offset = (page - 1) * limit;
  }

  const { count, rows: idRows } = await Product.findAndCountAll(idQueryOptions);
  const pageIds = idRows.map((row) => row.id);

  if (pageIds.length === 0) {
    return {
      data: [],
      total: count,
      limit,
      page: limit === -1 ? 1 : page,
    };
  }

  // Etapa 2: hidratação dos produtos da página com as associações necessárias
  const products = await Product.findAll({
    where: { id: { [Op.in]: pageIds } },
    include: buildProductIncludes(selectedFields),
    order: [['id', 'ASC']],
  });

  return {
    data: products.map((product) => formatProductResponse(product, selectedFields)),
    total: count,
    limit,
    page: limit === -1 ? 1 : page,
  };
}

/**
 * Busca um produto completo pelo ID.
 * @param {string|number} rawId
 */
async function getProductById(rawId) {
  const id = parsePositiveInt(rawId);
  if (!id) {
    throw new AppError('Produto não encontrado.', 404);
  }

  const product = await Product.findByPk(id, {
    include: buildProductIncludes(null),
  });

  if (!product) {
    throw new AppError('Produto não encontrado.', 404);
  }

  return formatProductResponse(product);
}

/**
 * Valida os campos principais (escalares) do payload de produto.
 * @param {Object} payload
 */
function validateProductScalarFields(payload) {
  const {
    enabled,
    name,
    slug,
    use_in_menu,
    stock,
    description,
    price,
    price_with_discount,
  } = payload || {};

  if (!isNonEmptyString(name)) {
    throw new AppError('O campo "name" é obrigatório.', 400);
  }
  if (!isNonEmptyString(slug)) {
    throw new AppError('O campo "slug" é obrigatório.', 400);
  }
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
    throw new AppError('O campo "price" é obrigatório e deve ser um número válido maior ou igual a 0.', 400);
  }
  if (
    typeof price_with_discount !== 'number' ||
    !Number.isFinite(price_with_discount) ||
    price_with_discount < 0
  ) {
    throw new AppError(
      'O campo "price_with_discount" é obrigatório e deve ser um número válido maior ou igual a 0.',
      400
    );
  }
  if (enabled !== undefined && typeof enabled !== 'boolean') {
    throw new AppError('O campo "enabled" deve ser um valor booleano.', 400);
  }
  if (use_in_menu !== undefined && typeof use_in_menu !== 'boolean') {
    throw new AppError('O campo "use_in_menu" deve ser um valor booleano.', 400);
  }
  if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
    throw new AppError('O campo "stock" deve ser um número inteiro maior ou igual a 0.', 400);
  }
  if (description !== undefined && description !== null && typeof description !== 'string') {
    throw new AppError('O campo "description" deve ser uma string.', 400);
  }

  return {
    enabled: enabled ?? false,
    name: name.trim(),
    slug: slug.trim(),
    use_in_menu: use_in_menu ?? false,
    stock: stock ?? 0,
    description: description !== undefined && description !== null ? description.trim() : null,
    price,
    price_with_discount,
  };
}

/**
 * Valida o array `category_ids` e confirma que todas as categorias existem no banco.
 * @param {*} rawCategoryIds
 * @param {Object} [transaction]
 * @returns {Promise<number[]|undefined>}
 */
async function validateCategoryIds(rawCategoryIds, transaction) {
  if (rawCategoryIds === undefined) {
    return undefined;
  }
  if (!Array.isArray(rawCategoryIds)) {
    throw new AppError('O campo "category_ids" deve ser um array de IDs inteiros.', 400);
  }

  const parsedIds = rawCategoryIds.map((rawId) => {
    const id = parsePositiveInt(rawId);
    if (!id) {
      throw new AppError(`ID de categoria inválido em "category_ids": ${rawId}.`, 400);
    }
    return id;
  });

  const uniqueIds = [...new Set(parsedIds)];
  if (uniqueIds.length === 0) {
    return [];
  }

  const existingCategories = await Category.findAll({
    where: { id: { [Op.in]: uniqueIds } },
    attributes: ['id'],
    transaction,
  });

  if (existingCategories.length !== uniqueIds.length) {
    const existingSet = new Set(existingCategories.map((c) => c.id));
    const missing = uniqueIds.filter((id) => !existingSet.has(id));
    throw new AppError(`Categorias não encontradas para os IDs: ${missing.join(', ')}.`, 400);
  }

  return uniqueIds;
}

/**
 * Valida e normaliza uma nova opção de produto.
 * Aceita tanto `values` quanto `value` (conforme especificação oficial) e `radius` numérico ou em `"px"`.
 *
 * @param {Object} option
 */
function validateNewOption(option) {
  if (!option || typeof option !== 'object') {
    throw new AppError('Cada item em "options" deve ser um objeto válido.', 400);
  }
  if (!isNonEmptyString(option.title)) {
    throw new AppError('Cada opção do produto deve conter o campo "title" preenchido.', 400);
  }

  const shape = option.shape !== undefined ? String(option.shape).trim().toLowerCase() : 'square';
  if (!VALID_SHAPES.includes(shape)) {
    throw new AppError(`O campo "shape" deve ser um dos valores: ${VALID_SHAPES.join(', ')}.`, 400);
  }

  const type = option.type !== undefined ? String(option.type).trim().toLowerCase() : 'text';
  if (!VALID_OPTION_TYPES.includes(type)) {
    throw new AppError(`O campo "type" deve ser um dos valores: ${VALID_OPTION_TYPES.join(', ')}.`, 400);
  }

  const radius = parseRadius(option.radius);
  const rawValues = option.values !== undefined ? option.values : option.value;
  const values = normalizeOptionValues(rawValues);

  return {
    title: option.title.trim(),
    shape,
    radius,
    type,
    values,
  };
}

/**
 * Cria um novo produto com suas categorias, imagens (base64 ou URL) e opções
 * dentro de uma transação atômica.
 *
 * @param {Object} payload
 */
async function createProduct(payload) {
  const scalarData = validateProductScalarFields(payload);
  const { category_ids, images, options } = payload || {};

  if (images !== undefined && !Array.isArray(images)) {
    throw new AppError('O campo "images" deve ser um array.', 400);
  }
  if (options !== undefined && !Array.isArray(options)) {
    throw new AppError('O campo "options" deve ser um array.', 400);
  }

  const preparedOptions = (options || []).map((opt) => validateNewOption(opt));

  const createdDiskFiles = [];
  const transaction = await sequelize.transaction();

  try {
    const validatedCategoryIds = await validateCategoryIds(category_ids, transaction);

    const product = await Product.create(scalarData, { transaction });

    if (validatedCategoryIds && validatedCategoryIds.length > 0) {
      await product.setCategories(validatedCategoryIds, { transaction });
    }

    if (images && images.length > 0) {
      const imageRecords = images.map((img) => {
        if (img.enabled !== undefined && typeof img.enabled !== 'boolean') {
          throw new AppError('O campo "enabled" da imagem deve ser booleano.', 400);
        }
        const { storedPath, createdFilePath } = imageService.persistImage(img, scalarData.slug);
        if (createdFilePath) {
          createdDiskFiles.push(createdFilePath);
        }
        return {
          product_id: product.id,
          enabled: img.enabled ?? true,
          path: storedPath,
        };
      });

      await ProductImage.bulkCreate(imageRecords, { transaction });
    }

    if (preparedOptions.length > 0) {
      const optionRecords = preparedOptions.map((opt) => ({
        ...opt,
        product_id: product.id,
      }));
      await ProductOption.bulkCreate(optionRecords, { transaction });
    }

    await transaction.commit();

    return getProductById(product.id);
  } catch (err) {
    await transaction.rollback();
    imageService.cleanupFiles(createdDiskFiles);
    throw err;
  }
}

/**
 * Atualiza um produto existente, sincronizando categorias, imagens (criar/atualizar/deletar)
 * e opções (criar/atualizar/deletar) de forma transacional.
 *
 * @param {string|number} rawId
 * @param {Object} payload
 */
async function updateProduct(rawId, payload) {
  const id = parsePositiveInt(rawId);
  if (!id) {
    throw new AppError('Produto não encontrado.', 404);
  }

  const product = await Product.findByPk(id);
  if (!product) {
    throw new AppError('Produto não encontrado.', 404);
  }

  const scalarData = validateProductScalarFields(payload);
  const { category_ids, images, options } = payload || {};

  if (images !== undefined && !Array.isArray(images)) {
    throw new AppError('O campo "images" deve ser um array.', 400);
  }
  if (options !== undefined && !Array.isArray(options)) {
    throw new AppError('O campo "options" deve ser um array.', 400);
  }

  const createdDiskFiles = [];
  const filesToDeleteAfterCommit = [];
  const transaction = await sequelize.transaction();

  try {
    const validatedCategoryIds = await validateCategoryIds(category_ids, transaction);

    await product.update(scalarData, { transaction });

    if (validatedCategoryIds !== undefined) {
      await product.setCategories(validatedCategoryIds, { transaction });
    }

    // Sincronização incremental de imagens (criar, atualizar ou deletar via deleted: true)
    if (images !== undefined) {
      for (const item of images) {
        if (!item || typeof item !== 'object') {
          throw new AppError('Cada item em "images" deve ser um objeto válido.', 400);
        }

        if (item.id !== undefined) {
          const imageId = parsePositiveInt(item.id);
          if (!imageId) {
            throw new AppError(`ID de imagem inválido: ${item.id}.`, 400);
          }

          const existingImage = await ProductImage.findOne({
            where: { id: imageId, product_id: product.id },
            transaction,
          });

          if (!existingImage) {
            throw new AppError(`Imagem com ID ${imageId} não encontrada para este produto.`, 400);
          }

          if (item.deleted === true) {
            filesToDeleteAfterCommit.push(existingImage.path);
            await existingImage.destroy({ transaction });
          } else {
            const updates = {};
            if (item.enabled !== undefined) {
              if (typeof item.enabled !== 'boolean') {
                throw new AppError('O campo "enabled" da imagem deve ser booleano.', 400);
              }
              updates.enabled = item.enabled;
            }
            if (item.content !== undefined) {
              const { storedPath, createdFilePath } = imageService.persistImage(
                item,
                scalarData.slug
              );
              if (createdFilePath) {
                createdDiskFiles.push(createdFilePath);
              }
              if (existingImage.path !== storedPath) {
                filesToDeleteAfterCommit.push(existingImage.path);
              }
              updates.path = storedPath;
            }
            if (Object.keys(updates).length > 0) {
              await existingImage.update(updates, { transaction });
            }
          }
        } else {
          if (item.enabled !== undefined && typeof item.enabled !== 'boolean') {
            throw new AppError('O campo "enabled" da imagem deve ser booleano.', 400);
          }
          const { storedPath, createdFilePath } = imageService.persistImage(item, scalarData.slug);
          if (createdFilePath) {
            createdDiskFiles.push(createdFilePath);
          }
          await ProductImage.create(
            {
              product_id: product.id,
              enabled: item.enabled ?? true,
              path: storedPath,
            },
            { transaction }
          );
        }
      }
    }

    // Sincronização incremental de opções (criar, atualizar ou deletar via deleted: true)
    if (options !== undefined) {
      for (const item of options) {
        if (!item || typeof item !== 'object') {
          throw new AppError('Cada item em "options" deve ser um objeto válido.', 400);
        }

        if (item.id !== undefined) {
          const optionId = parsePositiveInt(item.id);
          if (!optionId) {
            throw new AppError(`ID de opção inválido: ${item.id}.`, 400);
          }

          const existingOption = await ProductOption.findOne({
            where: { id: optionId, product_id: product.id },
            transaction,
          });

          if (!existingOption) {
            throw new AppError(`Opção com ID ${optionId} não encontrada para este produto.`, 400);
          }

          if (item.deleted === true) {
            await existingOption.destroy({ transaction });
          } else {
            const updates = {};

            if (item.title !== undefined) {
              if (!isNonEmptyString(item.title)) {
                throw new AppError('O campo "title" da opção não pode estar vazio.', 400);
              }
              updates.title = item.title.trim();
            }

            if (item.shape !== undefined) {
              const shape = String(item.shape).trim().toLowerCase();
              if (!VALID_SHAPES.includes(shape)) {
                throw new AppError(`O campo "shape" deve ser um dos valores: ${VALID_SHAPES.join(', ')}.`, 400);
              }
              updates.shape = shape;
            }

            if (item.type !== undefined) {
              const type = String(item.type).trim().toLowerCase();
              if (!VALID_OPTION_TYPES.includes(type)) {
                throw new AppError(
                  `O campo "type" deve ser um dos valores: ${VALID_OPTION_TYPES.join(', ')}.`,
                  400
                );
              }
              updates.type = type;
            }

            if (item.radius !== undefined) {
              updates.radius = parseRadius(item.radius);
            }

            const rawValues = item.values !== undefined ? item.values : item.value;
            if (rawValues !== undefined) {
              updates.values = normalizeOptionValues(rawValues);
            }

            if (Object.keys(updates).length > 0) {
              await existingOption.update(updates, { transaction });
            }
          }
        } else {
          const newOption = validateNewOption(item);
          await ProductOption.create(
            {
              ...newOption,
              product_id: product.id,
            },
            { transaction }
          );
        }
      }
    }

    await transaction.commit();

    // Remove arquivos antigos somente após confirmação da transação
    for (const oldPath of filesToDeleteAfterCommit) {
      imageService.removeStoredImage(oldPath);
    }
  } catch (err) {
    await transaction.rollback();
    imageService.cleanupFiles(createdDiskFiles);
    throw err;
  }
}

/**
 * Remove um produto e todos os seus registros associados (imagens, opções e categorias).
 * @param {string|number} rawId
 */
async function deleteProduct(rawId) {
  const id = parsePositiveInt(rawId);
  if (!id) {
    throw new AppError('Produto não encontrado.', 404);
  }

  const product = await Product.findByPk(id, {
    include: [{ model: ProductImage, as: 'images', attributes: ['path'] }],
  });

  if (!product) {
    throw new AppError('Produto não encontrado.', 404);
  }

  const imagePaths = (product.images || []).map((img) => img.path);
  const transaction = await sequelize.transaction();

  try {
    await ProductImage.destroy({ where: { product_id: product.id }, transaction });
    await ProductOption.destroy({ where: { product_id: product.id }, transaction });
    await ProductCategory.destroy({ where: { product_id: product.id }, transaction });
    await product.destroy({ transaction });

    await transaction.commit();

    for (const storedPath of imagePaths) {
      imageService.removeStoredImage(storedPath);
    }
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

module.exports = {
  searchProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
