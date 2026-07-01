const express = require('express');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { logAudit } = require('../utils/auditLogger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_siddhivinayak_jwt_access_secret';

// Helper Middleware: Ensure user is a registered delivery rider
const requireDelivery = (req, res, next) => {
  if (req.user.role !== 'DELIVERY' && !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Access restricted to delivery staff.' }
    });
  }
  next();
};

/**
 * Public Scanner: Verify customer's delivery QR code token and mark as DELIVERED
 */
router.post('/verify', async (req, res) => {
  const { token, codPaymentMode } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: { code: 'TOKEN_REQUIRED', message: 'Delivery token is required.' }
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { orderId } = decoded;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN_PAYLOAD', message: 'Invalid delivery token contents.' }
      });
    }

    const oldOrder = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!oldOrder) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Order associated with this token was not found.' }
      });
    }

    if (oldOrder.status === 'DELIVERED') {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'ALREADY_DELIVERED', 
          message: 'This order has already been verified and marked as delivered.',
          orderNumber: oldOrder.orderNumber,
          recipientName: oldOrder.recipientName,
          deliveredAt: oldOrder.deliveredAt
        }
      });
    }

    if (oldOrder.status !== 'OUT_FOR_DELIVERY') {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'INVALID_STATE', 
          message: `Cannot verify delivery for an order that is currently ${oldOrder.status.toLowerCase()}.` 
        }
      });
    }

    // Update order status to DELIVERED and flag COD cash collection immediately
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        deliveryToken: null,
        cashCollected: oldOrder.paymentMethod === 'COD',
        cashCollectedAt: oldOrder.paymentMethod === 'COD' ? new Date() : null,
        codPaymentMode: oldOrder.paymentMethod === 'COD' ? (codPaymentMode || 'CASH') : null
      }
    });

    await logAudit(null, {
      tableName: 'orders',
      recordId: orderId,
      action: 'UPDATE',
      oldValues: oldOrder,
      newValues: updatedOrder,
      userId: null
    });

    return res.json({
      success: true,
      message: 'Delivery verified successfully via QR scan.',
      orderNumber: updatedOrder.orderNumber,
      recipientName: updatedOrder.recipientName,
      deliveredAt: updatedOrder.deliveredAt
    });
  } catch (error) {
    console.error('QR code verification error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'The delivery verification QR code has expired. Please ask the customer to refresh their screen.' }
      });
    }

    return res.status(400).json({
      success: false,
      error: { code: 'VERIFICATION_FAILED', message: 'QR verification failed. The token is invalid or has been tampered with.' }
    });
  }
});

// ----------------------------------------------------
// Authenticated Rider Console Routes
// ----------------------------------------------------

/**
 * Rider: Get all active and historical orders assigned to the logged-in rider
 */
router.get('/assigned', authenticateToken, requireDelivery, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        deliveryRiderId: req.user.id
      },
      include: {
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Fetch assigned orders error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch assigned orders.' }
    });
  }
});

/**
 * Rider: Mark order as picked up from the store (transitions to OUT_FOR_DELIVERY)
 */
router.patch('/orders/:id/pickup', authenticateToken, requireDelivery, async (req, res) => {
  const { id } = req.params;

  try {
    const oldOrder = await prisma.order.findUnique({ where: { id } });
    if (!oldOrder) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' }
      });
    }

    if (oldOrder.deliveryRiderId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'UNAUTHORIZED_RIDER', message: 'This order is not assigned to you.' }
      });
    }

    if (oldOrder.status !== 'PACKED' && oldOrder.status !== 'CONFIRMED' && oldOrder.status !== 'PROCESSING') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: `Cannot pick up an order in ${oldOrder.status.toLowerCase()} state.` }
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'OUT_FOR_DELIVERY'
      }
    });

    await logAudit(null, {
      tableName: 'orders',
      recordId: id,
      action: 'UPDATE',
      oldValues: oldOrder,
      newValues: updatedOrder,
      userId: req.user.id
    });

    return res.json({
      success: true,
      message: 'Order marked as picked up. Out for delivery!',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Rider pickup error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update order to picked up.' }
    });
  }
});

/**
 * Rider: Complete delivery by entering the customer's secure OTP
 */
router.post('/orders/:id/verify-otp', authenticateToken, requireDelivery, async (req, res) => {
  const { id } = req.params;
  const { otp, codPaymentMode } = req.body;

  if (!otp) {
    return res.status(400).json({
      success: false,
      error: { code: 'OTP_REQUIRED', message: 'Verification OTP is required.' }
    });
  }

  try {
    const oldOrder = await prisma.order.findUnique({ where: { id } });
    if (!oldOrder) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' }
      });
    }

    if (oldOrder.deliveryRiderId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'UNAUTHORIZED_RIDER', message: 'This order is not assigned to you.' }
      });
    }

    if (oldOrder.status !== 'OUT_FOR_DELIVERY') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: 'Order is not out for delivery yet.' }
      });
    }

    if (oldOrder.deliveryOtp !== otp) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_OTP', message: 'Incorrect 6-digit delivery OTP entered.' }
      });
    }

    // Complete delivery and flag COD cash collection
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        deliveryToken: null,
        cashCollected: oldOrder.paymentMethod === 'COD',
        cashCollectedAt: oldOrder.paymentMethod === 'COD' ? new Date() : null,
        codPaymentMode: oldOrder.paymentMethod === 'COD' ? (codPaymentMode || 'CASH') : null
      }
    });

    await logAudit(null, {
      tableName: 'orders',
      recordId: id,
      action: 'UPDATE',
      oldValues: oldOrder,
      newValues: updatedOrder,
      userId: req.user.id
    });

    return res.json({
      success: true,
      message: 'Delivery verified successfully via OTP entry.',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Rider OTP verification error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to verify delivery OTP.' }
    });
  }
});

/**
 * Rider: Scan Admin order QR code to self-assign and pick up order
 */
router.post('/scan-pickup', authenticateToken, requireDelivery, async (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({
      success: false,
      error: { code: 'ORDER_ID_REQUIRED', message: 'Order ID is required.' }
    });
  }

  try {
    const oldOrder = await prisma.order.findUnique({ where: { id: orderId } });
    if (!oldOrder) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' }
      });
    }

    if (oldOrder.status !== 'PACKED' && oldOrder.status !== 'CONFIRMED' && oldOrder.status !== 'PROCESSING' && oldOrder.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: `Cannot pick up an order in ${oldOrder.status.toLowerCase()} state.` }
      });
    }

    // Generate customer verification token
    const deliveryToken = jwt.sign(
      { orderId },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Generate random 6-digit OTP
    const deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'OUT_FOR_DELIVERY',
        deliveryRiderId: req.user.id,
        deliveryRiderName: req.user.name || req.user.phone.substring(3),
        deliveryRiderPhone: req.user.phone,
        deliveryToken,
        deliveryOtp,
        deliveryTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });

    await logAudit(null, {
      tableName: 'orders',
      recordId: orderId,
      action: 'UPDATE',
      oldValues: oldOrder,
      newValues: updatedOrder,
      userId: req.user.id
    });

    return res.json({
      success: true,
      message: 'Order successfully assigned and marked as picked up!',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Scan pickup error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to process store pickup.' }
    });
  }
});

module.exports = router;
