const express = require('express');
const yup = require('yup');
const prisma = require('../config/prisma');
const validate = require('../middleware/validate');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

// ----------------------------------------------------
// Helper Functions
// ----------------------------------------------------

/**
 * Checks if the store is currently open based on configuration settings.
 */
const isStoreOpenNow = async () => {
  try {
    const settings = await prisma.storeSetting.findMany();
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    // Emergency manual shutdown override check
    if (settingsMap['store_status'] === 'CLOSED') {
      return false;
    }

    const openingTime = settingsMap['opening_time'] || '08:00';
    const closingTime = settingsMap['closing_time'] || '21:00';

    // Parse current hours and minutes
    const now = new Date();
    // Use simple local time comparison
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    return currentTimeStr >= openingTime && currentTimeStr <= closingTime;
  } catch (error) {
    console.error('Store timings check error:', error);
    return true; // Fallback to true if config check fails
  }
};

/**
 * Helper to generate a unique order reference number.
 */
const generateOrderNumber = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4 digit random number
  return `SST-${dateStr}-${randomSuffix}`;
};

// ----------------------------------------------------
// Validation Schemas
// ----------------------------------------------------

const orderSchema = yup.object().shape({
  addressId: yup.string().uuid('Invalid Address ID.').required('Address selection is required.'),
  paymentMethod: yup.string().oneOf(['COD', 'QR_PAYMENT'], 'Invalid payment method.').required('Payment method is required.'),
  items: yup.array().of(
    yup.object().shape({
      variantId: yup.string().uuid('Invalid Variant ID.').required('Variant ID is required.'),
      quantity: yup.number().typeError('Quantity must be a number.').integer().required().min(1, 'Quantity must be at least 1.')
    })
  ).required('Cart items are required.').min(1, 'Cart cannot be empty.')
});

// All endpoints in this router require authentication
router.use(authenticateToken);

// ----------------------------------------------------
// Endpoints
// ----------------------------------------------------

/**
 * Get logged-in user's order history
 */
router.get('/', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentMethod: true,
        totalAmount: true,
        createdAt: true
      }
    });

    return res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Fetch customer orders error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve order history.' }
    });
  }
});

/**
 * Get detailed single order spec (including items)
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true
      }
    });

    if (!order || order.userId !== req.user.id) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' }
      });
    }

    return res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Fetch order details error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve order details.' }
    });
  }
});

/**
 * Place a new order (COD/QR)
 */
