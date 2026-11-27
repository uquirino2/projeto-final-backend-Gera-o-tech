const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Modelo Sequelize para a tabela `product_images`.
 * Armazena os caminhos relativos (ou URLs) das imagens vinculadas a um produto.
 */
const ProductImage = sequelize.define(
  'ProductImage',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    path: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: 'product_images',
    timestamps: false,
    underscored: true,
  }
);

module.exports = ProductImage;
