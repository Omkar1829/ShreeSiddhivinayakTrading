const { verifyAccessToken } = require('../utils/tokens');

/**
 * Middleware to authenticate requests using JWT Access Tokens.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // Authorization header: Bearer <token>
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access token is required.'
      }
    });
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Access token has expired or is invalid.'
      }
    });
  }

  // Attach token payload to request object
  req.user = {
    id: decoded.userId,
    phone: decoded.phone,
    isAdmin: decoded.isAdmin,
    role: decoded.role
  };

  const als = require('../config/als');
  als.run({ userId: decoded.userId }, () => {
    next();
  });
};

/**
 * Middleware to restrict route access to administrators.
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied. Administrator privileges required.'
      }
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin
};
