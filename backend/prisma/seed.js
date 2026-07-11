const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const slugify = (text) => text.toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

async function main() {
  console.log('Seeding database started...');

  // 1. Create Default Store Settings
  const storeSettings = [
    { key: 'store_name', value: 'SHRI SIDDHIVINAYAK TRADING' },
    { key: 'logo_url', value: '' },
    { key: 'banner_url', value: '' },
    { key: 'phone_number', value: '+919999999999' },
    { key: 'whatsapp_number', value: '+919999999999' },
    { key: 'address', value: 'Shop No. 4, Opp. Krishna Tower, Uran Naka, Panvel - 410206, Maharashtra, India' },
    { key: 'opening_time', value: '08:00' },
    { key: 'closing_time', value: '21:00' },
    { key: 'store_status', value: 'OPEN' }
  ];

  console.log('Inserting store settings...');
  for (const setting of storeSettings) {
    await prisma.storeSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting
    });
  }

  // 2. Create Admin Account
  console.log('Inserting admin account...');
  const adminPhone = '+918452921123';
  await prisma.user.upsert({
    where: { phone: adminPhone },
    update: { isAdmin: true, name: 'Admin Yatish', role: 'ADMIN', isPrimaryAdmin: true },
    create: {
      phone: adminPhone,
      name: 'Admin Yatish',
      isAdmin: true,
      role: 'ADMIN',
      isPrimaryAdmin: true
    }
  });

  // 3. Create Categories
  console.log('Inserting categories and subcategories...');
  const categoriesData = [
    {
      name: 'Groceries',
      subcategories: ['Rice', 'Flour', 'Pulses']
    },
    {
      name: 'Dairy',
      subcategories: ['Milk', 'Butter', 'Cheese']
    },
    {
      name: 'Beverages',
      subcategories: ['Soft Drinks', 'Tea & Coffee']
    },
    {
      name: 'Snacks',
      subcategories: ['Biscuits', 'Chips']
    },
    {
      name: 'Household',
      subcategories: ['Soaps', 'Detergents']
    }
  ];

  for (const cat of categoriesData) {
    const category = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: {
        name: cat.name,
        slug: slugify(cat.name),
        status: 'ACTIVE'
      }
    });

    for (const subName of cat.subcategories) {
      await prisma.subcategory.upsert({
        where: {
          categoryId_name: {
            categoryId: category.id,
            name: subName
          }
        },
        update: {},
        create: {
          categoryId: category.id,
          name: subName,
          slug: slugify(subName),
          status: 'ACTIVE'
        }
      });
    }
  }

  // 4. Create Brands
  console.log('Inserting brands...');
  const brands = ['Amul', 'Tata', 'Britannia', 'Parle', 'Nestlé', 'Fortune'];
  for (const bName of brands) {
    await prisma.brand.upsert({
      where: { name: bName },
      update: {},
      create: {
        name: bName,
        slug: slugify(bName),
        status: 'ACTIVE'
      }
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
