require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

const PORT = Number(process.env.PORT) || 3000;

/**
 * Inicializa a conexão com o banco de dados e inicia o servidor HTTP.
 */
async function startServer() {
  try {
    await sequelize.authenticate();
    // eslint-disable-next-line no-console
    console.log('Conexão com o banco de dados estabelecida com sucesso.');

    const server = app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Servidor rodando em http://localhost:${PORT}`);
      // eslint-disable-next-line no-console
      console.log(`Documentação Swagger disponível em http://localhost:${PORT}/api-docs`);
    });

    const shutdown = async (signal) => {
      // eslint-disable-next-line no-console
      console.log(`Sinal ${signal} recebido. Encerrando servidor...`);
      server.close(async () => {
        await sequelize.close();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Falha ao conectar ao banco de dados:', err.message);
    process.exit(1);
  }
}

startServer();
