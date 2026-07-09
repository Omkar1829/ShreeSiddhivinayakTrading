require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./config/prisma');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const brandRoutes = require('./routes/brands');
const productRoutes = require('./routes/products');
const addressRoutes = require('./routes/addresses');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const deliveryRoutes = require('./routes/delivery');
const storeRoutes = require('./routes/store');
const notificationsRoutes = require('./routes/notifications');
const socketConfig = require('./config/socket');
const http = require('http');

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

// Setup local uploads directory and default grayscale SVG image
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const defaultSvgPath = path.join(uploadDir, 'default-product.svg');
if (!fs.existsSync(defaultSvgPath)) {
  const defaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <rect width="100%" height="100%" fill="#f3f4f6"/>
  <circle cx="200" cy="180" r="60" fill="#e5e7eb"/>
  <path d="M150,290 C150,250 170,230 200,230 C230,230 250,250 250,290" fill="#e5e7eb"/>
  <text x="50%" y="330" font-family="'Inter', sans-serif" font-size="16" font-weight="600" fill="#9ca3af" text-anchor="middle">No Image Available</text>
  <path d="M185,150 L215,150 L210,180 L190,180 Z" fill="none" stroke="#9ca3af" stroke-width="3" stroke-linejoin="round"/>
  <path d="M190,150 C190,140 210,140 210,150" fill="none" stroke="#9ca3af" stroke-width="3"/>
</svg>`;
  fs.writeFileSync(defaultSvgPath, defaultSvg);
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

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
app.use('/api/notifications', notificationsRoutes);

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

const server = http.createServer(app);

// Initialize Socket.io
socketConfig.init(server);

server.listen(PORT, () => {
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
