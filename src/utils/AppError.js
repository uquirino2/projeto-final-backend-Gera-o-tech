/**
 * Classe de erro customizada para erros operacionais da aplicação.
 * Permite propagar código HTTP e detalhes opcionais de forma padronizada
 * até o middleware centralizado de tratamento de erros.
 */
class AppError extends Error {
  /**
   * @param {string} message Mensagem descritiva do erro.
   * @param {number} [statusCode=400] Código de status HTTP apropriado.
   * @param {Array<string>|Object|null} [details=null] Detalhes adicionais (ex.: campos inválidos).
   */
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
