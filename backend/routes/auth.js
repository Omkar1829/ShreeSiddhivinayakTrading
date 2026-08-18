const express = require('express');
const yup = require('yup');
const prisma = require('../config/prisma');
const validate = require('../middleware/validate');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/tokens');
const { uploadImage } = require('../config/cloudinary');
const multer = require('multer');
const { logAudit } = require('../utils/auditLogger');
const { sendTwilioMessage } = require('../utils/twilio');
const { sendTwoFactorOtp, verifyTwoFactorOtp, sendOtpSmsViaTsms } = require('../utils/twoFactor');
const jwt = require('jsonwebtoken');
const {
  generateSecureOtp,
  checkResendCooldown,
  checkLockout,
  createOtpSession,
  getOtpSession,
  clearOtpSession,
  recordFailedAttempt,
  clearLockout,
  getOtpConfig
} = require('../utils/otp');

const router = express.Router();
const upload = multer();
const JWT_SECRET = process.env.JWT_SECRET;

// ----------------------------------------------------
// Validation Schemas
// ----------------------------------------------------

const otpRequestSchema = yup.object().shape({
  phone: yup.string()
    .required('Phone number is required.')
    .matches(/^(\+91)?[0-9]{10}$/, 'Phone number must be a valid 10-digit number optionally prefixed with +91.')
});

const otpVerifySchema = yup.object().shape({
  phone: yup.string()
    .required('Phone number is required.')
    .matches(/^(\+91)?[0-9]{10}$/, 'Phone number must be a valid 10-digit number optionally prefixed with +91.'),
  code: yup.string()
    .required('Verification code is required.')
    .length(6, 'Verification code must be exactly 6 digits.')
});

const profileUpdateSchema = yup.object().shape({
  name: yup.string().nullable().min(2, 'Name must be at least 2 characters.')
});

const registerSchema = yup.object().shape({
  registrationToken: yup.string().required('Registration token is required.'),
  name: yup.string().trim().required('Name is required.'),
  email: yup.string().email('Invalid email address format.').nullable().optional(),
  address: yup.string().nullable().optional(),
  pincode: yup.string().nullable().optional()
});

// ----------------------------------------------------
// Auth Routes
// ----------------------------------------------------

/**
 * Request OTP
 */
router.post('/otp/request', authLimiter, validate(otpRequestSchema), async (req, res) => {
  const { phone } = req.body;
  const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;

  // 1. Check Account Lockout
  const lockout = checkLockout(formattedPhone);
  if (lockout.isLocked) {
    return res.status(423).json({
      success: false,
      error: {
        code: 'ACCOUNT_LOCKED',
        message: `Too many failed attempts. This number is locked for another ${lockout.remainingMin} minutes.`
      }
    });
  }

  // 2. Check Resend Cooldown
  const cooldown = checkResendCooldown(formattedPhone);
  if (cooldown.isCooldown) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'OTP_COOLDOWN',
        message: `Please wait ${cooldown.waitSec} seconds before requesting a new verification code.`
      }
    });
  }

  // Check if user is registered
  const user = await prisma.user.findUnique({
    where: { phone: formattedPhone }
  });
  const isNewUser = !user;

  // Generate cryptographically secure 6-digit OTP code
  const otpCode = generateSecureOtp();
  let sessionId = null;

  const has2Factor = !!process.env.TWOFACTOR_API_KEY;
  const hasTwilio = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

  if (has2Factor) {
    try {
      // Send OTP strictly using 2Factor R1 Transactional SMS API (TRANS_SMS)
      await sendOtpSmsViaTsms(formattedPhone, otpCode);
    } catch (err) {
      console.error('[2Factor OTP Error] Failed to send OTP via Transactional SMS:', err.message);
    }
  } else if (hasTwilio) {
    try {
      const { expirySeconds } = getOtpConfig();
      const expiryMinutes = Math.round(expirySeconds / 60);
      await sendTwilioMessage(
        formattedPhone,
        `Your Shri Siddhivinayak Trading verification code is: ${otpCode}. It will expire in ${expiryMinutes} minutes.`
      );
    } catch (err) {
      console.error('[Twilio OTP Error] Failed to send message via Twilio REST:', err.message);
    }
  } else {
    // Mock fallback for development
    console.log(`[MOCK OTP] Twilio/2Factor not configured. Generated mock OTP code: ${otpCode} for ${formattedPhone}`);
  }

  createOtpSession(formattedPhone, otpCode, sessionId);

  console.log(`[OTP] Generated verification session for ${formattedPhone}. 2Factor Session ID: ${sessionId}, Code: ${otpCode}`);

  return res.json({
    success: true,
    isNewUser,
    message: (has2Factor || hasTwilio)
      ? 'Verification code sent successfully.'
      : `Verification code generated successfully. [Mock Console Code: ${otpCode}]`
  });
});

/**
 * Verify OTP
 */
