const AppError = require('./AppError');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALLOWED_IMAGE_MIME_TYPES = {
  'image/png': 'png',
  'image/jpg': 'jpg',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * Valida se uma string representa um texto não vazio.
 * @param {*} value
 * @returns {boolean}
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Valida o formato básico de endereço de e-mail.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return isNonEmptyString(email) && EMAIL_REGEX.test(email.trim());
}

/**
 * Converte e valida um parâmetro de rota `:id` como inteiro positivo.
 * Retorna `null` caso não seja um inteiro positivo válido.
 * @param {string|number} rawId
 * @returns {number|null}
 */
function parsePositiveInt(rawId) {
  if (rawId === undefined || rawId === null || rawId === '') {
    return null;
  }
  const str = String(rawId).trim();
  if (!/^\d+$/.test(str)) {
    return null;
  }
  const parsed = Number(str);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Valida e normaliza os parâmetros de paginação `limit` e `page`.
 * - `limit` padrão: 12; aceita `-1` (sem limite) ou inteiro >= 1.
 * - `page` padrão: 1; aceita inteiro >= 1 (ignorado quando `limit === -1`).
 * @param {Object} query
 * @returns {{ limit: number, page: number }}
 */
function parsePagination(query) {
  let limit = 12;
  if (query.limit !== undefined && query.limit !== '') {
    const rawLimit = String(query.limit).trim();
    if (!/^-?\d+$/.test(rawLimit)) {
      throw new AppError('O parâmetro "limit" deve ser um número inteiro válido.', 400);
    }
    limit = Number(rawLimit);
    if (limit !== -1 && limit < 1) {
      throw new AppError('O parâmetro "limit" deve ser -1 ou um inteiro positivo.', 400);
    }
  }

  let page = 1;
  if (query.page !== undefined && query.page !== '') {
    const rawPage = String(query.page).trim();
    if (!/^\d+$/.test(rawPage) || Number(rawPage) < 1) {
      throw new AppError('O parâmetro "page" deve ser um número inteiro maior ou igual a 1.', 400);
    }
    page = Number(rawPage);
  }

  return { limit, page };
}

/**
 * Valida e faz parse do parâmetro `fields=campo1,campo2`.
 * @param {string|undefined} rawFields
 * @param {string[]} allowedFields Lista de campos permitidos para o recurso.
 * @returns {string[]|null} Lista de campos solicitados ou `null` se não especificado.
 */
function parseFields(rawFields, allowedFields) {
  if (rawFields === undefined || rawFields === '') {
    return null;
  }
  if (typeof rawFields !== 'string') {
    throw new AppError('O parâmetro "fields" deve ser uma lista separada por vírgulas.', 400);
  }

  const fields = rawFields
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean);

  if (fields.length === 0) {
    throw new AppError('O parâmetro "fields" não pode estar vazio.', 400);
  }

  const invalidFields = fields.filter((field) => !allowedFields.includes(field));
  if (invalidFields.length > 0) {
    throw new AppError(
      `Campos inválidos em "fields": ${invalidFields.join(', ')}. Campos permitidos: ${allowedFields.join(', ')}.`,
      400
    );
  }

  // Remove duplicatas preservando a ordem solicitada
  return [...new Set(fields)];
}

/**
 * Valida e faz parse de um booleano recebido via query string (`"true"` ou `"false"`).
 * @param {string|undefined} value
 * @param {string} paramName
 * @returns {boolean|undefined}
 */
function parseBooleanQuery(value, paramName) {
  if (value === undefined || value === '') {
    return undefined;
  }
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  throw new AppError(`O parâmetro "${paramName}" deve ser "true" ou "false".`, 400);
}

/**
 * Valida e converte o parâmetro `category_ids=1,2,3` em um array de inteiros positivos.
 * @param {string|undefined} rawCategoryIds
 * @returns {number[]|null}
 */
function parseCategoryIdsQuery(rawCategoryIds) {
  if (rawCategoryIds === undefined || rawCategoryIds === '') {
    return null;
  }
  if (typeof rawCategoryIds !== 'string') {
    throw new AppError('O parâmetro "category_ids" deve ser uma lista de IDs separados por vírgula.', 400);
  }

  const parts = rawCategoryIds.split(',').map((item) => item.trim());
  const ids = parts.map((part) => {
    const parsed = parsePositiveInt(part);
    if (!parsed) {
      throw new AppError(`ID de categoria inválido em "category_ids": "${part}".`, 400);
    }
    return parsed;
  });

  return [...new Set(ids)];
}

/**
 * Valida e converte o parâmetro `price-range=100-200` em `{ min, max }`.
 * @param {string|undefined} rawPriceRange
 * @returns {{ min: number, max: number }|null}
 */
