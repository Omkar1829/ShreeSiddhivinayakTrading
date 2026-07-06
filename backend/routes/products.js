const express = require('express');
const yup = require('yup');
const prisma = require('../config/prisma');
const validate = require('../middleware/validate');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { uploadImage } = require('../config/cloudinary');
const multer = require('multer');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();
const upload = multer();

const slugify = (text) => text.toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

// ----------------------------------------------------
// Validation Schemas
// ----------------------------------------------------

const productCreateSchema = yup.object().shape({
  name: yup.string().required('Product name is required.').min(2, 'Name must be at least 2 characters.'),
  categoryId: yup.string().uuid('Invalid Category ID.').nullable().optional(),
  subcategoryId: yup.string().uuid('Invalid Subcategory ID.').nullable().optional(),
  brandId: yup.string().uuid('Invalid Brand ID.').nullable().optional(),
  description: yup.string().nullable().optional(),
  sku: yup.string().nullable().optional(),
  barcode: yup.string().nullable().optional(),
  status: yup.string().oneOf(['ACTIVE', 'INACTIVE'], 'Status must be ACTIVE or INACTIVE.').default('ACTIVE')
});

const variantSchema = yup.object().shape({
  attributeName: yup.string().required('Attribute name is required (e.g. Weight).'),
  attributeValue: yup.string().required('Attribute value is required (e.g. 5 Kg).'),
  price: yup.number().typeError('Price must be a number.').required('Price is required.').min(0.00, 'Price cannot be negative.'),
  stock: yup.number().typeError('Stock must be an integer.').integer('Stock must be an integer.').required('Stock is required.').min(0, 'Stock cannot be negative.'),
  status: yup.string().oneOf(['ACTIVE', 'INACTIVE'], 'Status must be ACTIVE or INACTIVE.').default('ACTIVE')
});

// ----------------------------------------------------
// Public Endpoints
// ----------------------------------------------------

/**
 * Get active products list with search and filters (categories, subcategories, brands)
 */
router.get('/', async (req, res) => {
  const { search, category, subcategory, brand, minPrice, maxPrice, inStock, limit = 20, offset = 0 } = req.query;

  const parsedLimit = Math.min(parseInt(limit) || 20, 100);
  const parsedOffset = Math.max(parseInt(offset) || 0, 0);

  // Build prisma query filters
  const filterClause = {
    status: 'ACTIVE',
  };

  if (category) {
    filterClause.category = { slug: category };
  }

  if (subcategory) {
    filterClause.subcategory = { slug: subcategory };
  }

  if (brand) {
    filterClause.brand = { slug: brand };
  }

  const variantConditions = {
    status: 'ACTIVE'
  };

  let hasVariantFilter = false;

  if (minPrice || maxPrice) {
    variantConditions.price = {};
    if (minPrice) variantConditions.price.gte = parseFloat(minPrice);
    if (maxPrice) variantConditions.price.lte = parseFloat(maxPrice);
    hasVariantFilter = true;
  }

  if (inStock === 'true') {
    variantConditions.stock = { gt: 0 };
    hasVariantFilter = true;
  }

  if (hasVariantFilter) {
    filterClause.variants = {
      some: variantConditions
    };
  }

  if (search) {
    filterClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { category: { name: { contains: search, mode: 'insensitive' } } },
      { subcategory: { name: { contains: search, mode: 'insensitive' } } },
      { brand: { name: { contains: search, mode: 'insensitive' } } }
    ];
  }

  try {
    const products = await prisma.product.findMany({
      where: filterClause,
      include: {
        category: { select: { name: true, slug: true } },
        subcategory: { select: { name: true, slug: true } },
        brand: { select: { name: true, slug: true } },
        variants: {
          where: { status: 'ACTIVE' },
          orderBy: { price: 'asc' }
        }
      },
      skip: parsedOffset,
      take: parsedLimit,
      orderBy: { name: 'asc' }
    });

    const total = await prisma.product.count({ where: filterClause });

    return res.json({
      success: true,
      products,
      pagination: {
        total,
        limit: parsedLimit,
        offset: parsedOffset
      }
    });
  } catch (error) {
    console.error('Fetch products error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve products.' }
    });
  }
});

