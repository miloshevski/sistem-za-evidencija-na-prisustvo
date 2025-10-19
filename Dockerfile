# ===================================
# Stage 1: Dependencies
# ===================================
FROM node:20-alpine AS deps

# Install dependencies only when needed
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci && \
    npm cache clean --force

# ===================================
# Stage 2: Builder
# ===================================
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build arguments for environment variables
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_GPS_TOLERANCE_METERS
ARG NEXT_PUBLIC_APP_VERSION
ARG NEXT_PUBLIC_TIMESTAMP_TOLERANCE_SECONDS
ARG NEXT_PUBLIC_QR_TOKEN_ROTATION_SECONDS

# Set environment variables for build
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_GPS_TOLERANCE_METERS=$NEXT_PUBLIC_GPS_TOLERANCE_METERS
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_TIMESTAMP_TOLERANCE_SECONDS=$NEXT_PUBLIC_TIMESTAMP_TOLERANCE_SECONDS
ENV NEXT_PUBLIC_QR_TOKEN_ROTATION_SECONDS=$NEXT_PUBLIC_QR_TOKEN_ROTATION_SECONDS

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js application
# Create a custom build script without turbopack for production
RUN npm run build -- --no-turbopack 2>/dev/null || \
    (echo "Turbopack flag not supported, building normally..." && \
    sed -i 's/ --turbopack//g' package.json && \
    npm run build)

# ===================================
# Stage 3: Runner (Production)
# ===================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start the application
CMD ["node", "server.js"]
