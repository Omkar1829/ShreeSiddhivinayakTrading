const express = require('express');
const yup = require('yup');
const prisma = require('../config/prisma');
const validate = require('../middleware/validate');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const { logAudit } = require('../utils/auditLogger');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Local Multer Disk Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Helper functions to resolve absolute image URLs dynamically (including default grayscale SVG)
const mapProductImage = (prod, req) => {
  if (!prod) return prod;
  const hostUrl = `${req.protocol}://${req.get('host')}`;
  const imageUrl = prod.imageUrl
    ? (prod.imageUrl.startsWith('http') ? prod.imageUrl : `${hostUrl}${prod.imageUrl}`)
    : `${hostUrl}/uploads/default-product.svg`;
  return {
    ...prod,
    imageUrl
  };
};

const mapProductsImages = (products, req) => {
  if (Array.isArray(products)) {
    return products.map(p => mapProductImage(p, req));
  }
  return mapProductImage(products, req);
};

const slugify = (text) => text.toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

// ----------------------------------------------------
// Validation Schemas
// ----------------------------------------------------

const productCreateSchema = yup.object().shape({
  name: yup.string().required('Product name is required.').min(2, 'Name must be at least 2 characters.'),
  categoryId: yup.string().transform((val) => (val === '' ? null : val)).uuid('Invalid Category ID.').nullable().optional(),
  subcategoryId: yup.string().transform((val) => (val === '' ? null : val)).uuid('Invalid Subcategory ID.').nullable().optional(),
  brandId: yup.string().transform((val) => (val === '' ? null : val)).uuid('Invalid Brand ID.').nullable().optional(),
  description: yup.string().transform((val) => (val === '' ? null : val)).nullable().optional(),
  sku: yup.string().transform((val) => (val === '' ? null : val)).nullable().optional(),
  barcode: yup.string().transform((val) => (val === '' ? null : val)).nullable().optional(),
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
      products: mapProductsImages(products, req),
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
      product: mapProductImage(product, req)
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
      products: mapProductsImages(products, req),
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
      imageUrl = `/uploads/${req.file.filename}`;
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
      product: mapProductImage(product, req)
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
      imageUrl = `/uploads/${req.file.filename}`;
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
      product: mapProductImage(updatedProduct, req)
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

    await prisma.$transaction(async (tx) => {
      const timestamp = Date.now();

      await tx.product.update({
        where: { id },
        data: {
          slug: `${oldProduct.slug}-deleted-${timestamp}`,
          sku: oldProduct.sku ? `${oldProduct.sku}-deleted-${timestamp}` : null,
          barcode: oldProduct.barcode ? `${oldProduct.barcode}-deleted-${timestamp}` : null,
          status: 'INACTIVE',
          deletedAt: new Date(),
          deletedBy: req.user.id
        }
      });

      // Soft delete all variants of this product
      const variants = await tx.variant.findMany({
        where: { productId: id }
      });

      for (const v of variants) {
        await tx.variant.update({
          where: { id: v.id },
          data: {
            status: 'INACTIVE',
            deletedAt: new Date(),
            deletedBy: req.user.id
          }
        });
      }
    });

    await logAudit(null, {
      tableName: 'products',
      recordId: id,
      action: 'DELETE',
      oldValues: oldProduct,
      userId: req.user.id
    });

    return res.json({
      success: true,
      message: 'Product and all associated variants soft-deleted successfully.'
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

    await prisma.variant.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        deletedAt: new Date(),
        deletedBy: req.user.id
      }
    });

    await logAudit(null, {
      tableName: 'variants',
      recordId: id,
      action: 'DELETE',
      oldValues: oldVariant,
      userId: req.user.id
    });

    return res.json({
      success: true,
      message: 'Variant soft-deleted successfully.'
    });
  } catch (error) {
    console.error('Delete variant error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete variant.' }
    });
  }
});

