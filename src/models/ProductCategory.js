const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Modelo Sequelize para a tabela pivô `product_categories`.
 * Estabelece o relacionamento N:N entre produtos e categorias.
 */
const ProductCategory = sequelize.define(
  'ProductCategory',
  {
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'products',
        key: 'id',
      },
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'categories',
        key: 'id',
      },
    },
  },
  {
    tableName: 'product_categories',
    timestamps: false,
    underscored: true,
  }
);

module.exports = ProductCategory;
