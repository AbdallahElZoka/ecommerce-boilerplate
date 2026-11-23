# ─────────────────────────────────────────────────────────────
# Stage 1: Builder
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies needed for native modules (argon2) and Prisma/OpenSSL runtime
RUN apk add --no-cache python3 make g++ openssl

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
# Use npm install when lockfile is missing (first-time clones)
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Generate Prisma Client
RUN npx prisma generate

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# ─────────────────────────────────────────────────────────────
# Stage 2: Production
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install only production dependencies + Prisma CLI (needed for migrate)
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN apk add --no-cache python3 make g++ openssl && \
    if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi && \
    npx prisma generate && \
    apk del python3 make g++ && \
    chown -R nodejs:nodejs /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Switch to non-root user
USER nodejs

# Environment
ENV NODE_ENV=development
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node -r tsconfig-paths/register dist/server.js"]