/**
 * Get single product by slug
 */
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const product = await prisma.product.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: {
        category: { select: { name: true, slug: true } },
        subcategory: { select: { name: true, slug: true } },
        brand: { select: { name: true, slug: true } },
        variants: {
          where: { status: 'ACTIVE' },
          orderBy: { price: 'asc' }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found or inactive.' }
      });
    }

    return res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Fetch product by slug error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve product details.' }
    });
  }
});

// ----------------------------------------------------
// Admin Protected Endpoints
// ----------------------------------------------------

/**
 * Admin: Get all products (including INACTIVE)
 */
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  const { search, limit, offset, categoryId, brandId } = req.query;

  const filterClause = {};
  if (categoryId) {
    filterClause.categoryId = categoryId;
  }
  if (brandId) {
    filterClause.brandId = brandId;
  }

  if (search) {
    filterClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { category: { name: { contains: search, mode: 'insensitive' } } },
      { subcategory: { name: { contains: search, mode: 'insensitive' } } },
      { brand: { name: { contains: search, mode: 'insensitive' } } },
      {
        variants: {
          some: {
            OR: [
              { attributeName: { contains: search, mode: 'insensitive' } },
              { attributeValue: { contains: search, mode: 'insensitive' } }
            ]
          }
        }
      }
    ];
  }

  try {
    const queryOptions = {
      where: filterClause,
      include: {
        category: true,
        subcategory: true,
        brand: true,
        variants: true
      },
      orderBy: { name: 'asc' }
    };

    if (limit) {
      queryOptions.take = parseInt(limit);
    }
    if (offset) {
      queryOptions.skip = parseInt(offset);
    }

    const products = await prisma.product.findMany(queryOptions);
    const total = await prisma.product.count({ where: filterClause });

    return res.json({
      success: true,
      products,
      pagination: {
        total,
        limit: limit ? parseInt(limit) : total,
        offset: offset ? parseInt(offset) : 0
      }
    });
  } catch (error) {
    console.error('Fetch admin products error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve admin products.' }
    });
  }
});

/**
 * Admin: Create a product (handles optional image upload)
 */
router.post('/', authenticateToken, requireAdmin, upload.single('image'), validate(productCreateSchema), async (req, res) => {
  const { name, categoryId, subcategoryId, brandId, description, sku, barcode, status } = req.body;
  const slug = slugify(name);

  try {
    // Check duplicates
    const duplicate = await prisma.product.findFirst({
      where: { OR: [{ slug }, sku ? { sku } : {}, barcode ? { barcode } : {}].filter(o => Object.keys(o).length > 0) }
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_PRODUCT', message: 'A product with this name, SKU, or barcode already exists.' }
      });
    }

    let imageUrl = null;
    if (req.file) {
      const uploadResult = await uploadImage(req.file.buffer, 'products');
      imageUrl = uploadResult.secure_url;
    }

    let variantsList = [];
    if (req.body.variants) {
      try {
        variantsList = JSON.parse(req.body.variants);
      } catch (e) {
        variantsList = [];
      }
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        categoryId: categoryId || null,
        subcategoryId: subcategoryId || null,
        brandId: brandId || null,
        description: description || null,
        sku: sku || null,
        barcode: barcode || null,
        imageUrl,
        status,
        variants: {
          create: variantsList
            .filter(v => v.attributeValue && !isNaN(parseFloat(v.price)) && !isNaN(parseInt(v.stock)))
            .map(v => ({
              attributeName: v.attributeName || 'Weight',
              attributeValue: v.attributeValue,
              price: parseFloat(v.price),
              stock: parseInt(v.stock),
              status: v.status || 'ACTIVE'
            }))
        }
      },
      include: {
        variants: true
      }
    });

    await logAudit(null, {
      tableName: 'products',
      recordId: product.id,
      action: 'INSERT',
      newValues: product,
      userId: req.user.id
    });

    return res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create product.' }
    });
  }
});

/**
 * Admin: Update a product
 */