function parsePriceRangeQuery(rawPriceRange) {
  if (rawPriceRange === undefined || rawPriceRange === '') {
    return null;
  }
  if (typeof rawPriceRange !== 'string') {
    throw new AppError('O parâmetro "price-range" deve seguir o formato "min-max" (ex.: 100-200).', 400);
  }

  const match = rawPriceRange.trim().match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  if (!match) {
    throw new AppError('O parâmetro "price-range" deve seguir o formato "min-max" (ex.: 100-200).', 400);
  }

  const min = Number(match[1]);
  const max = Number(match[2]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    throw new AppError('Intervalo de preços inválido: o valor mínimo não pode ser maior que o máximo.', 400);
  }

  return { min, max };
}

/**
 * Valida e converte o parâmetro `option[45]=GG,PP` em uma lista de filtros estruturados.
 * @param {Object|undefined} rawOptions Objeto gerado pelo parser de query do Express.
 * @returns {Array<{ optionId: number, values: string[] }>|null}
 */
function parseOptionFiltersQuery(rawOptions) {
  if (rawOptions === undefined) {
    return null;
  }
  if (typeof rawOptions !== 'object' || rawOptions === null || Array.isArray(rawOptions)) {
    throw new AppError('O parâmetro "option" deve seguir o formato "option[ID]=valor1,valor2".', 400);
  }

  const filters = [];
  for (const [rawOptionId, rawValues] of Object.entries(rawOptions)) {
    const optionId = parsePositiveInt(rawOptionId);
    if (!optionId) {
      throw new AppError(`ID de opção inválido em "option[${rawOptionId}]".`, 400);
    }
    if (typeof rawValues !== 'string' || rawValues.trim().length === 0) {
      throw new AppError(`Os valores de "option[${rawOptionId}]" não podem estar vazios.`, 400);
    }
    const values = rawValues
      .split(',')
      .map((val) => val.trim())
      .filter(Boolean);

    if (values.length === 0) {
      throw new AppError(`Os valores de "option[${rawOptionId}]" não podem estar vazios.`, 400);
    }

    filters.push({ optionId, values });
  }

  return filters.length > 0 ? filters : null;
}

/**
 * Converte o valor de `radius` recebido no payload (ex.: `4`, `"4"`, `"4px"`) para inteiro >= 0.
 * @param {*} rawRadius
 * @returns {number}
 */
function parseRadius(rawRadius) {
  if (rawRadius === undefined || rawRadius === null || rawRadius === '') {
    return 0;
  }
  if (typeof rawRadius === 'number') {
    if (!Number.isInteger(rawRadius) || rawRadius < 0) {
      throw new AppError('O campo "radius" deve ser um número inteiro não negativo (ex.: 4 ou "4px").', 400);
    }
    return rawRadius;
  }
  if (typeof rawRadius === 'string') {
    const match = rawRadius.trim().match(/^(\d+)(?:px)?$/i);
    if (!match) {
      throw new AppError('O campo "radius" deve ser um número inteiro não negativo (ex.: 4 ou "4px").', 400);
    }
    return Number(match[1]);
  }
  throw new AppError('O campo "radius" deve ser um número inteiro não negativo (ex.: 4 ou "4px").', 400);
}

/**
 * Normaliza os valores de uma opção de produto (`values` ou `value`),
 * aceitando array de strings ou string separada por vírgulas.
 * @param {*} rawValues
 * @returns {string} Valores unidos por vírgula para persistência no banco.
 */
function normalizeOptionValues(rawValues) {
  if (Array.isArray(rawValues)) {
    const cleaned = rawValues
      .map((item) => (typeof item === 'string' || typeof item === 'number' ? String(item).trim() : ''))
      .filter(Boolean);
    if (cleaned.length === 0) {
      throw new AppError('Os valores da opção do produto ("values") não podem estar vazios.', 400);
    }
    return cleaned.join(',');
  }

  if (typeof rawValues === 'string') {
    const cleaned = rawValues
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (cleaned.length === 0) {
      throw new AppError('Os valores da opção do produto ("values") não podem estar vazios.', 400);
    }
    return cleaned.join(',');
  }

  throw new AppError('Os valores da opção do produto ("values") devem ser um array ou string separada por vírgulas.', 400);
}

module.exports = {
  ALLOWED_IMAGE_MIME_TYPES,
  isNonEmptyString,
  isValidEmail,
  parsePositiveInt,
  parsePagination,
  parseFields,
  parseBooleanQuery,
  parseCategoryIdsQuery,
  parsePriceRangeQuery,
  parseOptionFiltersQuery,
  parseRadius,
  normalizeOptionValues,
};
