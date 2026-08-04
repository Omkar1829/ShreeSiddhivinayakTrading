require('dotenv').config({ path: './backend/.env' });
const {
  generateSecureOtp,
  checkResendCooldown,
  checkLockout,
  createOtpSession,
  getOtpSession,
  clearOtpSession,
  recordFailedAttempt,
  clearLockout,
  getOtpConfig,
  otpCache,
  lockoutCache
} = require('../utils/otp');

console.log('--- Starting Priority 2: OTP Security Automated Verification ---');

// 1. Verify Config Load
const config = getOtpConfig();
console.log('✅ Loaded OTP Config:', config);
if (config.expirySeconds !== 300 || config.maxAttempts !== 5 || config.lockoutMinutes !== 60 || config.cooldownSeconds !== 30) {
  console.error('❌ OTP Config mismatch:', config);
  process.exit(1);
}

// 2. Verify Cryptographic Entropy & Range for generateSecureOtp()
const generatedOtps = new Set();
for (let i = 0; i < 1000; i++) {
  const code = generateSecureOtp();
  if (code.length !== 6 || isNaN(parseInt(code, 10)) || parseInt(code, 10) < 100000 || parseInt(code, 10) > 999999) {
    console.error(`❌ Invalid OTP format or out of bounds generated: ${code}`);
    process.exit(1);
  }
  generatedOtps.add(code);
}
console.log(`✅ Cryptographic OTP Generator: 1000 codes generated successfully (${generatedOtps.size} unique values). Range [100000, 999999] verified.`);

// 3. Test Resend Cooldown
const testPhone = '+919999988888';
clearOtpSession(testPhone);
clearLockout(testPhone);

const otpCode = generateSecureOtp();
createOtpSession(testPhone, otpCode);

const cooldownCheck = checkResendCooldown(testPhone);
if (cooldownCheck.isCooldown && cooldownCheck.waitSec > 0 && cooldownCheck.waitSec <= 30) {
  console.log(`✅ Resend Cooldown Enforcement: PASSED (${cooldownCheck.waitSec}s remaining wait time)`);
} else {
  console.error('❌ Resend Cooldown Enforcement: FAILED', cooldownCheck);
  process.exit(1);
}

// 4. Test Verification Failed Attempts & Account Lockout
let lockoutResult = null;
for (let attempt = 1; attempt <= 4; attempt++) {
  lockoutResult = recordFailedAttempt(testPhone);
  if (lockoutResult.isNowLocked || lockoutResult.remainingAttempts !== (5 - attempt)) {
    console.error(`❌ Attempt ${attempt} tracking failed:`, lockoutResult);
    process.exit(1);
  }
}
console.log('✅ Failed attempt counting (attempts 1-4): PASSED');

// 5th failed attempt should trigger lockout
lockoutResult = recordFailedAttempt(testPhone);
if (lockoutResult.isNowLocked && lockoutResult.remainingMin === 60) {
  console.log('✅ 5th Attempt Triggered Account Lockout: PASSED (60 minutes lockout enforced)');
} else {
  console.error('❌ 5th Attempt Lockout: FAILED', lockoutResult);
  process.exit(1);
}

const lockoutStatus = checkLockout(testPhone);
if (lockoutStatus.isLocked) {
  console.log('✅ Lockout State Query: PASSED (Number correctly locked out)');
} else {
  console.error('❌ Lockout State Query: FAILED');
  process.exit(1);
}

// Cleanup
clearOtpSession(testPhone);
clearLockout(testPhone);

console.log('--- All Priority 2 OTP Security Tests PASSED Successfully ---');
