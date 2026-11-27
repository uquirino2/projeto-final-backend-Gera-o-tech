const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User } = require('../models');
const AppError = require('../utils/AppError');
const { getJwtSecret } = require('../middleware/authMiddleware');
const { isNonEmptyString, isValidEmail, parsePositiveInt } = require('../utils/validators');

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Formata um registro de usuário removendo campos sensíveis (como `password`).
 * @param {Object} user
 * @returns {{ id: number, firstname: string, surname: string, email: string }}
 */
function formatUserResponse(user) {
  return {
    id: user.id,
    firstname: user.firstname,
    surname: user.surname,
    email: user.email,
  };
}

/**
 * Busca um usuário pelo ID.
 * @param {string|number} rawId
 */
async function getUserById(rawId) {
  const id = parsePositiveInt(rawId);
  if (!id) {
    throw new AppError('Usuário não encontrado.', 404);
  }

  const user = await User.findByPk(id, {
    attributes: ['id', 'firstname', 'surname', 'email'],
  });

  if (!user) {
    throw new AppError('Usuário não encontrado.', 404);
  }

  return formatUserResponse(user);
}

/**
 * Cadastra um novo usuário com senha criptografada via bcrypt.
 * @param {Object} payload
 */
async function createUser(payload) {
  const { firstname, surname, email, password, confirmPassword } = payload || {};

  if (!isNonEmptyString(firstname)) {
    throw new AppError('O campo "firstname" é obrigatório.', 400);
  }
  if (!isNonEmptyString(surname)) {
    throw new AppError('O campo "surname" é obrigatório.', 400);
  }
  if (!isValidEmail(email)) {
    throw new AppError('O campo "email" é obrigatório e deve ser um e-mail válido.', 400);
  }
  if (!isNonEmptyString(password)) {
    throw new AppError('O campo "password" é obrigatório.', 400);
  }
  if (!isNonEmptyString(confirmPassword)) {
    throw new AppError('O campo "confirmPassword" é obrigatório.', 400);
  }
  if (password !== confirmPassword) {
    throw new AppError('Os campos "password" e "confirmPassword" devem ser iguais.', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  if (existingUser) {
    throw new AppError('Já existe um usuário cadastrado com este e-mail.', 400);
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const user = await User.create({
    firstname: firstname.trim(),
    surname: surname.trim(),
    email: normalizedEmail,
    password: hashedPassword,
  });

  return formatUserResponse(user);
}

/**
 * Atualiza os dados cadastrais de um usuário existente.
 * @param {string|number} rawId
 * @param {Object} payload
 */
async function updateUser(rawId, payload) {
  const id = parsePositiveInt(rawId);
  if (!id) {
    throw new AppError('Usuário não encontrado.', 404);
  }

  const user = await User.findByPk(id);
  if (!user) {
    throw new AppError('Usuário não encontrado.', 404);
  }

  const { firstname, surname, email } = payload || {};

  if (!isNonEmptyString(firstname)) {
    throw new AppError('O campo "firstname" é obrigatório.', 400);
  }
  if (!isNonEmptyString(surname)) {
    throw new AppError('O campo "surname" é obrigatório.', 400);
  }
  if (!isValidEmail(email)) {
    throw new AppError('O campo "email" é obrigatório e deve ser um e-mail válido.', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailInUse = await User.findOne({
    where: {
      email: normalizedEmail,
      id: { [Op.ne]: id },
    },
  });

  if (emailInUse) {
    throw new AppError('O e-mail informado já está em uso por outro usuário.', 400);
  }

  await user.update({
    firstname: firstname.trim(),
    surname: surname.trim(),
    email: normalizedEmail,
  });
}

/**
 * Remove um usuário pelo ID.
 * @param {string|number} rawId
 */
async function deleteUser(rawId) {
  const id = parsePositiveInt(rawId);
  if (!id) {
    throw new AppError('Usuário não encontrado.', 404);
  }

  const user = await User.findByPk(id);
  if (!user) {
    throw new AppError('Usuário não encontrado.', 404);
  }

  await user.destroy();
}

/**
 * Autentica um usuário por e-mail e senha e gera um token JWT.
 * @param {Object} payload
 * @returns {Promise<{ token: string }>}
 */
async function generateToken(payload) {
  const { email, password } = payload || {};

  if (!isValidEmail(email) || !isNonEmptyString(password)) {
    throw new AppError('E-mail e senha válidos são obrigatórios.', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ where: { email: normalizedEmail } });

  if (!user) {
    throw new AppError('E-mail ou senha incorretos.', 400);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('E-mail ou senha incorretos.', 400);
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  return { token };
}

module.exports = {
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  generateToken,
};
