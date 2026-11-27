const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const { User } = require('../src/models');
const { clearDatabase, createAuthenticatedUser } = require('./helpers');

describe('CRUD de Usuários (/v1/user)', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /v1/user', () => {
    it('deve cadastrar um usuário com senha criptografada via bcrypt (201)', async () => {
      const payload = {
        firstname: 'Maria',
        surname: 'Oliveira',
        email: 'maria@mail.com',
        password: 'Password@123',
        confirmPassword: 'Password@123',
      };

      const res = await request(app).post('/v1/user').send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(Number),
        firstname: 'Maria',
        surname: 'Oliveira',
        email: 'maria@mail.com',
      });
      expect(res.body).not.toHaveProperty('password');

      // Confirma persistência do hash bcrypt no banco
      const storedUser = await User.findByPk(res.body.id);
      expect(storedUser.password).not.toBe('Password@123');
      const matches = await bcrypt.compare('Password@123', storedUser.password);
      expect(matches).toBe(true);
    });

    it('deve retornar 400 quando password e confirmPassword forem diferentes', async () => {
      const res = await request(app).post('/v1/user').send({
        firstname: 'Maria',
        surname: 'Oliveira',
        email: 'maria@mail.com',
        password: '123',
        confirmPassword: '456',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('deve retornar 400 para e-mail inválido ou duplicado', async () => {
      const invalidRes = await request(app).post('/v1/user').send({
        firstname: 'Maria',
        surname: 'Oliveira',
        email: 'email-invalido',
        password: '123',
        confirmPassword: '123',
      });
      expect(invalidRes.status).toBe(400);

      await createAuthenticatedUser({ email: 'duplicado@mail.com' });

      const duplicateRes = await request(app).post('/v1/user').send({
        firstname: 'Outro',
        surname: 'Usuario',
        email: 'duplicado@mail.com',
        password: '123',
        confirmPassword: '123',
      });
      expect(duplicateRes.status).toBe(400);
    });

    it('deve retornar 400 quando faltarem campos obrigatórios', async () => {
      const res = await request(app).post('/v1/user').send({ firstname: 'Só Nome' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/user/:id', () => {
    it('deve retornar os dados públicos do usuário pelo ID (200)', async () => {
      const { user } = await createAuthenticatedUser({
        firstname: 'Carlos',
        surname: 'Santos',
        email: 'carlos@mail.com',
      });

      const res = await request(app).get(`/v1/user/${user.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: user.id,
        firstname: 'Carlos',
        surname: 'Santos',
        email: 'carlos@mail.com',
      });
      expect(res.body).not.toHaveProperty('password');
    });

    it('deve retornar 404 quando o usuário não existir ou o ID for inválido', async () => {
      const notFoundRes = await request(app).get('/v1/user/99999');
      expect(notFoundRes.status).toBe(404);

      const invalidIdRes = await request(app).get('/v1/user/abc');
      expect(invalidIdRes.status).toBe(404);
    });
  });

  describe('PUT /v1/user/:id', () => {
    it('deve atualizar um usuário autenticado e retornar 204 sem corpo', async () => {
      const { user, token } = await createAuthenticatedUser({ email: 'antigo@mail.com' });

      const res = await request(app)
        .put(`/v1/user/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstname: 'Novo Nome',
          surname: 'Novo Sobrenome',
          email: 'novo@mail.com',
        });

      expect(res.status).toBe(204);
      expect(res.text).toBe('');

      const getRes = await request(app).get(`/v1/user/${user.id}`);
      expect(getRes.body).toEqual({
        id: user.id,
        firstname: 'Novo Nome',
        surname: 'Novo Sobrenome',
        email: 'novo@mail.com',
      });
    });

    it('deve retornar 400 ao tentar atualizar para um e-mail já usado por outro usuário', async () => {
      const first = await createAuthenticatedUser({ email: 'primeiro@mail.com' });
      const second = await createAuthenticatedUser({ email: 'segundo@mail.com' });

      const res = await request(app)
        .put(`/v1/user/${second.user.id}`)
        .set('Authorization', `Bearer ${second.token}`)
        .send({
          firstname: 'Segundo',
          surname: 'User',
          email: first.user.email,
        });

      expect(res.status).toBe(400);
    });

    it('deve retornar 404 ao tentar atualizar usuário inexistente', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await request(app)
        .put('/v1/user/99999')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstname: 'Nome',
          surname: 'Sobrenome',
          email: 'qualquer@mail.com',
        });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /v1/user/:id', () => {
    it('deve deletar um usuário autenticado e retornar 204 sem corpo', async () => {
      const { user, token } = await createAuthenticatedUser();

      const res = await request(app)
        .delete(`/v1/user/${user.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
      expect(res.text).toBe('');

      const getRes = await request(app).get(`/v1/user/${user.id}`);
      expect(getRes.status).toBe(404);
    });

    it('deve retornar 404 ao tentar deletar usuário inexistente', async () => {
      const { token } = await createAuthenticatedUser();

      const res = await request(app)
        .delete('/v1/user/99999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
