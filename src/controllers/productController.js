const productService = require('../services/productService');

/**
 * Controller responsável pelos endpoints de produtos (`/v1/product`).
 */

async function search(req, res, next) {
  try {
    const result = await productService.searchProducts(req.query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function getById(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.id);
    return res.status(200).json(product);
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const product = await productService.createProduct(req.body);
    return res.status(201).json(product);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    await productService.updateProduct(req.params.id, req.body);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    await productService.deleteProduct(req.params.id);
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
