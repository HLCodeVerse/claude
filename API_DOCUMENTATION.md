# 📘 WhatsApp Mediator API Documentation
### Integrating Evolution WhatsApp Service with Your External Applications

This service acts as a high-speed, self-hosted **WhatsApp Mediator / Gateway**. Your backend servers, microservices, CRMs, chatbots, or customer portals can make standard HTTP REST API requests to send and receive WhatsApp messages without paying Meta Cloud per-template fees.

---

## 🔑 Authentication

Every request from your external application must include the `apikey` HTTP header:

```http
apikey: evol_whatsapp_api_secret_key_2026
Content-Type: application/json
```

**Base URL:**
```
https://claude-kv0j.onrender.com
```

---

## 📌 Core Endpoints Reference

### 1. Send Text Message
Deliver a text message to any international WhatsApp number.

- **Method:** `POST`
- **Endpoint:** `/message/sendText/{instanceName}`
- **Request Body:**
```json
{
  "number": "15551234567",
  "text": "Hello! Your verification code is: *49201*"
}
```
*Note: Format the phone number as Country Code + Area Code + Number (e.g. `15551234567` for US, `919876543210` for India, `5511999999999` for Brazil). Do not include `+`, spaces, or parentheses.*

- **Success Response (201 Created):**
```json
{
  "key": {
    "remoteJid": "15551234567@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE5F1E29D3A4B5C"
  },
  "message": {
    "conversation": "Hello! Your verification code is: *49201*"
  },
  "messageTimestamp": "1718876400",
  "status": "PENDING"
}
```

---

### 2. Send Media (Image, PDF, Video)
Send images, documents (PDF, Docx), or videos via URL or base64.

- **Method:** `POST`
- **Endpoint:** `/message/sendMedia/{instanceName}`
- **Request Body (Image):**
```json
{
  "number": "15551234567",
  "mediatype": "image",
  "media": "https://example.com/invoice.png",
  "caption": "Here is your monthly statement 📄"
}
```
- **Request Body (PDF Document):**
```json
{
  "number": "15551234567",
  "mediatype": "document",
  "media": "https://example.com/files/invoice-102.pdf",
  "fileName": "invoice-102.pdf",
  "caption": "Payment receipt attached"
}
```

---

### 3. Send WhatsApp Audio / Voice Note (PTT)
Send an audio file rendered as a green recorded voice note (PTT) on WhatsApp.

- **Method:** `POST`
- **Endpoint:** `/message/sendWhatsAppAudio/{instanceName}`
- **Request Body:**
```json
{
  "number": "15551234567",
  "audio": "https://example.com/audio/voice-memo.mp3",
  "ptt": true
}
```

---

### 4. Check Instance Connection State
Verify if your WhatsApp phone is currently connected before dispatching messages.

- **Method:** `GET`
- **Endpoint:** `/instance/connectionState/{instanceName}`
- **Response:**
```json
{
  "instance": {
    "instanceName": "my_bot",
    "state": "open"
  }
}
```
*States: `open` (Connected and ready), `connecting` (Handshaking), `close` (Disconnected / QR needed).*

---

### 5. Setup Webhook for Incoming Messages
Forward all incoming messages and replies directly to your backend listener.

- **Method:** `POST`
- **Endpoint:** `/webhook/set/{instanceName}`
- **Request Body:**
```json
{
  "webhook": {
    "enabled": true,
    "url": "https://your-api-server.com/api/whatsapp-webhook",
    "byEvents": false,
    "base64": false,
    "events": [
      "MESSAGES_UPSERT",
      "CONNECTION_UPDATE"
    ]
  }
}
```

---

## 💻 Code Snippets for Your Applications

### Node.js / Express / Next.js
```javascript
const sendWhatsAppMessage = async (instance, recipientNumber, text) => {
  const response = await fetch(`https://claude-kv0j.onrender.com/message/sendText/${instance}`, {
    method: 'POST',
    headers: {
      'apikey': 'evol_whatsapp_api_secret_key_2026',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      number: recipientNumber,
      text: text
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to send WhatsApp message');
  }
  return data;
};

// Example usage:
sendWhatsAppMessage('my_bot', '15551234567', 'Hello from my Node.js application! 🚀')
  .then(res => console.log('Message sent:', res))
  .catch(err => console.error('Error:', err.message));

// Send Image / PDF / Voice Note (via Local File or URL):
const fs = require('fs');

async function sendLocalFile(instance, recipientNumber, filePath, type = 'image', caption = '') {
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');
  const mimeType = type === 'image' ? 'image/png' : (type === 'audio' ? 'audio/mp3' : 'application/pdf');
  const dataUri = `data:${mimeType};base64,${base64Data}`;

  const endpoint = type === 'audio' 
    ? `https://claude-kv0j.onrender.com/message/sendWhatsAppAudio/${instance}`
    : `https://claude-kv0j.onrender.com/message/sendMedia/${instance}`;

  const payload = type === 'audio'
    ? { number: recipientNumber, audio: dataUri, ptt: true }
    : { number: recipientNumber, mediatype: type, mimetype: mimeType, media: dataUri, caption: caption, fileName: 'document.pdf' };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'apikey': 'evol_whatsapp_api_secret_key_2026', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return await res.json();
}
```

---

### Python / FastAPI / Django / Flask
```python
import requests
import base64

