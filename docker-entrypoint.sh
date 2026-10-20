#!/bin/bash
set -e

echo "=========================================================="
echo " Starting Free WhatsApp Service (Evolution API v2)"
echo "=========================================================="

# 1. Port Detection & Configuration
# External Port: Render sets $PORT dynamically (often 10000), docker-compose sets $SERVER_PORT (8080)
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

# 4. Storage directories
mkdir -p /evolution/instances /evolution/public

# 5. Database Connection Handling
if [ -n "$DATABASE_CONNECTION_URI" ]; then
  export DATABASE_ENABLED=true
  if [ -z "$DATABASE_PROVIDER" ]; then
    export DATABASE_PROVIDER=postgresql
  fi
  echo "[-] Database configured ($DATABASE_PROVIDER). Running migrations..."
  if [ -f "./Docker/scripts/deploy_database.sh" ]; then
    . ./Docker/scripts/deploy_database.sh || echo "[!] Database migration notice: Continuing..."
  fi
else
  export DATABASE_ENABLED=false
  echo "[-] No DATABASE_CONNECTION_URI detected. Running in standalone mode."
fi

echo "=========================================================="
echo " WhatsApp Service Ready"
echo " Server URL   : $SERVER_URL"
echo " Gateway Port : $EXTERNAL_PORT"
echo " Internal Port: $EVOLUTION_INTERNAL_PORT"
echo " Database     : $DATABASE_ENABLED"
echo " Dashboard UI : $SERVER_URL/dashboard"
echo " Swagger Docs : $SERVER_URL/docs"
echo " Manager UI   : $SERVER_URL/manager"
echo " Health Check : $SERVER_URL/health"
echo "=========================================================="

# 6. Start Node.js Reverse Proxy Gateway on external port
GATEWAY_SCRIPT="/evolution/gateway.js"
if [ ! -f "$GATEWAY_SCRIPT" ]; then
  GATEWAY_SCRIPT="./gateway.js"
fi

echo "[-] Launching Node Gateway reverse proxy on port $EXTERNAL_PORT..."
PORT="$EXTERNAL_PORT" SERVER_PORT="$EXTERNAL_PORT" EVOLUTION_INTERNAL_PORT="$EVOLUTION_INTERNAL_PORT" node "$GATEWAY_SCRIPT" &
GATEWAY_PID=$!

# 7. Configure internal port for Evolution API and start
export SERVER_PORT="$EVOLUTION_INTERNAL_PORT"
export PORT="$EVOLUTION_INTERNAL_PORT"

echo "[-] Launching Evolution API on internal port $EVOLUTION_INTERNAL_PORT..."
exec npm run start:prod
