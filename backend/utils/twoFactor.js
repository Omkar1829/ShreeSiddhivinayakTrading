const axios = require('axios');

const getApiKey = () => process.env.TWOFACTOR_API_KEY;
const getSenderId = () => process.env.TWOFACTOR_SENDER_ID || 'SSTOTP';


/**
 * Sends a Transactional SMS via 2Factor.in R1 API using approved DLT text content
 * @param {string} to - Destination mobile number (e.g. 9876543210, +919876543210, or 919876543210)
 * @param {string} smsText - Complete text message matching approved DLT template
 * @returns {Promise<string|null>} Telecom Operator Details ID or null on failure
 */
const sendTransactionalSms = async (to, smsText, customTemplateId = null) => {
  const apiKey = getApiKey();
  const senderId = getSenderId();

  if (!apiKey) {
    console.warn('[2Factor R1 TSMS] Missing TWOFACTOR_API_KEY in environment. Skipping SMS dispatch.');
    return null;
  }

  // Ensure 12-digit number starting with 91 (e.g. 919876543210)
  let cleanTo = to.replace(/\+/g, '').trim();
  if (cleanTo.length === 10) {
    cleanTo = '91' + cleanTo;
  }

  const url = 'https://2factor.in/API/R1/';

  const params = new URLSearchParams();
  params.append('module', 'TRANS_SMS');
  params.append('apikey', apiKey);
  params.append('to', cleanTo);
  params.append('from', senderId);
  params.append('msg', smsText);

  // Append DLT Entity ID (PEID) if configured
  if (process.env.TWOFACTOR_PEID) {
    params.append('peid', process.env.TWOFACTOR_PEID);
  }

  // Append DLT Content Template ID if configured
  const tid = customTemplateId || process.env.TWOFACTOR_OTP_TEMPLATE_ID || process.env.TWOFACTOR_TEMPLATE_ID;
  if (tid) {
    params.append('ctid', tid);
  }

  try {
    const response = await axios.post(url, params);

    if (response.data && response.data.Status === 'Success') {
      console.log(`[2Factor R1 TSMS] Transactional SMS sent successfully to ${cleanTo}. Operator Details:`, response.data.Details);
      return response.data.Details;
    } else {
      console.warn(`[2Factor R1 TSMS] Transactional SMS response non-success:`, response.data);
      return null;
    }
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`[2Factor R1 TSMS] Failed to send Transactional SMS to ${cleanTo}:`, errorDetails);
    return null;
  }
};

/**
 * Sends 6-digit OTP code strictly via 2Factor R1 Transactional SMS API (TRANS_SMS)
 * @param {string} to - Destination phone number
 * @param {string} otpCode - Generated 6-digit OTP code
 */
const sendOtpSmsViaTsms = async (to, otpCode) => {
  const smsText = `${otpCode} is your OTP for login to Shree Siddhivinayak Trading. Do not share this OTP with anyone.`;
  const templateId = process.env.TWOFACTOR_OTP_TEMPLATE_ID;
  return await sendTransactionalSms(to, smsText, templateId);
};

/**
 * 2Factor Official OTP Dispatch Endpoint
 */
const sendTwoFactorOtp = async (to, customOtp = null) => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  let cleanTo = to.replace(/\+/g, '').trim();
  if (cleanTo.length === 10) cleanTo = '91' + cleanTo;

  let url = customOtp
    ? `https://2factor.in/API/V1/${apiKey}/SMS/${cleanTo}/${customOtp}`
    : `https://2factor.in/API/V1/${apiKey}/SMS/${cleanTo}/AUTOGEN`;

  try {
    const response = await axios.get(url);
    if (response.data && response.data.Status === 'Success') {
      console.log(`[2Factor OTP] Sent OTP to ${cleanTo} via 2Factor OTP API. Session ID:`, response.data.Details);
      return response.data.Details;
    }
    return null;
  } catch (error) {
    console.error(`[2Factor OTP Error] Failed to send OTP to ${cleanTo}:`, error.response?.data || error.message);
    return null;
  }
};

/**
 * 2Factor OTP Verification API
 */
const verifyTwoFactorOtp = async (sessionId, otp) => {
  const apiKey = getApiKey();
  if (!apiKey) return false;
  const url = `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY/${sessionId}/${otp}`;
  try {
    const response = await axios.get(url);
    return (response.data && response.data.Status === 'Success' && response.data.Details === 'OTP Matched');
  } catch (error) {
    console.error(`[2Factor OTP Verify Error] Verification failed for session ${sessionId}:`, error.response?.data || error.message);
    return false;
  }
};

module.exports = {
  sendTransactionalSms,
  sendOtpSmsViaTsms,
  sendTwoFactorOtp,
  verifyTwoFactorOtp
};
