const axios = require('axios');

const MINIMOTH_BASE_URL = process.env.MINIMOTH_BASE_URL || 'https://api.minimoth.dev';

/**
 * Sends an OTP via MiniMoth WhatsApp-first gateway with SMS fallback
 * @param {string} phone - Recipient phone number (e.g. +918452921123)
 */
const sendMinimothOtp = async (phone) => {
  const apiKey = process.env.MINIMOTH_API_KEY;
  if (!apiKey) {
    console.warn('[MiniMoth] Missing MINIMOTH_API_KEY in environment variables.');
    return null;
  }

  try {
    const response = await axios.post(
      `${MINIMOTH_BASE_URL}/v1/otp/send`,
      {
        phone: phone,
        appName: 'Shree Siddhivinayak Trading'
      },
      {
        headers: {
          'x-api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    console.log(`[MiniMoth] OTP sent successfully to ${phone}. ID: ${response.data?.otp_id}`);
    return response.data;
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`[MiniMoth] Failed to send OTP to ${phone}:`, errorDetails);
    throw error;
  }
};

/**
 * Verifies an OTP code via MiniMoth API
 * @param {string} phone - Recipient phone number
 * @param {string} code - 6-digit verification code
 * @returns {Promise<boolean>} - True if verification succeeds
 */
const verifyMinimothOtp = async (phone, code) => {
  const apiKey = process.env.MINIMOTH_API_KEY;
  if (!apiKey) {
    console.warn('[MiniMoth] Missing MINIMOTH_API_KEY in environment variables.');
    return false;
  }

  try {
    const response = await axios.post(
      `${MINIMOTH_BASE_URL}/v1/otp/verify`,
      {
        phone: phone,
        code: code,
        otp: code
      },
      {
        headers: {
          'x-api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.status === 200 || response.data?.valid || response.data?.access_token) {
      return true;
    }
    return false;
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`[MiniMoth] Verification failed for ${phone}:`, errorDetails);
    return false;
  }
};

module.exports = {
  sendMinimothOtp,
  verifyMinimothOtp
};
