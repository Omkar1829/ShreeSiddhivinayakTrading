/**
 * Environment Variable Validation & Configuration Module
 * 
 * Ensures all required environment variables are set before the application starts.
 * Hardcoded fallbacks for sensitive credentials (JWT secrets, etc.) are strictly prohibited.
 */

const requiredEnvVars = [
  { key: 'JWT_SECRET', description: 'JWT Access Token Secret' },
  { key: 'JWT_REFRESH_SECRET', description: 'JWT Refresh Token Secret' },
  { key: 'DATABASE_URL', description: 'PostgreSQL Database Connection URL' }
];

function validateEnv() {
  const missing = requiredEnvVars.filter(
    ({ key }) => !process.env[key] || process.env[key].trim() === ''
  );

  if (missing.length > 0) {
    console.error('==================================================');
    console.error(' FATAL SECURITY ERROR: MISSING ENVIRONMENT VARIABLES');
    console.error('==================================================');
    missing.forEach(({ key, description }) => {
      console.error(` - ${key}: Missing (${description})`);
    });
    console.error('==================================================');
    console.error(' The application cannot start without secure credentials.');
    console.error(' Please update your .env file with appropriate values.');
    console.error('==================================================');
    process.exit(1);
  }

  return {
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 5000,
    OTP_EXPIRY_SECONDS: parseInt(process.env.OTP_EXPIRY_SECONDS, 10) || 300,
    OTP_MAX_ATTEMPTS: parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 5,
    OTP_LOCKOUT_MINUTES: parseInt(process.env.OTP_LOCKOUT_MINUTES, 10) || 60,
    OTP_RESEND_COOLDOWN_SECONDS: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS, 10) || 30,
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    REQUEST_BODY_LIMIT: process.env.REQUEST_BODY_LIMIT || '10mb',
    MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10
  };
}

module.exports = {
  validateEnv
};
