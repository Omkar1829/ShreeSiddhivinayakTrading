const rateLimit = require('express-rate-limit');

/**
 * Global Rate Limiter: 100 requests per 15 minutes per IP
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP address. Please try again after 15 minutes.'
    }
  }
});

/**
 * Authentication & OTP Rate Limiter: 10 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.'
    }
  }
});

/**
 * Administrative Operations Rate Limiter: 30 requests per 15 minutes per IP
 */
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many administrative requests from this IP address. Please try again after 15 minutes.'
    }
  }
});

module.exports = {
  globalLimiter,
  authLimiter,
  adminLimiter
};
