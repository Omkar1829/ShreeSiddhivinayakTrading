const express = require('express');
const yup = require('yup');
const prisma = require('../config/prisma');
const validate = require('../middleware/validate');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

// Helper to slugify strings
const slugify = (text) => text.toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

// ----------------------------------------------------
// Validation Schemas
// ----------------------------------------------------

const categorySchema = yup.object().shape({
  name: yup.string().required('Category name is required.').min(2, 'Name must be at least 2 characters.'),
  status: yup.string().oneOf(['ACTIVE', 'INACTIVE'], 'Status must be ACTIVE or INACTIVE.').default('ACTIVE')
});

const subcategorySchema = yup.object().shape({
  name: yup.string().required('Subcategory name is required.').min(2, 'Name must be at least 2 characters.'),
  status: yup.string().oneOf(['ACTIVE', 'INACTIVE'], 'Status must be ACTIVE or INACTIVE.').default('ACTIVE')
});

// ----------------------------------------------------
// Public Endpoints
// ----------------------------------------------------

/**
 * Get all active categories with active subcategories
 */
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { status: 'ACTIVE' },
      include: {
        subcategories: {
          where: { status: 'ACTIVE' }
        }
      },
      orderBy: { name: 'asc' }
    });

    return res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Fetch categories error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve categories.' }
    });
  }
});

// ----------------------------------------------------
// Admin Protected Endpoints
// ----------------------------------------------------

/**
 * Admin: Get all categories (including INACTIVE)
 */
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        subcategories: true
      },
      orderBy: { name: 'asc' }
    });

    return res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Fetch admin categories error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve categories for administration.' }
    });
  }
});

/**
 * Admin: Create a category
 */
router.post('/', authenticateToken, requireAdmin, validate(categorySchema), async (req, res) => {
  const { name, status } = req.body;
  const slug = slugify(name);

  try {
    // Check uniqueness
    const existing = await prisma.category.findFirst({
      where: { OR: [{ name }, { slug }] }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_CATEGORY', message: 'A category with this name or slug already exists.' }
      });
    }

    const category = await prisma.category.create({
      data: { name, slug, status }
    });

    await logAudit(null, {
      tableName: 'categories',
      recordId: category.id,
      action: 'INSERT',
      newValues: category,
      userId: req.user.id
    });

    return res.status(201).json({
      success: true,
      category
    });
  } catch (error) {
    console.error('Create category error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create category.' }
    });
  }
});

/**
 * Admin: Update a category
 */
router.put('/:id', authenticateToken, requireAdmin, validate(categorySchema), async (req, res) => {
  const { id } = req.params;
  const { name, status } = req.body;
  const slug = slugify(name);

  try {
    const oldCategory = await prisma.category.findUnique({ where: { id } });
    if (!oldCategory) {
      return res.status(404).json({
        success: false,
        error: { code: 'CATEGORY_NOT_FOUND', message: 'Category not found.' }
      });
    }

    // Check duplicate name on other rows
    const duplicate = await prisma.category.findFirst({
      where: {
        id: { not: id },
        OR: [{ name }, { slug }]
      }
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_CATEGORY', message: 'Another category with this name already exists.' }
      });
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: { name, slug, status }
    });

    await logAudit(null, {
      tableName: 'categories',
      recordId: id,
      action: 'UPDATE',
      oldValues: oldCategory,
      newValues: updatedCategory,
      userId: req.user.id
    });

    return res.json({
      success: true,
      category: updatedCategory
    });
  } catch (error) {
    console.error('Update category error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update category.' }
    });
  }
});

/**
 * Admin: Delete a category
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const oldCategory = await prisma.category.findUnique({ where: { id } });
    if (!oldCategory) {
      return res.status(404).json({
        success: false,
        error: { code: 'CATEGORY_NOT_FOUND', message: 'Category not found.' }
      });
    }

    await prisma.$transaction(async (tx) => {
      const timestamp = Date.now();
      
      // 1. Soft delete the category
      await tx.category.update({
        where: { id },
        data: {
          name: `${oldCategory.name}_deleted_${timestamp}`,
          slug: `${oldCategory.slug}_deleted_${timestamp}`,
          status: 'INACTIVE',
          deletedAt: new Date(),
          deletedBy: req.user.id
        }
      });

      // 2. Fetch and soft-delete all subcategories
      const subcategories = await tx.subcategory.findMany({
        where: { categoryId: id }
      });

      for (const sub of subcategories) {
        await tx.subcategory.update({
          where: { id: sub.id },
          data: {
            name: `${sub.name}-deleted-${timestamp}`,
            slug: `${sub.slug}-deleted-${timestamp}`,
            status: 'INACTIVE',
            deletedAt: new Date(),
            deletedBy: req.user.id
          }
        });
      }

      // 3. Fetch and soft-delete all products
      const products = await tx.product.findMany({
        where: { categoryId: id }
      });

      for (const prod of products) {
        await tx.product.update({
          where: { id: prod.id },
          data: {
            slug: `${prod.slug}-deleted-${timestamp}`,
            sku: prod.sku ? `${prod.sku}-deleted-${timestamp}` : null,
            barcode: prod.barcode ? `${prod.barcode}-deleted-${timestamp}` : null,
            status: 'INACTIVE',
            deletedAt: new Date(),
            deletedBy: req.user.id
          }
        });
      }
    });

    await logAudit(null, {
      tableName: 'categories',
      recordId: id,
      action: 'DELETE',
      oldValues: oldCategory,
      userId: req.user.id
    });

    return res.json({
      success: true,
      message: 'Category and all associated subcategories and products soft-deleted successfully.'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete category.' }
    });
  }
});

// ----------------------------------------------------
// Subcategories API
// ----------------------------------------------------

/**
 * Admin: Create a subcategory
 */
