const fs = require('fs');
const os = require('os');
const path = require('path');

// Configura variáveis isoladas para o ambiente de testes antes de carregar models/app
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key';
process.env.APP_URL = 'http://localhost:3000';

const testUploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'digital-store-uploads-'));
process.env.UPLOAD_DIR = testUploadDir;

const { sequelize } = require('../src/models');

beforeAll(async () => {
  await sequelize.authenticate();
  if (sequelize.getDialect() === 'sqlite') {
    await sequelize.query('PRAGMA foreign_keys = ON;');
    await sequelize.sync({ force: true });
  } else {
    // Em MySQL de testes, sincroniza o schema limpo antes da suíte
    await sequelize.sync({ force: true });
  }
});

afterAll(async () => {
  await sequelize.close();
  if (fs.existsSync(testUploadDir)) {
    fs.rmSync(testUploadDir, { recursive: true, force: true });
  }
});
