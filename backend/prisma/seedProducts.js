const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const slugify = (text) => text.toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

async function main() {
  console.log('Seeding products started...');

  // 1. Fetch categories
  const groceries = await prisma.category.findUnique({ where: { name: 'Groceries' } });
  const dairy = await prisma.category.findUnique({ where: { name: 'Dairy' } });
  const beverages = await prisma.category.findUnique({ where: { name: 'Beverages' } });
  const snacks = await prisma.category.findUnique({ where: { name: 'Snacks' } });
  const household = await prisma.category.findUnique({ where: { name: 'Household' } });

  if (!groceries || !dairy || !beverages || !snacks || !household) {
    throw new Error('Categories not found. Please ensure backend/prisma/seed.js has been run first.');
  }

  // 2. Fetch subcategories
  const pulses = await prisma.subcategory.findFirst({ where: { name: 'Pulses', categoryId: groceries.id } });
  const milk = await prisma.subcategory.findFirst({ where: { name: 'Milk', categoryId: dairy.id } });
  const tea = await prisma.subcategory.findFirst({ where: { name: 'Tea & Coffee', categoryId: beverages.id } });
  const chips = await prisma.subcategory.findFirst({ where: { name: 'Chips', categoryId: snacks.id } });
  const soaps = await prisma.subcategory.findFirst({ where: { name: 'Soaps', categoryId: household.id } });

  // 3. Fetch brands
  const tata = await prisma.brand.findUnique({ where: { name: 'Tata' } });
  const amul = await prisma.brand.findUnique({ where: { name: 'Amul' } });

  // 4. Create other brands if missing
  const laysBrand = await prisma.brand.upsert({
    where: { name: 'Lay\'s' },
    update: {},
    create: { name: 'Lay\'s', slug: 'lays', status: 'ACTIVE' }
  });
  const dettolBrand = await prisma.brand.upsert({
    where: { name: 'Dettol' },
    update: {},
    create: { name: 'Dettol', slug: 'dettol', status: 'ACTIVE' }
  });

  const productsData = [
    {
      name: 'Tata Sampann Premium Toor Dal',
      slug: 'tata-sampann-premium-toor-dal',
      categoryId: groceries.id,
      subcategoryId: pulses.id,
      brandId: tata.id,
      description: 'Unpolished and high in protein premium yellow split pigeon peas (arhar dal). Freshly selected for Indian household cooking.',
      sku: 'TATA-TOOR-DAL-1KG',
      barcode: '8901058002315',
      imageUrl: '/images/toor_dal.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg', price: 175.00, stock: 50 },
        { attributeName: 'Weight', attributeValue: '2 Kg', price: 340.00, stock: 30 }
      ]
    },
    {
      name: 'Amul Taaza Fresh Toned Milk',
      slug: 'amul-taaza-fresh-toned-milk',
      categoryId: dairy.id,
      subcategoryId: milk.id,
      brandId: amul.id,
      description: 'Pasteurized toned milk. Ideal for tea, coffee, breakfast cereals, or direct drinking.',
      sku: 'AMUL-MILK-500ML',
      barcode: '8901262010120',
      imageUrl: '/images/fresh_milk.png',
      variants: [
        { attributeName: 'Volume', attributeValue: '500 ml', price: 28.00, stock: 100 },
        { attributeName: 'Volume', attributeValue: '1 L', price: 54.00, stock: 75 }
      ]
    },
    {
      name: 'Tata Tea Premium Assam Blend',
      slug: 'tata-tea-premium-assam-blend',
      categoryId: beverages.id,
      subcategoryId: tea.id,
      brandId: tata.id,
      description: 'Unique blend of tea leaves from Assam for rich taste and strength. Complete morning freshness.',
      sku: 'TATA-TEA-250G',
      barcode: '8901058002346',
      imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=400',
      variants: [
        { attributeName: 'Weight', attributeValue: '250 g', price: 120.00, stock: 40 },
        { attributeName: 'Weight', attributeValue: '500 g', price: 235.00, stock: 35 }
      ]
    },
    {
      name: 'Lay\'s Classic Salted Potato Chips',
      slug: 'lays-classic-salted-potato-chips',
      categoryId: snacks.id,
      subcategoryId: chips.id,
      brandId: laysBrand.id,
      description: 'Crispy salted potato chips perfect for quick snacking and children tea-times.',
      sku: 'LAYS-SALTED-50G',
      barcode: '8901491101850',
      imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&q=80&w=400',
      variants: [
        { attributeName: 'Weight', attributeValue: '50 g', price: 20.00, stock: 120 },
        { attributeName: 'Weight', attributeValue: '100 g', price: 40.00, stock: 80 }
      ]
    },
    {
      name: 'Dettol Liquid Handwash Protect',
      slug: 'dettol-liquid-handwash-protect',
      categoryId: household.id,
      subcategoryId: soaps.id,
      brandId: dettolBrand.id,
      description: 'Antibacterial handwash protecting against 100 illness-causing germs. Hand hygiene for the whole family.',
      sku: 'DETT-HW-200ML',
      barcode: '8901396345672',
      imageUrl: 'https://images.unsplash.com/photo-1607006342411-9a905574c82b?auto=format&fit=crop&q=80&w=400',
      variants: [
        { attributeName: 'Volume', attributeValue: '200 ml', price: 99.00, stock: 60 },
        { attributeName: 'Volume', attributeValue: '750 ml', price: 250.00, stock: 25 }
      ]
    }
  ];

  console.log('Inserting products and variants...');
  for (const item of productsData) {
    const { variants, ...prodFields } = item;
    
    const product = await prisma.product.upsert({
      where: { slug: prodFields.slug },
      update: prodFields,
      create: prodFields
    });

    for (const v of variants) {
      const existingVar = await prisma.variant.findFirst({
        where: {
          productId: product.id,
          attributeName: v.attributeName,
          attributeValue: v.attributeValue
        }
      });

      if (!existingVar) {
        const createdVar = await prisma.variant.create({
          data: {
            productId: product.id,
            attributeName: v.attributeName,
            attributeValue: v.attributeValue,
            price: v.price,
            stock: v.stock,
            status: 'ACTIVE'
          }
        });

        // Record stock addition in transaction log
        await prisma.inventoryTransaction.create({
          data: {
            variantId: createdVar.id,
            quantity: v.stock,
            transactionType: 'STOCK_ADDITION',
            reason: 'Seeding sample product variant stock'
          }
        });
      }
    }
  }

  console.log('Product seeding completed successfully!');
}

main()
  .catch(e => {
    console.error('Error during product seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