router.put('/:id', authenticateToken, requireAdmin, upload.single('image'), validate(productCreateSchema), async (req, res) => {
  const { id } = req.params;
  const { name, categoryId, subcategoryId, brandId, description, sku, barcode, status } = req.body;
  const slug = slugify(name);

  try {
    const oldProduct = await prisma.product.findUnique({ where: { id } });
    if (!oldProduct) {
      return res.status(404).json({
        success: false,
        error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found.' }
      });
    }

    // Check duplicates on other records
    const duplicate = await prisma.product.findFirst({
      where: {
        id: { not: id },
        OR: [{ slug }, sku ? { sku } : {}, barcode ? { barcode } : {}].filter(o => Object.keys(o).length > 0)
      }
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_PRODUCT', message: 'Another product with this name, SKU, or barcode already exists.' }
      });
    }

    let imageUrl = oldProduct.imageUrl;
    if (req.file) {
      const uploadResult = await uploadImage(req.file.buffer, 'products');
      imageUrl = uploadResult.secure_url;
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name,
        slug,
        categoryId: categoryId || null,
        subcategoryId: subcategoryId || null,
        brandId: brandId || null,
        description: description || null,
        sku: sku || null,
        barcode: barcode || null,
        imageUrl,
        status
      }
    });

    await logAudit(null, {
      tableName: 'products',
      recordId: id,
      action: 'UPDATE',
      oldValues: oldProduct,
      newValues: updatedProduct,
      userId: req.user.id
    });

    return res.json({
      success: true,
      product: updatedProduct
    });
  } catch (error) {
    console.error('Update product error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update product.' }
    });
  }
});

/**
 * Admin: Delete a product
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const oldProduct = await prisma.product.findUnique({ where: { id } });
    if (!oldProduct) {
      return res.status(404).json({
        success: false,
        error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found.' }
      });
    }

    await prisma.product.delete({ where: { id } });

    await logAudit(null, {
      tableName: 'products',
      recordId: id,
      action: 'DELETE',
      oldValues: oldProduct,
      userId: req.user.id
    });

    return res.json({
      success: true,
      message: 'Product and all associated variants deleted successfully.'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete product.' }
    });
  }
});

// ----------------------------------------------------
// Variants API
// ----------------------------------------------------

/**
 * Admin: Add a variant to product
 */
router.post('/:productId/variants', authenticateToken, requireAdmin, validate(variantSchema), async (req, res) => {
  const { productId } = req.params;
  const { attributeName, attributeValue, price, stock, status } = req.body;

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'PRODUCT_NOT_FOUND', message: 'Parent product not found.' }
      });
    }

    // Check duplicate variant attributes on this product
    const duplicate = await prisma.variant.findFirst({
      where: { productId, attributeName, attributeValue }
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_VARIANT', message: 'A variant with these attributes already exists on this product.' }
      });
    }

    // Use Prisma transaction to create variant and audit transaction log
    const variant = await prisma.$transaction(async (tx) => {
      const newVar = await tx.variant.create({
        data: {
          productId,
          attributeName,
          attributeValue,
          price,
          stock,
          status
        }
      });

      // Log inventory initial transaction
      await tx.inventoryTransaction.create({
        data: {
          variantId: newVar.id,
          quantity: stock,
          transactionType: 'STOCK_ADDITION',
          reason: 'Initial stock addition during variant creation',
          adminUserId: req.user.id
        }
      });

      return newVar;
    });

    await logAudit(null, {
      tableName: 'variants',
      recordId: variant.id,
      action: 'INSERT',
      newValues: variant,
      userId: req.user.id
    });

    return res.status(201).json({
      success: true,
      variant
    });
  } catch (error) {
    console.error('Create variant error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to add variant.' }
    });
  }
});

/**
 * Admin: Update a variant
 */
