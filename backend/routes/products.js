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
  const { search, category, subcategory, brand, limit = 20, offset = 0 } = req.query;

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
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        subcategory: true,
        brand: true,
        variants: true
      },
      orderBy: { name: 'asc' }
    });

    return res.json({
      success: true,
      products
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
        status
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

module.exports = router;
