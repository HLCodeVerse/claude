/**
 * Evolution API v2 - Node.js WhatsApp Message Sender Example
 * 
 * Requirements:
 *   Node.js 18+ (includes native fetch)
 * 
 * Usage:
 *   node send-message.js
 */

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:8080';
const API_KEY = process.env.AUTHENTICATION_API_KEY || 'evol_whatsapp_api_secret_key_2026';
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'my_whatsapp_bot';
const RECIPIENT_NUMBER = process.env.RECIPIENT_NUMBER || '15551234567'; // Format: CountryCode + Number (No + or spaces)

async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'apikey': API_KEY,
      'Content-Type': 'application/json'
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${SERVER_URL}${endpoint}`, options);
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  console.log(`Connecting to Evolution API at: ${SERVER_URL}`);

  // 1. Check Server Status
  const statusRes = await apiRequest('/');
  console.log('[-] Server status:', statusRes.data.message || statusRes.data);

  // 2. Check or Create Instance
  console.log(`[-] Ensuring instance '${INSTANCE_NAME}' exists...`);
  const createRes = await apiRequest('/instance/create', 'POST', {
    instanceName: INSTANCE_NAME,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS'
  });

  if (createRes.ok) {
    console.log(`[+] Instance '${INSTANCE_NAME}' created!`);
  } else {
    console.log(`[-] Instance notice:`, createRes.data.response?.message || 'Instance may already exist');
  }

  // 3. Check Connection State
  const stateRes = await apiRequest(`/instance/connectionState/${INSTANCE_NAME}`);
  const state = stateRes.data.instance?.state || stateRes.data.state || 'close';
  console.log(`[-] Instance '${INSTANCE_NAME}' connection state: ${state}`);

  if (state !== 'open') {
    console.log(`[!] Instance is not connected to WhatsApp yet!`);
    console.log(`[!] Generating QR code...`);
    const qrRes = await apiRequest(`/instance/connect/${INSTANCE_NAME}`);
    if (qrRes.data.code) {
      console.log(`[!] Pair using terminal QR / Code or open the Web Dashboard to scan:`);
      console.log(qrRes.data.code);
    }
    return;
  }

  // 4. Send Text Message
  console.log(`[-] Sending test WhatsApp message to ${RECIPIENT_NUMBER}...`);
  const sendRes = await apiRequest(`/message/sendText/${INSTANCE_NAME}`, 'POST', {
    number: RECIPIENT_NUMBER,
    text: `Hello from Evolution API v2! 🚀\nSent at: ${new Date().toISOString()}`
  });

  console.log('Result:', JSON.stringify(sendRes.data, null, 2));
}

main().catch(err => console.error('Error:', err));
