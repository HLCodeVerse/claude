/**
 * ==============================================================================
 * Free WhatsApp Service - Node.js Gateway & Reverse Proxy (gateway.js)
 * ==============================================================================
 * High-performance, zero-dependency reverse proxy, router, and static server.
 * Built using Node.js standard library modules only (http, fs, path, url, net).
 *
 * Responsibilities:
 * 1. Serves the WhatsApp Service Manager UI (`dashboard/index.html`) on
 *    `/test`, `/ui`, `/dashboard`, `/app`, and browser requests to `/`.
 * 2. Instant health check endpoint on `/health` and `/ping`.
 * 3. Transparently proxies API calls, docs, and webhooks to Evolution API
 *    running on internal port 8082 (EVOLUTION_INTERNAL_PORT).
 * 4. Transparently tunnels WebSocket upgrades (`upgrade` event) to internal port 8082.
 * 5. Returns clean 503 / auto-refreshing loading indicator while Evolution API
 *    initializes during container boot.
 * ==============================================================================
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const net = require('net');

// Configuration
const EXTERNAL_PORT = parseInt(
  process.env.GATEWAY_PORT || process.env.PORT || process.env.SERVER_PORT || '8080',
  10
);
const INTERNAL_PORT = parseInt(
  process.env.EVOLUTION_INTERNAL_PORT || '8082',
  10
);
const INTERNAL_HOST = process.env.EVOLUTION_INTERNAL_HOST || '127.0.0.1';

// Resolve dashboard path
function resolveDashboardPath() {
  const candidates = [
    path.join(__dirname, 'dashboard', 'index.html'),
    path.resolve(process.cwd(), 'dashboard', 'index.html'),
    '/evolution/dashboard/index.html',
    path.join(__dirname, 'index.html')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return candidates[0];
}

const DASHBOARD_PATH = resolveDashboardPath();

// Cache for dashboard file
let dashboardCache = null;
let dashboardMtime = 0;

function serveDashboard(res) {
  try {
    if (fs.existsSync(DASHBOARD_PATH)) {
      const stat = fs.statSync(DASHBOARD_PATH);
      if (!dashboardCache || stat.mtimeMs !== dashboardMtime) {
        dashboardCache = fs.readFileSync(DASHBOARD_PATH);
        dashboardMtime = stat.mtimeMs;
      }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': dashboardCache.length,
        'Cache-Control': 'no-cache'
      });
      res.end(dashboardCache);
      return;
    }
  } catch (err) {
    console.error('[Gateway] Error reading dashboard:', err.message);
  }

  const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Evolution API Gateway</title>
  <style>body{font-family:sans-serif;padding:2rem;background:#0f172a;color:#f8fafc;}</style>
</head>
<body>
  <h1>Evolution API Gateway</h1>
  <p>Dashboard HTML not found at: <code>${DASHBOARD_PATH}</code></p>
  <p><a href="/docs" style="color:#25D366">Open Swagger Docs &rarr;</a></p>
</body>
</html>`;

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(fallbackHtml)
  });
  res.end(fallbackHtml);
}

// Initializing HTML indicator for browsers during boot
function getInitializingHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="3">
  <title>Evolution API is Initializing</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0f172a;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 1rem;
      padding: 2.5rem;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
    }
    .spinner-box {
      position: relative;
      width: 72px;
      height: 72px;
      margin: 0 auto 1.5rem;
    }
    .spinner {
      width: 72px;
      height: 72px;
      border: 4px solid #334155;
      border-top-color: #25D366;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    .icon {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 24px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h1 {
      font-size: 1.35rem;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 0.75rem;
    }
    p {
      color: #94a3b8;
      font-size: 0.95rem;
      line-height: 1.5;
      margin-bottom: 1.25rem;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(37, 211, 102, 0.1);
      border: 1px solid rgba(37, 211, 102, 0.3);
      color: #25D366;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #25D366;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.8); }
    }
    .progress-bar-container {
      width: 100%;
      height: 6px;
      background: #334155;
      border-radius: 9999px;
      overflow: hidden;
      margin-bottom: 1rem;
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #128C7E, #25D366);
      width: 60%;
      animation: progress-indeterminate 2s infinite ease-in-out;
      border-radius: 9999px;
    }
    @keyframes progress-indeterminate {
      0% { transform: translateX(-100%); width: 40%; }
      50% { width: 70%; }
      100% { transform: translateX(250%); width: 40%; }
    }
    .hint {
      font-size: 0.8rem;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner-box">
      <div class="spinner"></div>
      <div class="icon">&#x1F4AC;</div>
    </div>
    <div class="badge">
      <span class="dot"></span>
      Gateway Active &bull; Booting Core
    </div>
    <h1>Easy What's is Initializing</h1>
    <p>Easy What's is initializing, please wait a few seconds... (auto-refreshing)</p>
    <div class="progress-bar-container">
      <div class="progress-bar-fill"></div>
    </div>
    <div class="hint">Auto-refreshing every 3 seconds</div>
  </div>
</body>
</html>`;
}

// Send 503 response when backend is initializing
function sendBackendInitializingResponse(req, res) {
  const accept = (req.headers['accept'] || '').toLowerCase();
  if (accept.includes('text/html')) {
    const html = getInitializingHtml();
    res.writeHead(503, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': Buffer.byteLength(html),
      'Retry-After': '3',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(html);
  } else {
    const json = JSON.stringify({
      status: 503,
      error: 'Service Unavailable',
      message: 'Easy What\'s is initializing, please wait a few seconds... (auto-refreshing)',
      uptime: process.uptime(),
      retryAfter: 3
    });
    res.writeHead(503, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(json),
      'Retry-After': '3',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(json);
  }
}

// Cleans media payload: strips data URIs to pure Base64 and infers mimetype
function cleanMediaPayload(rawBody) {
  try {
    const data = JSON.parse(rawBody);
    let modified = false;
    if (data && typeof data === 'object') {
      if (typeof data.media === 'string' && data.media.startsWith('data:')) {
        const match = data.media.match(/^data:([^;]+);base64,(.+)$/s);
        if (match) {
          if (!data.mimetype) data.mimetype = match[1];
          data.media = match[2];
          modified = true;
        } else {
          const commaIdx = data.media.indexOf(',');
          if (commaIdx !== -1) {
            data.media = data.media.substring(commaIdx + 1);
            modified = true;
          }
        }
      }
      if (typeof data.audio === 'string' && data.audio.startsWith('data:')) {
        const commaIdx = data.audio.indexOf(',');
        if (commaIdx !== -1) {
          data.audio = data.audio.substring(commaIdx + 1);
          modified = true;
        }
      }
    }
    return modified ? JSON.stringify(data) : rawBody;
  } catch {
    return rawBody;
  }
}

// Global API key from environment
const GLOBAL_API_KEY = process.env.AUTHENTICATION_API_KEY || 'evol_whatsapp_api_secret_key_2026';

// Sets instance settings (alwaysOnline: true, syncFullHistory: true) so connection stays open forever
function ensureInstanceSettings(instanceName) {
  if (!instanceName) return;
  const settingsPayload = JSON.stringify({
    rejectCall: false,
    msgCall: '',
    groupsIgnore: false,
    alwaysOnline: true,
    readMessages: false,
    readStatus: false,
    syncFullHistory: true
  });
  const req = http.request({
    hostname: INTERNAL_HOST,
    port: INTERNAL_PORT,
    path: `/settings/set/${instanceName}`,
    method: 'POST',
    headers: {
      'apikey': GLOBAL_API_KEY,
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(settingsPayload)
    }
  }, (res) => { res.resume(); });
  req.on('error', () => {});
  req.end(settingsPayload);
}

// Tracks instances that user deliberately disconnected/unlinked to prevent keepalive loop collisions
const disconnectedByUser = new Set();

// Checks if instance is online, and if offline or non-existent, instantly brings it online
function ensureInstanceOnline(instanceName, callback) {
  if (!instanceName) {
    if (callback) callback(false);
    return;
  }
  const apiKey = GLOBAL_API_KEY;

  const stateReq = http.request({
    hostname: INTERNAL_HOST,
    port: INTERNAL_PORT,
    path: `/instance/connectionState/${instanceName}`,
    method: 'GET',
    headers: { 'apikey': apiKey }
  }, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
      let state = 'unknown';
      let notFound = res.statusCode === 404;
      try {
        const json = JSON.parse(body);
        if (json.response && json.response.message && json.response.message[0] && json.response.message[0].includes('does not exist')) {
          notFound = true;
        }
        state = json?.instance?.state || json?.state || 'unknown';
      } catch (e) {}

      if (notFound) {
        console.log(`[Gateway Auto-Revive] Instance "${instanceName}" does not exist. Creating...`);
        const createPayload = JSON.stringify({
          instanceName: instanceName,
          token: apiKey,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          syncFullHistory: true,
          groupsIgnore: false,
          alwaysOnline: true
        });
        const createReq = http.request({
          hostname: INTERNAL_HOST,
          port: INTERNAL_PORT,
          path: '/instance/create',
          method: 'POST',
          headers: {
            'apikey': apiKey,
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(createPayload)
          }
        }, (cRes) => {
          cRes.resume();
          cRes.on('end', () => {
            console.log(`[Gateway Auto-Revive] Instance "${instanceName}" created. Waiting for socket connection...`);
            setTimeout(() => {
              if (callback) callback(true);
            }, 1500);
          });
        });
        createReq.on('error', () => { if (callback) callback(false); });
        createReq.end(createPayload);
        return;
      }

      if (state === 'open') {
        disconnectedByUser.delete(instanceName);
        ensureInstanceSettings(instanceName);
        if (callback) callback(true);
      } else {
        if (disconnectedByUser.has(instanceName)) {
          console.log(`[Gateway Auto-Revive] Instance "${instanceName}" was intentionally disconnected by user. Skipping background auto-reconnect.`);
          if (callback) callback(false);
          return;
        }
        console.log(`[Gateway Auto-Revive] Instance "${instanceName}" is "${state}". Reconnecting socket...`);
        const connReq = http.request({
          hostname: INTERNAL_HOST,
          port: INTERNAL_PORT,
          path: `/instance/connect/${instanceName}`,
          method: 'GET',
          headers: { 'apikey': apiKey }
        }, (cRes) => {
          cRes.resume();
          cRes.on('end', () => {
            setTimeout(() => {
              if (callback) callback(true);
            }, 1500);
          });
        });
        connReq.on('error', () => { if (callback) callback(false); });
        connReq.end();
      }
    });
  });

  stateReq.on('error', () => {
    if (callback) callback(false);
  });
  stateReq.end();
}

// Background poller: Ensures instance "hl" is brought online immediately once core is ready
function initAutoRevivePoller() {
  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    const healthReq = http.request({
      hostname: INTERNAL_HOST,
      port: INTERNAL_PORT,
      path: '/',
      method: 'GET'
    }, (res) => {
      res.resume();
      if (res.statusCode === 200) {
        clearInterval(timer);
        console.log('[Gateway Auto-Revive] Evolution API core is ready! Ensuring instance "hl" is online...');
        ensureInstanceOnline('hl', (ok) => {
          console.log(`[Gateway Auto-Revive] Instance "hl" initialization complete (success: ${ok}).`);
        });
      }
    });
    healthReq.on('error', () => {});
    healthReq.end();

    if (attempts > 60) {
      clearInterval(timer);
    }
  }, 2000);
}

initAutoRevivePoller();

// Permanent Forever Keep-Alive: Keeps Baileys socket active & prevents sleeping
function initForeverKeepAlive() {
  const KEEP_ALIVE_INTERVAL = 3 * 60 * 1000; // Every 3 minutes
  setInterval(() => {
    // 1. Touch internal health endpoint
    const pingReq = http.request({
      hostname: INTERNAL_HOST,
      port: INTERNAL_PORT,
      path: '/',
      method: 'GET'
    }, (res) => {
      res.resume();
    });
    pingReq.on('error', () => {});
    pingReq.end();

    // 2. Keep instance "hl" active and auto-reconnect if dropped UNLESS intentionally disconnected by user
    if (!disconnectedByUser.has('hl')) {
      ensureInstanceOnline('hl', () => {});
    }
  }, KEEP_ALIVE_INTERVAL);
}

initForeverKeepAlive();

// External Self-Ping: Pings public Render URL every 7 minutes to prevent free-tier container sleep
function initExternalSelfPing() {
  const externalUrl = process.env.RENDER_EXTERNAL_URL || 'https://claude-kv0j.onrender.com';
  const PING_INTERVAL = 7 * 60 * 1000; // Every 7 minutes (Render free tier sleeps after 15m)

  console.log(`[Gateway Keep-Alive] External self-ping configured for: ${externalUrl}`);

  setInterval(() => {
    try {
      const parsed = new URL(`${externalUrl}/health`);
      const client = parsed.protocol === 'https:' ? https : http;
      const pingReq = client.get(parsed.toString(), (res) => {
        res.resume();
      });
      pingReq.on('error', () => {
        // Silently catch transient DNS/network blips
      });
      pingReq.setTimeout(15000, () => pingReq.destroy());
    } catch (e) {
      // Ignore URL parse error
    }
  }, PING_INTERVAL);
}

initExternalSelfPing();

// Transparent HTTP reverse proxy to Evolution API with auto-retry and offline auto-revive
function proxyHttpRequest(req, res) {
  // Track deliberate logout or delete to prevent keepalive collision
  const isLogoutOrDelete = req.method === 'DELETE' && (req.url.startsWith('/instance/logout/') || req.url.startsWith('/instance/delete/'));
  if (isLogoutOrDelete) {
    const parts = req.url.split('?')[0].split('/');
    if (parts.length >= 4 && parts[3]) {
      disconnectedByUser.add(parts[3]);
      console.log(`[Gateway] User requested logout/delete for instance "${parts[3]}". Pausing auto-reconnect.`);
    }
  }

  // Clear logout lock when connect endpoint is hit
  if (req.url.startsWith('/instance/connect/')) {
    const parts = req.url.split('?')[0].split('/');
    if (parts.length >= 4 && parts[3]) {
      disconnectedByUser.delete(parts[3]);
    }
  }

  const clientIp = req.socket.remoteAddress || '';
  const forwardedFor = req.headers['x-forwarded-for']
    ? `${req.headers['x-forwarded-for']}, ${clientIp}`
    : clientIp;

  const headers = { ...req.headers };
  headers['x-forwarded-for'] = forwardedFor;
  if (!headers['x-forwarded-proto']) {
    headers['x-forwarded-proto'] = 'http';
  }
  if (!headers['x-forwarded-host'] && headers['host']) {
    headers['x-forwarded-host'] = headers['host'];
  }

  const isMessageDispatch = req.method === 'POST' && req.url.startsWith('/message/');
  const isMediaDispatch = req.method === 'POST' && (
    req.url.includes('/message/sendMedia') ||
    req.url.includes('/message/sendWhatsAppAudio')
  );

  // Extract instance name from /message/*/:instance
  let targetInstance = null;
  if (isMessageDispatch) {
    const parts = req.url.split('?')[0].split('/');
    if (parts.length >= 4) {
      targetInstance = parts[3];
    }
  }

  const executeForward = (bodyBuffer, retryCount = 0) => {
    if (bodyBuffer) {
      headers['content-length'] = Buffer.byteLength(bodyBuffer);
    }

    const options = {
      hostname: INTERNAL_HOST,
      port: INTERNAL_PORT,
      path: req.url,
      method: req.method,
      headers: headers
    };

    const proxyReq = http.request(options, (proxyRes) => {
      // If message dispatch failed because instance is offline/not connected, auto-revive & retry once!
      if (isMessageDispatch && proxyRes.statusCode >= 400 && targetInstance) {
        let respChunks = [];
        proxyRes.on('data', c => respChunks.push(c));
        proxyRes.on('end', () => {
          const respStr = Buffer.concat(respChunks).toString('utf8');
          const lowerStr = respStr.toLowerCase();
          const isOffline = lowerStr.includes('closed') ||
                            lowerStr.includes('connection closed') ||
                            lowerStr.includes('does not exist') ||
                            lowerStr.includes('not connected') ||
                            lowerStr.includes('timed out') ||
                            proxyRes.statusCode === 404;

          if (isOffline && retryCount === 0) {
            console.log(`[Gateway Auto-Revive] Message dispatch returned ${proxyRes.statusCode} (${respStr.substring(0, 100)}). Reviving instance "${targetInstance}" and retrying...`);
            ensureInstanceOnline(targetInstance, () => {
              executeForward(bodyBuffer, 1);
            });
            return;
          }

          // If still offline, return a clean, descriptive 503 instead of raw 500 crash
          if (isOffline) {
            const cleanError = JSON.stringify({
              status: 503,
              error: 'WhatsApp Session Offline',
              message: `WhatsApp instance "${targetInstance}" is not currently connected. Please link your phone in WhatsApp Setup via 8-Digit Code or QR Code.`,
              instance: targetInstance
            });
            res.writeHead(503, {
              'Content-Type': 'application/json; charset=utf-8',
              'Content-Length': Buffer.byteLength(cleanError)
            });
            res.end(cleanError);
            return;
          }

          // Otherwise return original response
          res.writeHead(proxyRes.statusCode, proxyRes.statusMessage, proxyRes.headers);
          res.end(Buffer.concat(respChunks));
        });
        return;
      }

      proxyRes.on('error', (err) => {
        if (!res.destroyed) {
          res.destroy(err);
        }
      });
      res.writeHead(proxyRes.statusCode, proxyRes.statusMessage, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      if (!res.headersSent) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
          sendBackendInitializingResponse(req, res);
        } else {
          console.error('[Gateway] Proxy error:', err.message);
          const errJson = JSON.stringify({
            status: 502,
            error: 'Bad Gateway',
            message: err.message
          });
          res.writeHead(502, {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': Buffer.byteLength(errJson)
          });
          res.end(errJson);
        }
      } else {
        res.destroy(err);
      }
    });

    req.on('aborted', () => {
      proxyReq.destroy();
    });
    req.on('error', (err) => {
      proxyReq.destroy(err);
    });

    res.on('close', () => {
      if (proxyReq && !proxyReq.destroyed) {
        proxyReq.destroy();
      }
    });

    if (bodyBuffer) {
      proxyReq.end(bodyBuffer);
    } else if (req.readable) {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
  };

  // Buffer and clean body for message dispatches
  if (isMessageDispatch && (headers['content-type'] || '').includes('application/json')) {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf8');
      const cleaned = isMediaDispatch ? cleanMediaPayload(rawBody) : rawBody;
      executeForward(Buffer.from(cleaned, 'utf8'), 0);
    });
    req.on('error', err => {
      if (!res.headersSent) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else {
    executeForward(null, 0);
  }
}

// Create Main HTTP Server
const server = http.createServer((req, res) => {
  const host = req.headers.host || 'localhost';
  const parsedUrl = new URL(req.url, `http://${host}`);
  const pathname = parsedUrl.pathname;
  const normPath = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  // 1. Dashboard Routes: /test, /ui, /dashboard, /app
  const dashboardRoutes = ['/test', '/ui', '/dashboard', '/app', '/dashboard/index.html'];
  if (dashboardRoutes.includes(normPath)) {
    serveDashboard(res);
    return;
  }

  // 2. Health & Ping Routes: /health, /ping
  if (normPath === '/health' || normPath === '/ping') {
    const payload = JSON.stringify({
      status: 200,
      service: 'evolution-whatsapp-gateway',
      uptime: process.uptime()
    });
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload),
      'Cache-Control': 'no-cache'
    });
    res.end(payload);
    return;
  }

  // 3. Root Route: /
  if (normPath === '' || normPath === '/') {
    const accept = (req.headers['accept'] || '').toLowerCase();
    if (accept.includes('text/html')) {
      serveDashboard(res);
      return;
    }
    // Non-HTML requests (API clients, curl, Render health checks) proxy to backend
    proxyHttpRequest(req, res);
    return;
  }

  // 4. All other routes (/instance/*, /message/*, /webhook/*, /docs*, /manager*, etc.)
  proxyHttpRequest(req, res);
});

