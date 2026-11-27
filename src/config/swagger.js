/**
 * Especificação OpenAPI 3.0.3 para documentação interativa da API via Swagger UI.
 * Acessível em `/api-docs` e em formato JSON puro em `/api-docs.json`.
 */
const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Digital Store Backend API — Projeto Final Geração Tech',
    version: '1.0.0',
    description:
      'API RESTful de E-commerce desenvolvida com Node.js, Express, Sequelize, MySQL e JWT conforme especificação oficial da Digital College.',
  },
  servers: [
    {
      url: process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`,
      description: 'Servidor Local / Configurado via APP_URL',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Autenticação e emissão de tokens JWT' },
    { name: 'Users', description: 'Gerenciamento de usuários' },
    { name: 'Categories', description: 'Gerenciamento e busca de categorias' },
    { name: 'Products', description: 'Gerenciamento e busca avançada de produtos' },
    { name: 'Health', description: 'Monitoramento da saúde da API' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Insira o token obtido em POST /v1/user/token',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Mensagem descritiva do erro.' },
        },
      },
      TokenRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@mail.com' },
          password: { type: 'string', example: '123@123' },
        },
      },
      TokenResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        },
      },
      UserResponse: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          firstname: { type: 'string', example: 'João' },
          surname: { type: 'string', example: 'Silva' },
          email: { type: 'string', format: 'email', example: 'user@mail.com' },
        },
      },
      UserCreateRequest: {
        type: 'object',
        required: ['firstname', 'surname', 'email', 'password', 'confirmPassword'],
        properties: {
          firstname: { type: 'string', example: 'João' },
          surname: { type: 'string', example: 'Silva' },
          email: { type: 'string', format: 'email', example: 'user@mail.com' },
          password: { type: 'string', example: '123@123' },
          confirmPassword: { type: 'string', example: '123@123' },
        },
      },
      UserUpdateRequest: {
        type: 'object',
        required: ['firstname', 'surname', 'email'],
        properties: {
          firstname: { type: 'string', example: 'João Atualizado' },
          surname: { type: 'string', example: 'Silva' },
          email: { type: 'string', format: 'email', example: 'joao@mail.com' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Shoes' },
          slug: { type: 'string', example: 'shoes' },
          use_in_menu: { type: 'boolean', example: true },
        },
      },
      CategoryRequest: {
        type: 'object',
        required: ['name', 'slug'],
        properties: {
          name: { type: 'string', example: 'Shoes' },
          slug: { type: 'string', example: 'shoes' },
          use_in_menu: { type: 'boolean', default: false, example: true },
        },
      },
      CategorySearchResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Category' },
          },
          total: { type: 'integer', example: 10 },
          limit: { type: 'integer', example: 12 },
          page: { type: 'integer', example: 1 },
        },
      },
      ProductImageResponse: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          content: {
            type: 'string',
            example: 'http://localhost:3000/media/products/produto-01/image-01.png',
          },
        },
      },
      ProductOptionResponse: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'Cor' },
          shape: { type: 'string', enum: ['square', 'circle'], example: 'square' },
          radius: { type: 'integer', example: 4 },
          type: { type: 'string', enum: ['text', 'color'], example: 'text' },
          values: {
            type: 'array',
            items: { type: 'string' },
            example: ['PP', 'GG', 'M'],
          },
        },
      },
      ProductResponse: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          enabled: { type: 'boolean', example: true },
          name: { type: 'string', example: 'Produto 01' },
          slug: { type: 'string', example: 'produto-01' },
          use_in_menu: { type: 'boolean', example: false },
          stock: { type: 'integer', example: 10 },
          description: { type: 'string', nullable: true, example: 'Descrição do produto 01' },
          price: { type: 'number', format: 'float', example: 119.9 },
          price_with_discount: { type: 'number', format: 'float', example: 99.9 },
          category_ids: {
            type: 'array',
            items: { type: 'integer' },
            example: [1, 2],
          },
          images: {
            type: 'array',
            items: { $ref: '#/components/schemas/ProductImageResponse' },
          },
          options: {
            type: 'array',
            items: { $ref: '#/components/schemas/ProductOptionResponse' },
          },
        },
      },
      ProductCreateRequest: {
        type: 'object',
        required: ['name', 'slug', 'price', 'price_with_discount'],
        properties: {
          enabled: { type: 'boolean', default: false, example: true },
          name: { type: 'string', example: 'Produto 01' },
          slug: { type: 'string', example: 'produto-01' },
          use_in_menu: { type: 'boolean', default: false, example: true },
          stock: { type: 'integer', default: 0, example: 10 },
          description: { type: 'string', example: 'Descrição do produto 01' },
          price: { type: 'number', format: 'float', example: 119.9 },
          price_with_discount: { type: 'number', format: 'float', example: 99.9 },
          category_ids: {
            type: 'array',
            items: { type: 'integer' },
            example: [1],
          },
          images: {
            type: 'array',
            items: {
              type: 'object',
              required: ['content'],
              properties: {
                type: { type: 'string', example: 'image/png' },
                content: {
                  type: 'string',
                  description: 'Conteúdo em base64 (ou Data URI) ou URL externa.',
                  example: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
                },
                enabled: { type: 'boolean', default: true },
              },
            },
          },
          options: {
            type: 'array',
            items: {
              type: 'object',
              required: ['title'],
              properties: {
                title: { type: 'string', example: 'Tamanho' },
                shape: { type: 'string', enum: ['square', 'circle'], default: 'square' },
                radius: {
                  oneOf: [{ type: 'integer' }, { type: 'string' }],
                  example: '4px',
                },
                type: { type: 'string', enum: ['text', 'color'], default: 'text' },
                values: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['PP', 'M', 'GG'],
                },
              },
            },
          },
        },
      },
      ProductUpdateRequest: {
        type: 'object',
        required: ['name', 'slug', 'price', 'price_with_discount'],
        properties: {
          enabled: { type: 'boolean', example: true },
          name: { type: 'string', example: 'Produto 01 atualizado' },
          slug: { type: 'string', example: 'produto-01-atualizado' },
          use_in_menu: { type: 'boolean', example: true },
          stock: { type: 'integer', example: 20 },
          description: { type: 'string', example: 'Descrição atualizada' },
          price: { type: 'number', format: 'float', example: 49.9 },
          price_with_discount: { type: 'number', format: 'float', example: 39.9 },
          category_ids: {
            type: 'array',
            items: { type: 'integer' },
            example: [1],
          },
          images: {
            type: 'array',
            description: 'Suporta criação (sem id), atualização (com id e content) e remoção (com id e deleted: true).',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                deleted: { type: 'boolean' },
                type: { type: 'string', example: 'image/png' },
                content: { type: 'string' },
              },
            },
          },
          options: {
            type: 'array',
            description: 'Suporta criação (sem id), atualização (com id) e remoção (com id e deleted: true).',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                deleted: { type: 'boolean' },
                title: { type: 'string' },
                shape: { type: 'string', enum: ['square', 'circle'] },
                radius: { oneOf: [{ type: 'integer' }, { type: 'string' }] },
                type: { type: 'string', enum: ['text', 'color'] },
                values: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      ProductSearchResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/ProductResponse' },
          },
          total: { type: 'integer', example: 120 },
          limit: { type: 'integer', example: 12 },
          page: { type: 'integer', example: 1 },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Verifica o status de saúde da API',
        responses: {
          200: {
            description: 'API operacional',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/v1/user/token': {
      post: {
        tags: ['Auth'],
        summary: 'Gera um token JWT para autenticação',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TokenRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Token gerado com sucesso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TokenResponse' },
              },
            },
          },
          400: {
            description: 'Credenciais inválidas ou dados incorretos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/v1/user': {
      post: {
        tags: ['Users'],
        summary: 'Cadastra um novo usuário',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserCreateRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Usuário criado com sucesso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserResponse' },
              },
            },
          },
          400: {
            description: 'Dados inválidos ou e-mail já cadastrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/v1/user/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Obtém os dados de um usuário pelo ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: {
            description: 'Usuário encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserResponse' },
              },
            },
          },
          404: { description: 'Usuário não encontrado' },
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Atualiza os dados de um usuário',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserUpdateRequest' },
            },
          },
        },
        responses: {
          204: { description: 'Usuário atualizado com sucesso (sem corpo)' },
          400: { description: 'Dados inválidos' },
          401: { description: 'Token de autorização ausente ou inválido' },
          404: { description: 'Usuário não encontrado' },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Remove um usuário pelo ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          204: { description: 'Usuário removido com sucesso (sem corpo)' },
          401: { description: 'Token de autorização ausente ou inválido' },
          404: { description: 'Usuário não encontrado' },
        },
      },
    },
    '/v1/category/search': {
      get: {
        tags: ['Categories'],
        summary: 'Lista e filtra categorias com paginação',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Quantidade por página (padrão 12; use -1 para listar todas)',
            schema: { type: 'integer', default: 12 },
          },
          {
            name: 'page',
            in: 'query',
            description: 'Número da página (padrão 1; ignorado se limit=-1)',
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'fields',
            in: 'query',
            description: 'Campos separados por vírgula (ex.: name,slug)',
            schema: { type: 'string' },
          },
          {
            name: 'use_in_menu',
            in: 'query',
            description: 'Filtra categorias visíveis no menu (true ou false)',
            schema: { type: 'boolean' },
          },
        ],
        responses: {
          200: {
            description: 'Lista de categorias retornada com sucesso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CategorySearchResponse' },
              },
            },
          },
          400: { description: 'Parâmetros de busca inválidos' },
        },
      },
    },
    '/v1/category': {
      post: {
        tags: ['Categories'],
        summary: 'Cadastra uma nova categoria',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CategoryRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Categoria criada com sucesso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Category' },
              },
            },
          },
          400: { description: 'Dados inválidos' },
          401: { description: 'Token de autorização ausente ou inválido' },
        },
      },
    },
    '/v1/category/{id}': {
      get: {
        tags: ['Categories'],
        summary: 'Obtém os dados de uma categoria pelo ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: {
            description: 'Categoria encontrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Category' },
              },
            },
          },
          404: { description: 'Categoria não encontrada' },
        },
      },
      put: {
        tags: ['Categories'],
        summary: 'Atualiza uma categoria pelo ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CategoryRequest' },
            },
          },
        },
        responses: {
          204: { description: 'Categoria atualizada com sucesso (sem corpo)' },
          400: { description: 'Dados inválidos' },
          401: { description: 'Token de autorização ausente ou inválido' },
          404: { description: 'Categoria não encontrada' },
        },
      },
      delete: {
        tags: ['Categories'],
        summary: 'Remove uma categoria pelo ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          204: { description: 'Categoria removida com sucesso (sem corpo)' },
          401: { description: 'Token de autorização ausente ou inválido' },
          404: { description: 'Categoria não encontrada' },
        },
      },
    },
    '/v1/product/search': {
      get: {
        tags: ['Products'],
        summary: 'Lista e filtra produtos com busca avançada e paginação',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Itens por página (padrão 12; use -1 para buscar todos)',
            schema: { type: 'integer', default: 12 },
          },
          {
            name: 'page',
            in: 'query',
            description: 'Página atual (padrão 1; ignorado se limit=-1)',
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'fields',
            in: 'query',
            description: 'Campos separados por vírgula (ex.: name,images,price)',
            schema: { type: 'string' },
          },
          {
            name: 'match',
            in: 'query',
            description: 'Termo de busca no nome ou descrição do produto',
            schema: { type: 'string' },
          },
          {
            name: 'category_ids',
            in: 'query',
            description: 'IDs de categorias separados por vírgula (ex.: 1,2)',
            schema: { type: 'string' },
          },
          {
            name: 'price-range',
            in: 'query',
            description: 'Janela de preços no formato min-max (ex.: 100-200)',
            schema: { type: 'string' },
          },
          {
            name: 'option[45]',
            in: 'query',
            description: 'Filtro por valores de opção no formato option[ID]=val1,val2 (ex.: option[45]=GG,PP)',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Lista de produtos retornada com sucesso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProductSearchResponse' },
              },
            },
          },
          400: { description: 'Parâmetros de busca inválidos' },
        },
      },
    },
    '/v1/product': {
      post: {
        tags: ['Products'],
        summary: 'Cadastra um novo produto com categorias, imagens e opções',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductCreateRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Produto criado com sucesso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProductResponse' },
              },
            },
          },
          400: { description: 'Dados inválidos' },
          401: { description: 'Token de autorização ausente ou inválido' },
        },
      },
    },
    '/v1/product/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Obtém os detalhes completos de um produto pelo ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: {
            description: 'Produto encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProductResponse' },
              },
            },
          },
          404: { description: 'Produto não encontrado' },
        },
      },
      put: {
        tags: ['Products'],
        summary: 'Atualiza um produto e sincroniza suas categorias, imagens e opções',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductUpdateRequest' },
            },
          },
        },
        responses: {
          204: { description: 'Produto atualizado com sucesso (sem corpo)' },
          400: { description: 'Dados inválidos' },
          401: { description: 'Token de autorização ausente ou inválido' },
          404: { description: 'Produto não encontrado' },
        },
      },
      delete: {
        tags: ['Products'],
        summary: 'Remove um produto e seus relacionamentos pelo ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          204: { description: 'Produto removido com sucesso (sem corpo)' },
          401: { description: 'Token de autorização ausente ou inválido' },
          404: { description: 'Produto não encontrado' },
        },
      },
    },
  },
};

module.exports = swaggerSpec;
