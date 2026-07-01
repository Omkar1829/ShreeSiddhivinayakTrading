const axios = require('axios');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_FROM || '+14155238886';

/**
 * Sends an SMS or WhatsApp message via Twilio REST API
 * @param {string} to - Recipient phone number (e.g. +919876543210)
 * @param {string} body - Message body
 */
const sendTwilioMessage = async (to, body) => {
  if (!accountSid || !authToken) {
    console.warn('[Twilio] Missing Account SID or Auth Token in environment. Skipping message send.');
    return null;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  // Format recipient and sender formats: if sender starts with 'whatsapp:', prefix recipient too
  const isWhatsApp = twilioFrom.startsWith('whatsapp:');
  const formattedTo = isWhatsApp && !to.startsWith('whatsapp:') ? `whatsapp:${to}` : to;

  const params = new URLSearchParams();
  params.append('To', formattedTo);
  params.append('From', twilioFrom);
  params.append('Body', body);

  try {
    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const response = await axios.post(url, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader
      }
    });
    console.log(`[Twilio] Message dispatched successfully to ${formattedTo}. SID: ${response.data.sid}`);
    return response.data;
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`[Twilio] Failed to send message to ${formattedTo}:`, errorDetails);
    throw error;
  }
};

module.exports = {
  sendTwilioMessage
};
