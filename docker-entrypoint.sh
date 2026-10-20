#!/bin/bash
set -e

echo "=========================================================="
echo " Starting Free WhatsApp Service (Evolution API v2)"
echo "=========================================================="

# 1. Port Detection & Configuration
EXTERNAL_PORT="${PORT:-${SERVER_PORT:-8080}}"
export GATEWAY_PORT="$EXTERNAL_PORT"
export EVOLUTION_INTERNAL_PORT="${EVOLUTION_INTERNAL_PORT:-8082}"

echo "[-] External Gateway Port   : $EXTERNAL_PORT"
echo "[-] Evolution API Port (Int): $EVOLUTION_INTERNAL_PORT"

# 2. Server URL Detection: Render provides $RENDER_EXTERNAL_URL
if [ -n "$RENDER_EXTERNAL_URL" ]; then
  if [ -z "$SERVER_URL" ] || [ "$SERVER_URL" = "http://localhost:8080" ] || [ "$SERVER_URL" = "http://localhost:$EXTERNAL_PORT" ]; then
    export SERVER_URL="$RENDER_EXTERNAL_URL"
    echo "[-] Auto-configured SERVER_URL from Render: $SERVER_URL"
  fi
fi

if [ -z "$SERVER_URL" ]; then
  export SERVER_URL="http://localhost:${EXTERNAL_PORT}"
fi

# 3. API Key Default
if [ -z "$AUTHENTICATION_API_KEY" ]; then
  export AUTHENTICATION_API_KEY="evol_whatsapp_api_secret_key_2026"
  echo "[-] WARNING: AUTHENTICATION_API_KEY not set. Using default key."
  echo "[-] API KEY: $AUTHENTICATION_API_KEY"
else
  echo "[-] AUTHENTICATION_API_KEY is configured."
fi

# 4. Storage Directories
mkdir -p /evolution/instances /evolution/public /var/lib/postgresql/data /run/postgresql
chown -R postgres:postgres /var/lib/postgresql /run/postgresql
chmod 775 /run/postgresql

# 5. Redis Settings (Disable external Redis to prevent disconnect errors)
export CACHE_REDIS_ENABLED="${CACHE_REDIS_ENABLED:-false}"
export CACHE_LOCAL_ENABLED=true

# 6. Database Configuration (Supabase PostgreSQL / Embedded DB Fallback)
SUPABASE_URI="postgresql://postgres.zrwqcigybfqelbtenenv:Chandan%409777767188@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?schema=public&sslmode=require"

if [ -z "$DATABASE_CONNECTION_URI" ] || [ "$DATABASE_CONNECTION_URI" = "postgresql://user:pass@localhost:5432/evolution?schema=public" ]; then
  export DATABASE_CONNECTION_URI="$SUPABASE_URI"
  echo "[-] Auto-configured Supabase PostgreSQL for persistent WhatsApp sessions."
fi

export DATABASE_ENABLED=true
export DATABASE_PROVIDER=postgresql

# Full persistence for chats, contacts, instances, and messages so MCP & AI apps can access all data
export DATABASE_SAVE_DATA_INSTANCE=true
export DEL_INSTANCE=false
export DATABASE_CONNECTION_CLIENT_NAME="evolution"
export DATABASE_SAVE_DATA_NEW_MESSAGE=true
export DATABASE_SAVE_MESSAGE_UPDATE=true
export DATABASE_SAVE_DATA_CONTACTS=true
export DATABASE_SAVE_DATA_CHATS=true
export DATABASE_SAVE_DATA_HISTORIC=false
export DATABASE_SAVE_DATA_LABELS=false

# 7. WhatsApp Web Protocol & Baileys Settings (Prevents count: 0 and connection drops)
if [ -z "$CONFIG_SESSION_PHONE_VERSION" ]; then
  LATEST_WA_VER=$(node -e "
    const https = require('https');
    const req = https.get('https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/baileys-version.json', { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const v = JSON.parse(data).version;
          console.log(v.join('.'));
        } catch(e) {}
      });
    });
    req.on('error', () => {});
    req.on('timeout', () => req.destroy());
  " 2>/dev/null || true)

  if [ -n "$LATEST_WA_VER" ]; then
    export CONFIG_SESSION_PHONE_VERSION="$LATEST_WA_VER"
    export WEB_VERSION="$LATEST_WA_VER"
    echo "[-] Auto-detected latest WhatsApp Web version: $CONFIG_SESSION_PHONE_VERSION"
  else
    export CONFIG_SESSION_PHONE_VERSION="2.3000.1043857760"
    export WEB_VERSION="2.3000.1043857760"
    echo "[-] Using fallback WhatsApp Web version: $CONFIG_SESSION_PHONE_VERSION"
  fi
fi

export CONFIG_SESSION_PHONE_CLIENT="Chrome"
export CONFIG_SESSION_PHONE_NAME="Chrome"

# 7. Apply Database Migrations (Prisma)
echo "[-] Applying Evolution API Prisma database migrations..."
if [ -f "./Docker/scripts/deploy_database.sh" ]; then
  . ./Docker/scripts/deploy_database.sh || echo "[!] Database migration notice: continuing startup..."
fi

echo "=========================================================="
echo " WhatsApp Service Ready"
echo " Server URL   : $SERVER_URL"
echo " Gateway Port : $EXTERNAL_PORT"
echo " Internal Port: $EVOLUTION_INTERNAL_PORT"
echo " Database     : $DATABASE_PROVIDER ($DATABASE_CONNECTION_URI)"
echo " Redis        : $CACHE_REDIS_ENABLED (Local cache: $CACHE_LOCAL_ENABLED)"
echo " Dashboard UI : $SERVER_URL/dashboard"
echo " Test Suite   : $SERVER_URL/test"
echo " Swagger Docs : $SERVER_URL/docs"
echo " Manager UI   : $SERVER_URL/manager"
echo " Health Check : $SERVER_URL/health"
echo "=========================================================="

# 8. Start Node.js Reverse Proxy Gateway on external port
GATEWAY_SCRIPT="/evolution/gateway.js"
if [ ! -f "$GATEWAY_SCRIPT" ]; then
  GATEWAY_SCRIPT="./gateway.js"
fi

echo "[-] Launching Node Gateway reverse proxy on port $EXTERNAL_PORT..."
PORT="$EXTERNAL_PORT" SERVER_PORT="$EXTERNAL_PORT" EVOLUTION_INTERNAL_PORT="$EVOLUTION_INTERNAL_PORT" node "$GATEWAY_SCRIPT" &
GATEWAY_PID=$!

# 9. Configure internal port for Evolution API and start
export SERVER_PORT="$EVOLUTION_INTERNAL_PORT"
export PORT="$EVOLUTION_INTERNAL_PORT"

echo "[-] Launching Evolution API on internal port $EVOLUTION_INTERNAL_PORT..."
exec npm run start:prod
