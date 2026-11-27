const sequelize = require('../config/database');
const User = require('./User');
const Category = require('./Category');
const Product = require('./Product');
const ProductImage = require('./ProductImage');
const ProductOption = require('./ProductOption');
const ProductCategory = require('./ProductCategory');

/**
 * Definição das associações entre modelos (1:N e N:N).
 */
Product.hasMany(ProductImage, {
  foreignKey: 'product_id',
  as: 'images',
  onDelete: 'CASCADE',
  hooks: true,
});
ProductImage.belongsTo(Product, {
  foreignKey: 'product_id',
  as: 'product',
});

Product.hasMany(ProductOption, {
  foreignKey: 'product_id',
  as: 'options',
  onDelete: 'CASCADE',
  hooks: true,
});
ProductOption.belongsTo(Product, {
  foreignKey: 'product_id',
  as: 'product',
});

Product.belongsToMany(Category, {
  through: ProductCategory,
  foreignKey: 'product_id',
  otherKey: 'category_id',
  as: 'categories',
  onDelete: 'CASCADE',
});
Category.belongsToMany(Product, {
  through: ProductCategory,
  foreignKey: 'category_id',
  otherKey: 'product_id',
  as: 'products',
  onDelete: 'CASCADE',
});

Product.hasMany(ProductCategory, {
  foreignKey: 'product_id',
  as: 'productCategories',
  onDelete: 'CASCADE',
});
ProductCategory.belongsTo(Product, {
  foreignKey: 'product_id',
  as: 'product',
});
Category.hasMany(ProductCategory, {
  foreignKey: 'category_id',
  as: 'productCategories',
  onDelete: 'CASCADE',
});
ProductCategory.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'category',
});

module.exports = {
  sequelize,
  User,
  Category,
  Product,
  ProductImage,
  ProductOption,
  ProductCategory,
};