router.post('/:categoryId/subcategories', authenticateToken, requireAdmin, validate(subcategorySchema), async (req, res) => {
  const { categoryId } = req.params;
  const { name, status } = req.body;
  const slug = slugify(name);

  try {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return res.status(404).json({
        success: false,
        error: { code: 'CATEGORY_NOT_FOUND', message: 'Parent category not found.' }
      });
    }

    // Check duplicate name inside the same category
    const duplicate = await prisma.subcategory.findFirst({
      where: { categoryId, name }
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_SUBCATEGORY', message: 'A subcategory with this name already exists under this category.' }
      });
    }

    const subcategory = await prisma.subcategory.create({
      data: { categoryId, name, slug, status }
    });

    await logAudit(null, {
      tableName: 'subcategories',
      recordId: subcategory.id,
      action: 'INSERT',
      newValues: subcategory,
      userId: req.user.id
    });

    return res.status(201).json({
      success: true,
      subcategory
    });
  } catch (error) {
    console.error('Create subcategory error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create subcategory.' }
    });
  }
});

/**
 * Admin: Update a subcategory
 */
router.put('/subcategories/:id', authenticateToken, requireAdmin, validate(subcategorySchema), async (req, res) => {
  const { id } = req.params;
  const { name, status } = req.body;
  const slug = slugify(name);

  try {
    const oldSubcategory = await prisma.subcategory.findUnique({ where: { id } });
    if (!oldSubcategory) {
      return res.status(404).json({
        success: false,
        error: { code: 'SUBCATEGORY_NOT_FOUND', message: 'Subcategory not found.' }
      });
    }

    // Check uniqueness within the same parent category
    const duplicate = await prisma.subcategory.findFirst({
      where: {
        id: { not: id },
        categoryId: oldSubcategory.categoryId,
        name
      }
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_SUBCATEGORY', message: 'Another subcategory with this name exists in this category.' }
      });
    }

    const updatedSub = await prisma.subcategory.update({
      where: { id },
      data: { name, slug, status }
    });

    await logAudit(null, {
      tableName: 'subcategories',
      recordId: id,
      action: 'UPDATE',
      oldValues: oldSubcategory,
      newValues: updatedSub,
      userId: req.user.id
    });

    return res.json({
      success: true,
      subcategory: updatedSub
    });
  } catch (error) {
    console.error('Update subcategory error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update subcategory.' }
    });
  }
});

/**
 * Admin: Delete a subcategory
 */
router.delete('/subcategories/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const oldSubcategory = await prisma.subcategory.findUnique({ where: { id } });
    if (!oldSubcategory) {
      return res.status(404).json({
        success: false,
        error: { code: 'SUBCATEGORY_NOT_FOUND', message: 'Subcategory not found.' }
      });
    }

    await prisma.$transaction(async (tx) => {
      const timestamp = Date.now();

      await tx.subcategory.update({
        where: { id },
        data: {
          name: `${oldSubcategory.name}-deleted-${timestamp}`,
          slug: `${oldSubcategory.slug}-deleted-${timestamp}`,
          status: 'INACTIVE',
          deletedAt: new Date(),
          deletedBy: req.user.id
        }
      });

      // Fetch and soft-delete all products in this subcategory
      const products = await tx.product.findMany({
        where: { subcategoryId: id }
      });

      for (const prod of products) {
        await tx.product.update({
          where: { id: prod.id },
          data: {
            slug: `${prod.slug}-deleted-${timestamp}`,
            sku: prod.sku ? `${prod.sku}-deleted-${timestamp}` : null,
            barcode: prod.barcode ? `${prod.barcode}-deleted-${timestamp}` : null,
            status: 'INACTIVE',
            deletedAt: new Date(),
            deletedBy: req.user.id
          }
        });
      }
    });

    await logAudit(null, {
      tableName: 'subcategories',
      recordId: id,
      action: 'DELETE',
      oldValues: oldSubcategory,
      userId: req.user.id
    });

    return res.json({
      success: true,
      message: 'Subcategory and all associated products soft-deleted successfully.'
    });
  } catch (error) {
    console.error('Delete subcategory error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete subcategory.' }
    });
  }
});

module.exports = router;
