const express = require('express');
const yup = require('yup');
const prisma = require('../config/prisma');
const validate = require('../middleware/validate');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

const slugify = (text) => text.toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

// ----------------------------------------------------
// Validation Schemas
// ----------------------------------------------------

const brandSchema = yup.object().shape({
  name: yup.string().required('Brand name is required.').min(2, 'Brand name must be at least 2 characters.'),
  logoUrl: yup.string().url('Logo must be a valid URL.').nullable(),
  status: yup.string().oneOf(['ACTIVE', 'INACTIVE'], 'Status must be ACTIVE or INACTIVE.').default('ACTIVE')
});

// ----------------------------------------------------
// Public Endpoints
// ----------------------------------------------------

/**
 * Get all active brands
 */
router.get('/', async (req, res) => {
  try {
    const brands = await prisma.brand.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' }
    });

    return res.json({
      success: true,
      brands
    });
  } catch (error) {
    console.error('Fetch brands error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve brands.' }
    });
  }
});

// ----------------------------------------------------
// Admin Protected Endpoints
// ----------------------------------------------------

/**
 * Admin: Get all brands (including INACTIVE)
 */
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: { name: 'asc' }
    });

    return res.json({
      success: true,
      brands
    });
  } catch (error) {
    console.error('Fetch admin brands error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve brands.' }
    });
  }
});

/**
 * Admin: Create a brand
 */
router.post('/', authenticateToken, requireAdmin, validate(brandSchema), async (req, res) => {
  const { name, logoUrl, status } = req.body;
  const slug = slugify(name);

  try {
    const existing = await prisma.brand.findFirst({
      where: { OR: [{ name }, { slug }] }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_BRAND', message: 'A brand with this name or slug already exists.' }
      });
    }

    const brand = await prisma.brand.create({
      data: { name, slug, logoUrl, status }
    });

    await logAudit(null, {
      tableName: 'brands',
      recordId: brand.id,
      action: 'INSERT',
      newValues: brand,
      userId: req.user.id
    });

    return res.status(201).json({
      success: true,
      brand
    });
  } catch (error) {
    console.error('Create brand error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create brand.' }
    });
  }
});

/**
 * Admin: Update a brand
 */
router.put('/:id', authenticateToken, requireAdmin, validate(brandSchema), async (req, res) => {
  const { id } = req.params;
  const { name, logoUrl, status } = req.body;
  const slug = slugify(name);

  try {
    const oldBrand = await prisma.brand.findUnique({ where: { id } });
    if (!oldBrand) {
      return res.status(404).json({
        success: false,
        error: { code: 'BRAND_NOT_FOUND', message: 'Brand not found.' }
      });
    }

    const duplicate = await prisma.brand.findFirst({
      where: {
        id: { not: id },
        OR: [{ name }, { slug }]
      }
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_BRAND', message: 'Another brand with this name or slug already exists.' }
      });
    }

    const updatedBrand = await prisma.brand.update({
      where: { id },
      data: { name, slug, logoUrl, status }
    });

    await logAudit(null, {
      tableName: 'brands',
      recordId: id,
      action: 'UPDATE',
      oldValues: oldBrand,
      newValues: updatedBrand,
      userId: req.user.id
    });

    return res.json({
      success: true,
      brand: updatedBrand
    });
  } catch (error) {
    console.error('Update brand error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update brand.' }
    });
  }
});

/**
 * Admin: Delete a brand
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const oldBrand = await prisma.brand.findUnique({ where: { id } });
    if (!oldBrand) {
      return res.status(404).json({
        success: false,
        error: { code: 'BRAND_NOT_FOUND', message: 'Brand not found.' }
      });
    }

    await prisma.brand.delete({ where: { id } });

    await logAudit(null, {
      tableName: 'brands',
      recordId: id,
      action: 'DELETE',
      oldValues: oldBrand,
      userId: req.user.id
    });

    return res.json({
      success: true,
      message: 'Brand deleted successfully.'
    });
  } catch (error) {
    console.error('Delete brand error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete brand.' }
    });
  }
});

module.exports = router;
