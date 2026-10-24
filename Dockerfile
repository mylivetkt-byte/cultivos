# ---- Multi‑stage Dockerfile for AgroPaccioli (SAS Agrícolas) ----
# Stage 1: Build the Vite client
FROM node:20-slim AS builder
WORKDIR /app
ENV NODE_ENV=development
COPY package.json package-lock.json* ./
RUN npm install --include=dev --legacy-peer-deps
COPY . ./
RUN npm run build

# Stage 2: Runtime for the Express server & static SPA
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3002
ENV HOST=0.0.0.0

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --legacy-peer-deps
COPY server ./server
COPY --from=builder /app/dist ./public
RUN mkdir -p /app/uploads

EXPOSE 3002
CMD ["node", "server/index.js"]