def send_whatsapp_text(instance_name: str, number: str, message: str):
    url = f"https://claude-kv0j.onrender.com/message/sendText/{instance_name}"
    headers = {
        "apikey": "evol_whatsapp_api_secret_key_2026",
        "Content-Type": "application/json"
    }
    payload = {"number": number, "text": message}
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()

def send_whatsapp_media(instance_name: str, number: str, file_path_or_url: str, media_type: str = "image", caption: str = ""):
    """Send image, pdf document, or voice note via URL or local file path."""
    headers = {
        "apikey": "evol_whatsapp_api_secret_key_2026",
        "Content-Type": "application/json"
    }
    
    # Check if local file or URL
    if file_path_or_url.startswith("http"):
        media_data = file_path_or_url
    else:
        with open(file_path_or_url, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")
        mime = "image/png" if media_type == "image" else ("audio/mp3" if media_type == "audio" else "application/pdf")
        media_data = f"data:{mime};base64,{encoded}"

    if media_type == "audio":
        url = f"https://claude-kv0j.onrender.com/message/sendWhatsAppAudio/{instance_name}"
        payload = {"number": number, "audio": media_data, "ptt": True}
    else:
        url = f"https://claude-kv0j.onrender.com/message/sendMedia/{instance_name}"
        payload = {
            "number": number,
            "mediatype": media_type,
            "media": media_data,
            "caption": caption,
            "fileName": "document.pdf"
        }

    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()

# Example:
# send_whatsapp_text("my_bot", "15551234567", "Hello from Python! 🐍")
# send_whatsapp_media("my_bot", "15551234567", "invoice.pdf", media_type="document")
```

---

### PHP / Laravel
```php
<?php
function sendWhatsApp($instance, $number, $message) {
    $url = "https://claude-kv0j.onrender.com/message/sendText/" . $instance;
    $apiKey = "evol_whatsapp_api_secret_key_2026";

    $payload = json_encode([
        "number" => $number,
        "text" => $message
    ]);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "apikey: " . $apiKey,
        "Content-Type: application/json"
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return json_decode($response, true);
}

// Example usage:
$res = sendWhatsApp("my_bot", "15551234567", "Hello from PHP application! 🐘");
print_r($res);
?>
```

---

## 🛡️ Anti-Ban Guide: Will WhatsApp Suspend My Account If I Send Bulk Messages?

### ⚠️ The Direct Answer:
**YES, WhatsApp WILL ban your phone number if you send bulk spam recklessly!**

WhatsApp uses automated AI algorithms that monitor outbound message rates, user interactions, and spam reports. If a number exhibits bot-like or spam behavior, WhatsApp flags and suspends it (temporarily for 24-48 hours, or permanently).

---

### 🛑 What Causes WhatsApp Account Suspensions?

1. **User Reports (The #1 Ban Trigger):**
   When people receive an unsolicited message from an unknown number, WhatsApp shows a big yellow banner: **"Report and Block"**. If **3 to 5 people** click "Report" within a few hours, WhatsApp's automated system bans your number immediately.
2. **Speed & Volume Velocity:**
   Sending 100 messages in 10 seconds is impossible for a human. WhatsApp detects this velocity and flags the session.
3. **Identical Message Hashing:**
   Sending the exact same word-for-word message to hundreds of strangers.
4. **New Number "Cold Blasting":**
   Using a brand-new SIM card or freshly registered WhatsApp account and immediately sending 500 promotional messages.

---

### 🛡️ The 6 Golden Rules to Send Messages Safely (Zero Bans)

#### 1. Add Delays Between Every Message (Rate Limiting)
**Never send bulk messages in a tight loop.** Insert a randomized delay of **5 to 15 seconds** between each message:
```javascript
// Safe bulk dispatch helper with random delay:
for (const user of recipients) {
  await sendWhatsAppMessage('my_bot', user.phone, user.personalizedText);
  // Wait random delay between 6 and 14 seconds
  const delayMs = Math.floor(Math.random() * 8000) + 6000;
  await new Promise(resolve => setTimeout(resolve, delayMs));
}
```

#### 2. Number Warm-Up Schedule
If linking a newly created or previously inactive number, follow this schedule:
- **Days 1–3:** Max 15–25 messages per day (chat with known friends/family to build trust score).
- **Days 4–7:** Max 40–60 messages per day.
- **Week 2:** Max 100–150 messages per day.
- **Week 3+:** Max 250–400 messages per day (spaced throughout the day).

#### 3. Use Dynamic Variables & Text Spintax
Vary the greeting and phrasing so messages don't have identical hashes:
- *Greeting:* `Hi John`, `Hello Sarah`, `Hey David`.
- *Spintax:* `{Hi|Hello|Hey} {name}, your order #{orderId} is confirmed!`

#### 4. Opt-in & Two-Way Conversations
- Only message users who opted in or are expecting updates from your service (e.g. order receipts, OTP verification, booking reminders).
- If recipients reply to you, WhatsApp views your account as a legitimate trusted contact.

#### 5. Include an Easy Opt-Out
Always end promotional or reminder messages with:
`"Reply STOP to unsubscribe"`. If a user replies STOP, remove them from your database immediately. This prevents them from clicking WhatsApp's **"Report & Block"** button!

#### 6. Safe Daily Thresholds
- **Safe Daily Limit for Baileys Multi-Device:** **150 to 300 messages per day** (with randomized delays).
- **Batch Processing:** Send in batches of 50, then pause for 30–60 minutes before the next batch.
