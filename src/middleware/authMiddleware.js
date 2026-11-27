const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

/**
 * Obtém o segredo JWT configurado nas variáveis de ambiente.
 * @returns {string}
 */
function getJwtSecret() {
  return process.env.JWT_SECRET || 'digital_store_default_jwt_secret';
}

/**
 * Middleware de autenticação JWT.
 * Exige o cabeçalho `Authorization: Bearer <token>` válido para rotas protegidas.
 * Em caso de ausência ou token inválido/expirado, retorna 401 Unauthorized.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || typeof authHeader !== 'string') {
    return next(new AppError('Token de autorização não informado.', 401));
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]) {
    return next(new AppError('Formato do token de autorização inválido. Utilize "Bearer <token>".', 401));
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Token de autorização expirado.', 401));
    }
    return next(new AppError('Token de autorização inválido.', 401));
  }
}

module.exports = {
  authMiddleware,
  getJwtSecret,
};
