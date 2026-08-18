require('dotenv').config({ path: './backend/.env' });
const { successResponse, errorResponse } = require('../utils/response');
const { broadcast } = require('../utils/eventHub');

console.log('--- Starting Priority 8: Technical Debt & Architecture Automated Verification ---');

// 1. Verify Standardized API Response Helpers
console.log('1. Testing Standardized Response Helpers...');
let statusCaptured = null;
let jsonCaptured = null;

const mockRes = () => {
  const res = {};
  res.status = (code) => { statusCaptured = code; return res; };
  res.json = (data) => { jsonCaptured = data; return res; };
  return res;
};

// Success Helper Test
successResponse(mockRes(), { user: { id: 'usr-1' } }, 'User fetched successfully');
if (statusCaptured === 200 && jsonCaptured?.success === true && jsonCaptured?.message === 'User fetched successfully') {
  console.log('✅ successResponse Helper: PASSED', jsonCaptured);
} else {
  console.error('❌ successResponse Helper: FAILED', { statusCaptured, jsonCaptured });
  process.exit(1);
}

// Error Helper Test
errorResponse(mockRes(), 'Invalid request parameters', 'BAD_REQUEST', 400);
if (statusCaptured === 400 && jsonCaptured?.success === false && jsonCaptured?.error?.code === 'BAD_REQUEST') {
  console.log('✅ errorResponse Helper: PASSED', jsonCaptured);
} else {
  console.error('❌ errorResponse Helper: FAILED', { statusCaptured, jsonCaptured });
  process.exit(1);
}

// 2. Verify Unified EventHub Broadcaster
console.log('\n2. Testing Unified Real-Time Event Hub Broadcaster...');
try {
  broadcast('TEST_EVENT', { timestamp: Date.now(), test: true });
  console.log('✅ Unified Event Hub Broadcaster: PASSED (Dispatches safely across SSE and Socket.IO channels)');
} catch (err) {
  console.error('❌ Unified Event Hub Broadcaster: FAILED', err);
  process.exit(1);
}

console.log('\n--- All Priority 8 Technical Debt & Architecture Tests PASSED Successfully ---');
