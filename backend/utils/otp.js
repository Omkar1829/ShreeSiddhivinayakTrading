const crypto = require('crypto');

/**
 * OTP Configuration options parsed from environment variables.
 */
const getOtpConfig = () => {
  return {
    expirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS, 10) || 300,        // Default 5 minutes
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 5,             // Default 5 attempts
    lockoutMinutes: parseInt(process.env.OTP_LOCKOUT_MINUTES, 10) || 60,       // Default 60 minutes lockout
    cooldownSeconds: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS, 10) || 30 // Default 30 seconds resend cooldown
  };
};

// In-memory OTP session store and account lockout store
const otpCache = new Map();
const lockoutCache = new Map();

/**
 * Generates a cryptographically secure 6-digit OTP code using crypto.randomInt.
 * @returns {string} 6-digit OTP string (100000 - 999999)
 */
const generateSecureOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Checks if the phone number is currently in resend cooldown.
 * @param {string} phone
 * @returns {{ isCooldown: boolean, waitSec: number }}
 */
const checkResendCooldown = (phone) => {
  const { cooldownSeconds } = getOtpConfig();
  const cached = otpCache.get(phone);
  if (cached && cached.createdAt) {
    const elapsedMs = Date.now() - cached.createdAt;
    const cooldownMs = cooldownSeconds * 1000;
    if (elapsedMs < cooldownMs) {
      const waitSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
      return { isCooldown: true, waitSec };
    }
  }
  return { isCooldown: false, waitSec: 0 };
};

/**
 * Checks if the phone number is locked out due to repeated verification failures.
 * @param {string} phone
 * @returns {{ isLocked: boolean, remainingMin: number }}
 */
const checkLockout = (phone) => {
  const lockout = lockoutCache.get(phone);
  if (lockout && lockout.lockedUntil > Date.now()) {
    const remainingMin = Math.ceil((lockout.lockedUntil - Date.now()) / (60 * 1000));
    return { isLocked: true, remainingMin };
  }
  return { isLocked: false, remainingMin: 0 };
};

/**
 * Creates and caches a new OTP verification session.
 * @param {string} phone
 * @param {string} code
 * @param {string|null} sessionId - Optional 2Factor Session ID
 */
const createOtpSession = (phone, code, sessionId = null) => {
  const { expirySeconds } = getOtpConfig();
  const now = Date.now();
  otpCache.set(phone, {
    code,
    sessionId,
    createdAt: now,
    expiresAt: now + expirySeconds * 1000
  });
};

/**
 * Returns active OTP session for a phone number.
 * @param {string} phone
 */
const getOtpSession = (phone) => {
  return otpCache.get(phone);
};

/**
 * Removes active OTP session for a phone number.
 * @param {string} phone
 */
const clearOtpSession = (phone) => {
  otpCache.delete(phone);
};

/**
 * Records a failed verification attempt.
 * Locks the account if attempt count reaches or exceeds OTP_MAX_ATTEMPTS.
 * @param {string} phone
 * @returns {{ isNowLocked: boolean, remainingAttempts: number, remainingMin: number }}
 */
const recordFailedAttempt = (phone) => {
  const { maxAttempts, lockoutMinutes } = getOtpConfig();
  let lockout = lockoutCache.get(phone) || { attempts: 0, lockedUntil: 0 };
  
  lockout.attempts += 1;
  lockoutCache.set(phone, lockout);

  if (lockout.attempts >= maxAttempts) {
    lockout.lockedUntil = Date.now() + lockoutMinutes * 60 * 1000;
    lockoutCache.set(phone, lockout);
    otpCache.delete(phone); // Invalidate active OTP session on lockout
    return {
      isNowLocked: true,
      remainingAttempts: 0,
      remainingMin: lockoutMinutes
    };
  }

  return {
    isNowLocked: false,
    remainingAttempts: maxAttempts - lockout.attempts,
    remainingMin: 0
  };
};

/**
 * Clears lockout status upon successful verification.
 * @param {string} phone
 */
const clearLockout = (phone) => {
  lockoutCache.delete(phone);
};

module.exports = {
  getOtpConfig,
  generateSecureOtp,
  checkResendCooldown,
  checkLockout,
  createOtpSession,
  getOtpSession,
  clearOtpSession,
  recordFailedAttempt,
  clearLockout,
  // Export stores for diagnostic unit testing
  otpCache,
  lockoutCache
};
