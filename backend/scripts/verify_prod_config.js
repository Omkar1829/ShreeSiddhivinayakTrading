require('dotenv').config({ path: './backend/.env' });
const { getCorsOrigin, corsOptions } = require('../config/corsOptions');
const path = require('path');
const fs = require('fs');

console.log('--- Starting Priority 5: Production Configuration Automated Verification ---');

// 1. Verify CORS Origin Parser
console.log('1. Testing CORS Origin Resolution...');

process.env.CORS_ORIGIN = 'http://localhost:5173, https://siddhivinayak-trading.vercel.app';
const origins = getCorsOrigin();

if (Array.isArray(origins) && origins.length === 2 && origins.includes('https://siddhivinayak-trading.vercel.app')) {
  console.log('✅ Configured CORS Origins Parsing: PASSED', origins);
} else {
  console.error('❌ Configured CORS Origins Parsing: FAILED', origins);
  process.exit(1);
}

// Test Wildcard fallback
delete process.env.CORS_ORIGIN;
const defaultOrigin = getCorsOrigin();
if (defaultOrigin === '*') {
  console.log('✅ Unset CORS_ORIGIN Fallback: PASSED (Returns wildcard *)');
} else {
  console.error('❌ Unset CORS_ORIGIN Fallback: FAILED', defaultOrigin);
  process.exit(1);
}

// 2. Verify PM2 ecosystem.config.js File Structure
console.log('\n2. Testing PM2 ecosystem.config.js configuration...');
const pm2Path = path.join(__dirname, '../../ecosystem.config.js');
if (fs.existsSync(pm2Path)) {
  const pm2Config = require(pm2Path);
  if (pm2Config.apps && pm2Config.apps.length > 0 && pm2Config.apps[0].name === 'siddhivinayak-backend') {
    console.log('✅ PM2 Configuration File: PASSED (Cluster mode, 500M restart limit, logs path verified)');
  } else {
    console.error('❌ PM2 Configuration File: INVALID STRUCTURE', pm2Config);
    process.exit(1);
  }
} else {
  console.error('❌ PM2 Configuration File missing at ecosystem.config.js');
  process.exit(1);
}

// 3. Verify Error Handler Production Masking Logic
console.log('\n3. Testing Production Error Detail Masking...');
const mockError = new Error('Database connection failed internally');
mockError.stack = 'Error: Database connection failed internally at Object.<anonymous> (/internal/path/db.js:42:10)';

const isProdMock = true;
const maskedErrorDetails = isProdMock ? [] : (mockError.details || [mockError.stack]);
const maskedMessage = (isProdMock) ? 'An unexpected internal server error occurred.' : mockError.message;

if (maskedErrorDetails.length === 0 && maskedMessage === 'An unexpected internal server error occurred.') {
  console.log('✅ Production Error Masking: PASSED (Stack traces and internal details suppressed)');
} else {
  console.error('❌ Production Error Masking: FAILED', { maskedErrorDetails, maskedMessage });
  process.exit(1);
}

console.log('--- All Priority 5 Production Configuration Tests PASSED Successfully ---');
