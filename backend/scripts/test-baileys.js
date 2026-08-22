const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const path = require('path');
const pino = require('pino');

// Target phone number from CLI or default
const rawPhone = process.argv[2] || '8452921123';
const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
const targetJid = cleanPhone.startsWith('91') && cleanPhone.length === 12 
  ? `${cleanPhone}@s.whatsapp.net` 
  : `91${cleanPhone}@s.whatsapp.net`;

const customMessage = process.argv[3] || 
  '🛒 *Shree Siddhivinayak Trading*\n\nHello! Your order *#1024* has been packed and is **Out for Delivery**! 🚚📦';

async function startBaileys() {
  console.log('====================================================');
  console.log('       Baileys WhatsApp Integration Test            ');
  console.log('====================================================\n');

  const authFolder = path.join(__dirname, '../baileys_auth_info');
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }) // suppress noisy debug logs
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n====================================================');
      console.log('📲 SCAN THIS QR CODE WITH WHATSAPP ON YOUR PHONE:');
      console.log('   (WhatsApp -> Menu/Settings -> Linked Devices -> Link a Device)');
      console.log('====================================================\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`⚠️ Connection closed (status: ${statusCode}). Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        startBaileys();
      }
    } else if (connection === 'open') {
      console.log('\n====================================================');
      console.log('✅ WHATSAPP CONNECTED SUCCESSFULLY!');
      console.log('====================================================\n');

      console.log(`📡 Sending test message to: +${targetJid.replace('@s.whatsapp.net', '')}...`);
      
      try {
        await sock.sendMessage(targetJid, { text: customMessage });
        console.log('\n================ RESULT ================');
        console.log(`✅ MESSAGE SENT SUCCESSFULLY!`);
        console.log(`📱 Recipient: +${targetJid.replace('@s.whatsapp.net', '')}`);
        console.log(`💬 Message:\n\n${customMessage}`);
        console.log('========================================\n');
        console.log('🎉 Credentials saved in backend/baileys_auth_info.');
        console.log('Next time you run this script, it will send messages instantly without asking for a QR scan!');
        
        // Wait 3 seconds before exiting process so message flushes out
        setTimeout(() => process.exit(0), 3000);
      } catch (err) {
        console.error('❌ Failed to send WhatsApp message:', err.message || err);
        process.exit(1);
      }
    }
  });
}

startBaileys();
