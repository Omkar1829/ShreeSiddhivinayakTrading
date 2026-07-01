require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./config/prisma');

const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const brandRoutes = require('./routes/brands');
const productRoutes = require('./routes/products');
const addressRoutes = require('./routes/addresses');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const deliveryRoutes = require('./routes/delivery');
const storeRoutes = require('./routes/store');

const app = express();
const PORT = process.env.PORT || 5000;

// ----------------------------------------------------
// Global Middlewares
// ----------------------------------------------------

app.use(cors({
  origin: '*', // In production, restrict to frontend vercel domain
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ----------------------------------------------------
// REST API Routes
// ----------------------------------------------------

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/products', productRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/store', storeRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Assert database connection is alive
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      success: true,
      status: 'healthy',
      database: 'connected',
      timestamp: new Date()
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// ----------------------------------------------------
// 404 Handler & Global Error Middleware
// ----------------------------------------------------

// 404 Route Not Found
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The requested endpoint ${req.method} ${req.url} does not exist.`
    }
  });
});

// Centralized Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);

  const statusCode = err.status || err.statusCode || 500;
  
  return res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'An unexpected internal server error occurred.',
      details: err.details || []
    }
  });
});

// ----------------------------------------------------
// Server Startup
// ----------------------------------------------------

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  SHRI SIDDHIVINAYAK TRADING SERVER STARTED      `);
  console.log(`  Running in mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Port: ${PORT}                                  `);
  console.log(`  API Health check: http://localhost:${PORT}/health`);
  console.log(`==================================================`);
});

// Graceful Shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  console.log('Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});
