const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const slugify = (text) => text.toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

async function main() {
  console.log('Clearing existing inventory and orders...');

  // Clear orders and transactions to prevent foreign key constraint violations
  await prisma.inventoryTransaction.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.subcategory.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();

  console.log('Database cleared.');

  // 1. Create Core Categories
  const catGroceries = await prisma.category.create({
    data: { name: 'Groceries', slug: 'groceries', status: 'ACTIVE' }
  });
  const catOilGhee = await prisma.category.create({
    data: { name: 'Oil & Ghee', slug: 'oil-ghee', status: 'ACTIVE' }
  });
  const catPulsesPeas = await prisma.category.create({
    data: { name: 'Pulses & Lentils', slug: 'pulses-lentils', status: 'ACTIVE' }
  });
  const catMasale = await prisma.category.create({
    data: { name: 'Masale & Spices', slug: 'masale-spices', status: 'ACTIVE' }
  });
  const catDryFruitsSnacks = await prisma.category.create({
    data: { name: 'Dry Fruits & Snacks', slug: 'dry-fruits-snacks', status: 'ACTIVE' }
  });

  // 2. Create Subcategories
  const subRice = await prisma.subcategory.create({
    data: { name: 'Rice', slug: 'rice', categoryId: catGroceries.id, status: 'ACTIVE' }
  });
  const subMillets = await prisma.subcategory.create({
    data: { name: 'Patni & Millets', slug: 'patni-millets', categoryId: catGroceries.id, status: 'ACTIVE' }
  });
  const subWheat = await prisma.subcategory.create({
    data: { name: 'Wheat & Grains', slug: 'wheat-grains', categoryId: catGroceries.id, status: 'ACTIVE' }
  });
  const subOil = await prisma.subcategory.create({
    data: { name: 'Cooking Oil', slug: 'cooking-oil', categoryId: catOilGhee.id, status: 'ACTIVE' }
  });
  const subGhee = await prisma.subcategory.create({
    data: { name: 'Ghee & Vanaspati', slug: 'ghee-vanaspati', categoryId: catOilGhee.id, status: 'ACTIVE' }
  });
  const subDal = await prisma.subcategory.create({
    data: { name: 'Dal & Pulses', slug: 'dal-pulses', categoryId: catPulsesPeas.id, status: 'ACTIVE' }
  });
  const subPeas = await prisma.subcategory.create({
    data: { name: 'Whole Peas & Beans', slug: 'whole-peas-beans', categoryId: catPulsesPeas.id, status: 'ACTIVE' }
  });
  const subSpices = await prisma.subcategory.create({
    data: { name: 'Spices & Powders', slug: 'spices-powders', categoryId: catMasale.id, status: 'ACTIVE' }
  });
  const subTea = await prisma.subcategory.create({
    data: { name: 'Tea & Beverages', slug: 'tea-beverages', categoryId: catMasale.id, status: 'ACTIVE' }
  });
  const subHing = await prisma.subcategory.create({
    data: { name: 'Hing & Seasonings', slug: 'hing-seasonings', categoryId: catMasale.id, status: 'ACTIVE' }
  });
  const subDryFruits = await prisma.subcategory.create({
    data: { name: 'Dry Fruits', slug: 'dry-fruits', categoryId: catDryFruitsSnacks.id, status: 'ACTIVE' }
  });
  const subPapad = await prisma.subcategory.create({
    data: { name: 'Papad & Snacks', slug: 'papad-snacks', categoryId: catDryFruitsSnacks.id, status: 'ACTIVE' }
  });
  const subPickle = await prisma.subcategory.create({
    data: { name: 'Pickles & Preserves', slug: 'pickles-preserves', categoryId: catDryFruitsSnacks.id, status: 'ACTIVE' }
  });
  const subJaggery = await prisma.subcategory.create({
    data: { name: 'Jaggery & Sweeteners', slug: 'jaggery-sweeteners', categoryId: catDryFruitsSnacks.id, status: 'ACTIVE' }
  });

  // 3. Create Brands Helper
  const brandsCache = {};
  const getOrCreateBrand = async (name) => {
    const slug = slugify(name);
    if (brandsCache[slug]) return brandsCache[slug];
    const b = await prisma.brand.upsert({
      where: { slug },
      update: {},
      create: { name, slug, status: 'ACTIVE' }
    });
    brandsCache[slug] = b;
    return b;
  };

  const brandSST = await getOrCreateBrand('SST');
  const brandPanchsheel = await getOrCreateBrand('Panchsheel');
  const brandAishwarya = await getOrCreateBrand('Aishwarya');
  const brandBluemoon = await getOrCreateBrand('Bluemoon');
  const brandSupermoon = await getOrCreateBrand('Supermoon');
  const brandKirti = await getOrCreateBrand('Kirti');
  const brandSagar = await getOrCreateBrand('Sagar');
  const brandKaveri = await getOrCreateBrand('Kaveri');
  const brandClassic = await getOrCreateBrand('Classic');
  const brandLifestyle = await getOrCreateBrand('Lifestyle');
  const brandBlueDiamond = await getOrCreateBrand('Blue Diamond');
  const brandChandtara = await getOrCreateBrand('Chandtara');
  const brandJoker = await getOrCreateBrand('Joker');
  const brandBadam = await getOrCreateBrand('Badam');
  const brandMango = await getOrCreateBrand('Mango');
  const brandApple = await getOrCreateBrand('Apple');
  const brandMannat = await getOrCreateBrand('Mannat');
  const brandIndrayani = await getOrCreateBrand('Indrayani');
  const brandChinor = await getOrCreateBrand('Chinor');
  const brandAmbeMohar = await getOrCreateBrand('Ambe Mohar');
  const brandGujrat = await getOrCreateBrand('Gujrat');
  const brandJaya = await getOrCreateBrand('Jaya');
  const brandVirat = await getOrCreateBrand('Virat');
  const brandMorpankh = await getOrCreateBrand('Morpankh');
  const brandBabydoll = await getOrCreateBrand('Babydoll');
  const brandShahiParivaar = await getOrCreateBrand('Shahi Parivaar');
  const brandGandhi = await getOrCreateBrand('Gandhi');
  const brandKhapli = await getOrCreateBrand('Khapli');
  const brandGemini = await getOrCreateBrand('Gemini');
  const brandSunrich = await getOrCreateBrand('Sunrich');
  const brandPriya = await getOrCreateBrand('Priya');
  const brandGowardhan = await getOrCreateBrand('Gowardhan');
  const brandAmul = await getOrCreateBrand('Amul');
  const brandGits = await getOrCreateBrand('Gits');
  const brandDalda = await getOrCreateBrand('Dalda');
  const brandNeelam = await getOrCreateBrand('Neelam');
  const brandWow = await getOrCreateBrand('Wow');
  const brandMayur = await getOrCreateBrand('Mayur');
  const brandJivana = await getOrCreateBrand('Jivana');
  const brandTata = await getOrCreateBrand('Tata');
  const brandSociety = await getOrCreateBrand('Society');
  const brandMalti = await getOrCreateBrand('Malti');
  const brandSunkiran = await getOrCreateBrand('Sunkiran');

  // 4. Products Definitions
  const productsList = [
    // ----------------------------------------------------
    // RICE
    // ----------------------------------------------------
    {
      name: 'Panchsheel Vada Surti Kolam Rice',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandPanchsheel.id,
      description: 'Traditional aromatic Vada Surti Kolam rice, unpolished grains, perfect for daily home dining.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '26 Kg Bag', price: 60 * 26, stock: 35 } // Default 60/kg rate
      ]
    },
    {
      name: 'Aishwarya Vada Surti Kolam Rice',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandAishwarya.id,
      description: 'Premium choice Vada Surti Kolam rice, selected unpolished white grains with excellent texture.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '26 Kg Bag', price: 60 * 26, stock: 40 }
      ]
    },
    {
      name: 'Bluemoon Jeera Rice',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandBluemoon.id,
      description: 'Aromatic short-grain Jeera rice, highly fragrant and ideal for Jeera rice and biryani pairings.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '26 Kg Bag', price: 70 * 26, stock: 30 } // Default 70/kg rate
      ]
    },
    {
      name: 'Aishwarya Jeera Rice',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandAishwarya.id,
      description: 'Selected fine grain Aishwarya Jeera rice. Fragrant, soft cooking and premium grocery quality.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '26 Kg Bag', price: 70 * 26, stock: 25 }
      ]
    },
    {
      name: 'Supermoon Jeera Rice',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandSupermoon.id,
      description: 'Premium aged Jeera rice from Supermoon. Tiny grains with intense traditional aroma.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '26 Kg Bag', price: 75 * 26, stock: 20 }
      ]
    },
    {
      name: '24 Carat Jeera Rice',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandSST.id,
      description: 'Luxurious aged Jeera rice grains, unpolished, aromatic and soft-texture cooking.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '26 Kg Bag', price: 80 * 26, stock: 15 }
      ]
    },
    {
      name: 'Kirti Steam Surti Kolam Rice',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandKirti.id,
      description: 'Aromatic Kirti Steam Surti Kolam rice. Fluffy texture grains perfect for daily household meals.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '26 Kg Bag', price: 60 * 26, stock: 40 }
      ]
    },
    {
      name: 'Sagar Steam Surti Kolam Rice',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandSagar.id,
      description: 'Sagar Steam Surti Kolam rice grains. Fine white color, soft and easy to digest.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '30 Kg Bag', price: 54 * 30, stock: 30 } // Rate 54 per kg
      ]
    },
    {
      name: 'Kaveri Steam Surti Kolam Rice',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandKaveri.id,
      description: 'High-quality Kaveri Steam Surti Kolam rice. Unpolished grains with delicious taste.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '26 Kg Bag', price: 60 * 26, stock: 50 } // Rate 60 per kg
      ]
    },
    {
      name: 'Classic Steam Surti Kolam Rice',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandClassic.id,
      description: 'Aged Classic Steam Surti Kolam rice. Fluffy structure, clean sorted white grains.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '26 Kg Bag', price: 65 * 26, stock: 45 } // Rate 65 per kg
      ]
    },
    {
      name: 'Lifestyle Steam Surti Kolam Rice',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandLifestyle.id,
      description: 'Premium Lifestyle Steam Surti Kolam rice bag. Standard wholesale size, ideal for large families.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '26 Kg Bag', price: 65 * 26, stock: 40 } // Rate 65 per kg
      ]
    },
    {
      name: 'Blue Diamond Steam Surti Kolam Rice',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandBlueDiamond.id,
      description: 'Superior grade Blue Diamond Steam Surti Kolam rice. Clean unpolished grains.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '26 Kg Bag', price: 64 * 26, stock: 35 } // Rate 64 per kg
      ]
    },
    {
      name: 'Chandtara HMT Steam Kolam Rice',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandChandtara.id,
      description: 'Famous Chandtara HMT Steam Kolam rice. Medium slender grains with rich natural nutrients.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '26 Kg Bag', price: 50 * 26, stock: 30 } // Rate 50 per kg
      ]
    },
    {
      name: 'Joker HMT Steam Kolam Rice',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandJoker.id,
      description: 'Daily choice Joker HMT Steam Kolam rice. Soft texture, high digestion quality.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '26 Kg Bag', price: 48 * 26, stock: 25 } // Rate 48 per kg
      ]
    },
    {
      name: 'Badam BPT Steam Kolam Rice',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandBadam.id,
      description: 'Wholesale Badam BPT Steam Kolam rice bag. Pre-packaged, unpolished, aromatic grain.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '26 Kg Bag', price: 1144, stock: 30 } // Total bag price
      ]
    },
    {
      name: 'Mango BPT Steam Kolam Rice',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandMango.id,
      description: 'Mango BPT Steam Kolam wholesale rice bag. Rich texture, suitable for premium catering.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '26 Kg Bag', price: 1144, stock: 45 } // Total bag price
      ]
    },
    {
      name: 'Apple Sona Masuri Kolam Rice',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandApple.id,
      description: 'Popular Apple Sona Masuri kolam rice. Aged grains that cook soft and fluffy.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '30 Kg Bag', price: 1020, stock: 40 } // Total bag price
      ]
    },
    {
      name: 'Mannat Basmati Rice',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandMannat.id,
      description: 'Aged premium Basmati rice grains with elongated shape, aromatic fragrance and soft texture.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: 'XXXL Per Kg', price: 130, stock: 150 },
        { attributeName: 'Weight', attributeValue: 'XXL Per Kg', price: 100, stock: 200 }
      ]
    },
    {
      name: 'Sela Basmati Rice',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandSST.id,
      description: 'Parboiled (Sela) Basmati rice, sturdy grains that do not break during cooking. High volume yield.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: 'Per Kg', price: 75, stock: 300 }
      ]
    },
    {
      name: 'Broken Basmati Rice (Tukda)',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandSST.id,
      description: 'Broken Basmati rice variants, perfect for kheer, khichdi, and budget-friendly daily meals.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: 'Dubar Per Kg', price: 60, stock: 250 },
        { attributeName: 'Weight', attributeValue: 'Tibar Per Kg', price: 50, stock: 200 }
      ]
    },
    {
      name: 'Indrayani Sented Rice',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandIndrayani.id,
      description: 'Traditional sticky scented Indrayani rice from Maharashtra, highly fragrant.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: 'Per Kg', price: 60, stock: 350 }
      ]
    },
    {
      name: 'Chinor Kaali Much Sented Rice',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandChinor.id,
      description: 'Kaali Much Chinor rice, premium scented long slender grains with soft cooking.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: 'Per Kg', price: 95, stock: 180 }
      ]
    },
    {
      name: 'Ambe Mohar Sented Rice',
      categoryId: catGroceries.id,
      subcategoryId: subRice.id,
      brandId: brandAmbeMohar.id,
      description: 'Premium mango-blossom scented Ambe Mohar rice, highly traditional and nutritious.',
      imageUrl: '/images/rice.png',
      variants: [
        { attributeName: 'Weight', attributeValue: 'Per Kg', price: 150, stock: 120 }
      ]
    },

    // ----------------------------------------------------
    // PATNI & MILLETS
    // ----------------------------------------------------
    {
      name: 'Gujrat IR8 Patni Rice',
      categoryId: catGroceries.id,
      subcategoryId: subMillets.id,
      brandId: brandGujrat.id,
      description: 'Traditional bold red Patni rice (IR8), rich in fiber and vitamins, ideal for health-conscious diets.',
      imageUrl: '/images/wheat.png',
      variants: [
        { attributeName: 'Weight', attributeValue: 'Per Kg', price: 45, stock: 400 },
        { attributeName: 'Weight', attributeValue: '30 Kg Bag', price: 1290, stock: 60 }
      ]
    },
    {
      name: 'Gujrat Broken IR8 Patni Rice',
      categoryId: catGroceries.id,
      subcategoryId: subMillets.id,
      brandId: brandGujrat.id,
      description: 'Broken Gujrat IR8 Patni grains, popular for kanji, porridge, and domestic feeds.',
      imageUrl: '/images/wheat.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '30 Kg Bag', price: 1140, stock: 40 }
      ]
    },
    {
      name: 'Jaya Broken IR8 Patni Rice',
      categoryId: catGroceries.id,
      subcategoryId: subMillets.id,
      brandId: brandJaya.id,
      description: 'Jaya Broken IR8 Patni rice bag. High carbohydrate content, clean sorted grains.',
      imageUrl: '/images/wheat.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '26 Kg Bag', price: 1200, stock: 35 }
      ]
    },
    {
      name: 'Nachni Millets (Ragi)',
      categoryId: catGroceries.id,
      subcategoryId: subMillets.id,
      brandId: brandSST.id,
      description: 'Fresh Nachni millets (Ragi/Finger Millet). High in calcium and gluten-free.',
      imageUrl: '/images/wheat.png',
      variants: [
        { attributeName: 'Weight', attributeValue: 'Per Kg', price: 60, stock: 150 }
      ]
    },
    {
      name: 'Jwari Millets (Sorghum)',
      categoryId: catGroceries.id,
      subcategoryId: subMillets.id,
      brandId: brandSST.id,
      description: 'Sorghum millets (Jowar) sorted grains. Excellent for making nutritious bhakri flatbreads.',
      imageUrl: '/images/wheat.png',
      variants: [
        { attributeName: 'Quality', attributeValue: 'Premium Per Kg', price: 75, stock: 200 },
        { attributeName: 'Quality', attributeValue: 'Medium Per Kg', price: 65, stock: 250 },
        { attributeName: 'Quality', attributeValue: 'Regular Per Kg', price: 55, stock: 300 }
      ]
    },
    {
      name: 'Bajri Millets (Pearl Millet)',
      categoryId: catGroceries.id,
      subcategoryId: subMillets.id,
      brandId: brandSST.id,
      description: 'Pearl millet (Bajra) whole grains, warm energy provider, ideal for winter seasons.',
      imageUrl: '/images/wheat.png',
      variants: [
        { attributeName: 'Weight', attributeValue: 'Per Kg', price: 50, stock: 300 }
      ]
    },

    // ----------------------------------------------------
    // WHEAT & GRAINS
    // ----------------------------------------------------
    {
      name: 'Virat MP Lokwan Wheat',
      categoryId: catGroceries.id,
      subcategoryId: subWheat.id,
      brandId: brandVirat.id,
      description: 'Virat brand Madhya Pradesh Lokwan wheat. Golden grains with high protein, makes soft rotis.',
      imageUrl: '/images/wheat.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '30 Kg Bag', price: 1140, stock: 80 }
      ]
    },
    {
      name: 'Morpankh MP Lokwan Wheat',
      categoryId: catGroceries.id,
      subcategoryId: subWheat.id,
      brandId: brandMorpankh.id,
      description: 'Selected Morpankh MP Lokwan wheat grains. Cleaned, heavy grains for premium home milling.',
      imageUrl: '/images/wheat.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '30 Kg Bag', price: 1140, stock: 70 }
      ]
    },
    {
      name: 'Babydoll MP Sehor Wheat',
      categoryId: catGroceries.id,
      subcategoryId: subWheat.id,
      brandId: brandBabydoll.id,
      description: 'Famous Babydoll MP Sehor wheat. Sharbati grade sweet wheat, rich nutrition profile.',
      imageUrl: '/images/wheat.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '30 Kg Bag', price: 1200, stock: 50 }
      ]
    },
    {
      name: 'Shahi Parivaar MP Sehor Wheat',
      categoryId: catGroceries.id,
      subcategoryId: subWheat.id,
      brandId: brandShahiParivaar.id,
      description: 'Royal grade Shahi Parivaar MP Sehor wheat. Premium golden grains, soft chapati quality.',
      imageUrl: '/images/wheat.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '30 Kg Bag', price: 1260, stock: 45 }
      ]
    },
    {
      name: 'Gandhi Sarbati Wheat',
      categoryId: catGroceries.id,
      subcategoryId: subWheat.id,
      brandId: brandGandhi.id,
      description: 'High-end Gandhi Sharbati wheat grains, premium sweetness, direct from Sehore fields.',
      imageUrl: '/images/wheat.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '30 Kg Bag', price: 1650, stock: 30 }
      ]
    },
    {
      name: 'Khapli Gahu Wheat (Emmer)',
      categoryId: catGroceries.id,
      subcategoryId: subWheat.id,
      brandId: brandKhapli.id,
      description: 'Emmer wheat (Khapli), low glycemic index, highly recommended for diabetic management.',
      imageUrl: '/images/wheat.png',
      variants: [
        { attributeName: 'Weight', attributeValue: 'Pack of 1 Kg', price: 130, stock: 100 }
      ]
    },

    // ----------------------------------------------------
    // COOKING OIL
    // ----------------------------------------------------
    {
      name: 'Gemini Pure Sunflower Oil',
      categoryId: catOilGhee.id,
      subcategoryId: subOil.id,
      brandId: brandGemini.id,
      description: 'Refined sunflower oil enriched with Vitamins A, D & E. Light and healthy for daily frying.',
      imageUrl: '/images/oil.png',
      variants: [
        { attributeName: 'Volume', attributeValue: '13 Kg Tin', price: 2680, stock: 40 },
        { attributeName: 'Volume', attributeValue: '13 Kg Plastic Jar', price: 2710, stock: 35 },
        { attributeName: 'Volume', attributeValue: '5 Ltr Jar', price: 970, stock: 60 },
        { attributeName: 'Volume', attributeValue: '1 Ltr Pouch', price: 175, stock: 200 }
      ]
    },
    {
      name: 'Sunrich Sunflower Oil',
      categoryId: catOilGhee.id,
      subcategoryId: subOil.id,
      brandId: brandSunrich.id,
      description: 'Clear and light Sunrich sunflower oil. Lower absorption technology for guilt-free snacks.',
      imageUrl: '/images/oil.png',
      variants: [
        { attributeName: 'Volume', attributeValue: '13 Kg Tin', price: 2550, stock: 30 },
        { attributeName: 'Volume', attributeValue: '5 Ltr Jar', price: 900, stock: 50 },
        { attributeName: 'Volume', attributeValue: '1 Ltr Pouch', price: 150, stock: 150 }
      ]
    },
    {
      name: 'Priya Sunflower Oil',
      categoryId: catOilGhee.id,
      subcategoryId: subOil.id,
      brandId: brandPriya.id,
      description: 'Healthy and economic Priya sunflower oil, stable under high heat cooking.',
      imageUrl: '/images/oil.png',
      variants: [
        { attributeName: 'Volume', attributeValue: '13 Kg Tin', price: 2560, stock: 25 },
        { attributeName: 'Volume', attributeValue: '5 Ltr Jar', price: 920, stock: 40 },
        { attributeName: 'Volume', attributeValue: '1 Ltr Pouch', price: 155, stock: 120 }
      ]
    },

    // ----------------------------------------------------
    // GHEE & VANASPATI
    // ----------------------------------------------------
    {
      name: 'Gowardhan Pure Cow Ghee',
      categoryId: catOilGhee.id,
      subcategoryId: subGhee.id,
      brandId: brandGowardhan.id,
      description: 'Granular (danedar) Gowardhan cow ghee, rich aroma, golden color.',
      imageUrl: '/images/ghee.png',
      variants: [
        { attributeName: 'Volume', attributeValue: '1 Ltr Tin', price: 780, stock: 80 },
        { attributeName: 'Volume', attributeValue: '500 ml Pouch', price: 390, stock: 100 },
        { attributeName: 'Volume', attributeValue: '200 ml Pouch', price: 195, stock: 150 }
      ]
    },
    {
      name: 'Amul Pure Cow Ghee',
      categoryId: catOilGhee.id,
      subcategoryId: subGhee.id,
      brandId: brandAmul.id,
      description: 'Fresh and pure Amul cow ghee, traditional butter clarification, unmatched taste.',
      imageUrl: '/images/ghee.png',
      variants: [
        { attributeName: 'Volume', attributeValue: '1 Ltr Tin', price: 645, stock: 120 },
        { attributeName: 'Volume', attributeValue: '500 ml Pouch', price: 325, stock: 140 },
        { attributeName: 'Volume', attributeValue: '200 ml Pouch', price: 165, stock: 160 }
      ]
    },
    {
      name: 'Gits Pure Cow Ghee',
      categoryId: catOilGhee.id,
      subcategoryId: subGhee.id,
      brandId: brandGits.id,
      description: 'Premium aromatic Gits cow ghee. Excellent addition to khichdi, rotis, and sweets.',
      imageUrl: '/images/ghee.png',
      variants: [
        { attributeName: 'Volume', attributeValue: '1 Ltr Tin', price: 630, stock: 30 },
        { attributeName: 'Volume', attributeValue: '500 ml Pouch', price: 320, stock: 50 },
        { attributeName: 'Volume', attributeValue: '200 ml Pouch', price: 160, stock: 80 }
      ]
    },
    {
      name: 'Dalda Vanaspati Ghee',
      categoryId: catOilGhee.id,
      subcategoryId: subGhee.id,
      brandId: brandDalda.id,
      description: 'Hydrogenerated vegetable fat (Vanaspati), popular for baking, biryani preparation, and deep frying.',
      imageUrl: '/images/ghee.png',
      variants: [
        { attributeName: 'Volume', attributeValue: '1 Ltr Tin', price: 190, stock: 100 },
        { attributeName: 'Volume', attributeValue: '500 ml Pouch', price: 95, stock: 120 }
      ]
    },

    // ----------------------------------------------------
    // DAL & PULSES
    // ----------------------------------------------------
    {
      name: 'Premium Toor Dal (Arhar)',
      categoryId: catPulsesPeas.id,
      subcategoryId: subDal.id,
      brandId: brandSST.id,
      description: 'Unpolished premium split pigeon peas (toor dal), rich in proteins and high fiber content.',
      imageUrl: '/images/pulses.png',
      variants: [
        { attributeName: 'Brand/Origin', attributeValue: 'Latur 1 Kg', price: 140, stock: 200 },
        { attributeName: 'Brand/Origin', attributeValue: 'Gujrat 1 Kg', price: 150, stock: 150 },
        { attributeName: 'Brand/Origin', attributeValue: 'Imported 1 Kg', price: 130, stock: 300 }
      ]
    },
    {
      name: 'Moong Dal (Yellow Split)',
      categoryId: catPulsesPeas.id,
      subcategoryId: subDal.id,
      brandId: brandSST.id,
      description: 'Aromatic unpolished yellow split moong dal, easy to cook and digest.',
      imageUrl: '/images/pulses.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg', price: 120, stock: 250 }
      ]
    },
    {
      name: 'Chana Dal (Gram Dal)',
      categoryId: catPulsesPeas.id,
      subcategoryId: subDal.id,
      brandId: brandSST.id,
      description: 'Unpolished baby chickpea split dal, rich in proteins, used for curries and flour.',
      imageUrl: '/images/pulses.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg', price: 90, stock: 300 }
      ]
    },
    {
      name: 'Masoor Dal (Red Lentil)',
      categoryId: catPulsesPeas.id,
      subcategoryId: subDal.id,
      brandId: brandSST.id,
      description: 'Fast-cooking split red masoor dal, unpolished, nutritious skin benefits.',
      imageUrl: '/images/pulses.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg', price: 90, stock: 280 }
      ]
    },
    {
      name: 'Urad Dal (Black Gram Split)',
      categoryId: catPulsesPeas.id,
      subcategoryId: subDal.id,
      brandId: brandSST.id,
      description: 'Split white urad dal, ideal for making idli batter, dosas, and vada recipes.',
      imageUrl: '/images/pulses.png',
      variants: [
        { attributeName: 'Quality', attributeValue: 'Loose 1 Kg', price: 130, stock: 200 },
        { attributeName: 'Quality', attributeValue: 'Premium 1 Kg', price: 140, stock: 150 }
      ]
    },
    {
      name: 'Pawta Dal',
      categoryId: catPulsesPeas.id,
      subcategoryId: subDal.id,
      brandId: brandSST.id,
      description: 'Nutritious flat bean split dal, popular in local Maharashtrian curries.',
      imageUrl: '/images/pulses.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg', price: 160, stock: 100 }
      ]
    },
    {
      name: 'Black Chilta Dal',
      categoryId: catPulsesPeas.id,
      subcategoryId: subDal.id,
      brandId: brandSST.id,
      description: 'Split black gram dal with skin (Chilta). High fiber content, rich texture.',
      imageUrl: '/images/pulses.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg', price: 130, stock: 150 }
      ]
    },
    {
      name: 'Green Chilta Dal (Moong Chilka)',
      categoryId: catPulsesPeas.id,
      subcategoryId: subDal.id,
      brandId: brandSST.id,
      description: 'Split green gram dal with skin, light on stomach, highly nutritious.',
      imageUrl: '/images/pulses.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg', price: 130, stock: 180 }
      ]
    },

    // ----------------------------------------------------
    // WHOLE PEAS & BEANS
    // ----------------------------------------------------
    {
      name: 'Whole Moong Beans',
      categoryId: catPulsesPeas.id,
      subcategoryId: subPeas.id,
      brandId: brandSST.id,
      description: 'Whole green moong beans, excellent for sprouting and protein-rich breakfast salads.',
      imageUrl: '/images/pulses.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg', price: 150, stock: 180 }
      ]
    },
    {
      name: 'Matki Beans (Moth)',
      categoryId: catPulsesPeas.id,
      subcategoryId: subPeas.id,
      brandId: brandSST.id,
      description: 'Whole moth beans (Matki), highly popular for preparing traditional Maharashtrian Misal.',
      imageUrl: '/images/pulses.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg', price: 160, stock: 150 }
      ]
    },
    {
      name: 'Aakha Masoor (Whole Red Lentils)',
      categoryId: catPulsesPeas.id,
      subcategoryId: subPeas.id,
      brandId: brandSST.id,
      description: 'Whole brown red lentils (Aakha Masoor), rich earthy flavor, perfect for masoor khichdi.',
      imageUrl: '/images/pulses.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg', price: 100, stock: 220 }
      ]
    },
    {
      name: 'Dry Peas (Vatana)',
      categoryId: catPulsesPeas.id,
      subcategoryId: subPeas.id,
      brandId: brandSST.id,
      description: 'Dehydrated dry peas (Vatana) variants, used for street-style Ragda and curries.',
      imageUrl: '/images/pulses.png',
      variants: [
        { attributeName: 'Color', attributeValue: 'Green 1 Kg', price: 100, stock: 250 },
        { attributeName: 'Color', attributeValue: 'White 1 Kg', price: 100, stock: 250 }
      ]
    },
    {
      name: 'Dollar Chavli (Cowpeas)',
      categoryId: catPulsesPeas.id,
      subcategoryId: subPeas.id,
      brandId: brandSST.id,
      description: 'Large size black-eyed peas (Dollar Chavli), creamy texture when cooked.',
      imageUrl: '/images/pulses.png',
      variants: [
        { attributeName: 'Size', attributeValue: 'Hathi 1 Kg', price: 110, stock: 120 },
        { attributeName: 'Size', attributeValue: 'Commando 1 Kg', price: 150, stock: 100 }
      ]
    },
    {
      name: 'Baarik Chavli (Small Cowpeas)',
      categoryId: catPulsesPeas.id,
      subcategoryId: subPeas.id,
      brandId: brandSST.id,
      description: 'Small size black eyed cowpeas, faster cooking and delicious sweet-savory notes.',
      imageUrl: '/images/pulses.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg', price: 120, stock: 140 }
      ]
    },
    {
      name: 'Kala Vatana (Black Peas)',
      categoryId: catPulsesPeas.id,
      subcategoryId: subPeas.id,
      brandId: brandSST.id,
      description: 'Rare whole black peas, classic konkani amti ingredient, rich iron source.',
      imageUrl: '/images/pulses.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg', price: 120, stock: 110 }
      ]
    },
    {
      name: 'Vaal (Field Beans)',
      categoryId: catPulsesPeas.id,
      subcategoryId: subPeas.id,
      brandId: brandSST.id,
      description: 'Field beans (Vaal/Dalimbi), bitter-sweet flavor, highly traditional Maharashtrian bean.',
      imageUrl: '/images/pulses.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg', price: 130, stock: 80 }
      ]
    },
    {
      name: 'Pawta Whole Beans',
      categoryId: catPulsesPeas.id,
      subcategoryId: subPeas.id,
      brandId: brandSST.id,
      description: 'Whole dry flat beans, fibrous texture, rich botanical nutrients.',
      imageUrl: '/images/pulses.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg', price: 180, stock: 90 }
      ]
    },
    {
      name: 'Rajma (Red Kidney Beans)',
      categoryId: catPulsesPeas.id,
      subcategoryId: subPeas.id,
      brandId: brandSST.id,
      description: 'Glossy red kidney beans (Rajma), robust flavor, thick gravy consistency.',
      imageUrl: '/images/pulses.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg', price: 140, stock: 150 }
      ]
    },
    {
      name: 'Kala Chana (Brown Chickpeas)',
      categoryId: catPulsesPeas.id,
      subcategoryId: subPeas.id,
      brandId: brandSST.id,
      description: 'Whole brown chickpeas, high fiber and protein, standard health booster.',
      imageUrl: '/images/pulses.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg', price: 90, stock: 250 }
      ]
    },
    {
      name: 'Kabuli Chana (Garbanzo)',
      categoryId: catPulsesPeas.id,
      subcategoryId: subPeas.id,
      brandId: brandSST.id,
      description: 'Large white chickpeas (chole), smooth texture, premium boiling quality.',
      imageUrl: '/images/pulses.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg', price: 130, stock: 180 }
      ]
    },

    // ----------------------------------------------------
    // MASALE & POWDERS
    // ----------------------------------------------------
    {
      name: 'SST Mix Masala (Red)',
      categoryId: catMasale.id,
      subcategoryId: subSpices.id,
      brandId: brandSST.id,
      description: 'Spice blend of local red chilis, coriander and cinnamon. Highly pungent and aromatic.',
      imageUrl: '/images/masala.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg Pack', price: 720, stock: 100 }
      ]
    },
    {
      name: 'Garam Masala Powder',
      categoryId: catMasale.id,
      subcategoryId: subSpices.id,
      brandId: brandSST.id,
      description: 'Rich blend of cardamom, cloves, star anise and black pepper. Adds warmth to curries.',
      imageUrl: '/images/masala.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg Pack', price: 720, stock: 80 }
      ]
    },
    {
      name: 'Kashmiri Mirchi Powder',
      categoryId: catMasale.id,
      subcategoryId: subSpices.id,
      brandId: brandSST.id,
      description: 'Mild red chili powder known for imparting rich red color to curries without high spice heat.',
      imageUrl: '/images/masala.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg Pack', price: 720, stock: 90 }
      ]
    },
    {
      name: 'Bedgi Mirchi Powder',
      categoryId: catMasale.id,
      subcategoryId: subSpices.id,
      brandId: brandSST.id,
      description: 'Traditional wrinkled Bedgi chili powder, gives deep color and moderate hot spice levels.',
      imageUrl: '/images/masala.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg Pack', price: 750, stock: 60 }
      ]
    },
    {
      name: 'Dhana Powder (Coriander)',
      categoryId: catMasale.id,
      subcategoryId: subSpices.id,
      brandId: brandSST.id,
      description: 'Finely milled coriander seeds powder, cool spice base for all gravy dishes.',
      imageUrl: '/images/masala.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg Pack', price: 320, stock: 120 }
      ]
    },
    {
      name: 'Halad Turmeric Powder',
      categoryId: catMasale.id,
      subcategoryId: subSpices.id,
      brandId: brandSST.id,
      description: 'Bright yellow turmeric powder, antiseptic properties, core spice of Indian households.',
      imageUrl: '/images/masala.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg Pack', price: 320, stock: 150 }
      ]
    },
    {
      name: 'Jeera Seeds (Cumin)',
      categoryId: catMasale.id,
      subcategoryId: subSpices.id,
      brandId: brandSST.id,
      description: 'Premium clean cumin seeds (Jeera) for tadka tempering and roasted spice flavoring.',
      imageUrl: '/images/masala.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg Pack', price: 360, stock: 80 }
      ]
    },
    {
      name: 'Rai Seeds (Mustard)',
      categoryId: catMasale.id,
      subcategoryId: subSpices.id,
      brandId: brandSST.id,
      description: 'Black mustard seeds (Rai), essential tempering spice, sharp popping flavor.',
      imageUrl: '/images/masala.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg Pack', price: 180, stock: 100 }
      ]
    },
    {
      name: 'Whole Spices Packets',
      categoryId: catMasale.id,
      subcategoryId: subSpices.id,
      brandId: brandSST.id,
      description: 'Assorted whole spices packets in retail packaging, clean and fresh sorted.',
      imageUrl: '/images/masala.png',
      variants: [
        { attributeName: 'Spice', attributeValue: 'Miri (Black Pepper) 50g', price: 55, stock: 300 },
        { attributeName: 'Spice', attributeValue: 'Lavang (Cloves) 26g', price: 30, stock: 300 },
        { attributeName: 'Spice', attributeValue: 'Dalchini (Cinnamon) 50g', price: 30, stock: 300 },
        { attributeName: 'Spice', attributeValue: 'Velchi (Cardamom) 26g', price: 100, stock: 200 },
        { attributeName: 'Spice', attributeValue: 'Masala Velchi 26g', price: 60, stock: 200 },
        { attributeName: 'Spice', attributeValue: 'Starful (Star Anise) 26g', price: 30, stock: 150 },
        { attributeName: 'Spice', attributeValue: 'Javitri (Mace) 26g', price: 100, stock: 100 },
        { attributeName: 'Spice', attributeValue: 'Tamalpatra (Bay Leaf) 25g', price: 26, stock: 120 },
        { attributeName: 'Spice', attributeValue: 'Kasturi Methi 26g', price: 25, stock: 180 },
        { attributeName: 'Spice', attributeValue: 'Trifala 26g', price: 30, stock: 140 },
        { attributeName: 'Spice', attributeValue: 'Dagad Ful 26g', price: 30, stock: 150 },
        { attributeName: 'Spice', attributeValue: 'Mirchi Whole 100g', price: 60, stock: 120 },
        { attributeName: 'Spice', attributeValue: 'Jaifal (Nutmeg) 1 Pc', price: 10, stock: 500 },
        { attributeName: 'Spice', attributeValue: 'Akha Dhana 100g', price: 30, stock: 200 },
        { attributeName: 'Spice', attributeValue: 'Methi Seeds 100g', price: 15, stock: 250 },
        { attributeName: 'Spice', attributeValue: 'Kokam 250g', price: 120, stock: 100 },
        { attributeName: 'Spice', attributeValue: 'Chincha (Tamarind) 250g', price: 50, stock: 150 },
        { attributeName: 'Spice', attributeValue: 'Badishop (Fennel) 100g', price: 50, stock: 160 },
        { attributeName: 'Spice', attributeValue: 'Badishop Lukhnavi 100g', price: 60, stock: 120 },
        { attributeName: 'Spice', attributeValue: 'Til (Sesame) 250g', price: 55, stock: 200 },
        { attributeName: 'Spice', attributeValue: 'Khaskhas (Poppy) 26g', price: 60, stock: 100 },
        { attributeName: 'Spice', attributeValue: 'Owa (Carom) 100g', price: 40, stock: 180 },
        { attributeName: 'Spice', attributeValue: 'Magaj Seeds 250g', price: 175, stock: 80 }
      ]
    },
    {
      name: 'Samrat Besan (Gram Flour)',
      categoryId: catMasale.id,
      subcategoryId: subSpices.id,
      brandId: brandSST.id,
      description: 'Finely ground chana dal flour, ideal for bhajiya pakoras, laddoos and thickening.',
      imageUrl: '/images/masala.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg Pack', price: 110, stock: 150 },
        { attributeName: 'Weight', attributeValue: '500 gm Pack', price: 55, stock: 200 }
      ]
    },
    {
      name: 'Rawa (Semolina)',
      categoryId: catMasale.id,
      subcategoryId: subSpices.id,
      brandId: brandSST.id,
      description: 'Coarse semolina (Rawa) for making delicious upma, sheera and batter coatings.',
      imageUrl: '/images/masala.png',
      variants: [
        { attributeName: 'Weight', attributeValue: 'Per Kg', price: 60, stock: 250 }
      ]
    },
    {
      name: 'Pohe (Flattened Rice)',
      categoryId: catMasale.id,
      subcategoryId: subSpices.id,
      brandId: brandSST.id,
      description: 'Medium flattened rice flakes (Pohe), breakfast standard in Maharashtra.',
      imageUrl: '/images/masala.png',
      variants: [
        { attributeName: 'Weight', attributeValue: 'Per Kg Pack', price: 60, stock: 300 }
      ]
    },
    {
      name: 'Khobra (Dry Coconut)',
      categoryId: catMasale.id,
      subcategoryId: subSpices.id,
      brandId: brandSST.id,
      description: 'Dehydrated dry coconut halves (copra), essential for gravies and sweets.',
      imageUrl: '/images/masala.png',
      variants: [
        { attributeName: 'Quality', attributeValue: 'Size A 1 Kg', price: 380, stock: 80 },
        { attributeName: 'Quality', attributeValue: 'Size B 1 Kg', price: 410, stock: 60 },
        { attributeName: 'Quality', attributeValue: 'Size C 1 Kg', price: 300, stock: 100 }
      ]
    },
    {
      name: 'SST Salt Packets',
      categoryId: catMasale.id,
      subcategoryId: subSpices.id,
      brandId: brandSST.id,
      description: 'Essential cooking salts, iodized and organic sendhav versions.',
      imageUrl: '/images/masala.png',
      variants: [
        { attributeName: 'Type', attributeValue: 'Tata Iodized Salt 1kg', price: 30, stock: 500 },
        { attributeName: 'Type', attributeValue: 'Tata Sendhav Salt 1kg', price: 70, stock: 200 },
        { attributeName: 'Type', attributeValue: 'Jada Meeth (Rock Salt) 1kg', price: 10, stock: 300 }
      ]
    },
    {
      name: 'Society Tea Powder',
      categoryId: catMasale.id,
      subcategoryId: subTea.id,
      brandId: brandSociety.id,
      description: 'Premium quality Society tea powder, strong aroma and rich flavor extraction.',
      imageUrl: '/images/masala.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg Pack', price: 550, stock: 100 },
        { attributeName: 'Weight', attributeValue: '500 gm Pack', price: 290, stock: 120 },
        { attributeName: 'Weight', attributeValue: '250 gm Pack', price: 145, stock: 150 }
      ]
    },
    {
      name: 'Masala Tea Jar',
      categoryId: catMasale.id,
      subcategoryId: subTea.id,
      brandId: brandSST.id,
      description: 'Rich masala tea blend in a secure storage jar. Warm spices infused.',
      imageUrl: '/images/masala.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '200 gm Jar', price: 200, stock: 80 }
      ]
    },
    {
      name: 'Sunkiran Tea',
      categoryId: catMasale.id,
      subcategoryId: subTea.id,
      brandId: brandSunkiran.id,
      description: 'Budget-friendly Sunkiran tea leaves, strong color and brisk cup flavor.',
      imageUrl: '/images/masala.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '250 gm Pack', price: 110, stock: 100 }
      ]
    },
    {
      name: 'Malti Hing (Asafoetida)',
      categoryId: catMasale.id,
      subcategoryId: subHing.id,
      brandId: brandMalti.id,
      description: 'Highly aromatic Malti hing powder, vital seasoning for tempering dals and curries.',
      imageUrl: '/images/masala.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '100 gm Pack', price: 100, stock: 250 },
        { attributeName: 'Weight', attributeValue: '50 gm Pack', price: 50, stock: 350 }
      ]
    },

    // ----------------------------------------------------
    // DRY FRUITS
    // ----------------------------------------------------
    {
      name: 'Premium Cashews (Kaju)',
      categoryId: catDryFruitsSnacks.id,
      subcategoryId: subDryFruits.id,
      brandId: brandSST.id,
      description: 'Fresh and crunchy whole cashews, rich in monounsaturated fats.',
      imageUrl: '/images/dry_fruits.png',
      variants: [
        { attributeName: 'Grade', attributeValue: 'Standard 250g', price: 250, stock: 150 },
        { attributeName: 'Grade', attributeValue: 'A Grade 250g', price: 325, stock: 120 }
      ]
    },
    {
      name: 'Premium Almonds (Badam)',
      categoryId: catDryFruitsSnacks.id,
      subcategoryId: subDryFruits.id,
      brandId: brandSST.id,
      description: 'Sweet whole almonds, excellent memory booster, direct from California.',
      imageUrl: '/images/dry_fruits.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '250 gm Pack', price: 240, stock: 200 }
      ]
    },
    {
      name: 'Pistachios (Pista)',
      categoryId: catDryFruitsSnacks.id,
      subcategoryId: subDryFruits.id,
      brandId: brandSST.id,
      description: 'Lightly roasted pistachios, rich in antioxidants and vitamins.',
      imageUrl: '/images/dry_fruits.png',
      variants: [
        { attributeName: 'Type', attributeValue: 'Salted Khara 250g', price: 350, stock: 100 },
        { attributeName: 'Type', attributeValue: 'Shell-less 250g', price: 600, stock: 80 }
      ]
    },
    {
      name: 'Raisins (Manuka)',
      categoryId: catDryFruitsSnacks.id,
      subcategoryId: subDryFruits.id,
      brandId: brandSST.id,
      description: 'Sweet seedless raisins (Manuka), natural energy candies.',
      imageUrl: '/images/dry_fruits.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '100 gm Pack', price: 70, stock: 250 }
      ]
    },
    {
      name: 'Charula Seeds (Chironji)',
      categoryId: catDryFruitsSnacks.id,
      subcategoryId: subDryFruits.id,
      brandId: brandSST.id,
      description: 'Premium Chironji seeds, sweet nutty flavor, standard dessert garnish.',
      imageUrl: '/images/dry_fruits.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '26 gm Packet', price: 60, stock: 150 }
      ]
    },

    // ----------------------------------------------------
    // PAPAD & SNACKS
    // ----------------------------------------------------
    {
      name: 'Neelam Papad',
      categoryId: catDryFruitsSnacks.id,
      subcategoryId: subPapad.id,
      brandId: brandNeelam.id,
      description: 'Crispy Neelam brand urad dal papad with black pepper highlights.',
      imageUrl: '/images/papad.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '500 gm Pack', price: 170, stock: 150 },
        { attributeName: 'Weight', attributeValue: '200 gm Pack', price: 75, stock: 250 }
      ]
    },
    {
      name: 'Wow Papad',
      categoryId: catDryFruitsSnacks.id,
      subcategoryId: subPapad.id,
      brandId: brandWow.id,
      description: 'Selected Wow brand spicy urad papad, quick microwave or fry companion.',
      imageUrl: '/images/papad.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '500 gm Pack', price: 160, stock: 120 },
        { attributeName: 'Weight', attributeValue: '200 gm Pack', price: 75, stock: 200 }
      ]
    },

    // ----------------------------------------------------
    // PICKLES & PRESERVES
    // ----------------------------------------------------
    {
      name: 'SST Traditional Mango Pickle',
      categoryId: catDryFruitsSnacks.id,
      subcategoryId: subPickle.id,
      brandId: brandSST.id,
      description: 'Traditional home-style spicy mango pickle in mustard oil and spices.',
      imageUrl: '/images/pickle.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '200 gm Bottle', price: 60, stock: 200 },
        { attributeName: 'Weight', attributeValue: '500 gm Bottle', price: 100, stock: 150 },
        { attributeName: 'Weight', attributeValue: '1 Kg Jar', price: 200, stock: 100 },
        { attributeName: 'Weight', attributeValue: '5 Kg Bucket', price: 380, stock: 30 }
      ]
    },

    // ----------------------------------------------------
    // JAGGERY & SWEETENERS
    // ----------------------------------------------------
    {
      name: 'Mayur Jaggery (Gur)',
      categoryId: catDryFruitsSnacks.id,
      subcategoryId: subJaggery.id,
      brandId: brandMayur.id,
      description: 'Pure sugarcane Mayur jaggery block, sulfur-free organic sweetener.',
      imageUrl: '/images/jaggery.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg Block', price: 60, stock: 200 },
        { attributeName: 'Weight', attributeValue: '500 gm Block', price: 30, stock: 250 }
      ]
    },
    {
      name: 'Organic Kesar Jaggery',
      categoryId: catDryFruitsSnacks.id,
      subcategoryId: subJaggery.id,
      brandId: brandSST.id,
      description: 'Premium organic jaggery infused with saffron (kesar) flavors.',
      imageUrl: '/images/jaggery.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg Block', price: 70, stock: 150 },
        { attributeName: 'Weight', attributeValue: '500 gm Block', price: 40, stock: 180 }
      ]
    },
    {
      name: 'Organic Jivana Sugar',
      categoryId: catDryFruitsSnacks.id,
      subcategoryId: subJaggery.id,
      brandId: brandJivana.id,
      description: 'Clean, chemical-free Jivana sugar crystals, sweet organic purity.',
      imageUrl: '/images/jaggery.png',
      variants: [
        { attributeName: 'Weight', attributeValue: '1 Kg Pack', price: 100, stock: 300 }
      ]
    }
  ];

  console.log(`Starting to insert ${productsList.length} products with variants...`);

  for (const prodData of productsList) {
    const slug = slugify(prodData.name);
    
    // Create product
    const p = await prisma.product.create({
      data: {
        name: prodData.name,
        slug: slug,
        description: prodData.description,
        imageUrl: prodData.imageUrl,
        categoryId: prodData.categoryId,
        subcategoryId: prodData.subcategoryId,
        brandId: prodData.brandId,
        status: 'ACTIVE',
        sku: slug.toUpperCase() + '-BASE',
        barcode: 'BAR-' + Math.floor(100000000000 + Math.random() * 900000000000).toString()
      }
    });

    // Create variants
    for (const v of prodData.variants) {
      await prisma.variant.create({
        data: {
          productId: p.id,
          attributeName: v.attributeName,
          attributeValue: v.attributeValue,
          price: v.price,
          stock: v.stock
        }
      });
    }
  }

  console.log('Product catalog successfully seeded with PDF items!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