// CSV parser helper function with UTF-8 BOM stripping
function parseCSV(csvText) {
  if (!csvText) return [];
  // Strip UTF-8 Byte Order Mark (BOM) if present
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
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
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

const { validateCsvUpload } = require('../middleware/uploadValidator');

/**
 * Admin: Bulk import products and variants via CSV
 */
router.post('/admin/import-csv', authenticateToken, requireAdmin, upload.single('file'), validateCsvUpload, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: { message: 'No CSV file was uploaded.' } });
  }

  const axios = require('axios');
  let csvText = '';

  // Dual Multer Storage Compatibility (Memory Buffer vs Disk File Path)
  try {
    if (req.file.buffer) {
      csvText = req.file.buffer.toString('utf8');
    } else if (req.file.path) {
      csvText = fs.readFileSync(req.file.path, 'utf8');
      try {
        fs.unlinkSync(req.file.path); // Clean up temporary file from disk
      } catch (unlinkErr) {
        console.warn('Failed to delete temporary CSV upload file:', unlinkErr.message);
      }
    } else {
      return res.status(400).json({ success: false, error: { message: 'Uploaded file content could not be read.' } });
    }
  } catch (fileErr) {
    return res.status(500).json({ success: false, error: { message: `Error reading uploaded file: ${fileErr.message}` } });
  }

  let parsedRows;
  try {
    parsedRows = parseCSV(csvText);
  } catch (parseErr) {
    return res.status(400).json({ success: false, error: { message: 'Failed to parse CSV file format.' } });
  }

  if (parsedRows.length <= 1) {
    return res.status(400).json({ success: false, error: { message: 'CSV file must contain a header row and at least one data row.' } });
  }

  const headerRow = parsedRows[0].map(h => h.toLowerCase().replace(/[\s_]+/g, ''));
  const dataRows = parsedRows.slice(1);

  // Flexible Header Column Alias Dictionary
  const aliasMap = {
    name: ['productname', 'name', 'product', 'title', 'itemname'],
    description: ['description', 'desc', 'details'],
    category: ['category', 'categoryname', 'cat'],
    brand: ['brand', 'brandname'],
    sku: ['sku', 'productsku', 'itemsku', 'code', 'barcode'],
    price: ['price', 'mrp', 'unitprice', 'cost'],
    salePrice: ['saleprice', 'offerprice', 'discountprice'],
    stock: ['stock', 'quantity', 'qty', 'inventory'],
    weight: ['weight', 'size', 'unit'],
    variantName: ['variantname', 'attributename', 'type'],
    variantValue: ['variantvalue', 'attributevalue', 'variant'],
    imageUrl: ['imageurl', 'image', 'img', 'photo', 'picture']
  };

  const findColIndex = (aliases) => {
    for (const alias of aliases) {
      const idx = headerRow.indexOf(alias);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const idxName = findColIndex(aliasMap.name);
  const idxDesc = findColIndex(aliasMap.description);
  const idxCategory = findColIndex(aliasMap.category);
  const idxBrand = findColIndex(aliasMap.brand);
  const idxSku = findColIndex(aliasMap.sku);
  const idxPrice = findColIndex(aliasMap.price);
  const idxSalePrice = findColIndex(aliasMap.salePrice);
  const idxStock = findColIndex(aliasMap.stock);
  const idxWeight = findColIndex(aliasMap.weight);
  const idxVarName = findColIndex(aliasMap.variantName);
  const idxVarVal = findColIndex(aliasMap.variantValue);
  const idxImageUrl = findColIndex(aliasMap.imageUrl);

  if (idxName === -1) {
    return res.status(400).json({
      success: false,
      error: { message: "CSV is missing a required 'Product Name' or 'Name' header column." }
    });
  }

  const errors = [];
  const validRows = [];
  const seenSkus = new Set();

  // First Pass: Data Validation
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
        errors.push({ row: rowNum, error: `SKU already exists in database: '${sku}'` });
        continue;
      }
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
      errors.push({ row: rowNum, error: `Invalid Price value: '${priceStr}'. Must be a number >= 0.` });
      continue;
    }

    const stock = stockStr !== '' ? parseInt(stockStr, 10) : 0;
    if (isNaN(stock) || stock < 0) {
      errors.push({ row: rowNum, error: `Invalid Stock value: '${stockStr}'. Must be an integer >= 0.` });
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

  // Transactional Bulk Import Execution
  try {
    await prisma.$transaction(async (tx) => {
      const createdProductsBySlug = new Map();

      for (const row of validRows) {
        let uploadedImageUrl = null;
        if (row.imageUrl) {
          try {
            if (row.imageUrl.startsWith('http://') || row.imageUrl.startsWith('https://')) {
              const imageResponse = await axios.get(row.imageUrl, {
                responseType: 'arraybuffer',
                timeout: 5000 // 5 seconds timeout
              });
              const imageBuffer = Buffer.from(imageResponse.data, 'binary');
              const uploadResult = await uploadImage(imageBuffer, 'products');
              uploadedImageUrl = uploadResult.secure_url;
            }
          } catch (imgErr) {
            console.warn(`Failed to fetch/upload image from URL '${row.imageUrl}':`, imgErr.message);
          }
        }

        let categoryId = null;
        if (row.categoryName) {
          const catSlug = slugify(row.categoryName);
          const category = await tx.category.upsert({
            where: { slug: catSlug },
            update: {},
            create: { name: row.categoryName, slug: catSlug }
          });
          categoryId = category.id;
        }

        let brandId = null;
        if (row.brandName) {
          const brandSlug = slugify(row.brandName);
          const brand = await tx.brand.upsert({
            where: { slug: brandSlug },
            update: {},
            create: { name: row.brandName, slug: brandSlug }
          });
          brandId = brand.id;
        }

        const prodSlug = slugify(row.name);
        let product = createdProductsBySlug.get(prodSlug);

        if (!product) {
          product = await tx.product.findUnique({
            where: { slug: prodSlug }
          });
        }

        if (!product) {
          product = await tx.product.create({
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
          createdProductsBySlug.set(prodSlug, product);
        }

        const attributeName = row.variantName || 'Weight';
        const attributeValue = row.variantValue || row.weight || '1 Kg';

        const existingVariant = await tx.variant.findFirst({
          where: {
            productId: product.id,
            attributeName,
            attributeValue
          }
        });

        if (!existingVariant) {
          const createdVar = await tx.variant.create({
            data: {
              productId: product.id,
              attributeName,
              attributeValue,
              price: row.price,
              stock: row.stock,
              status: 'ACTIVE'
            }
          });

          await tx.inventoryTransaction.create({
            data: {
              variantId: createdVar.id,
              quantity: row.stock,
              transactionType: 'STOCK_ADDITION',
              reason: 'Imported via CSV bulk upload'
            }
          });

          importedVariantsCount++;
        }
      }
    }, { maxWait: 10000, timeout: 30000 });

    return res.json({
      success: true,
      summary: {
        totalRows: dataRows.length,
        importedProducts: importedProductsCount,
        importedVariants: importedVariantsCount,
        failedRowsCount: 0
      },
      errors: []
    });
  } catch (txError) {
    console.error('CSV Transactional Import Error:', txError);
    return res.status(500).json({
      success: false,
      error: {
        message: `Database transaction failed during CSV import: ${txError.message}`
      }
    });
  }
});

module.exports = router;
