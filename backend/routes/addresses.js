const express = require('express');
const yup = require('yup');
const prisma = require('../config/prisma');
const validate = require('../middleware/validate');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

// ----------------------------------------------------
// Validation Schemas
// ----------------------------------------------------

const addressSchema = yup.object().shape({
  recipientName: yup.string().required('Recipient name is required.'),
  recipientPhone: yup.string()
    .required('Recipient phone number is required.')
    .matches(/^(\+91)?[0-9]{10}$/, 'Phone number must be a valid 10-digit number.'),
  addressLine1: yup.string().required('Street address details are required.'),
  addressLine2: yup.string().nullable().optional(),
  landmark: yup.string().nullable().optional(),
  city: yup.string().default('Panvel'),
  state: yup.string().default('Maharashtra'),
  postalCode: yup.string().required('Postal pin code is required.').length(6, 'Pin code must be exactly 6 digits.'),
  isDefault: yup.boolean().default(false)
});

// All routes require user authentication
router.use(authenticateToken);

// ----------------------------------------------------
// Endpoints
// ----------------------------------------------------

/**
 * Get all saved addresses of the user
 */
router.get('/', async (req, res) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
    });

    return res.json({
      success: true,
      addresses
    });
  } catch (error) {
    console.error('Fetch addresses error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve addresses.' }
    });
  }
});

/**
 * Create a new address
 */
router.post('/', validate(addressSchema), async (req, res) => {
  const userId = req.user.id;
  const { recipientName, recipientPhone, addressLine1, addressLine2, landmark, city, state, postalCode, isDefault } = req.body;

  try {
    const newAddress = await prisma.$transaction(async (tx) => {
      // If setting this address as default, unset other defaults
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false }
        });
      }

      // Check if user has no other addresses. If so, make this default automatically.
      const existingCount = await tx.address.count({ where: { userId } });
      const finalIsDefault = existingCount === 0 ? true : isDefault;

      return await tx.address.create({
        data: {
          userId,
          recipientName,
          recipientPhone,
          addressLine1,
          addressLine2,
          landmark,
          city,
          state,
          postalCode,
          isDefault: finalIsDefault
        }
      });
    });

    await logAudit(null, {
      tableName: 'addresses',
      recordId: newAddress.id,
      action: 'INSERT',
      newValues: newAddress,
      userId
    });

    return res.status(201).json({
      success: true,
      address: newAddress
    });
  } catch (error) {
    console.error('Create address error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create address.' }
    });
  }
});

/**
 * Update an existing address
 */
router.put('/:id', validate(addressSchema), async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { recipientName, recipientPhone, addressLine1, addressLine2, landmark, city, state, postalCode, isDefault } = req.body;

  try {
    const oldAddress = await prisma.address.findUnique({ where: { id } });
    if (!oldAddress || oldAddress.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: { code: 'ADDRESS_NOT_FOUND', message: 'Address not found.' }
      });
    }

    const updatedAddress = await prisma.$transaction(async (tx) => {
      if (isDefault && !oldAddress.isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false }
        });
      }

      return await tx.address.update({
        where: { id },
        data: {
          recipientName,
          recipientPhone,
          addressLine1,
          addressLine2,
          landmark,
          city,
          state,
          postalCode,
          isDefault: oldAddress.isDefault ? true : isDefault // Keep default true if it was already default
        }
      });
    });

    await logAudit(null, {
      tableName: 'addresses',
      recordId: id,
      action: 'UPDATE',
      oldValues: oldAddress,
      newValues: updatedAddress,
      userId
    });

    return res.json({
      success: true,
      address: updatedAddress
    });
  } catch (error) {
    console.error('Update address error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update address.' }
    });
  }
});

/**
 * Set an address as default
 */
router.patch('/:id/default', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const address = await prisma.address.findUnique({ where: { id } });
    if (!address || address.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: { code: 'ADDRESS_NOT_FOUND', message: 'Address not found.' }
      });
    }

    const updatedAddress = await prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });

      return await tx.address.update({
        where: { id },
        data: { isDefault: true }
      });
    });

    await logAudit(null, {
      tableName: 'addresses',
      recordId: id,
      action: 'UPDATE',
      oldValues: address,
      newValues: updatedAddress,
      userId
    });

    return res.json({
      success: true,
      address: updatedAddress
    });
  } catch (error) {
    console.error('Set default address error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to set default address.' }
    });
  }
});

/**
 * Delete an address
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const oldAddress = await prisma.address.findUnique({ where: { id } });
    if (!oldAddress || oldAddress.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: { code: 'ADDRESS_NOT_FOUND', message: 'Address not found.' }
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.address.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: userId
        }
      });

      // If we deleted the default address, and other addresses exist, set the most recent one as default
      if (oldAddress.isDefault) {
        const remaining = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' }
        });
        if (remaining) {
          await tx.address.update({
            where: { id: remaining.id },
            data: { isDefault: true }
          });
        }
      }
    });

    await logAudit(null, {
      tableName: 'addresses',
      recordId: id,
      action: 'DELETE',
      oldValues: oldAddress,
      userId
    });

    return res.json({
      success: true,
      message: 'Address deleted successfully.'
    });
  } catch (error) {
    console.error('Delete address error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete address.' }
    });
  }
});

module.exports = router;
