const categoryService = require('../services/categoryService');

/**
 * Controller responsável pelos endpoints de categorias (`/v1/category`).
 */

async function search(req, res, next) {
  try {
    const result = await categoryService.searchCategories(req.query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function getById(req, res, next) {
  try {
    const category = await categoryService.getCategoryById(req.params.id);
    return res.status(200).json(category);
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const category = await categoryService.createCategory(req.body);
    return res.status(201).json(category);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    await categoryService.updateCategory(req.params.id, req.body);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    await categoryService.deleteCategory(req.params.id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  search,
  getById,
  create,
  update,
  remove,
};
