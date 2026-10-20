#!/bin/bash
set -e

echo "=========================================================="
echo " Starting Free WhatsApp Service (Evolution API v2)"
echo "=========================================================="

# 1. Port Detection: Render sets $PORT dynamically (often 10000)
if [ -n "$PORT" ]; then
  export SERVER_PORT="$PORT"
  echo "[-] Detected Render PORT: $PORT -> Setting SERVER_PORT=$PORT"
fi

if [ -z "$SERVER_PORT" ]; then
  export SERVER_PORT=8080
  echo "[-] Defaulting SERVER_PORT to 8080"
fi

# 2. Server URL Detection: Render provides $RENDER_EXTERNAL_URL
if [ -n "$RENDER_EXTERNAL_URL" ]; then
  if [ -z "$SERVER_URL" ] || [ "$SERVER_URL" = "http://localhost:8080" ] || [ "$SERVER_URL" = "http://localhost:$SERVER_PORT" ]; then
    export SERVER_URL="$RENDER_EXTERNAL_URL"
    echo "[-] Auto-configured SERVER_URL from Render: $SERVER_URL"
  fi
fi

if [ -z "$SERVER_URL" ]; then
  export SERVER_URL="http://localhost:${SERVER_PORT}"
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
echo " Port         : $SERVER_PORT"
echo " Database     : $DATABASE_ENABLED"
echo " Swagger Docs : $SERVER_URL/docs"
echo " Manager UI   : $SERVER_URL/manager"
echo "=========================================================="

# Execute Evolution API production start
exec npm run start:prod
