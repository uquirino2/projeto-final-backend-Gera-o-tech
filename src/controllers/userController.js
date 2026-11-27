const userService = require('../services/userService');

/**
 * Controller responsável pelos endpoints de usuários e autenticação (`/v1/user`).
 */

async function getById(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);
    return res.status(200).json(user);
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const user = await userService.createUser(req.body);
    return res.status(201).json(user);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    await userService.updateUser(req.params.id, req.body);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    await userService.deleteUser(req.params.id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function generateToken(req, res, next) {
  try {
    const result = await userService.generateToken(req.body);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getById,
  create,
  update,
  remove,
  generateToken,
};
