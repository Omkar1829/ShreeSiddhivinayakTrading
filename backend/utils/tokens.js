const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_siddhivinayak_jwt_access_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_siddhivinayak_jwt_refresh_secret';

/**
 * Generates a short-lived access token.
 * @param {object} user - User record.
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      phone: user.phone, 
      isAdmin: user.isAdmin,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
};

/**
 * Generates a long-lived refresh token.
 * @param {object} user - User record.
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id 
    },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Verifies the access token.
 * @param {string} token - JWT Access Token.
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Verifies the refresh token.
 * @param {string} token - JWT Refresh Token.
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
