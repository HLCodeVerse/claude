# 🚀 Free WhatsApp Cloud Service (Evolution API v2)

[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg?logo=docker)](https://www.docker.com/)
[![Render](https://img.shields.io/badge/Deploy%20to-Render-46E3B7.svg?logo=render)](https://render.com)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Multi--Device-25D366.svg?logo=whatsapp)](https://whatsapp.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A complete, production-ready, self-hosted **Free WhatsApp REST API Service** powered by **Evolution API v2** (Baileys Multi-Device engine). Deployable to **Render** with zero manual configuration or locally using **Docker Compose**.

No Meta Cloud API fees, no 24-hour template restrictions, and completely free to use with your own WhatsApp phone number.

---

## ✨ Features

- **100% Free WhatsApp API:** Connect your existing phone number via QR Code (Baileys Multi-Device).
- **1-Click Render Deployment:** Pre-configured `Dockerfile` and `render.yaml` Blueprint for Render Cloud.
- **Dynamic Port & URL Auto-Detection:** Automatically binds to Render's dynamic `$PORT` and `$RENDER_EXTERNAL_URL`.
- **Integrated Web Dashboard:** Beautiful client-side UI (`dashboard/index.html`) to pair QR codes, monitor instances, and send messages with zero coding required.
- **Interactive API Documentation:** Built-in Swagger UI at `/docs` and official Evolution Manager at `/manager`.
- **Rich Message Types:** Text, Images, Videos, Audio Voice Notes (PTT), PDF Documents, Locations, and Contacts.
- **Bi-Directional Webhooks:** Receive incoming WhatsApp messages (`MESSAGES_UPSERT`) and connection updates in real-time.
- **Database Ready:** Compatible with PostgreSQL (Render DB, Neon, Supabase) and Redis. Auto-falls back to standalone mode if no database is attached.
- **Production Code Examples:** Ready-to-run scripts in Node.js, Python, cURL, and a complete Postman collection.

---

## 📁 Repository Structure

```
.
├── Dockerfile                  # Optimized production Dockerfile for Render & Cloud PaaS
├── docker-entrypoint.sh        # Smart entrypoint handling Render PORT, DB migrations, and URLs
├── docker-compose.yml          # Full local stack (Evolution API + PostgreSQL 16 + Redis 7)
├── render.yaml                 # Render Blueprint for 1-click infrastructure deployment
├── .env.example                # Full environment configuration template with documentation
├── .gitignore                  # Prevents accidental commit of keys and WhatsApp sessions
├── .dockerignore               # Optimizes Docker build cache and upload times
├── dashboard/
│   └── index.html              # Sleek, single-file modern Web Dashboard (Tailwind CSS)
├── examples/
│   ├── send-message.js         # Node.js example script to send WhatsApp messages
│   ├── send-message.py         # Python example script using requests
│   ├── webhook-bot.js          # Standalone auto-reply WhatsApp bot (zero dependencies)
│   └── test-api.http           # REST Client file for 1-click testing in VS Code
└── evolution-whatsapp.postman_collection.json # Ready-to-import Postman collection
```

---

## 🚀 Quick Deployment on Render

### Method 1: Git Push to your Existing Render Web Service

If you have already connected this GitHub repository (`https://github.com/HLCodeVerse/claude.git`) to Render:

1. **Commit and push** all code in this repo to GitHub:
   ```bash
   git add .
   git commit -m "feat: complete Evolution WhatsApp service with Docker and Render support"
   git push origin main
   ```
2. Render will automatically detect the `Dockerfile` and trigger a new deployment.
3. In your **Render Dashboard** &rarr; Your Service &rarr; **Environment Variables**, set:
   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `AUTHENTICATION_API_KEY` | `your_secret_api_key_here` | Secret key used to authorize API requests |
   | `SERVER_URL` | `https://<your-service>.onrender.com` | Your public Render service URL |
   | `DATABASE_CONNECTION_URI` | *(Optional)* PostgreSQL URI | Optional: Neon, Supabase, or Render DB |
   | `DEL_INSTANCE` | `false` | Keeps instances alive across reboots |

---

### Method 2: Deploy using Render Blueprint (`render.yaml`)

1. Go to the [Render Dashboard](https://dashboard.render.com).
2. Click **New +** &rarr; **Blueprint**.
3. Select your repository `HLCodeVerse/claude`.
4. Render will read `render.yaml` and automatically provision:
   - Evolution WhatsApp API Web Service.
   - A managed PostgreSQL database for session persistence.
5. Click **Apply**.

---

## 💻 Running Locally with Docker Compose

If you want to run the full stack (API + PostgreSQL + Redis) locally on your computer or VPS:

1. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
2. Launch the services:
   ```bash
   docker compose up -d
   ```
3. Check the logs:
   ```bash
   docker compose logs -f evolution-api
   ```
4. Access the services:
   - **Base API:** [http://localhost:8080](http://localhost:8080)
   - **Swagger UI:** [http://localhost:8080/docs](http://localhost:8080/docs)
   - **Evolution Manager:** [http://localhost:8080/manager](http://localhost:8080/manager)
   - **Custom Dashboard:** Open `dashboard/index.html` in your browser.

---

## 📱 How to Connect Your WhatsApp Account

1. Open `dashboard/index.html` in your web browser (or double-click the file).
2. Enter your **Server URL** (e.g. `https://your-service.onrender.com` or `http://localhost:8080`) and your **API Key**.
3. Click **Create New Instance** (e.g. name it `my-phone`).
4. Click **Scan QR Code**.
5. On your phone:
   - Open **WhatsApp** &rarr; **Settings** &rarr; **Linked Devices** &rarr; **Link a Device**.
   - Point your phone camera at the QR code displayed on screen.
6. The dashboard will automatically update to **● Connected**! You can now send and receive WhatsApp messages via API.

---

## 📡 Essential REST API Endpoints

All API requests require the header:
```http
apikey: your_secret_api_key
```

### 1. Create Instance
```bash
curl -X POST "https://your-service.onrender.com/instance/create" \
  -H "apikey: your_secret_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "my_phone",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS"
  }'
```

### 2. Connect & Get QR Code
```bash
curl -X GET "https://your-service.onrender.com/instance/connect/my_phone" \
  -H "apikey: your_secret_api_key"
```

### 3. Check Connection Status
```bash
curl -X GET "https://your-service.onrender.com/instance/connectionState/my_phone" \
  -H "apikey: your_secret_api_key"
```

### 4. Send WhatsApp Text Message
```bash
curl -X POST "https://your-service.onrender.com/message/sendText/my_phone" \
  -H "apikey: your_secret_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "15551234567",
    "text": "Hello from Evolution API! 🚀"
  }'
```

### 5. Send Image or Document
```bash
curl -X POST "https://your-service.onrender.com/message/sendMedia/my_phone" \
  -H "apikey: your_secret_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "15551234567",
    "mediatype": "image",
    "media": "https://picsum.photos/600/400",
    "caption": "Photo from API"
  }'
```

### 6. Send Voice Note (PTT)
```bash
curl -X POST "https://your-service.onrender.com/message/sendWhatsAppAudio/my_phone" \
  -H "apikey: your_secret_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "15551234567",
    "audio": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "ptt": true
  }'
```

---

## 🤖 Webhook & Auto-Reply Bot

To receive incoming WhatsApp messages and reply automatically:

1. Configure your instance webhook:
   ```bash
   curl -X POST "https://your-service.onrender.com/webhook/set/my_phone" \
     -H "apikey: your_secret_api_key" \
     -H "Content-Type: application/json" \
     -d '{
       "enabled": true,
       "url": "https://your-bot-server.com/webhook",
       "webhook_by_events": false,
       "events": [
         "MESSAGES_UPSERT",
         "CONNECTION_UPDATE"
       ]
     }'
   ```
2. Run the included auto-reply bot example:
   ```bash
   export SERVER_URL="https://your-service.onrender.com"
   export AUTHENTICATION_API_KEY="your_secret_api_key"
   node examples/webhook-bot.js
   ```

---

## 💡 Recommended Free Permanent Database

Render's free PostgreSQL instance expires after 30 days. For a **100% free permanent database that never expires**:

1. Create a free account at [Neon.tech](https://neon.tech) or [Supabase.com](https://supabase.com).
2. Create a new PostgreSQL database.
3. Copy the database connection URI (e.g. `postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require`).
4. Paste it as `DATABASE_CONNECTION_URI` in your Render Web Service Environment Variables.
5. Set `DATABASE_ENABLED=true` and `DATABASE_PROVIDER=postgresql`.

Your WhatsApp sessions, message logs, and instance keys will remain permanently persistent!

---

## ⏰ Keeping Render Free Tier Awake

Render Free tier services spin down after 15 minutes of inactivity. To keep your WhatsApp API online 24/7 for free:

1. Create a free monitor at [UptimeRobot.com](https://uptimerobot.com) or [Cron-Job.org](https://cron-job.org).
2. Set the HTTP URL to `https://<your-service>.onrender.com/`.
3. Set the interval to ping every **5 to 10 minutes**.
4. This ensures your service stays active, connected, and ready to send/receive messages instantly!

---

## 🛡️ License

This project is licensed under the [MIT License](LICENSE). Evolution API is maintained by the [Evolution Foundation](https://github.com/evolution-foundation).
