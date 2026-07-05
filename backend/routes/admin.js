const express = require('express');
const jwt = require('jsonwebtoken');
const yup = require('yup');
const prisma = require('../config/prisma');
const validate = require('../middleware/validate');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_siddhivinayak_jwt_access_secret';

// All routes in this router require authentication and admin access
router.use(authenticateToken, requireAdmin);

// ----------------------------------------------------
// Validation Schemas
// ----------------------------------------------------

const statusUpdateSchema = yup.object().shape({
  status: yup.string().oneOf(
    ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REJECTED'],
    'Invalid status value.'
  ).required('Status is required.')
});

const deliveryAssignSchema = yup.object().shape({
  deliveryRiderId: yup.string().uuid('Invalid rider ID.').required('Rider selection is required.')
});

const teamMemberSchema = yup.object().shape({
  name: yup.string().required('Name is required.'),
  phone: yup.string()
    .required('Phone number is required.')
    .matches(/^(\+91)?[0-9]{10}$/, 'Phone number must be a valid 10-digit number.'),
  role: yup.string().oneOf(['ADMIN', 'DELIVERY'], 'Invalid role selection.').required()
});

const stockAdjustmentSchema = yup.object().shape({
  variantId: yup.string().uuid('Invalid variant ID.').required('Variant selection is required.'),
  quantity: yup.number().typeError('Quantity adjustment must be a number.').integer().required('Quantity adjustment is required.').not([0], 'Quantity adjustment cannot be zero.'),
  transactionType: yup.string().oneOf(['STOCK_ADDITION', 'STOCK_REDUCTION', 'MANUAL_ADJUSTMENT'], 'Invalid transaction type.').required(),
  reason: yup.string().nullable().optional()
});

const manualOrderSchema = yup.object().shape({
  recipientName: yup.string().required('Customer name is required.'),
  recipientPhone: yup.string().required('Customer phone is required.'),
  deliveryAddress: yup.string().required('Counter description or address is required.'),
  items: yup.array().of(
    yup.object().shape({
      variantId: yup.string().uuid().required(),
      quantity: yup.number().integer().required().min(1)
    })
  ).required().min(1)
});

// ----------------------------------------------------
// Dashboard Analytics Endpoints
// ----------------------------------------------------

/**
 * Get dashboard metrics overview
 */
router.get('/dashboard/metrics', async (req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  try {
    const totalOrders = await prisma.order.count();
    const totalCustomers = await prisma.user.count({ where: { isAdmin: false } });
    const totalProducts = await prisma.product.count({ where: { status: 'ACTIVE' } });

    // Sum overall revenues from delivered and packed/processing orders (exclude cancelled/rejected)
    const revenueSum = await prisma.order.aggregate({
      where: {
        status: { notIn: ['CANCELLED', 'REJECTED'] }
      },
      _sum: {
        totalAmount: true
      }
    });

    const totalRevenue = revenueSum._sum.totalAmount || 0;

    // Today's orders
    const ordersToday = await prisma.order.count({
      where: {
        createdAt: { gte: startOfToday }
      }
    });

    // Today's revenue
    const revenueTodaySum = await prisma.order.aggregate({
      where: {
        createdAt: { gte: startOfToday },
        status: { notIn: ['CANCELLED', 'REJECTED'] }
      },
      _sum: {
        totalAmount: true
      }
    });

    const revenueToday = revenueTodaySum._sum.totalAmount || 0;

    return res.json({
      success: true,
      metrics: {
        totalOrders,
        totalRevenue: Number(totalRevenue),
        totalCustomers,
        totalProducts,
        ordersToday,
        revenueToday: Number(revenueToday)
      }
    });
  } catch (error) {
    console.error('Fetch dashboard metrics error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve dashboard metrics.' }
    });
  }
});

/**
 * Get low stock products threshold < 5
 */
router.get('/dashboard/low-stock', async (req, res) => {
  try {
    const lowStockVariants = await prisma.variant.findMany({
      where: {
        stock: { lt: 5 },
        status: 'ACTIVE',
        product: { status: 'ACTIVE' }
      },
      include: {
        product: true
      },
      orderBy: { stock: 'asc' }
    });

    return res.json({
      success: true,
      variants: lowStockVariants
    });
  } catch (error) {
    console.error('Fetch low stock error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve low stock alerts.' }
    });
  }
});

/**
 * Get top selling products
 */
router.get('/dashboard/top-products', async (req, res) => {
  try {
    const topItems = await prisma.orderItem.groupBy({
      by: ['productId', 'productName', 'variantName'],
      _sum: {
        quantity: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 5
    });

    return res.json({
      success: true,
      products: topItems.map(item => ({
        productName: item.productName,
        variantName: item.variantName,
        totalSold: item._sum.quantity
      }))
    });
  } catch (error) {
    console.error('Fetch top products error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve top products.' }
    });
  }
});

