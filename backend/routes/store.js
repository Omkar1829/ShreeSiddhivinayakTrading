const express = require('express');
const yup = require('yup');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const prisma = require('../config/prisma');
const validate = require('../middleware/validate');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const { addClient, removeClient } = require('../utils/eventHub');

const router = express.Router();

// Multer storage for store assets (UPI QR code, logo, etc.)
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `upi-qr-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

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
      configMap['whatsapp_number'] = "9833607049";
    }

    // Ensure default settings are returned if DB is unseeded
    const defaultConfigs = {
      store_name: "SHREE SIDDHIVINAYAK TRADING",
      logo_url: "",
      banner_url: "",
      phone_number: "+919833607049",
      secondary_phone_number: "+918879279207",
      whatsapp_number: "+919833607049",
      address: "Shop No. 4, Opp. Krishna Tower, Uran Naka, Panvel - 410206",
      opening_time: "08:00",
      closing_time: "21:00",
      store_status: "OPEN",
      audit_logs_enabled: "false"
    };

    return res.json({
      success: true,
      settings: {
        ...defaultConfigs,
        ...configMap
      }
    });
  } catch (error) {
    console.error('Fetch public store settings error (falling back to defaults):', error);
    return res.json({
      success: true,
      settings: {
        store_name: "SHREE SIDDHIVINAYAK TRADING",
        logo_url: "",
        banner_url: "",
        phone_number: "+918879279207",
        secondary_phone_number: "+919833607049",
        whatsapp_number: "+919833607049",
        address: "Shop No. 4, Opp. Krishna Tower, Uran Naka, Panvel - 410206",
        opening_time: "08:00",
        closing_time: "21:00",
        store_status: "OPEN",
        audit_logs_enabled: "false"
      }
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

/**
 * Admin: Upload store QR code photo
 */
router.post('/upload-qr', authenticateToken, requireAdmin, upload.single('qrImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { message: 'No QR image file was uploaded.' } });
    }
    const relativeUrl = `/uploads/${req.file.filename}`;
    return res.json({
      success: true,
      url: relativeUrl
    });
  } catch (error) {
    console.error('QR upload error:', error);
    return res.status(500).json({ success: false, error: { message: 'Failed to process QR image upload.' } });
  }
});

module.exports = router;
