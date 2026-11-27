const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AppError = require('../utils/AppError');
const { ALLOWED_IMAGE_MIME_TYPES, isNonEmptyString } = require('../utils/validators');

/**
 * Retorna o diretório absoluto configurado para armazenamento local de uploads.
 * @returns {string}
 */
function getUploadRoot() {
  const configured = process.env.UPLOAD_DIR || 'uploads';
  return path.resolve(process.cwd(), configured);
}

/**
 * Verifica se uma string representa uma URL HTTP/HTTPS externa.
 * @param {string} value
 * @returns {boolean}
 */
function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\/.+/i.test(value.trim());
}

/**
 * Converte o `path` salvo no banco em uma URL completa para a resposta da API.
 * Se já for uma URL absoluta (http/https), retorna inalterada.
 * @param {string} storedPath
 * @returns {string}
 */
function resolveImageUrl(storedPath) {
  if (!storedPath) return '';
  if (isHttpUrl(storedPath)) {
    return storedPath;
  }
  const baseUrl = (process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/+$/, '');
  const cleanPath = storedPath.replace(/^\/+/, '');
  return `${baseUrl}/media/${cleanPath}`;
}

/**
 * Extrai extensão de arquivo e payload base64 puro a partir dos campos `type` e `content`.
 * Aceita tanto base64 puro quanto Data URI (`data:image/png;base64,...`).
 * @param {string|undefined} type MIME type informado (ex.: `image/png`)
 * @param {string} content Conteúdo em base64 ou Data URI
 * @returns {{ extension: string, base64Data: string }}
 */
function extractImagePayload(type, content) {
  let mimeType = type ? String(type).trim().toLowerCase() : null;
  let base64Data = content.trim();

  const dataUriMatch = base64Data.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i);
  if (dataUriMatch) {
    mimeType = mimeType || dataUriMatch[1].toLowerCase();
    base64Data = dataUriMatch[2];
  }

  if (mimeType && !ALLOWED_IMAGE_MIME_TYPES[mimeType]) {
    throw new AppError(
      `Tipo de imagem não suportado: "${mimeType}". Tipos permitidos: ${Object.keys(ALLOWED_IMAGE_MIME_TYPES).join(', ')}.`,
      400
    );
  }

  const extension = mimeType ? ALLOWED_IMAGE_MIME_TYPES[mimeType] : 'png';
  return { extension, base64Data };
}

/**
 * Persiste uma imagem de produto (URL externa ou base64 em disco).
 * Retorna o caminho relativo salvo para armazenamento na coluna `product_images.path`
 * e o caminho absoluto criado em disco (se houver), permitindo rollback em caso de erro.
 *
 * @param {{ type?: string, content: string }} imageInput
 * @param {string} productSlug
 * @returns {{ storedPath: string, createdFilePath: string|null }}
 */
function persistImage(imageInput, productSlug) {
  if (!imageInput || !isNonEmptyString(imageInput.content)) {
    throw new AppError('Cada imagem deve conter o campo "content" preenchido.', 400);
  }

  const trimmedContent = imageInput.content.trim();

  // Mantém URLs externas diretamente sem gravar arquivo em disco
  if (isHttpUrl(trimmedContent)) {
    return {
      storedPath: trimmedContent,
      createdFilePath: null,
    };
  }

  const { extension, base64Data } = extractImagePayload(imageInput.type, trimmedContent);

  const safeSlug = String(productSlug || 'product')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) || 'product';

  const uploadRoot = getUploadRoot();
  const productDir = path.join(uploadRoot, 'products', safeSlug);
  fs.mkdirSync(productDir, { recursive: true });

  const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;
  const absoluteFilePath = path.join(productDir, fileName);

  // Proteção contra path traversal
  const resolvedRoot = path.resolve(uploadRoot);
  const resolvedTarget = path.resolve(absoluteFilePath);
  if (!resolvedTarget.startsWith(resolvedRoot + path.sep)) {
    throw new AppError('Caminho de arquivo de imagem inválido.', 400);
  }

  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(resolvedTarget, buffer);

  const storedPath = path.posix.join('products', safeSlug, fileName);
  return {
    storedPath,
    createdFilePath: resolvedTarget,
  };
}

/**
 * Remove um arquivo de imagem armazenado localmente com base no `path` salvo no banco.
 * Ignora URLs externas ou arquivos inexistentes.
 * @param {string} storedPath
 */
function removeStoredImage(storedPath) {
  if (!storedPath || isHttpUrl(storedPath)) {
    return;
  }

  const uploadRoot = path.resolve(getUploadRoot());
  const targetPath = path.resolve(uploadRoot, storedPath);

  if (!targetPath.startsWith(uploadRoot + path.sep)) {
    return;
  }

  try {
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
  } catch {
    // Falha ao remover arquivo físico não deve interromper o fluxo HTTP
  }
}

/**
 * Remove arquivos recém-criados em caso de rollback de transação.
 * @param {string[]} filePaths
 */
function cleanupFiles(filePaths) {
  for (const filePath of filePaths) {
    if (!filePath) continue;
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignora erros de limpeza durante rollback
    }
  }
}

module.exports = {
  getUploadRoot,
  isHttpUrl,
  resolveImageUrl,
  persistImage,
  removeStoredImage,
  cleanupFiles,
};
