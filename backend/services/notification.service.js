const prisma = require('../config/prisma');
const { admin, isFirebaseAvailable } = require('../config/firebase');
const { emitToAdmins, emitToUser } = require('../config/socket');

/**
 * Reusable helper to send push notifications to a set of admins via Firebase Admin SDK
 * @param {string[]} adminIds - Array of Admin User IDs
 * @param {object} payload - { title, body, data: { orderId, url } }
 */
const sendPushNotification = async (adminIds, payload) => {
  if (!adminIds || adminIds.length === 0) return;

  try {
    // 1. Fetch FCM tokens for the specified admins
    const devices = await prisma.adminDevice.findMany({
      where: { adminId: { in: adminIds } },
      select: { fcmToken: true }
    });

    const fcmTokens = devices.map(d => d.fcmToken).filter(Boolean);

    if (fcmTokens.length === 0) {
      console.log(`[Push Notification] No FCM tokens registered for admins: ${adminIds.join(', ')}`);
      return;
    }

    if (!isFirebaseAvailable) {
      console.log(`[MOCK Push Notification] Firebase not configured. Payload:`, payload, `Tokens count: ${fcmTokens.length}`);
      return;
    }

    // 2. Build multicast message
    const message = {
      tokens: fcmTokens,
      notification: {
        title: payload.title,
        body: payload.body
      },
      data: {
        orderId: payload.data?.orderId || '',
        url: payload.data?.url || '/admin/orders'
      },
      webpush: {
        notification: {
          icon: '/manifest-icon-192.png',
          badge: '/manifest-icon-192.png',
          click_action: payload.data?.url || '/admin/orders'
        }
      }
    };

    console.log(`[Push Notification] Attempting to send push to ${fcmTokens.length} devices.`);
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`[Push Notification] Sent. Success: ${response.successCount}, Failures: ${response.failureCount}`);

    // 3. Clean up invalid/unregistered tokens
    const tokensToRemove = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errCode = resp.error?.code;
        if (
          errCode === 'messaging/invalid-registration-token' ||
          errCode === 'messaging/registration-token-not-registered'
        ) {
          tokensToRemove.push(fcmTokens[idx]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      await prisma.adminDevice.deleteMany({
        where: { fcmToken: { in: tokensToRemove } }
      });
      console.log(`[Push Notification Cleanup] Cleared ${tokensToRemove.length} expired/unregistered FCM tokens.`);
    }

  } catch (error) {
    console.error('[Push Notification Error] Failed to dispatch multicast notification:', error);
  }
};

/**
 * Trigger notification when a customer places a new order
 * @param {object} order - The created Order model instance
 */
const sendNewOrderNotification = async (order) => {
  try {
    // 1. Fetch all admins
    const admins = await prisma.user.findMany({
      where: {
        OR: [
          { isAdmin: true },
          { role: 'ADMIN' }
        ]
      },
      select: { id: true }
    });

    const adminIds = admins.map(a => a.id);
    if (adminIds.length === 0) return;

    const title = 'New Order Received';
    const body = `Customer ${order.recipientName} placed Order #${order.orderNumber} worth ₹${order.totalAmount}`;
    const url = `/admin/orders`;

    // 2. Save notifications in database for each admin
    const notificationsData = adminIds.map(adminId => ({
      title,
      message: body,
      type: 'NEW_ORDER',
      userId: adminId,
      orderId: order.id,
      isRead: false
    }));

    await prisma.notification.createMany({
      data: notificationsData
    });

    // 3. Broadcast real-time Socket.IO event to active dashboard clients
    // Fetch latest notifications to send to socket
    const createdNotifications = await prisma.notification.findMany({
      where: { orderId: order.id },
      include: {
        order: {
          select: { orderNumber: true, totalAmount: true }
        }
      }
    });

    // Socket.IO event: emits new-order event to admins
    emitToAdmins('new-order', {
      order,
      notification: createdNotifications[0] // send sample notification payload
    });

    // Also emit individual notifications to each admin's private socket room
    createdNotifications.forEach(notif => {
      emitToUser(notif.userId, 'new-notification', notif);
    });

    // 4. Dispatch Firebase Multicast Push Notification
    await sendPushNotification(adminIds, {
      title,
      body,
      data: {
        orderId: order.id,
        url
      }
    });

  } catch (error) {
    console.error('[Notification Service Error] sendNewOrderNotification failed:', error);
  }
};

/**
 * Trigger notification when a variant's stock goes below 5
 * @param {object} variant - The Variant instance (with product included)
 */