// ----------------------------------------------------
// Orders Management Endpoints
// ----------------------------------------------------

/**
 * Admin: Get all orders
 */
router.get('/orders', async (req, res) => {
  const { status, search, limit, offset } = req.query;

  const filterClause = {};
  if (status === 'ACTIVE') {
    filterClause.status = {
      in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'OUT_FOR_DELIVERY']
    };
  } else if (status && status !== 'ALL') {
    filterClause.status = status;
  }

  if (search) {
    filterClause.OR = [
      { id: { contains: search, mode: 'insensitive' } },
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { recipientName: { contains: search, mode: 'insensitive' } },
      { recipientPhone: { contains: search, mode: 'insensitive' } },
      { paymentMethod: { contains: search, mode: 'insensitive' } },
      { status: { contains: search, mode: 'insensitive' } },
      {
        user: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } }
          ]
        }
      }
    ];
  }

  try {
    const queryOptions = {
      where: filterClause,
      include: {
        items: true,
        user: { select: { phone: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    };

    if (limit) {
      queryOptions.take = parseInt(limit);
    }
    if (offset) {
      queryOptions.skip = parseInt(offset);
    }

    const orders = await prisma.order.findMany(queryOptions);
    const total = await prisma.order.count({ where: filterClause });

    return res.json({
      success: true,
      orders,
      pagination: {
        total,
        limit: limit ? parseInt(limit) : total,
        offset: offset ? parseInt(offset) : 0
      }
    });
  } catch (error) {
    console.error('Fetch admin orders error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve orders.' }
    });
  }
});

/**
 * Admin: Update order status
 * Handles stock restoration if order is CANCELLED or REJECTED.
 */
router.patch('/orders/:id/status', validate(statusUpdateSchema), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const oldOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!oldOrder) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' }
      });
    }

    if (oldOrder.status === status) {
      return res.json({ success: true, order: oldOrder });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // If order is transitioning to CANCELLED or REJECTED from an active state, restore inventory stock
      const isRestoring = (status === 'CANCELLED' || status === 'REJECTED') && 
                          (oldOrder.status !== 'CANCELLED' && oldOrder.status !== 'REJECTED');

      if (isRestoring) {
        const stockRestoreUpdates = [];
        const stockTxLogs = [];

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
              reason: `Order updated to ${status} by admin. Stock restored.`,
              referenceOrderId: id
            });
          }
        }

        await Promise.all(stockRestoreUpdates);
        if (stockTxLogs.length > 0) {
          await tx.inventoryTransaction.createMany({ data: stockTxLogs });
        }
      }

      const updateData = { status };
      if (status === 'DELIVERED') {
        updateData.deliveredAt = new Date();
      } else if (status === 'CANCELLED') {
        updateData.cancelledAt = new Date();
      }

      return await tx.order.update({
        where: { id },
        data: updateData
      });
    });

    await logAudit(null, {
      tableName: 'orders',
      recordId: id,
      action: 'UPDATE',
      oldValues: oldOrder,
      newValues: updatedOrder,
      userId: req.user.id
    });

    try {
      const { broadcast } = require('../utils/eventHub');
      broadcast('ORDER_UPDATED', { orderId: id, status });
    } catch (err) {
      console.error('[EventHub Error] Failed to broadcast ORDER_UPDATED:', err.message);
    }

    return res.json({
      success: true,
      order: updatedOrder
    });
  } catch (error) {
    console.error('Admin status update error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update order status.' }
    });
  }
});

/**
 * Admin: Assign delivery rider
 * Sets status to OUT_FOR_DELIVERY and generates secure verification token.
 */
router.patch('/orders/:id/assign-delivery', validate(deliveryAssignSchema), async (req, res) => {
  const { id } = req.params;
  const { deliveryRiderId } = req.body;

  try {
    const oldOrder = await prisma.order.findUnique({ where: { id } });
    if (!oldOrder) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' }
      });
    }

    const rider = await prisma.user.findUnique({
      where: { id: deliveryRiderId }
    });

    if (!rider || rider.role !== 'DELIVERY') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_RIDER', message: 'Selected delivery rider account was not found.' }
      });
    }

    // Sign verification token (expires in 24 hours)
    const deliveryToken = jwt.sign(
      { orderId: id },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Generate random 6-digit OTP
    const deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        deliveryRiderId,
        deliveryRiderName: rider.name || rider.phone.substring(3),
        deliveryRiderPhone: rider.phone,
        deliveryToken,
        deliveryOtp,
        deliveryTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
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

    try {
      const { broadcast } = require('../utils/eventHub');
      broadcast('ORDER_UPDATED', { orderId: id, riderId: deliveryRiderId });
    } catch (err) {
      console.error('[EventHub Error] Failed to broadcast ORDER_UPDATED:', err.message);
    }

    return res.json({
      success: true,
      order: updatedOrder
    });
  } catch (error) {
    console.error('Assign delivery rider error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to assign delivery rider.' }
    });
  }
});

