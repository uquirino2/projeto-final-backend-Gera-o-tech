const AppError = require('../utils/AppError');

/**
 * Middleware para rotas inexistentes (404 Not Found).
 */
function notFoundHandler(req, res) {
  return res.status(404).json({
    error: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Middleware centralizado de tratamento de erros da aplicação.
 * Converte erros operacionais (AppError), erros de parsing JSON e erros do Sequelize
 * em respostas HTTP padronizadas sem expor detalhes internos sensíveis.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Erro de JSON malformado no corpo da requisição
  if (err && (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400))) {
    return res.status(400).json({
      error: 'JSON inválido no corpo da requisição.',
    });
  }

  // Payload excedeu o limite configurado
  if (err && err.type === 'entity.too.large') {
    return res.status(400).json({
      error: 'O tamanho do corpo da requisição excede o limite permitido.',
    });
  }

  // Erros operacionais esperados da aplicação
  if (err instanceof AppError) {
    const response = { error: err.message };
    if (err.details) {
      response.details = err.details;
    }
    return res.status(err.statusCode).json(response);
  }

  // Erros de validação e restrições do Sequelize
  if (err && err.name === 'SequelizeUniqueConstraintError') {
    const fields = err.errors ? err.errors.map((e) => e.path).join(', ') : '';
    return res.status(400).json({
      error: fields ? `Valor duplicado para o campo: ${fields}.` : 'Registro já existente.',
    });
  }

  if (err && err.name === 'SequelizeValidationError') {
    const details = err.errors ? err.errors.map((e) => e.message) : [];
    return res.status(400).json({
      error: 'Erro de validação dos dados enviados.',
      details,
    });
  }

  if (err && err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      error: 'Referência inválida para registro relacionado.',
    });
  }

  // Erros inesperados (500 Internal Server Error)
  if (process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.error('[ERROR]', err);
  }

  return res.status(500).json({
    error: 'Erro interno do servidor.',
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
