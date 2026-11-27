require('dotenv').config();

/**
 * Configurações de conexão do Sequelize CLI para os ambientes
 * de desenvolvimento, testes e produção.
 */
const mysqlConfig = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'digital_store_db',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  dialect: process.env.DB_DIALECT || 'mysql',
  logging: false,
  define: {
    underscored: true,
  },
};

const testConfig =
  process.env.DB_DIALECT === 'mysql'
    ? {
        ...mysqlConfig,
        database: process.env.DB_TEST_NAME || process.env.DB_NAME || 'digital_store_test',
      }
    : {
        dialect: 'sqlite',
        storage: ':memory:',
        logging: false,
        define: {
          underscored: true,
        },
      };

module.exports = {
  development: mysqlConfig,
  test: testConfig,
  production: {
    ...mysqlConfig,
    logging: false,
  },
};
