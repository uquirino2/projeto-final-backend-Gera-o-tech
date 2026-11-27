const { Router } = require('express');
const productController = require('../controllers/productController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = Router();

// A rota `/search` deve vir antes de `/:id` para evitar colisão de parâmetros
router.get('/search', productController.search);
router.get('/:id', productController.getById);
router.post('/', authMiddleware, productController.create);
router.put('/:id', authMiddleware, productController.update);
router.delete('/:id', authMiddleware, productController.remove);

module.exports = router;