/**
 * Admin: Create manual walk-in / phone order
 * Deducts stock immediately.
 */
router.post('/orders/manual', validate(manualOrderSchema), async (req, res) => {
  const { recipientName, recipientPhone, deliveryAddress, items } = req.body;

  try {
    const manualOrder = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItems = [];
      const deductions = [];
      const logs = [];

      for (const item of items) {
        const variant = await tx.variant.findUnique({
          where: { id: item.variantId },
          include: { product: true }
        });

        if (!variant || variant.status !== 'ACTIVE' || variant.product.status !== 'ACTIVE') {
          throw new Error(`PRODUCT_NOT_AVAILABLE|Variant ID ${item.variantId} is not active.`);
        }

        if (variant.stock < item.quantity) {
          throw new Error(`INSUFFICIENT_STOCK|${variant.product.name} has only ${variant.stock} units left.`);
        }

        totalAmount += Number(variant.price) * item.quantity;

        orderItems.push({
          productId: variant.productId,
          variantId: variant.id,
          productName: variant.product.name,
          variantName: `${variant.attributeName}: ${variant.attributeValue}`,
          price: variant.price,
          quantity: item.quantity
        });

        deductions.push(
          tx.variant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } }
          })
        );

        logs.push({
          variantId: item.variantId,
          quantity: -item.quantity,
          transactionType: 'ORDER_DEDUCTION',
          reason: 'Manual phone/counter order sale'
        });
      }

      await Promise.all(deductions);

      // Generate order number
      const orderNumber = `SST-MAN-${Date.now().toString().slice(-6)}`;

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          status: 'DELIVERED', // Manual sale is immediately delivered
          paymentMethod: 'COD',
          totalAmount,
          deliveryCharge: 0.00,
          recipientName,
          recipientPhone,
          deliveryAddress,
          deliveredAt: new Date(),
          items: {
            create: orderItems
          }
        }
      });

      await tx.inventoryTransaction.createMany({
        data: logs.map(log => ({ ...log, referenceOrderId: createdOrder.id }))
      });

      return createdOrder;
    });

    await logAudit(null, {
      tableName: 'orders',
      recordId: manualOrder.id,
      action: 'INSERT',
      newValues: manualOrder,
      userId: req.user.id
    });

    return res.status(201).json({
      success: true,
      order: manualOrder
    });
  } catch (error) {
    console.error('Manual order error:', error);
    const [code, msg] = error.message.includes('|') ? error.message.split('|') : ['MANUAL_ORDER_FAILED', 'Failed to save manual order.'];
    return res.status(code === 'INSUFFICIENT_STOCK' ? 400 : 500).json({
      success: false,
      error: { code, message: msg }
    });
  }
});

// ----------------------------------------------------
// Inventory Adjustment Endpoints
// ----------------------------------------------------

/**
 * Admin: Adjust variant stock levels manually
 */
router.post('/inventory/adjust', validate(stockAdjustmentSchema), async (req, res) => {
  const { variantId, quantity, transactionType, reason } = req.body;
  const adminUserId = req.user.id;

  try {
    const variant = await prisma.variant.findUnique({
      where: { id: variantId },
      include: { product: true }
    });

    if (!variant) {
      return res.status(404).json({
        success: false,
        error: { code: 'VARIANT_NOT_FOUND', message: 'Variant not found.' }
      });
    }

    const calculatedNewStock = variant.stock + quantity;
    if (calculatedNewStock < 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ADJUSTMENT', message: `Adjustment would cause negative stock (${calculatedNewStock}).` }
      });
    }

    const updatedVariant = await prisma.$transaction(async (tx) => {
      // 1. Update stock
      const updated = await tx.variant.update({
        where: { id: variantId },
        data: { stock: calculatedNewStock }
      });

      // 2. Record transaction log
      await tx.inventoryTransaction.create({
        data: {
          variantId,
          quantity,
          transactionType,
          reason: reason || 'Manual stock adjustment by admin',
          adminUserId
        }
      });

      return updated;
    });

    await logAudit(null, {
      tableName: 'variants',
      recordId: variantId,
      action: 'UPDATE',
      oldValues: variant,
      newValues: updatedVariant,
      userId: adminUserId
    });

    return res.json({
      success: true,
      message: 'Stock adjusted successfully.',
      variant: updatedVariant
    });
  } catch (error) {
    console.error('Inventory adjustment error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to adjust stock level.' }
    });
  }
});

