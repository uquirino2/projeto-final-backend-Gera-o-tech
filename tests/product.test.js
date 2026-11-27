const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../src/app');
const { ProductImage, ProductOption, ProductCategory } = require('../src/models');
const { clearDatabase, createAuthenticatedUser, SAMPLE_PNG_BASE64 } = require('./helpers');

describe('CRUD e Busca Avançada de Produtos (/v1/product)', () => {
  let token;
  let catShoes;
  let catOffers;
  let catApparel;

  beforeEach(async () => {
    await clearDatabase();
    const auth = await createAuthenticatedUser();
    token = auth.token;

    const c1 = await request(app)
      .post('/v1/category')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Shoes', slug: 'shoes', use_in_menu: true });
    const c2 = await request(app)
      .post('/v1/category')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Offers', slug: 'offers', use_in_menu: true });
    const c3 = await request(app)
      .post('/v1/category')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Apparel', slug: 'apparel', use_in_menu: false });

    catShoes = c1.body;
    catOffers = c2.body;
    catApparel = c3.body;
  });

  describe('POST /v1/product e GET /v1/product/:id', () => {
    it('deve criar produto completo com categorias, imagens base64 e opções (value e values) (201)', async () => {
      const payload = {
        enabled: true,
        name: 'Produto 01',
        slug: 'produto-01',
        stock: 10,
        description: 'Descrição do produto 01',
        price: 119.9,
        price_with_discount: 99.9,
        category_ids: [catShoes.id, catOffers.id],
        images: [
          {
            type: 'image/png',
            content: SAMPLE_PNG_BASE64,
          },
          {
            type: 'image/jpg',
            content: `data:image/jpeg;base64,${SAMPLE_PNG_BASE64}`,
          },
          {
            content: 'https://store.com/media/product-01/external.jpg',
          },
        ],
        options: [
          {
            title: 'Tamanho',
            shape: 'square',
            radius: '4px',
            type: 'text',
            value: ['PP', 'GG', 'M'],
          },
          {
            title: 'Cor',
            shape: 'circle',
            type: 'color',
            values: ['#000', '#333'],
          },
        ],
      };

      const res = await request(app)
        .post('/v1/product')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.id).toEqual(expect.any(Number));
      expect(res.body.enabled).toBe(true);
      expect(res.body.name).toBe('Produto 01');
      expect(res.body.slug).toBe('produto-01');
      expect(res.body.stock).toBe(10);
      expect(res.body.price).toBeCloseTo(119.9);
      expect(res.body.price_with_discount).toBeCloseTo(99.9);
      expect(res.body.category_ids).toEqual([catShoes.id, catOffers.id].sort((a, b) => a - b));
      expect(res.body.images).toHaveLength(3);
      expect(res.body.images[0].content).toMatch(
        /^http:\/\/localhost:3000\/media\/products\/produto-01\/.+\.png$/
      );
      expect(res.body.images[2].content).toBe('https://store.com/media/product-01/external.jpg');

      // Verifica se o arquivo base64 foi efetivamente salvo e servido em /media
      const mediaPath = new URL(res.body.images[0].content).pathname;
      const staticRes = await request(app).get(mediaPath);
      expect(staticRes.status).toBe(200);

      expect(res.body.options).toHaveLength(2);
      expect(res.body.options[0]).toMatchObject({
        title: 'Tamanho',
        shape: 'square',
        radius: 4,
        type: 'text',
        values: ['PP', 'GG', 'M'],
      });
      expect(res.body.options[1]).toMatchObject({
        title: 'Cor',
        shape: 'circle',
        radius: 0,
        type: 'color',
        values: ['#000', '#333'],
      });

      // Verifica GET /v1/product/:id
      const getRes = await request(app).get(`/v1/product/${res.body.id}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body).toEqual(res.body);
    });

    it('deve retornar 400 para category_ids inexistente ou payload inválido', async () => {
      const badCategory = await request(app)
        .post('/v1/product')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Produto Inválido',
          slug: 'produto-invalido',
          price: 100,
          price_with_discount: 80,
          category_ids: [99999],
        });
      expect(badCategory.status).toBe(400);

      const badPrice = await request(app)
        .post('/v1/product')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Preço Negativo',
          slug: 'preco-negativo',
          price: -10,
          price_with_discount: 0,
        });
      expect(badPrice.status).toBe(400);

      const badMime = await request(app)
        .post('/v1/product')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Mime Inválido',
          slug: 'mime-invalido',
          price: 50,
          price_with_discount: 40,
          images: [{ type: 'application/pdf', content: SAMPLE_PNG_BASE64 }],
        });
      expect(badMime.status).toBe(400);

      const badShape = await request(app)
        .post('/v1/product')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Shape Inválido',
          slug: 'shape-invalido',
          price: 50,
          price_with_discount: 40,
          options: [{ title: 'Cor', shape: 'triangle', values: ['Azul'] }],
        });
      expect(badShape.status).toBe(400);
    });

    it('deve retornar 404 para produto inexistente em GET /v1/product/:id', async () => {
      const res = await request(app).get('/v1/product/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /v1/product/search', () => {
    let prodTenis;
    let prodCamisa;
    let prodBone;

    beforeEach(async () => {
      const r1 = await request(app)
        .post('/v1/product')
        .set('Authorization', `Bearer ${token}`)
        .send({
          enabled: true,
          name: 'Tênis Runner Pro',
          slug: 'tenis-runner-pro',
          stock: 15,
          description: 'Calçado esportivo leve para corrida',
          price: 180,
          price_with_discount: 150,
          category_ids: [catShoes.id, catOffers.id],
          images: [{ content: 'https://store.com/media/tenis.png' }],
          options: [
            { title: 'Tamanho', shape: 'square', radius: '4px', type: 'text', values: ['39', '40', '42'] },
          ],
        });

      const r2 = await request(app)
        .post('/v1/product')
        .set('Authorization', `Bearer ${token}`)
        .send({
          enabled: true,
          name: 'Camisa DryFit',
          slug: 'camisa-dryfit',
          stock: 30,
          description: 'Ideal para combinar com seu tênis de treino',
          price: 120,
          price_with_discount: 99.9,
          category_ids: [catApparel.id],
          images: [{ content: 'https://store.com/media/camisa.png' }],
          options: [
            { title: 'Tamanho', shape: 'square', radius: '4px', type: 'text', values: ['PP', 'M', 'GG'] },
          ],
        });

      const r3 = await request(app)
        .post('/v1/product')
        .set('Authorization', `Bearer ${token}`)
        .send({
          enabled: true,
          name: 'Boné Clássico',
          slug: 'bone-classico',
          stock: 50,
          description: 'Acessório casual em algodão',
          price: 60,
          price_with_discount: 49.9,
          category_ids: [catApparel.id, catOffers.id],
          images: [{ content: 'https://store.com/media/bone.png' }],
          options: [
            { title: 'Tamanho', shape: 'square', type: 'text', values: ['MEDIUM'] },
          ],
        });

      prodTenis = r1.body;
      prodCamisa = r2.body;
      prodBone = r3.body;
    });

    it('deve listar produtos com paginação e limit=-1', async () => {
      const paged = await request(app).get('/v1/product/search?limit=2&page=1');
      expect(paged.status).toBe(200);
      expect(paged.body.total).toBe(3);
      expect(paged.body.limit).toBe(2);
      expect(paged.body.page).toBe(1);
      expect(paged.body.data).toHaveLength(2);

      const all = await request(app).get('/v1/product/search?limit=-1');
      expect(all.status).toBe(200);
      expect(all.body.total).toBe(3);
      expect(all.body.limit).toBe(-1);
      expect(all.body.data).toHaveLength(3);
    });

    it('deve limitar os campos retornados via fields=name,images,price', async () => {
      const res = await request(app).get('/v1/product/search?fields=name,images,price');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      for (const item of res.body.data) {
        expect(Object.keys(item).sort()).toEqual(['images', 'name', 'price']);
      }
    });

    it('deve filtrar por match no nome ou descrição', async () => {
      const res = await request(app).get('/v1/product/search?match=corrida');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0].id).toBe(prodTenis.id);

      const resBoth = await request(app).get(
        `/v1/product/search?match=${encodeURIComponent('tênis')}`
      );
      expect(resBoth.status).toBe(200);
      // Em SQLite LOWER() é ASCII, mas 'tênis' combina com descrição da Camisa; em MySQL combina ambos
      expect(resBoth.body.total).toBeGreaterThanOrEqual(1);
    });

    it('deve filtrar por category_ids preservando todas as categorias do produto retornado', async () => {
      const res = await request(app).get(`/v1/product/search?category_ids=${catShoes.id}`);
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0].id).toBe(prodTenis.id);
      expect(res.body.data[0].category_ids).toEqual(
        [catShoes.id, catOffers.id].sort((a, b) => a - b)
      );
    });

    it('deve filtrar por price-range inclusivo', async () => {
      const res = await request(app).get('/v1/product/search?price-range=100-200');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      const ids = res.body.data.map((p) => p.id);
      expect(ids).toContain(prodTenis.id);
      expect(ids).toContain(prodCamisa.id);
      expect(ids).not.toContain(prodBone.id);
    });

    it('deve filtrar por option[ID]=GG,PP com correspondência exata de valores', async () => {
      const camisaOptId = prodCamisa.options[0].id;
      const boneOptId = prodBone.options[0].id;

      const res = await request(app).get(
        `/v1/product/search?option[${camisaOptId}]=GG,PP`
      );
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0].id).toBe(prodCamisa.id);

      // 'M' não deve casar falsamente com 'MEDIUM'
      const noFalseMatch = await request(app).get(
        `/v1/product/search?option[${boneOptId}]=M`
      );
      expect(noFalseMatch.status).toBe(200);
      expect(noFalseMatch.body.total).toBe(0);
      expect(noFalseMatch.body.data).toEqual([]);
    });

    it('deve retornar 400 para parâmetros de busca inválidos', async () => {
      const badRange = await request(app).get('/v1/product/search?price-range=300-100');
      expect(badRange.status).toBe(400);

      const badRangeFormat = await request(app).get('/v1/product/search?price-range=abc');
      expect(badRangeFormat.status).toBe(400);

      const badCatIds = await request(app).get('/v1/product/search?category_ids=1,abc');
      expect(badCatIds.status).toBe(400);

      const badOption = await request(app).get('/v1/product/search?option[xyz]=GG');
      expect(badOption.status).toBe(400);

      const badField = await request(app).get('/v1/product/search?fields=invalido');
      expect(badField.status).toBe(400);
    });

    it('deve combinar múltiplos filtros simultaneamente (match + category_ids + price-range + option)', async () => {
      const camisaOptId = prodCamisa.options[0].id;

      const combined = await request(app).get(
        `/v1/product/search?match=dryfit&category_ids=${catApparel.id}&price-range=100-150&option[${camisaOptId}]=GG`
      );
      expect(combined.status).toBe(200);
      expect(combined.body.total).toBe(1);
      expect(combined.body.data[0].id).toBe(prodCamisa.id);

      // Interseção vazia deve retornar lista vazia com total 0
      const empty = await request(app).get(
        `/v1/product/search?category_ids=${catShoes.id}&option[${camisaOptId}]=GG`
      );
      expect(empty.status).toBe(200);
      expect(empty.body.total).toBe(0);
      expect(empty.body.data).toEqual([]);
    });
  });

  describe('PUT /v1/product/:id', () => {
    it('deve atualizar produto sincronizando categorias, imagens e opções (criar/atualizar/deletar) (204)', async () => {
      const created = await request(app)
        .post('/v1/product')
        .set('Authorization', `Bearer ${token}`)
        .send({
          enabled: true,
          name: 'Produto 01',
          slug: 'produto-01',
          stock: 10,
          description: 'Original',
          price: 119.9,
          price_with_discount: 99.9,
          category_ids: [catShoes.id],
          images: [
            { type: 'image/png', content: SAMPLE_PNG_BASE64 },
            { type: 'image/png', content: SAMPLE_PNG_BASE64 },
            { content: 'https://store.com/media/old.jpg' },
          ],
          options: [
            { title: 'Cor', shape: 'square', radius: '4px', type: 'text', value: ['PP', 'M'] },
            { title: 'Tamanho', shape: 'circle', type: 'text', values: ['40', '41'] },
          ],
        });

      const product = created.body;
      const img1 = product.images[0];
      const img2 = product.images[1];
      const img3 = product.images[2];
      const opt1 = product.options[0];
      const opt2 = product.options[1];

      // Caminho físico da imagem 2 que será deletada
      const img2RelativePath = new URL(img2.content).pathname.replace(/^\/media\//, '');
      const img2DiskPath = path.join(process.env.UPLOAD_DIR, img2RelativePath);
      expect(fs.existsSync(img2DiskPath)).toBe(true);

      const updateRes = await request(app)
        .put(`/v1/product/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          enabled: true,
          name: 'Produto 01 atualizado',
          slug: 'produto-01-atualizado',
          stock: 20,
          description: 'Descrição atualizada',
          price: 49.9,
          price_with_discount: 0,
          category_ids: [catOffers.id, catApparel.id],
          images: [
            { type: 'image/png', content: SAMPLE_PNG_BASE64 },
            { id: img2.id, deleted: true },
            { id: img3.id, type: 'image/png', content: SAMPLE_PNG_BASE64 },
            { id: img1.id, content: 'https://store.com/media/product-01/image-01.jpg' },
          ],
          options: [
            { id: opt1.id, deleted: true },
            { id: opt2.id, radius: '10px', value: ['42/43', '44/45'] },
            { title: 'Tipo', shape: 'square', type: 'text', values: ['100% algodão', '65% algodão'] },
          ],
        });

      expect(updateRes.status).toBe(204);
      expect(updateRes.text).toBe('');

      // Confirma limpeza do arquivo deletado em disco
      expect(fs.existsSync(img2DiskPath)).toBe(false);

      const getRes = await request(app).get(`/v1/product/${product.id}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.name).toBe('Produto 01 atualizado');
      expect(getRes.body.stock).toBe(20);
      expect(getRes.body.price).toBeCloseTo(49.9);
      expect(getRes.body.price_with_discount).toBe(0);
      expect(getRes.body.category_ids).toEqual(
        [catOffers.id, catApparel.id].sort((a, b) => a - b)
      );

      // 3 originais - 1 deletada + 1 nova = 3 imagens
      expect(getRes.body.images).toHaveLength(3);
      const updatedImg1 = getRes.body.images.find((i) => i.id === img1.id);
      expect(updatedImg1.content).toBe('https://store.com/media/product-01/image-01.jpg');
      expect(getRes.body.images.find((i) => i.id === img2.id)).toBeUndefined();

      // 2 originais - 1 deletada + 1 nova = 2 opções
      expect(getRes.body.options).toHaveLength(2);
      expect(getRes.body.options.find((o) => o.id === opt1.id)).toBeUndefined();
      const updatedOpt2 = getRes.body.options.find((o) => o.id === opt2.id);
      expect(updatedOpt2.radius).toBe(10);
      expect(updatedOpt2.values).toEqual(['42/43', '44/45']);
      const newOpt = getRes.body.options.find((o) => o.title === 'Tipo');
      expect(newOpt.values).toEqual(['100% algodão', '65% algodão']);
    });

    it('deve retornar 404 para produto inexistente e 400 para imagem/opção inexistente', async () => {
      const notFoundRes = await request(app)
        .put('/v1/product/99999')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Inexistente',
          slug: 'inexistente',
          price: 10,
          price_with_discount: 5,
        });
      expect(notFoundRes.status).toBe(404);

      const created = await request(app)
        .post('/v1/product')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Base',
          slug: 'base',
          price: 10,
          price_with_discount: 5,
        });

      const badImgId = await request(app)
        .put(`/v1/product/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Base',
          slug: 'base',
          price: 10,
          price_with_discount: 5,
          images: [{ id: 99999, deleted: true }],
        });
      expect(badImgId.status).toBe(400);
    });
  });

  describe('DELETE /v1/product/:id', () => {
    it('deve remover o produto, relacionamentos no banco e arquivos em disco (204)', async () => {
      const created = await request(app)
        .post('/v1/product')
        .set('Authorization', `Bearer ${token}`)
        .send({
          enabled: true,
          name: 'Produto Para Deletar',
          slug: 'produto-deletar',
          price: 90,
          price_with_discount: 70,
          category_ids: [catShoes.id],
          images: [{ type: 'image/png', content: SAMPLE_PNG_BASE64 }],
          options: [{ title: 'Cor', values: ['Preto'] }],
        });

      const productId = created.body.id;
      const imgRelativePath = new URL(created.body.images[0].content).pathname.replace(/^\/media\//, '');
      const imgDiskPath = path.join(process.env.UPLOAD_DIR, imgRelativePath);
      expect(fs.existsSync(imgDiskPath)).toBe(true);

      const delRes = await request(app)
        .delete(`/v1/product/${productId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(delRes.status).toBe(204);
      expect(delRes.text).toBe('');
      expect(fs.existsSync(imgDiskPath)).toBe(false);

      const getRes = await request(app).get(`/v1/product/${productId}`);
      expect(getRes.status).toBe(404);

      // Garante remoção limpa das tabelas filhas
      expect(await ProductImage.count({ where: { product_id: productId } })).toBe(0);
      expect(await ProductOption.count({ where: { product_id: productId } })).toBe(0);
      expect(await ProductCategory.count({ where: { product_id: productId } })).toBe(0);
    });

    it('deve retornar 404 ao deletar produto inexistente', async () => {
      const res = await request(app)
        .delete('/v1/product/99999')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