const sendLowStockNotification = async (variant) => {
  try {
    const admins = await prisma.user.findMany({
      where: {
        OR: [
          { isAdmin: true },
          { role: 'ADMIN' }
        ]
      },
      select: { id: true }
    });

    const adminIds = admins.map(a => a.id);
    if (adminIds.length === 0) return;

    const productName = variant.product?.name || 'Product';
    const variantName = variant.attributeValue || '';
    const title = 'Low Stock Alert';
    const body = `Variant "${productName} (${variantName})" is running low on stock. Only ${variant.stock} units remaining.`;

    // Save notifications
    const notificationsData = adminIds.map(adminId => ({
      title,
      message: body,
      type: 'LOW_STOCK',
      userId: adminId,
      isRead: false
    }));

    await prisma.notification.createMany({
      data: notificationsData
    });

    // Broadcast Socket.IO
    emitToAdmins('low-stock', {
      variantId: variant.id,
      productId: variant.productId,
      stock: variant.stock,
      message: body
    });

    // Emit to individual admin sockets
    const dbNotifs = await prisma.notification.findMany({
      where: { message: body },
      take: adminIds.length
    });
    dbNotifs.forEach(notif => {
      emitToUser(notif.userId, 'new-notification', notif);
    });

    // Send FCM push
    await sendPushNotification(adminIds, {
      title,
      body,
      data: {
        url: '/admin/inventory'
      }
    });

  } catch (error) {
    console.error('[Notification Service Error] sendLowStockNotification failed:', error);
  }
};

/**
 * Trigger notification when an order is cancelled
 * @param {object} order - The Order instance
 */
const sendOrderCancelledNotification = async (order) => {
  try {
    const admins = await prisma.user.findMany({
      where: {
        OR: [
          { isAdmin: true },
          { role: 'ADMIN' }
        ]
      },
      select: { id: true }
    });

    const adminIds = admins.map(a => a.id);
    if (adminIds.length === 0) return;

    const title = 'Order Cancelled';
    const body = `Order #${order.orderNumber} has been cancelled by the customer.`;

    // Save notifications
    const notificationsData = adminIds.map(adminId => ({
      title,
      message: body,
      type: 'ORDER_CANCELLED',
      userId: adminId,
      orderId: order.id,
      isRead: false
    }));

    await prisma.notification.createMany({
      data: notificationsData
    });

    // Broadcast Socket.IO
    emitToAdmins('order-cancelled', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      message: body
    });

    // Emit to individual admin sockets
    const dbNotifs = await prisma.notification.findMany({
      where: { orderId: order.id, type: 'ORDER_CANCELLED' }
    });
    dbNotifs.forEach(notif => {
      emitToUser(notif.userId, 'new-notification', notif);
    });

    // Send FCM push
    await sendPushNotification(adminIds, {
      title,
      body,
      data: {
        orderId: order.id,
        url: `/admin/orders`
      }
    });

  } catch (error) {
    console.error('[Notification Service Error] sendOrderCancelledNotification failed:', error);
  }
};

/**
 * Send general system notification to admins
 * @param {string} title
 * @param {string} message
 * @param {string} type
 */
const sendSystemNotification = async (title, message, type = 'SYSTEM') => {
  try {
    const admins = await prisma.user.findMany({
      where: {
        OR: [
          { isAdmin: true },
          { role: 'ADMIN' }
        ]
      },
      select: { id: true }
    });

    const adminIds = admins.map(a => a.id);
    if (adminIds.length === 0) return;

    // Save notifications
    const notificationsData = adminIds.map(adminId => ({
      title,
      message,
      type,
      userId: adminId,
      isRead: false
    }));

    await prisma.notification.createMany({
      data: notificationsData
    });

    // Broadcast Socket.IO to active admins
    const sampleNotif = await prisma.notification.findFirst({
      where: { message, type }
    });

    if (sampleNotif) {
      adminIds.forEach(adminId => {
        emitToUser(adminId, 'new-notification', {
          ...sampleNotif,
          userId: adminId
        });
      });
    }

    // Send FCM push
    await sendPushNotification(adminIds, {
      title,
      body: message,
      data: {
        url: '/admin'
      }
    });

  } catch (error) {
    console.error('[Notification Service Error] sendSystemNotification failed:', error);
  }
};

module.exports = {
  sendPushNotification,
  sendNewOrderNotification,
  sendLowStockNotification,
  sendOrderCancelledNotification,
  sendSystemNotification
};
