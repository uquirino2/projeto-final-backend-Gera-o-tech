const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { clearDatabase, createAuthenticatedUser } = require('./helpers');

describe('Autenticação JWT, Swagger e Infraestrutura', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /v1/user/token', () => {
    it('deve gerar um token JWT válido com credenciais corretas (200)', async () => {
      const { user, credentials } = await createAuthenticatedUser({
        email: 'login@mail.com',
      });

      const res = await request(app).post('/v1/user/token').send(credentials);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');

      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded.id).toBe(user.id);
      expect(decoded.email).toBe('login@mail.com');
    });

    it('deve retornar 400 quando a senha estiver incorreta', async () => {
      const { credentials } = await createAuthenticatedUser({ email: 'wrongpass@mail.com' });

      const res = await request(app).post('/v1/user/token').send({
        email: credentials.email,
        password: 'wrong-password',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('deve retornar 400 quando o usuário não existir', async () => {
      const res = await request(app).post('/v1/user/token').send({
        email: 'inexistente@mail.com',
        password: '123@123',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('deve retornar 400 quando email ou password não forem enviados', async () => {
      const res = await request(app).post('/v1/user/token').send({ email: 'a@b.com' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Proteção de rotas com Bearer JWT (401 Unauthorized)', () => {
    const protectedEndpoints = [
      { method: 'put', path: '/v1/user/1' },
      { method: 'delete', path: '/v1/user/1' },
      { method: 'post', path: '/v1/category' },
      { method: 'put', path: '/v1/category/1' },
      { method: 'delete', path: '/v1/category/1' },
      { method: 'post', path: '/v1/product' },
      { method: 'put', path: '/v1/product/1' },
      { method: 'delete', path: '/v1/product/1' },
    ];

    it.each(protectedEndpoints)(
      'deve retornar 401 em $method $path sem cabeçalho Authorization',
      async ({ method, path }) => {
        const res = await request(app)[method](path).send({});
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error');
      }
    );

    it('deve retornar 401 para formato de cabeçalho inválido (sem Bearer)', async () => {
      const res = await request(app)
        .post('/v1/category')
        .set('Authorization', 'Basic abcdef')
        .send({ name: 'Shoes', slug: 'shoes' });

      expect(res.status).toBe(401);
    });

    it('deve retornar 401 para token com assinatura inválida', async () => {
      const invalidToken = jwt.sign({ id: 1 }, 'wrong_secret');
      const res = await request(app)
        .post('/v1/category')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({ name: 'Shoes', slug: 'shoes' });

      expect(res.status).toBe(401);
    });

    it('deve retornar 401 para token expirado', async () => {
      const expiredToken = jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: '-10s' });
      const res = await request(app)
        .post('/v1/category')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ name: 'Shoes', slug: 'shoes' });

      expect(res.status).toBe(401);
    });
  });

  describe('Healthcheck, Swagger e Tratamento Global de Erros', () => {
    it('deve responder 200 em GET /health', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('deve expor a especificação OpenAPI 3.0 em GET /api-docs.json', async () => {
      const res = await request(app).get('/api-docs.json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.3');
      expect(res.body.paths).toHaveProperty('/v1/user/token');
      expect(res.body.paths).toHaveProperty('/v1/category/search');
      expect(res.body.paths).toHaveProperty('/v1/product/search');
    });

    it('deve retornar 404 para rota inexistente', async () => {
      const res = await request(app).get('/v1/rota-que-nao-existe');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('deve retornar 400 para JSON malformado no corpo da requisição', async () => {
      const res = await request(app)
        .post('/v1/user')
        .set('Content-Type', 'application/json')
        .send('{ "firstname": "quebrado" ');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('deve mapear erros do Sequelize e erros inesperados no errorHandler', () => {
      const { errorHandler } = require('../src/middleware/errorHandler');
      const createMockRes = () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res;
      };

      // SequelizeUniqueConstraintError
      const resUnique = createMockRes();
      errorHandler(
        { name: 'SequelizeUniqueConstraintError', errors: [{ path: 'email' }] },
        {},
        resUnique,
        jest.fn()
      );
      expect(resUnique.status).toHaveBeenCalledWith(400);

      // SequelizeValidationError
      const resVal = createMockRes();
      errorHandler(
        { name: 'SequelizeValidationError', errors: [{ message: 'Campo inválido' }] },
        {},
        resVal,
        jest.fn()
      );
      expect(resVal.status).toHaveBeenCalledWith(400);

      // SequelizeForeignKeyConstraintError
      const resFk = createMockRes();
      errorHandler({ name: 'SequelizeForeignKeyConstraintError' }, {}, resFk, jest.fn());
      expect(resFk.status).toHaveBeenCalledWith(400);

      // Erro inesperado (500)
      const res500 = createMockRes();
      errorHandler(new Error('Falha inesperada'), {}, res500, jest.fn());
      expect(res500.status).toHaveBeenCalledWith(500);
    });
  });
});
