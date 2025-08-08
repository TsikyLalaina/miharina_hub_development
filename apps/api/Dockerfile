# Multi-stage Dockerfile for Miharina API
FROM node:20-alpine AS base

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 miharina

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Development stage
FROM base AS dev
ENV NODE_ENV=development
RUN npm ci --include=dev
COPY . .
USER miharina
EXPOSE 3001
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
ENV NODE_ENV=production
RUN npm ci --omit=dev
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
ENV NODE_ENV=production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 miharina

# Copy built application
COPY --from=build --chown=miharina:nodejs /app/dist ./dist
COPY --from=build --chown=miharina:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=miharina:nodejs /app/package*.json ./

# Switch to non-root user
USER miharina

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
