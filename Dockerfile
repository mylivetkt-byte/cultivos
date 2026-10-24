# ---- Multi‑stage Dockerfile for AgroPaccioli (SAS Agrícolas) ----
# Stage 1: Build the Vite client
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++ libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci --silent
COPY . ./
RUN npm run build

# Stage 2: Runtime for the Express server & static SPA
FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache python3 make g++ libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci --only=production --silent
COPY server ./server
COPY --from=builder /app/dist ./public
RUN mkdir -p /app/uploads

ENV NODE_ENV=production
ENV PORT=3002
ENV HOST=0.0.0.0

EXPOSE 3002
CMD ["node", "server/index.js"]

