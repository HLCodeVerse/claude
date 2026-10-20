# ==============================================================================
# Evolution API v2 - Free WhatsApp Service Dockerfile
# Optimized for Render Cloud Deployment & Local Docker
# Includes:
#   1. Embedded PostgreSQL server (zero-setup database out of the box)
#   2. Zero-dependency Node.js Reverse Proxy Gateway (serves Test UI on /)
#   3. Full Evolution WhatsApp API v2 engine
# ==============================================================================
FROM evoapicloud/evolution-api:v2.2.3

# Switch to root to configure permissions, packages, and entrypoint
USER root
WORKDIR /evolution

# Install embedded PostgreSQL and su-exec on Alpine for zero-config database support
RUN apk update && \
    apk add --no-cache postgresql postgresql-contrib su-exec

# Create directories for persistent WhatsApp session data and embedded PostgreSQL
RUN mkdir -p /evolution/instances /evolution/public /var/lib/postgresql/data /run/postgresql && \
    chown -R postgres:postgres /var/lib/postgresql /run/postgresql && \
    chmod 775 /run/postgresql

# Copy custom entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/custom-entrypoint.sh
RUN chmod +x /usr/local/bin/custom-entrypoint.sh

# Copy Node.js reverse proxy gateway and static dashboard UI
COPY gateway.js /evolution/gateway.js
COPY dashboard/ /evolution/dashboard/

# Render and standard ports
EXPOSE 8080 10000

# Set default production environment variables
ENV NODE_ENV=production \
    SERVER_TYPE=http \
    SERVER_PORT=8080 \
    EVOLUTION_INTERNAL_PORT=8082 \
    AUTHENTICATION_TYPE=apikey \
    AUTHENTICATION_API_KEY=evol_whatsapp_api_secret_key_2026 \
    AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true \
    SERVER_DISABLE_DOCS=false \
    SERVER_DISABLE_MANAGER=false \
    CONFIG_SESSION_PHONE_VERSION=2.3000.1043857760 \
    WEB_VERSION=2.3000.1043857760 \
    CONFIG_SESSION_PHONE_CLIENT=Chrome \
    CONFIG_SESSION_PHONE_NAME=Chrome \
    DATABASE_SAVE_DATA_CHATS=false \
    DATABASE_SAVE_DATA_CONTACTS=false \
    DATABASE_SAVE_DATA_HISTORIC=false \
    DATABASE_SAVE_DATA_LABELS=false \
    CACHE_REDIS_ENABLED=false \
    CACHE_LOCAL_ENABLED=true \
    CORS_ORIGIN=* \
    CORS_METHODS=GET,POST,PUT,DELETE \
    CORS_CREDENTIALS=true \
    LOG_LEVEL=ERROR,WARN,INFO \
    DEL_INSTANCE=false

# Use custom entrypoint to auto-bind Render's dynamic PORT and database settings
ENTRYPOINT ["/usr/local/bin/custom-entrypoint.sh"]