router.post('/otp/verify', authLimiter, validate(otpVerifySchema), async (req, res) => {
  const { phone, code } = req.body;
  const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;

  // 1. Check if number is currently locked out
  const lockout = checkLockout(formattedPhone);
  if (lockout.isLocked) {
    return res.status(423).json({
      success: false,
      error: {
        code: 'ACCOUNT_LOCKED',
        message: `Too many failed attempts. This number is locked for another ${lockout.remainingMin} minutes.`
      }
    });
  }

  const cachedOtp = getOtpSession(formattedPhone);

  if (!cachedOtp) {
    return res.status(400).json({
      success: false,
      error: { code: 'OTP_NOT_FOUND', message: 'No active OTP verification session found for this number.' }
    });
  }

  if (cachedOtp.expiresAt < Date.now()) {
    clearOtpSession(formattedPhone);
    return res.status(400).json({
      success: false,
      error: { code: 'OTP_EXPIRED', message: 'The verification code has expired. Please request a new one.' }
    });
  }

  let isMatched = false;
  if (cachedOtp.sessionId) {
    // Verify via 2Factor verify API
    isMatched = await verifyTwoFactorOtp(cachedOtp.sessionId, code);
  } else {
    // Check local generated code
    isMatched = cachedOtp.code === code;
  }

  if (!isMatched) {
    // Record failed attempt and handle potential lockout
    const result = recordFailedAttempt(formattedPhone);
    if (result.isNowLocked) {
      return res.status(423).json({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Incorrect verification code entered ${getOtpConfig().maxAttempts} times. Your account is locked for ${result.remainingMin} minutes.`
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OTP',
          message: `Incorrect verification code. You have ${result.remainingAttempts} attempts remaining.`
        }
      });
    }
  }

  // OTP verified successfully, clear active OTP session and lockout stats
  clearOtpSession(formattedPhone);
  clearLockout(formattedPhone);

  try {
    // Check if user exists, otherwise create
    let user = await prisma.user.findUnique({
      where: { phone: formattedPhone }
    });

    const adminNumbers = ['+919833607049'];
    const shouldBeAdmin = adminNumbers.includes(formattedPhone);

    if (!user) {
      // Sign a temporary registration token (expires in 10 minutes)
      const registrationToken = jwt.sign(
        { phone: formattedPhone },
        JWT_SECRET,
        { expiresIn: '10m' }
      );
      return res.json({
        success: true,
        isNewUser: true,
        registrationToken
      });
    }

    // Proactively promote to admin if not set
    if (shouldBeAdmin && (!user.isAdmin || user.role !== 'ADMIN')) {
      user = await prisma.user.update({
        where: { phone: formattedPhone },
        data: {
          isAdmin: true,
          role: 'ADMIN'
        }
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.json({
      success: true,
      isNewUser: false,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        avatarUrl: user.avatarUrl,
        isAdmin: user.isAdmin,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error during user verification:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to process login request.' }
    });
  }
});

/**
 * Complete registration for new users with a name
 */
router.post('/register', validate(registerSchema), async (req, res) => {
  const { registrationToken, name } = req.body;

  try {
    const decoded = jwt.verify(registrationToken, JWT_SECRET);
    const phone = decoded.phone;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Registration token is invalid.' }
      });
    }

    // Double check if user was created in the meantime
    let user = await prisma.user.findUnique({ where: { phone } });
    if (user) {
      return res.status(400).json({
        success: false,
        error: { code: 'USER_ALREADY_EXISTS', message: 'User is already registered. Please log in.' }
      });
    }

    const adminNumbers = ['+919833607049'];
    const shouldBeAdmin = adminNumbers.includes(phone);

    user = await prisma.user.create({
      data: {
        phone,
        name: name.trim(),
        isAdmin: shouldBeAdmin,
        role: shouldBeAdmin ? 'ADMIN' : 'CUSTOMER'
      }
    });

    // Audit log new user creation
    await logAudit(null, {
      tableName: 'users',
      recordId: user.id,
      action: 'INSERT',
      newValues: user
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        avatarUrl: user.avatarUrl,
        isAdmin: user.isAdmin,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Registration token has expired or is invalid.' }
    });
  }
});

/**
 * Refresh JWT Access Token
 */
router.post('/token/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: { code: 'REFRESH_TOKEN_REQUIRED', message: 'Refresh token is required.' }
    });
  }

  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is expired or invalid.' }
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User associated with this token was not found.' }
      });
    }

    const accessToken = generateAccessToken(user);

    return res.json({
      success: true,
      accessToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to refresh access token.' }
    });
  }
});

/**
 * Get current profile (Me)
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found.' }
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        avatarUrl: user.avatarUrl,
        isAdmin: user.isAdmin,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve profile data.' }
    });
  }
});

/**
 * Update user profile
 */
router.put('/profile', authenticateToken, upload.single('avatar'), validate(profileUpdateSchema), async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;

  try {
    const oldUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!oldUser) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User profile does not exist.' }
      });
    }

    let avatarUrl = oldUser.avatarUrl;
    if (req.file) {
      // Upload new avatar image to Cloudinary
      const uploadResult = await uploadImage(req.file.buffer, 'avatars');
      avatarUrl = uploadResult.secure_url;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name !== undefined ? name : oldUser.name,
        avatarUrl
      }
    });

    // Audit log the update
    await logAudit(null, {
      tableName: 'users',
      recordId: userId,
      action: 'UPDATE',
      oldValues: oldUser,
      newValues: updatedUser,
      userId
    });

    return res.json({
      success: true,
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        name: updatedUser.name,
        avatarUrl: updatedUser.avatarUrl,
        isAdmin: updatedUser.isAdmin,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update profile settings.' }
    });
  }
});

module.exports = router;
