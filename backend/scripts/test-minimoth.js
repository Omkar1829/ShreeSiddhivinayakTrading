const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');

// Load environment variables from backend/.env or root .env
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const args = process.argv.slice(2);
const phoneNumber = args[0];

let apiKey = process.env.MINIMOTH_API_KEY;
let otpToVerify = null;

if (args.length >= 2) {
  // If second arg is a 6-digit OTP code or numeric string, it's the OTP code
  if (/^\d{4,8}$/.test(args[1])) {
    otpToVerify = args[1];
  } else {
    apiKey = args[1] || process.env.MINIMOTH_API_KEY;
    if (args[2]) {
      otpToVerify = args[2];
    }
  }
}

console.log('====================================================');
console.log('      MiniMoth SDK OTP Verification Test Script     ');
console.log('====================================================\n');

if (!phoneNumber) {
  console.log('❌ Error: Phone number is required!\n');
  console.log('Usage:');
  console.log('  1. Send OTP:');
  console.log('     node backend/scripts/test-minimoth.js <+91Phone>\n');
  console.log('  2. Verify OTP:');
  console.log('     node backend/scripts/test-minimoth.js <+91Phone> <OTP_CODE>\n');
  console.log('Example:');
  console.log('  node backend/scripts/test-minimoth.js +918452921123 789616\n');
  process.exit(1);
}

if (!apiKey) {
  console.log('❌ Error: MiniMoth API Key is missing!');
  console.log('Please set MINIMOTH_API_KEY in backend/.env or pass it as an argument.\n');
  process.exit(1);
}

// Format phone number to E.164 format (+91...)
let formattedPhone = phoneNumber.trim();
if (!formattedPhone.startsWith('+')) {
  if (formattedPhone.length === 10) {
    formattedPhone = `+91${formattedPhone}`;
  } else if (formattedPhone.startsWith('91') && formattedPhone.length === 12) {
    formattedPhone = `+${formattedPhone}`;
  }
}

// Check if official @minimoth/sdk-node package is installed
let MiniMothClass = null;
let MiniMothErrorClass = null;
try {
  const sdk = require('@minimoth/sdk-node');
  MiniMothClass = sdk.MiniMoth;
  MiniMothErrorClass = sdk.MiniMothError;
  console.log('📦 Using official @minimoth/sdk-node SDK');
} catch (e) {
  console.log('ℹ️ @minimoth/sdk-node package not found locally. Running with direct API transport.');
}

/**
 * Send OTP
 */
async function sendOtp(phone) {
  console.log(`📡 Sending OTP to ${phone}...`);

  if (MiniMothClass) {
    const mm = new MiniMothClass({ apiKey });
    try {
      const { otpId } = await mm.otp.send({ phone });
      console.log('\n================ SUCCESS ================');
      console.log('✅ OTP ID:', otpId);
      console.log('=========================================\n');
      console.log('🎉 OTP sent successfully! Check WhatsApp / SMS on:', phone);
      console.log('\n👉 Please reply with the 6-digit OTP code received on your phone to verify!');
    } catch (err) {
      console.error('\n❌ Failed to send OTP:');
      if (MiniMothErrorClass && err instanceof MiniMothErrorClass) {
        console.error(`Error Code: ${err.code} (Status: ${err.statusCode || 400})`);
      } else {
        console.error('Error Message:', err.message || err);
      }
    }
  } else {
    try {
      const response = await axios.post(
        'https://api.minimoth.dev/v1/otp/send',
        { phone },
        {
          headers: {
            'x-api-key': apiKey,
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('\n================ SUCCESS ================');
      console.log('📲 Response Data:', JSON.stringify(response.data, null, 2));
      console.log('=========================================\n');
      console.log('🎉 OTP sent successfully! Check WhatsApp / SMS on:', phone);
      console.log('\n👉 Please reply with the 6-digit OTP code received on your phone to verify!');
    } catch (err) {
      console.error('\n❌ Failed to send OTP:');
      if (err.response) {
        console.error('Status:', err.response.status);
        console.error('Error Details:', JSON.stringify(err.response.data, null, 2));
      } else {
        console.error('Message:', err.message);
      }
    }
  }
}

/**
 * Verify OTP
 */
async function verifyOtp(phone, otpCode) {
  console.log(`🔍 Verifying OTP "${otpCode}" for ${phone}...`);

  if (MiniMothClass) {
    const mm = new MiniMothClass({ apiKey });
    const result = await mm.otp.verify({ phone, otp: otpCode });

    if (!result.valid) {
      console.error('\n❌ OTP Verification Failed!');
      console.error('Error Code:', result.code);
      if (result.code === 'INVALID_OTP') console.error('-> Explanation: Incorrect OTP entered.');
      if (result.code === 'OTP_NOT_FOUND') console.error('-> Explanation: OTP expired or already used.');
      if (result.code === 'VERIFY_RATE_LIMITED') console.error('-> Explanation: Too many failed attempts. Request a new OTP.');
      console.log('');
      return;
    }

    console.log('\n================ SUCCESS ================');
    console.log('✅ OTP Verified Successfully!');
    console.log('🔑 Session ID:', result.sessionId);
    console.log('🎟️ Access Token:', result.accessToken ? `${result.accessToken.substring(0, 20)}...` : 'N/A');
    console.log('=========================================\n');
  } else {
    try {
      const response = await axios.post(
        'https://api.minimoth.dev/v1/otp/verify',
        { phone, code: otpCode, otp: otpCode },
        {
          headers: {
            'x-api-key': apiKey,
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('\n================ SUCCESS ================');
      console.log('🔑 Response Data:', JSON.stringify(response.data, null, 2));
      console.log('=========================================\n');
    } catch (err) {
      console.error('\n❌ Failed to verify OTP:');
      if (err.response) {
        console.error('Status:', err.response.status);
        console.error('Error Details:', JSON.stringify(err.response.data, null, 2));
      } else {
        console.error('Message:', err.message);
      }
    }
  }
}

// Execute Action
if (otpToVerify) {
  verifyOtp(formattedPhone, otpToVerify);
} else {
  sendOtp(formattedPhone);
}
