const { Router } = require('express');
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = Router();

// Geração de token JWT (login)
router.post('/token', userController.generateToken);

// CRUD de usuários
router.get('/:id', userController.getById);
router.post('/', userController.create);
router.put('/:id', authMiddleware, userController.update);
router.delete('/:id', authMiddleware, userController.remove);

module.exports = router;