/**
 * Admin: Get inventory transaction logs
 */
router.get('/inventory/transactions', async (req, res) => {
  try {
    const transactions = await prisma.inventoryTransaction.findMany({
      include: {
        variant: {
          include: {
            product: { select: { name: true } }
          }
        },
        adminUser: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      transactions
    });
  } catch (error) {
    console.error('Fetch stock transactions error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve inventory transactions history.' }
    });
  }
});

// ----------------------------------------------------
// Audit Logs Feed Endpoint
// ----------------------------------------------------

/**
 * Admin: Get system audit logs
 */
router.get('/audit-logs', async (req, res) => {
  const { tableName, action } = req.query;

  const filter = {};
  if (tableName) filter.tableName = tableName;
  if (action) filter.action = action;

  try {
    const logs = await prisma.auditLog.findMany({
      where: filter,
      include: {
        user: { select: { name: true, phone: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve system audit logs.' }
    });
  }
});

/**
 * Admin: Get all customer accounts with order metrics
 */
router.get('/users', async (req, res) => {
  const { search, limit, offset } = req.query;

  const filterClause = { isAdmin: false };

  if (search) {
    filterClause.OR = [
      { id: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } }
    ];
  }

  try {
    const queryOptions = {
      where: filterClause,
      include: {
        orders: {
          select: {
            id: true,
            totalAmount: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    };

    if (limit) {
      queryOptions.take = parseInt(limit);
    }
    if (offset) {
      queryOptions.skip = parseInt(offset);
    }

    const customers = await prisma.user.findMany(queryOptions);
    const total = await prisma.user.count({ where: filterClause });

    const formatted = customers.map(u => {
      const successfulOrders = u.orders.filter(o => o.status === 'DELIVERED');
      const totalSpend = successfulOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
      return {
        id: u.id,
        name: u.name || 'Unnamed Customer',
        phone: u.phone,
        status: u.status || 'ACTIVE',
        createdAt: u.createdAt,
        ordersCount: u.orders.length,
        totalSpend
      };
    });

    return res.json({
      success: true,
      customers: formatted,
      pagination: {
        total,
        limit: limit ? parseInt(limit) : total,
        offset: offset ? parseInt(offset) : 0
      }
    });
  } catch (error) {
    console.error('Fetch customers error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve customer accounts.' }
    });
  }
});

/**
 * Admin: Get all store team members (admins & delivery boys)
 */
router.get('/team', async (req, res) => {
  try {
    const team = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'DELIVERY'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      team
    });
  } catch (error) {
    console.error('Fetch team error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve team directory.' }
    });
  }
});

/**
 * Admin: Create or update a team member (Admin or Delivery boy)
 */
router.post('/team', validate(teamMemberSchema), async (req, res) => {
  const { name, phone, role } = req.body;
  const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;

  try {
    const oldUser = await prisma.user.findUnique({
      where: { phone: formattedPhone }
    });

    const member = await prisma.user.upsert({
      where: { phone: formattedPhone },
      update: {
        name,
        role,
        isAdmin: role === 'ADMIN'
      },
      create: {
        phone: formattedPhone,
        name,
        role,
        isAdmin: role === 'ADMIN'
      }
    });

    await logAudit(null, {
      tableName: 'users',
      recordId: member.id,
      action: oldUser ? 'UPDATE' : 'INSERT',
      oldValues: oldUser,
      newValues: member,
      userId: req.user.id
    });

    return res.status(oldUser ? 200 : 201).json({
      success: true,
      message: 'Team member saved successfully.',
      member
    });
  } catch (error) {
    console.error('Save team member error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to save team member details.' }
    });
  }
});

/**
 * Admin: Remove a team member (downgrade to standard customer)
 */
router.delete('/team/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const oldUser = await prisma.user.findUnique({ where: { id } });
    if (!oldUser) {
      return res.status(404).json({
        success: false,
        error: { code: 'MEMBER_NOT_FOUND', message: 'Team member not found.' }
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role: 'CUSTOMER',
        isAdmin: false
      }
    });

    await logAudit(null, {
      tableName: 'users',
      recordId: id,
      action: 'UPDATE',
      oldValues: oldUser,
      newValues: updatedUser,
      userId: req.user.id
    });

    return res.json({
      success: true,
      message: 'Team member removed from staff directory.'
    });
  } catch (error) {
    console.error('Remove team member error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to remove team member.' }
    });
  }
});

module.exports = router;