router.post('/', validate(orderSchema), async (req, res) => {
  const userId = req.user.id;
  const { addressId, paymentMethod, items } = req.body;

  // 1. Check Store Timings
  const open = await isStoreOpenNow();
  if (!open) {
    return res.status(400).json({
      success: false,
      error: { code: 'STORE_CLOSED', message: 'Sorry, the store is closed and not accepting online orders at this time.' }
    });
  }

  try {
    // 2. Fetch shipping address
    const address = await prisma.address.findUnique({
      where: { id: addressId }
    });

    if (!address || address.userId !== userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: 'Selected address is invalid.' }
      });
    }

    const formattedAddress = `${address.recipientName}, ${address.recipientPhone}, ${address.addressLine1}, ${address.addressLine2 ? address.addressLine2 + ', ' : ''}${address.landmark ? address.landmark + ', ' : ''}${address.city}, ${address.state} - ${address.postalCode}`;

    // Execute order processing in single atomic transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      let totalAccumulated = 0;
      const orderItemsToCreate = [];
      const stockDeductionUpdates = [];
      const stockTxLogs = [];

      // Loop and verify variant stocks
      for (const item of items) {
        const variant = await tx.variant.findUnique({
          where: { id: item.variantId },
          include: { product: true }
        });

        if (!variant || variant.status !== 'ACTIVE' || variant.product.status !== 'ACTIVE') {
          throw new Error(`PRODUCT_NOT_AVAILABLE|One or more products in your cart are no longer available.`);
        }

        if (variant.stock < item.quantity) {
          throw new Error(`INSUFFICIENT_STOCK|${variant.product.name} (${variant.attributeValue}) is out of stock or has insufficient quantity.`);
        }

        const itemTotal = Number(variant.price) * item.quantity;
        totalAccumulated += itemTotal;

        orderItemsToCreate.push({
          productId: variant.productId,
          variantId: variant.id,
          productName: variant.product.name,
          variantName: `${variant.attributeName}: ${variant.attributeValue}`,
          price: variant.price,
          quantity: item.quantity
        });

        // Track variant stock updates (deduct stock)
        stockDeductionUpdates.push(
          tx.variant.update({
            where: { id: variant.id },
            data: { stock: { decrement: item.quantity } }
          })
        );

        // Track inventory transaction logs
        stockTxLogs.push({
          variantId: variant.id,
          quantity: -item.quantity,
          transactionType: 'ORDER_DEDUCTION',
          reason: `Auto-deducted for order fulfillment`
        });
      }

      // Execute stock deductions
      await Promise.all(stockDeductionUpdates);

      // Generate order number
      const orderNumber = await generateOrderNumber();

      // Create Order Header
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: 'PENDING',
          paymentMethod,
          totalAmount: totalAccumulated,
          deliveryCharge: 0.00, // MVP Free Delivery
          recipientName: address.recipientName,
          recipientPhone: address.recipientPhone,
          deliveryAddress: formattedAddress,
          items: {
            create: orderItemsToCreate
          }
        }
      });

      // Insert inventory transaction logs linked to this order ID
      await tx.inventoryTransaction.createMany({
        data: stockTxLogs.map(log => ({
          ...log,
          referenceOrderId: createdOrder.id
        }))
      });

      return createdOrder;
    });

    // Log audit trail
    await logAudit(null, {
      tableName: 'orders',
      recordId: newOrder.id,
      action: 'INSERT',
      newValues: newOrder,
      userId
    });

    try {
      const { broadcast } = require('../utils/eventHub');
      broadcast('ORDER_PLACED', { orderId: newOrder.id, orderNumber: newOrder.orderNumber });
    } catch (err) {
      console.error('[EventHub Error] Failed to broadcast ORDER_PLACED:', err.message);
    }

    return res.status(201).json({
      success: true,
      order: newOrder
    });
  } catch (error) {
    console.error('Checkout error:', error);
    const [code, msg] = error.message.includes('|') ? error.message.split('|') : ['CHECKOUT_FAILED', 'Failed to place order.'];

    return res.status(code === 'PRODUCT_NOT_AVAILABLE' || code === 'INSUFFICIENT_STOCK' ? 400 : 500).json({
      success: false,
      error: { code, message: msg }
    });
  }
});

/**
 * Customer cancel order
 * Allowed only in PENDING or CONFIRMED status.
 * Restores inventory stock.
 */
router.post('/:id/cancel', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const oldOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!oldOrder || oldOrder.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' }
      });
    }

    if (oldOrder.status !== 'PENDING' && oldOrder.status !== 'CONFIRMED') {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'CANNOT_CANCEL', 
          message: `Orders cannot be cancelled once they are ${oldOrder.status.toLowerCase()}.` 
        }
      });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const stockRestoreUpdates = [];
      const stockTxLogs = [];

      // Restore stock for each item in the order
      for (const item of oldOrder.items) {
        if (item.variantId) {
          stockRestoreUpdates.push(
            tx.variant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } }
            })
          );

          stockTxLogs.push({
            variantId: item.variantId,
            quantity: item.quantity,
            transactionType: 'ORDER_RESTORE',
            reason: `Order cancelled by customer. Stock restored.`,
            referenceOrderId: id
          });
        }
      }

      await Promise.all(stockRestoreUpdates);

      if (stockTxLogs.length > 0) {
        await tx.inventoryTransaction.createMany({
          data: stockTxLogs
        });
      }

      return await tx.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date()
        }
      });
    });

    await logAudit(null, {
      tableName: 'orders',
      recordId: id,
      action: 'UPDATE',
      oldValues: oldOrder,
      newValues: updatedOrder,
      userId
    });

    return res.json({
      success: true,
      message: 'Order cancelled successfully.',
      status: 'CANCELLED'
    });
  } catch (error) {
    console.error('Order cancellation error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to cancel order.' }
    });
  }
});

router.isStoreOpenNow = isStoreOpenNow;
module.exports = router;
