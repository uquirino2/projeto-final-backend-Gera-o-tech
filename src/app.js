const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const routes = require('./routes');
const swaggerSpec = require('./config/swagger');
const imageService = require('./services/imageService');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Parser customizado de query string para preservar IDs numéricos em `option[ID]=val1,val2`
// (o parser `qs` padrão do Express converte índices <= 20 em array e descarta o ID original)
app.set('query parser', (queryString) => {
  const params = new URLSearchParams(queryString);
  const result = Object.create(null);

  for (const [key, value] of params.entries()) {
    const bracketMatch = key.match(/^([^[\]]+)\[([^[\]]*)\]$/);
    if (bracketMatch) {
      const baseKey = bracketMatch[1];
      const subKey = bracketMatch[2];
      if (
        baseKey === '__proto__' ||
        baseKey === 'constructor' ||
        baseKey === 'prototype' ||
        subKey === '__proto__' ||
        subKey === 'constructor' ||
        subKey === 'prototype'
      ) {
        continue;
      }
      if (typeof result[baseKey] !== 'object' || result[baseKey] === null) {
        result[baseKey] = Object.create(null);
      }
      result[baseKey][subKey] = value;
    } else if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
      result[key] = value;
    }
  }

  return result;
});

// Segurança de cabeçalhos HTTP (CSP relaxada apenas para permitir recursos da Swagger UI)
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(cors());

// Parsing do corpo JSON (suporta payloads maiores para imagens em base64)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir imagens enviadas localmente pela rota /media
app.use('/media', express.static(imageService.getUploadRoot()));

// Endpoint de verificação de saúde
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Documentação interativa Swagger (OpenAPI 3.0)
app.get('/api-docs.json', (req, res) => {
  res.status(200).json(swaggerSpec);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

// Rotas principais da API v1
app.use(routes);

// Tratamento de rotas inexistentes e erros centralizados
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
