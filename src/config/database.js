const { Sequelize } = require('sequelize');
const allConfigs = require('./config');

const env = process.env.NODE_ENV || 'development';
const dbConfig = allConfigs[env] || allConfigs.development;

/**
 * Instância única (Singleton) do Sequelize utilizada pelos modelos e serviços.
 */
const sequelize =
  dbConfig.dialect === 'sqlite'
    ? new Sequelize({
        dialect: 'sqlite',
        storage: dbConfig.storage,
        logging: dbConfig.logging,
        define: dbConfig.define,
      })
    : new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: dbConfig.dialect,
        logging: dbConfig.logging,
        define: dbConfig.define,
      });

module.exports = sequelize;
