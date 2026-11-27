const request = require('supertest');
const app = require('../src/app');
const { clearDatabase, createAuthenticatedUser } = require('./helpers');

describe('CRUD e Busca de Categorias (/v1/category)', () => {
  let token;

  beforeEach(async () => {
    await clearDatabase();
    const auth = await createAuthenticatedUser();
    token = auth.token;
  });

  describe('POST /v1/category', () => {
    it('deve criar uma nova categoria autenticada (201)', async () => {
      const res = await request(app)
        .post('/v1/category')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Shoes',
          slug: 'shoes',
          use_in_menu: true,
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(Number),
        name: 'Shoes',
        slug: 'shoes',
        use_in_menu: true,
      });
    });

    it('deve usar false como valor padrão de use_in_menu quando omitido', async () => {
      const res = await request(app)
        .post('/v1/category')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Black Friday', slug: 'black-friday' });

      expect(res.status).toBe(201);
      expect(res.body.use_in_menu).toBe(false);
    });

    it('deve retornar 400 quando dados obrigatórios faltarem ou forem inválidos', async () => {
      const resMissing = await request(app)
        .post('/v1/category')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Sem Slug' });
      expect(resMissing.status).toBe(400);

      const resBadBool = await request(app)
        .post('/v1/category')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Shoes', slug: 'shoes', use_in_menu: 'sim' });
      expect(resBadBool.status).toBe(400);
    });
  });

  describe('GET /v1/category/:id', () => {
    it('deve retornar a categoria pelo ID (200)', async () => {
      const created = await request(app)
        .post('/v1/category')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Offers', slug: 'offers', use_in_menu: true });

      const res = await request(app).get(`/v1/category/${created.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: created.body.id,
        name: 'Offers',
        slug: 'offers',
        use_in_menu: true,
      });
    });

    it('deve retornar 404 para categoria inexistente', async () => {
      const res = await request(app).get('/v1/category/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /v1/category/search', () => {
    beforeEach(async () => {
      const items = [
        { name: 'Shoes', slug: 'shoes', use_in_menu: true },
        { name: 'Offers', slug: 'offers', use_in_menu: true },
        { name: 'Black Friday', slug: 'black-friday', use_in_menu: false },
        { name: 'Accessories', slug: 'accessories', use_in_menu: true },
        { name: 'Outlet', slug: 'outlet', use_in_menu: false },
      ];
      for (const item of items) {
        await request(app)
          .post('/v1/category')
          .set('Authorization', `Bearer ${token}`)
          .send(item);
      }
    });

    it('deve listar categorias com paginação padrão (limit=12, page=1)', async () => {
      const res = await request(app).get('/v1/category/search');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(5);
      expect(res.body.limit).toBe(12);
      expect(res.body.page).toBe(1);
      expect(res.body.data).toHaveLength(5);
    });

    it('deve paginar corretamente com limit e page', async () => {
      const res = await request(app).get('/v1/category/search?limit=2&page=2');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(5);
      expect(res.body.limit).toBe(2);
      expect(res.body.page).toBe(2);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].slug).toBe('black-friday');
      expect(res.body.data[1].slug).toBe('accessories');
    });

    it('deve retornar todos os itens quando limit=-1 (ignorando page)', async () => {
      const res = await request(app).get('/v1/category/search?limit=-1&page=3');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(5);
      expect(res.body.limit).toBe(-1);
      expect(res.body.page).toBe(1);
      expect(res.body.data).toHaveLength(5);
    });

    it('deve filtrar por fields e use_in_menu', async () => {
      const res = await request(app).get(
        '/v1/category/search?use_in_menu=true&fields=name,slug'
      );

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(3);
      expect(res.body.data).toHaveLength(3);
      for (const item of res.body.data) {
        expect(Object.keys(item).sort()).toEqual(['name', 'slug']);
      }
    });

    it('deve retornar 400 para parâmetros de consulta inválidos', async () => {
      const badLimit = await request(app).get('/v1/category/search?limit=0');
      expect(badLimit.status).toBe(400);

      const badPage = await request(app).get('/v1/category/search?page=-2');
      expect(badPage.status).toBe(400);

      const badFields = await request(app).get('/v1/category/search?fields=nao_existe');
      expect(badFields.status).toBe(400);

      const badMenu = await request(app).get('/v1/category/search?use_in_menu=talvez');
      expect(badMenu.status).toBe(400);
    });
  });

  describe('PUT /v1/category/:id e DELETE /v1/category/:id', () => {
    it('deve atualizar uma categoria e retornar 204 sem corpo', async () => {
      const created = await request(app)
        .post('/v1/category')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Shoes', slug: 'shoes', use_in_menu: false });

      const updateRes = await request(app)
        .put(`/v1/category/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Sneakers', slug: 'sneakers', use_in_menu: true });

      expect(updateRes.status).toBe(204);
      expect(updateRes.text).toBe('');

      const getRes = await request(app).get(`/v1/category/${created.body.id}`);
      expect(getRes.body).toEqual({
        id: created.body.id,
        name: 'Sneakers',
        slug: 'sneakers',
        use_in_menu: true,
      });
    });

    it('deve retornar 404 ao atualizar ou deletar categoria inexistente', async () => {
      const putRes = await request(app)
        .put('/v1/category/99999')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'X', slug: 'x' });
      expect(putRes.status).toBe(404);

      const delRes = await request(app)
        .delete('/v1/category/99999')
        .set('Authorization', `Bearer ${token}`);
      expect(delRes.status).toBe(404);
    });

    it('deve deletar uma categoria e retornar 204 sem corpo', async () => {
      const created = await request(app)
        .post('/v1/category')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Temporária', slug: 'temporaria' });

      const delRes = await request(app)
        .delete(`/v1/category/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(delRes.status).toBe(204);
      expect(delRes.text).toBe('');

      const getRes = await request(app).get(`/v1/category/${created.body.id}`);
      expect(getRes.status).toBe(404);
    });
  });
});
