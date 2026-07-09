# ---- Multi‑stage Dockerfile for the SAS Agrícolas app ----
# Stage 1: Build the Vite client
FROM node:20-alpine AS builder
WORKDIR /app
# Install dependencies (both client and server share package.json)
COPY package.json package-lock.json* ./
RUN npm ci --silent
# Copy source code
COPY . ./
# Build the client (vite)
RUN npm run build

# Stage 2: Runtime for the Express server
FROM node:20-alpine AS runtime
WORKDIR /app
# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production --silent
# Copy server source (excluding src/client which will be served as static)
COPY server ./server
# Copy built client assets from builder stage
COPY --from=builder /app/dist ./public
# Expose API port (default 3002 as per user config)
EXPOSE 3002
# Start the server
CMD ["node", "server/index.js"]