router.put('/variants/:id', authenticateToken, requireAdmin, validate(variantSchema), async (req, res) => {
  const { id } = req.params;
  const { attributeName, attributeValue, price, stock, status } = req.body;

  try {
    const oldVariant = await prisma.variant.findUnique({ where: { id } });
    if (!oldVariant) {
      return res.status(404).json({
        success: false,
        error: { code: 'VARIANT_NOT_FOUND', message: 'Variant not found.' }
      });
    }

    // Check duplicate variant settings on other records
    const duplicate = await prisma.variant.findFirst({
      where: {
        id: { not: id },
        productId: oldVariant.productId,
        attributeName,
        attributeValue
      }
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_VARIANT', message: 'Another variant with these attributes already exists on this product.' }
      });
    }

    // Execute variant update and log inventory difference if any
    const updatedVar = await prisma.$transaction(async (tx) => {
      const currentVal = await tx.variant.update({
        where: { id },
        data: {
          attributeName,
          attributeValue,
          price,
          stock, // Update stock directly
          status
        }
      });

      const diff = stock - oldVariant.stock;
      if (diff !== 0) {
        // Record inventory transaction
        await tx.inventoryTransaction.create({
          data: {
            variantId: id,
            quantity: diff,
            transactionType: 'MANUAL_ADJUSTMENT',
            reason: `Manual inventory count updated from ${oldVariant.stock} to ${stock}`,
            adminUserId: req.user.id
          }
        });
      }

      return currentVal;
    });

    await logAudit(null, {
      tableName: 'variants',
      recordId: id,
      action: 'UPDATE',
      oldValues: oldVariant,
      newValues: updatedVar,
      userId: req.user.id
    });

    return res.json({
      success: true,
      variant: updatedVar
    });
  } catch (error) {
    console.error('Update variant error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update variant details.' }
    });
  }
});

/**
 * Admin: Delete a variant
 */
router.delete('/variants/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const oldVariant = await prisma.variant.findUnique({ where: { id } });
    if (!oldVariant) {
      return res.status(404).json({
        success: false,
        error: { code: 'VARIANT_NOT_FOUND', message: 'Variant not found.' }
      });
    }

    await prisma.variant.delete({ where: { id } });

    await logAudit(null, {
      tableName: 'variants',
      recordId: id,
      action: 'DELETE',
      oldValues: oldVariant,
      userId: req.user.id
    });

    return res.json({
      success: true,
      message: 'Variant deleted successfully.'
    });
  } catch (error) {
    console.error('Delete variant error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete variant.' }
    });
  }
});

