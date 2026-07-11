const express = require('express');
const yup = require('yup');
const prisma = require('../config/prisma');
const validate = require('../middleware/validate');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const { addClient, removeClient } = require('../utils/eventHub');

const router = express.Router();

// ----------------------------------------------------
// Validation Schemas
// ----------------------------------------------------

const storeSettingsUpdateSchema = yup.object().shape({
  settings: yup.array().of(
    yup.object().shape({
      key: yup.string().required(),
      value: yup.string().ensure()
    })
  ).required('Settings array is required.')
});

// ----------------------------------------------------
// Public Endpoints
// ----------------------------------------------------

/**
 * SSE Endpoint: Real-time store event notifications (Orders, assignments, dispatches)
 */
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*'); // support cross-origin SSE connections
  res.flushHeaders();

  addClient(res);

  req.on('close', () => {
    removeClient(res);
  });
});

/**
 * Get all public store configurations
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = await prisma.storeSetting.findMany();
    // Convert array to clean key-value object map
    const configMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    // Query primary admin from database to dynamically override support contact details
    const primaryAdmin = await prisma.user.findFirst({
      where: { isPrimaryAdmin: true },
      select: { phone: true }
    });

    if (primaryAdmin && primaryAdmin.phone) {
      configMap['phone_number'] = primaryAdmin.phone;
      configMap['whatsapp_number'] = primaryAdmin.phone;
    }

    // Ensure default settings are returned if DB is unseeded
    const defaultConfigs = {
      store_name: "SHRI SIDDHIVINAYAK TRADING",
      logo_url: "",
      banner_url: "",
      phone_number: "+918452921123",
      whatsapp_number: "+918452921123",
      address: "Shop No. 4, Opp. Krishna Tower, Uran Naka, Panvel - 410206",
      opening_time: "08:00",
      closing_time: "21:00",
      store_status: "OPEN"
    };

    return res.json({
      success: true,
      settings: {
        ...defaultConfigs,
        ...configMap
      }
    });
  } catch (error) {
    console.error('Fetch public store settings error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve store settings.' }
    });
  }
});

// ----------------------------------------------------
// Admin Protected Endpoints
// ----------------------------------------------------

/**
 * Admin: Update store configuration settings keys
 */
router.put('/settings', authenticateToken, requireAdmin, validate(storeSettingsUpdateSchema), async (req, res) => {
  const { settings } = req.body;
  const adminUserId = req.user.id;

  try {
    // Record old values for audit logging
    const oldSettings = await prisma.storeSetting.findMany();
    const oldMap = oldSettings.reduce((acc, c) => ({ ...acc, [c.key]: c.value }), {});

    const updatedSettings = await prisma.$transaction(async (tx) => {
      const updates = [];

      for (const setting of settings) {
        updates.push(
          tx.storeSetting.upsert({
            where: { key: setting.key },
            update: { value: setting.value },
            create: { key: setting.key, value: setting.value }
          })
        );
      }

      return await Promise.all(updates);
    });

    const newMap = updatedSettings.reduce((acc, c) => ({ ...acc, [c.key]: c.value }), {});

    await logAudit(null, {
      tableName: 'store_settings',
      recordId: 'STORE_CONFIG',
      action: 'UPDATE',
      oldValues: oldMap,
      newValues: newMap,
      userId: adminUserId
    });

    return res.json({
      success: true,
      message: 'Store settings updated successfully.',
      settings: newMap
    });
  } catch (error) {
    console.error('Update store settings error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to save store settings.' }
    });
  }
});

module.exports = router;
