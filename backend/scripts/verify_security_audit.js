require('dotenv').config({ path: './backend/.env' });
const { globalLimiter, authLimiter, adminLimiter } = require('../middleware/rateLimiter');
const { validateImageUpload, validateCsvUpload } = require('../middleware/uploadValidator');

console.log('--- Starting Priority 7: Security Audit Automated Verification ---');

// 1. Verify Rate Limiter Middleware Initialization
console.log('1. Testing Rate Limiter Configurations...');
if (globalLimiter && authLimiter && adminLimiter) {
  console.log('✅ Rate Limiters Initialization: PASSED (Global, Auth & Admin limiters active)');
} else {
  console.error('❌ Rate Limiters Initialization: FAILED');
  process.exit(1);
}

// 2. Verify File Upload Extension Validation
console.log('\n2. Testing Upload Extension & MIME-Type Filter Middleware...');

// Test 2a: Valid Image Extension (.jpg)
let nextCalled = false;
let resStatus = null;
let resJson = null;

const mockRes = () => {
  const res = {};
  res.status = (code) => { resStatus = code; return res; };
  res.json = (data) => { resJson = data; return res; };
  return res;
};

validateImageUpload({ file: { originalname: 'product-photo.jpg' } }, mockRes(), () => { nextCalled = true; });

if (nextCalled) {
  console.log('✅ Valid Image Extension Filter (.jpg): PASSED (Allowed)');
} else {
  console.error('❌ Valid Image Extension Filter: FAILED');
  process.exit(1);
}

// Test 2b: Invalid Executable Extension Upload (.exe)
nextCalled = false;
resStatus = null;
resJson = null;

validateImageUpload({ file: { originalname: 'malicious-script.exe' } }, mockRes(), () => { nextCalled = true; });

if (!nextCalled && resStatus === 400 && resJson?.error?.code === 'INVALID_FILE_TYPE') {
  console.log('✅ Invalid Executable Extension Rejection (.exe): PASSED (Correctly rejected with HTTP 400 INVALID_FILE_TYPE)');
} else {
  console.error('❌ Invalid Executable Extension Rejection: FAILED', { resStatus, resJson });
  process.exit(1);
}

// Test 2c: Invalid CSV Extension (.pdf)
nextCalled = false;
resStatus = null;
resJson = null;

validateCsvUpload({ file: { originalname: 'invoice-document.pdf' } }, mockRes(), () => { nextCalled = true; });

if (!nextCalled && resStatus === 400 && resJson?.error?.code === 'INVALID_FILE_TYPE') {
  console.log('✅ Non-CSV File Upload Rejection (.pdf): PASSED (Correctly rejected with HTTP 400 INVALID_FILE_TYPE)');
} else {
  console.error('❌ Non-CSV File Upload Rejection: FAILED', { resStatus, resJson });
  process.exit(1);
}

// 3. Verify Role Authorization Guard Enforcement
console.log('\n3. Testing Role Authorization & Privilege Escalation Guards...');
const { requireAdmin } = require('../middleware/auth');

nextCalled = false;
resStatus = null;
resJson = null;

// Test non-admin user trying to access admin endpoint
const mockUserReq = { user: { id: 'usr-123', role: 'CUSTOMER', isAdmin: false } };
requireAdmin(mockUserReq, mockRes(), () => { nextCalled = true; });

if (!nextCalled && resStatus === 403 && resJson?.error?.code === 'FORBIDDEN') {
  console.log('✅ Admin Privilege Escalation Guard: PASSED (Non-admin customer correctly blocked with HTTP 403 FORBIDDEN)');
} else {
  console.error('❌ Admin Privilege Escalation Guard: FAILED', { resStatus, resJson });
  process.exit(1);
}

console.log('--- All Priority 7 Security Review Tests PASSED Successfully ---');