// CSV parser helper function
function parseCSV(csvText) {
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
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentLine.push(currentVal.trim());
      if (currentLine.length > 1 || currentLine[0] !== '') {
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
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Admin: Bulk import products and variants via CSV
 */
router.post('/admin/import-csv', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: { message: 'No CSV file was uploaded.' } });
  }

  const axios = require('axios');
  const csvText = req.file.buffer.toString('utf8');
  let parsedRows;
  try {
    parsedRows = parseCSV(csvText);
  } catch (parseErr) {
    return res.status(400).json({ success: false, error: { message: 'Failed to parse CSV file format.' } });
  }

  if (parsedRows.length <= 1) {
    return res.status(400).json({ success: false, error: { message: 'CSV file must contain a header row and at least one data row.' } });
  }

  const headerRow = parsedRows[0].map(h => h.toLowerCase().replace(/\s+/g, ''));
  const dataRows = parsedRows.slice(1);

  const colIndex = (name) => headerRow.indexOf(name);
  
  const idxName = colIndex('productname');
  const idxDesc = colIndex('description');
  const idxCategory = colIndex('category');
  const idxBrand = colIndex('brand');
  const idxSku = colIndex('sku');
  const idxPrice = colIndex('price');
  const idxSalePrice = colIndex('saleprice');
  const idxStock = colIndex('stock');
  const idxWeight = colIndex('weight');
  const idxVarName = colIndex('variantname');
  const idxVarVal = colIndex('variantvalue');
  const idxImageUrl = colIndex('imageurl');

  if (idxName === -1) {
    return res.status(400).json({ success: false, error: { message: "CSV is missing the required 'Product Name' header." } });
  }

  const errors = [];
  const validRows = [];
  const seenSkus = new Set();
  
  // First pass: validation
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2;

    if (row.length === 0 || (row.length === 1 && row[0] === '')) {
      continue;
    }

    const name = idxName !== -1 ? row[idxName] : '';
    const sku = idxSku !== -1 ? row[idxSku] : '';
    const priceStr = idxPrice !== -1 ? row[idxPrice] : '';
    const stockStr = idxStock !== -1 ? row[idxStock] : '';

    if (!name) {
      errors.push({ row: rowNum, error: "Missing required field: 'Product Name'" });
      continue;
    }

    if (sku) {
      if (seenSkus.has(sku)) {
        errors.push({ row: rowNum, error: `Duplicate SKU within CSV file: '${sku}'` });
        continue;
      }
      seenSkus.add(sku);

      const dbProduct = await prisma.product.findUnique({ where: { sku } });
      if (dbProduct) {
        errors.push({ row: rowNum, error: `SKU already exists in the database: '${sku}'` });
        continue;
      }
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
      errors.push({ row: rowNum, error: `Invalid Price value: '${priceStr}'. Must be a number >= 0.` });
      continue;
    }

    const stock = parseInt(stockStr);
    if (isNaN(stock) || stock < 0) {
      errors.push({ row: rowNum, error: `Invalid Stock value: '${stockStr}'. Must an integer >= 0.` });
      continue;
    }

    validRows.push({
      rowNum,
      name,
      description: idxDesc !== -1 ? row[idxDesc] : '',
      categoryName: idxCategory !== -1 ? row[idxCategory] : '',
      brandName: idxBrand !== -1 ? row[idxBrand] : '',
      sku,
      price,
      stock,
      weight: idxWeight !== -1 ? row[idxWeight] : '',
      variantName: idxVarName !== -1 ? row[idxVarName] : '',
      variantValue: idxVarVal !== -1 ? row[idxVarVal] : '',
      imageUrl: idxImageUrl !== -1 ? row[idxImageUrl] : ''
    });
  }

  if (errors.length > 0) {
    return res.json({
      success: false,
      summary: {
        totalRows: dataRows.length,
        importedProducts: 0,
        importedVariants: 0,
        failedRowsCount: errors.length
      },
      errors
    });
  }

  let importedProductsCount = 0;
  let importedVariantsCount = 0;

  for (const row of validRows) {
    try {
      let uploadedImageUrl = null;
      if (row.imageUrl) {
        try {
          if (row.imageUrl.startsWith('http://') || row.imageUrl.startsWith('https://')) {
            const imageResponse = await axios.get(row.imageUrl, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(imageResponse.data, 'binary');
            const uploadResult = await uploadImage(imageBuffer, 'products');
            uploadedImageUrl = uploadResult.secure_url;
          }
        } catch (imgErr) {
          console.error(`Failed to fetch/upload image from URL: ${row.imageUrl}`, imgErr.message);
        }
      }

      let categoryId = null;
      if (row.categoryName) {
        const catSlug = slugify(row.categoryName);
        const category = await prisma.category.upsert({
          where: { slug: catSlug },
          update: {},
          create: { name: row.categoryName, slug: catSlug }
        });
        categoryId = category.id;
      }

      let brandId = null;
      if (row.brandName) {
        const brandSlug = slugify(row.brandName);
        const brand = await prisma.brand.upsert({
          where: { slug: brandSlug },
          update: {},
          create: { name: row.brandName, slug: brandSlug }
        });
        brandId = brand.id;
      }

      const prodSlug = slugify(row.name);
      let product = await prisma.product.findUnique({
        where: { slug: prodSlug }
      });

      if (!product) {
        product = await prisma.product.create({
          data: {
            name: row.name,
            slug: prodSlug,
            description: row.description,
            sku: row.sku || null,
            imageUrl: uploadedImageUrl || row.imageUrl || null,
            categoryId,
            brandId,
            status: 'ACTIVE'
          }
        });
        importedProductsCount++;
      }

      const attributeName = row.variantName || 'Weight';
      const attributeValue = row.variantValue || row.weight || '1 Kg';

      const existingVariant = await prisma.variant.findFirst({
        where: {
          productId: product.id,
          attributeName,
          attributeValue
        }
      });

      if (!existingVariant) {
        const createdVar = await prisma.variant.create({
          data: {
            productId: product.id,
            attributeName,
            attributeValue,
            price: row.price,
            stock: row.stock,
            status: 'ACTIVE'
          }
        });

        await prisma.inventoryTransaction.create({
          data: {
            variantId: createdVar.id,
            quantity: row.stock,
            transactionType: 'STOCK_ADDITION',
            reason: 'Imported via CSV file bulk upload'
          }
        });

        importedVariantsCount++;
      }
    } catch (rowErr) {
      console.error(`Error processing CSV row ${row.rowNum}:`, rowErr);
      errors.push({ row: row.rowNum, error: `Database error: ${rowErr.message}` });
    }
  }

  return res.json({
    success: errors.length === 0,
    summary: {
      totalRows: dataRows.length,
      importedProducts: importedProductsCount,
      importedVariants: importedVariantsCount,
      failedRowsCount: errors.length
    },
    errors
  });
});

module.exports = router;
