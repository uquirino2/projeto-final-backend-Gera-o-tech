'use strict';

const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const passwordHash = await bcrypt.hash('123@123', 10);

    await queryInterface.bulkInsert('users', [
      {
        firstname: 'Admin',
        surname: 'Digital Store',
        email: 'admin@mail.com',
        password: passwordHash,
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('categories', [
      {
        name: 'Shoes',
        slug: 'shoes',
        use_in_menu: true,
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Offers',
        slug: 'offers',
        use_in_menu: true,
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Black Friday',
        slug: 'black-friday',
        use_in_menu: false,
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('products', [
      {
        enabled: true,
        name: 'Tênis Nike Air Max',
        slug: 'tenis-nike-air-max',
        use_in_menu: true,
        stock: 25,
        description: 'Tênis esportivo confortável com amortecimento Air Max.',
        price: 399.9,
        price_with_discount: 299.9,
        created_at: now,
        updated_at: now,
      },
      {
        enabled: true,
        name: 'Tênis Adidas Ultraboost',
        slug: 'tenis-adidas-ultraboost',
        use_in_menu: true,
        stock: 15,
        description: 'Tênis para corrida de alto desempenho com tecnologia Boost.',
        price: 549.9,
        price_with_discount: 449.9,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('products', null, {});
    await queryInterface.bulkDelete('categories', null, {});
    await queryInterface.bulkDelete('users', { email: 'admin@mail.com' }, {});
  },
};
