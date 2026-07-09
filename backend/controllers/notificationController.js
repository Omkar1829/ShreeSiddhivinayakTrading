const prisma = require('../config/prisma');
const { sendSystemNotification } = require('../services/notification.service');

/**
 * Fetch notifications for authenticated admin (paginated, newest first)
 */
const getNotifications = async (req, res) => {
  const adminId = req.user.id;
  const limit = parseInt(req.query.limit || 20);
  const offset = parseInt(req.query.offset || 0);

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: adminId },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      include: {
        order: {
          select: { orderNumber: true }
        }
      }
    });

    const total = await prisma.notification.count({
      where: { userId: adminId }
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: adminId, isRead: false }
    });

    return res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        total,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('[Notification Controller Error] getNotifications failed:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve notifications.' }
    });
  }
};

/**
 * Mark a specific notification as read
 */
const markRead = async (req, res) => {
  const adminId = req.user.id;
  const { id } = req.params;

  try {
    const notif = await prisma.notification.findFirst({
      where: { id, userId: adminId }
    });

    if (!notif) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found.' }
      });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    return res.json({
      success: true,
      notification: updated
    });
  } catch (error) {
    console.error('[Notification Controller Error] markRead failed:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to mark notification as read.' }
    });
  }
};

/**
 * Mark all notifications for admin as read
 */
const markAllRead = async (req, res) => {
  const adminId = req.user.id;

  try {
    await prisma.notification.updateMany({
      where: { userId: adminId, isRead: false },
      data: { isRead: true }
    });

    return res.json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (error) {
    console.error('[Notification Controller Error] markAllRead failed:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to mark all notifications as read.' }
    });
  }
};

/**
 * Delete a specific notification
 */
const deleteNotification = async (req, res) => {
  const adminId = req.user.id;
  const { id } = req.params;

  try {
    const notif = await prisma.notification.findFirst({
      where: { id, userId: adminId }
    });

    if (!notif) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found.' }
      });
    }

    await prisma.notification.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Notification deleted successfully.'
    });
  } catch (error) {
    console.error('[Notification Controller Error] deleteNotification failed:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete notification.' }
    });
  }
};

/**
 * Register or update admin device FCM token
 */
const registerDevice = async (req, res) => {
  const adminId = req.user.id;
  const { fcmToken, browser, os, deviceType } = req.body;

  if (!fcmToken) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'fcmToken is required.' }
    });
  }

  try {
    const device = await prisma.adminDevice.upsert({
      where: { fcmToken },
      update: {
        adminId,
        browser,
        os,
        deviceType,
        updatedAt: new Date()
      },
      create: {
        fcmToken,
        adminId,
        browser,
        os,
        deviceType
      }
    });

    return res.json({
      success: true,
      device,
      message: 'Device registered successfully.'
    });
  } catch (error) {
    console.error('[Notification Controller Error] registerDevice failed:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to register device.' }
    });
  }
};

/**
 * Send test notification (FCM push + Socket emit) for QA testing
 */
const testNotification = async (req, res) => {
  const { title, message, type } = req.body;

  try {
    await sendSystemNotification(
      title || 'Test Notification',
      message || 'This is a test broadcast notification for Shri Siddhivinayak Trading admins.',
      type || 'SYSTEM'
    );

    return res.json({
      success: true,
      message: 'Test notification triggered successfully.'
    });
  } catch (error) {
    console.error('[Notification Controller Error] testNotification failed:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to trigger test notification.' }
    });
  }
};

module.exports = {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  registerDevice,
  testNotification
};
