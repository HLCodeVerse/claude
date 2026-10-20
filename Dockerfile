# ==============================================================================
# Evolution API v2 - Free WhatsApp Service Dockerfile
# Optimized for Render Cloud Deployment & Local Docker
# ==============================================================================
FROM evoapicloud/evolution-api:v2.2.3

# Switch to root to configure permissions and entrypoint
USER root
WORKDIR /evolution

# Create directories for persistent WhatsApp session data and media
RUN mkdir -p /evolution/instances /evolution/public

# Copy custom entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/custom-entrypoint.sh
RUN chmod +x /usr/local/bin/custom-entrypoint.sh

# Render and standard ports
EXPOSE 8080 10000

# Set default production environment variables
ENV NODE_ENV=production \
    SERVER_TYPE=http \
    SERVER_PORT=8080 \
    AUTHENTICATION_TYPE=apikey \
    AUTHENTICATION_API_KEY=evol_whatsapp_api_secret_key_2026 \
    AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true \
    SERVER_DISABLE_DOCS=false \
    SERVER_DISABLE_MANAGER=false \
    CORS_ORIGIN=* \
    CORS_METHODS=GET,POST,PUT,DELETE \
    CORS_CREDENTIALS=true \
    LOG_LEVEL=ERROR,WARN,INFO \
    DEL_INSTANCE=false

# Use custom entrypoint to auto-bind Render's dynamic PORT and database settings
ENTRYPOINT ["/usr/local/bin/custom-entrypoint.sh"]
