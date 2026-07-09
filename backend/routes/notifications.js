const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  registerDevice,
  testNotification
} = require('../controllers/notificationController');

const router = express.Router();

// Apply auth + admin guards to all endpoints
router.use(authenticateToken);
router.use(requireAdmin);

// Notifications Endpoints
router.get('/', getNotifications);
router.patch('/:id/read', markRead);
router.patch('/read-all', markAllRead);
router.delete('/:id', deleteNotification);
router.post('/test', testNotification);

// FCM Device Registry Endpoint
router.post('/devices', registerDevice);

module.exports = router;
