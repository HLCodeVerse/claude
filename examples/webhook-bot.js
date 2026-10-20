/**
 * Evolution API v2 - Free WhatsApp Auto-Reply Webhook Bot
 * Zero-dependency standalone bot using Node.js built-in 'http' module!
 * 
 * Usage:
 *   node webhook-bot.js
 * 
 * How it works:
 *   1. Listens on port 3000 for webhook events from Evolution API.
 *   2. Receives 'MESSAGES_UPSERT' when someone sends a message to your WhatsApp number.
 *   3. Replies automatically to the sender with an intelligent menu!
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:8080';
const API_KEY = process.env.AUTHENTICATION_API_KEY || 'evol_whatsapp_api_secret_key_2026';

async function sendWhatsAppMessage(instance, recipientNumber, text) {
  try {
    const res = await fetch(`${SERVER_URL}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        'apikey': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: recipientNumber,
        text: text
      })
    });
    return await res.json();
  } catch (err) {
    console.error('[-] Error sending WhatsApp reply:', err.message);
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const event = payload.event;
        const instance = payload.instance;

        console.log(`[Event: ${event}] Instance: ${instance}`);

        // Handle incoming WhatsApp message event
        if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
          const msgData = payload.data;
          const key = msgData.key || {};
          
          // Ignore messages sent by ourselves
          if (key.fromMe) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ignored_own_message' }));
            return;
          }

          const remoteJid = key.remoteJid || '';
          const senderNumber = remoteJid.replace('@s.whatsapp.net', '');
          
          // Extract message text from Baileys message structure
          const msg = msgData.message || {};
          const text = msg.conversation || 
                       msg.extendedTextMessage?.text || 
                       msg.imageMessage?.caption || 
                       '';

          console.log(`[+] Received from ${senderNumber}: "${text}"`);

          // Simple Auto-Reply Bot Logic
          let replyText = '';
          const lowerText = text.toLowerCase().trim();

          if (lowerText === 'hi' || lowerText === 'hello' || lowerText === 'menu') {
            replyText = `👋 Hello! Welcome to our automated WhatsApp service powered by Evolution API v2!\n\n` +
                        `*Reply with an option:*\n` +
                        `1️⃣ - Operating Hours\n` +
                        `2️⃣ - Support & Contact\n` +
                        `3️⃣ - Server Status\n` +
                        `4️⃣ - Website & Docs`;
          } else if (lowerText === '1') {
            replyText = `🕒 *Operating Hours:*\nWe are open Monday to Friday from 9:00 AM to 6:00 PM.`;
          } else if (lowerText === '2') {
            replyText = `📞 *Support:* You can reach our team at support@example.com.`;
          } else if (lowerText === '3') {
            replyText = `✅ *Status:* WhatsApp Service is running smoothly on Evolution API v2!`;
          } else if (lowerText === '4') {
            replyText = `🌐 *Links:*\nDocumentation: ${SERVER_URL}/docs\nManager: ${SERVER_URL}/manager`;
          } else {
            replyText = `🤖 Thanks for your message: "${text}"\nType *menu* to see all available options!`;
          }

          if (replyText) {
            console.log(`[-] Sending auto-reply to ${senderNumber}...`);
            await sendWhatsAppMessage(instance, senderNumber, replyText);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      } catch (err) {
        console.error('[-] Webhook parser error:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else {
    // Healthcheck endpoint for webhook receiver
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WhatsApp Webhook Bot is active and listening for POST events.');
  }
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` WhatsApp Auto-Reply Bot listening on port: ${PORT}`);
  console.log(` Point your Evolution API Webhook to: http://<your-host>:${PORT}`);
  console.log(` Target Evolution API: ${SERVER_URL}`);
  console.log(`====================================================`);
});
