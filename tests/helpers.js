const request = require('supertest');
const app = require('../src/app');
const {
  User,
  Category,
  Product,
  ProductImage,
  ProductOption,
  ProductCategory,
} = require('../src/models');

/**
 * Limpa todas as tabelas em ordem segura de chaves estrangeiras entre testes.
 */
async function clearDatabase() {
  await ProductCategory.destroy({ where: {} });
  await ProductOption.destroy({ where: {} });
  await ProductImage.destroy({ where: {} });
  await Product.destroy({ where: {} });
  await Category.destroy({ where: {} });
  await User.destroy({ where: {} });
}

/**
 * Cria um usuário e retorna o usuário criado juntamente com um token JWT válido.
 * @param {Object} [overrides]
 */
async function createAuthenticatedUser(overrides = {}) {
  const userData = {
    firstname: 'Ulisses',
    surname: 'Quirino',
    email: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@mail.com`,
    password: '123@123',
    confirmPassword: '123@123',
    ...overrides,
  };

  const createRes = await request(app).post('/v1/user').send(userData);
  const tokenRes = await request(app)
    .post('/v1/user/token')
    .send({ email: userData.email, password: userData.password });

  return {
    user: createRes.body,
    token: tokenRes.body.token,
    credentials: { email: userData.email, password: userData.password },
  };
}

// PNG válido de 1x1 pixel em base64 para testes reais de persistência de imagem
const SAMPLE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

module.exports = {
  clearDatabase,
  createAuthenticatedUser,
  SAMPLE_PNG_BASE64,
};