// WebSocket Upgrade Forwarding
server.on('upgrade', (req, clientSocket, head) => {
  clientSocket.on('error', (err) => {
    // Client socket error handled
  });

  clientSocket.pause();

  const targetSocket = net.connect(
    {
      port: INTERNAL_PORT,
      host: INTERNAL_HOST
    },
    () => {
      let rawHeader = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        rawHeader += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
      }
      rawHeader += '\r\n';

      targetSocket.write(rawHeader);
      if (head && head.length > 0) {
        targetSocket.write(head);
      }

      clientSocket.resume();
      targetSocket.pipe(clientSocket);
      clientSocket.pipe(targetSocket);
    }
  );

  targetSocket.on('error', (err) => {
    if (clientSocket.writable) {
      clientSocket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');
    }
    clientSocket.destroy();
  });

  targetSocket.on('close', () => {
    if (!clientSocket.destroyed) {
      clientSocket.destroy();
    }
  });

  clientSocket.on('close', () => {
    if (!targetSocket.destroyed) {
      targetSocket.destroy();
    }
  });
});

// Server Startup
server.listen(EXTERNAL_PORT, '0.0.0.0', () => {
  console.log('==========================================================');
  console.log(`[Gateway] Reverse Proxy & Dashboard Server Active`);
  console.log(`[Gateway] Listening on        : http://0.0.0.0:${EXTERNAL_PORT}`);
  console.log(`[Gateway] Target Evolution API: http://${INTERNAL_HOST}:${INTERNAL_PORT}`);
  console.log(`[Gateway] Dashboard File      : ${DASHBOARD_PATH}`);
  console.log('==========================================================');
});

// Process Signal Handling
function shutdown(signal) {
  console.log(`[Gateway] Received ${signal}. Gracefully stopping...`);
  server.close(() => {
    console.log('[Gateway] Server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    process.exit(0);
  }, 4000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('[Gateway] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Gateway] Unhandled Rejection:', reason);
});
