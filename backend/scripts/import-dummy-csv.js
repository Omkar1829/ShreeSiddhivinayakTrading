require('dotenv').config({ path: './backend/.env' });
const prisma = require('../config/prisma');
const fs = require('fs');
const path = require('path');

function parseCSV(csvText) {
  if (!csvText) return [];
  if (csvText.charCodeAt(0) === 0xFEFF) {
    csvText = csvText.slice(1);
  }

  const lines = [];
  let currentLine = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentLine.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentLine.push(currentVal.trim());
      if (currentLine.length > 1 || (currentLine.length === 1 && currentLine[0] !== '')) {
        lines.push(currentLine);
      }
      currentLine = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || currentLine.length > 0) {
    currentLine.push(currentVal.trim());
    if (currentLine.length > 1 || (currentLine.length === 1 && currentLine[0] !== '')) {
      lines.push(currentLine);
    }
  }
  return lines;
}

const slugify = (text) => text ? text.toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-') : '';

async function importDummyCsv() {
  const csvFilePath = path.join(__dirname, '../../siddhivinayak_products_dummy.csv');
  console.log(`📦 Reading dummy product CSV from: ${csvFilePath}`);

  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV file not found at: ${csvFilePath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvFilePath, 'utf8');
  const rows = parseCSV(csvContent);

  if (rows.length < 2) {
    console.error('❌ CSV contains no data rows.');
    process.exit(1);
  }

  const rawHeaders = rows[0].map(h => h.toLowerCase().trim());
  console.log('📋 Headers detected:', rawHeaders);

  const getColIndex = (aliases) => rawHeaders.findIndex(h => aliases.includes(h));

  const nameIdx = getColIndex(['product name', 'name', 'product']);
  const descIdx = getColIndex(['description', 'desc']);
  const catIdx = getColIndex(['category', 'category name']);
  const brandIdx = getColIndex(['brand', 'brand name']);
  const skuIdx = getColIndex(['sku', 'product sku']);
  const priceIdx = getColIndex(['price', 'mrp', 'regular price']);
  const salePriceIdx = getColIndex(['sale price', 'offer price']);
  const stockIdx = getColIndex(['stock', 'quantity', 'qty']);
  const weightIdx = getColIndex(['weight', 'volume', 'size']);
  const varNameIdx = getColIndex(['variant name', 'attribute name']);
  const varValIdx = getColIndex(['variant value', 'attribute value']);
  const imgIdx = getColIndex(['image url', 'image', 'picture']);

  let importedProductsCount = 0;
  let importedVariantsCount = 0;

  try {
    await prisma.$transaction(async (tx) => {
      const createdProductsBySlug = new Map();

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const productName = nameIdx !== -1 ? row[nameIdx] : '';
        if (!productName) continue;

        const description = descIdx !== -1 ? row[descIdx] : null;
        const categoryName = catIdx !== -1 ? row[catIdx] : null;
        const brandName = brandIdx !== -1 ? row[brandIdx] : null;
        const sku = skuIdx !== -1 ? row[skuIdx] : null;
        const price = priceIdx !== -1 ? parseFloat(row[priceIdx]) || 0 : 0;
        const stock = stockIdx !== -1 ? parseInt(row[stockIdx]) || 0 : 0;
        const weight = weightIdx !== -1 ? row[weightIdx] : null;
        const variantName = varNameIdx !== -1 ? row[varNameIdx] : 'Weight';
        const variantValue = varValIdx !== -1 ? row[varValIdx] : (weight || 'Default');
        const imageUrl = imgIdx !== -1 ? row[imgIdx] : null;

        let categoryId = null;
        if (categoryName) {
          const catSlug = slugify(categoryName);
          const category = await tx.category.upsert({
            where: { slug: catSlug },
            update: {},
            create: { name: categoryName, slug: catSlug }
          });
          categoryId = category.id;
        }

        let brandId = null;
        if (brandName) {
          const brandSlug = slugify(brandName);
          const brand = await tx.brand.upsert({
            where: { slug: brandSlug },
            update: {},
            create: { name: brandName, slug: brandSlug }
          });
          brandId = brand.id;
        }

        const prodSlug = slugify(productName);
        let product = createdProductsBySlug.get(prodSlug);

        if (!product) {
          product = await tx.product.findUnique({ where: { slug: prodSlug } });
        }

        if (!product) {
          product = await tx.product.create({
            data: {
              name: productName,
              slug: prodSlug,
              description,
              sku: sku || null,
              imageUrl: imageUrl || null,
              categoryId,
              brandId,
              status: 'ACTIVE'
            }
          });
          importedProductsCount++;
          createdProductsBySlug.set(prodSlug, product);
        }

        const existingVariant = await tx.variant.findFirst({
          where: { productId: product.id, attributeName: variantName, attributeValue: variantValue }
        });

        if (!existingVariant) {
          const createdVar = await tx.variant.create({
            data: {
              productId: product.id,
              attributeName: variantName,
              attributeValue: variantValue,
              price,
              stock,
              status: 'ACTIVE'
            }
          });

          await tx.inventoryTransaction.create({
            data: {
              variantId: createdVar.id,
              quantity: stock,
              transactionType: 'STOCK_ADDITION',
              reason: 'Imported via Dummy CSV Seed'
            }
          });

          importedVariantsCount++;
        }
      }
    }, { maxWait: 10000, timeout: 30000 });

    console.log(`✅ Successfully imported ${importedProductsCount} products and ${importedVariantsCount} product variants into the database!`);
  } catch (err) {
    console.error('❌ Error executing CSV import:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importDummyCsv();
