const { Router } = require('express');
const categoryController = require('../controllers/categoryController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = Router();

// A rota `/search` deve vir antes de `/:id` para evitar colisão de parâmetros
router.get('/search', categoryController.search);
router.get('/:id', categoryController.getById);
router.post('/', authMiddleware, categoryController.create);
router.put('/:id', authMiddleware, categoryController.update);
router.delete('/:id', authMiddleware, categoryController.remove);

module.exports = router;
