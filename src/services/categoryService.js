const { Category } = require('../models');
const AppError = require('../utils/AppError');
const {
  isNonEmptyString,
  parsePositiveInt,
  parsePagination,
  parseFields,
  parseBooleanQuery,
} = require('../utils/validators');

const ALLOWED_CATEGORY_FIELDS = ['id', 'name', 'slug', 'use_in_menu'];

/**
 * Formata uma categoria respeitando os campos solicitados (ou padrão completo).
 * @param {Object} category
 * @param {string[]|null} selectedFields
 * @returns {Object}
 */
function formatCategoryResponse(category, selectedFields = null) {
  const full = {
    id: category.id,
    name: category.name,
    slug: category.slug,
    use_in_menu: Boolean(category.use_in_menu),
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
 * Lista categorias com suporte a paginação, limite `-1`, seleção de campos e filtro `use_in_menu`.
 * @param {Object} query
 */
async function searchCategories(query = {}) {
  const { limit, page } = parsePagination(query);
  const selectedFields = parseFields(query.fields, ALLOWED_CATEGORY_FIELDS);
  const useInMenu = parseBooleanQuery(query.use_in_menu, 'use_in_menu');

  const where = {};
  if (useInMenu !== undefined) {
    where.use_in_menu = useInMenu;
  }

  const queryOptions = {
    where,
    attributes: selectedFields || ALLOWED_CATEGORY_FIELDS,
    order: [['id', 'ASC']],
  };

  if (limit !== -1) {
    queryOptions.limit = limit;
    queryOptions.offset = (page - 1) * limit;
  }

  const { count, rows } = await Category.findAndCountAll(queryOptions);

  return {
    data: rows.map((row) => formatCategoryResponse(row, selectedFields)),
    total: count,
    limit,
    page: limit === -1 ? 1 : page,
  };
}

/**
 * Busca uma categoria pelo ID.
 * @param {string|number} rawId
 */
async function getCategoryById(rawId) {
  const id = parsePositiveInt(rawId);
  if (!id) {
    throw new AppError('Categoria não encontrada.', 404);
  }

  const category = await Category.findByPk(id);
  if (!category) {
    throw new AppError('Categoria não encontrada.', 404);
  }

  return formatCategoryResponse(category);
}

/**
 * Valida os dados de entrada de criação/atualização de categoria.
 * @param {Object} payload
 */
function validateCategoryPayload(payload) {
  const { name, slug, use_in_menu } = payload || {};

  if (!isNonEmptyString(name)) {
    throw new AppError('O campo "name" é obrigatório.', 400);
  }
  if (!isNonEmptyString(slug)) {
    throw new AppError('O campo "slug" é obrigatório.', 400);
  }
  if (use_in_menu !== undefined && typeof use_in_menu !== 'boolean') {
    throw new AppError('O campo "use_in_menu" deve ser um valor booleano (true ou false).', 400);
  }

  return {
    name: name.trim(),
    slug: slug.trim(),
    use_in_menu: use_in_menu ?? false,
  };
}

/**
 * Cria uma nova categoria.
 * @param {Object} payload
 */
async function createCategory(payload) {
  const data = validateCategoryPayload(payload);
  const category = await Category.create(data);
  return formatCategoryResponse(category);
}

/**
 * Atualiza uma categoria existente pelo ID.
 * @param {string|number} rawId
 * @param {Object} payload
 */
async function updateCategory(rawId, payload) {
  const id = parsePositiveInt(rawId);
  if (!id) {
    throw new AppError('Categoria não encontrada.', 404);
  }

  const category = await Category.findByPk(id);
  if (!category) {
    throw new AppError('Categoria não encontrada.', 404);
  }

  const data = validateCategoryPayload(payload);
  await category.update(data);
}

/**
 * Remove uma categoria pelo ID.
 * @param {string|number} rawId
 */
async function deleteCategory(rawId) {
  const id = parsePositiveInt(rawId);
  if (!id) {
    throw new AppError('Categoria não encontrada.', 404);
  }

  const category = await Category.findByPk(id);
  if (!category) {
    throw new AppError('Categoria não encontrada.', 404);
  }

  await category.destroy();
}

module.exports = {
  searchCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
