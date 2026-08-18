require('dotenv').config({ path: './backend/.env' });
const jwt = require('jsonwebtoken');
const { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } = require('../utils/tokens');

console.log('--- Starting JWT Security Verification ---');

// Test 1: Verify token generation & signature with env secrets
const userMock = {
  id: 'user-test-uuid-123',
  phone: '+919876543210',
  isAdmin: true,
  role: 'ADMIN'
};

const accessToken = generateAccessToken(userMock);
const refreshToken = generateRefreshToken(userMock);

console.log('✅ Access Token generated:', accessToken ? 'SUCCESS' : 'FAILED');
console.log('✅ Refresh Token generated:', refreshToken ? 'SUCCESS' : 'FAILED');

// Test 2: Verify Access Token decoding
const decodedAccess = verifyAccessToken(accessToken);
if (decodedAccess && decodedAccess.userId === userMock.id && decodedAccess.role === 'ADMIN') {
  console.log('✅ Access Token Verification: PASSED');
} else {
  console.error('❌ Access Token Verification: FAILED', decodedAccess);
  process.exit(1);
}

// Test 3: Verify Refresh Token decoding
const decodedRefresh = verifyRefreshToken(refreshToken);
if (decodedRefresh && decodedRefresh.userId === userMock.id) {
  console.log('✅ Refresh Token Verification: PASSED');
} else {
  console.error('❌ Refresh Token Verification: FAILED', decodedRefresh);
  process.exit(1);
}

// Test 4: Verify rejection of tokens signed with former fallback secret
const fallbackSecret = 'fallback_siddhivinayak_jwt_access_secret';
const forgedToken = jwt.sign({ userId: userMock.id, role: 'ADMIN' }, fallbackSecret);

const rejected = verifyAccessToken(forgedToken);
if (rejected === null) {
  console.log('✅ Forged/Fallback Token Rejection: PASSED (Forged token was correctly rejected)');
} else {
  console.error('❌ Security Vulnerability: Forged token was accepted!', rejected);
  process.exit(1);
}

console.log('--- All JWT Security Tests PASSED Successfully ---');
