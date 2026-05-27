# syntax=docker/dockerfile:1

# ── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create the data directory used for JSON persistence
RUN mkdir -p /data

# Copy standalone Next.js output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

LABEL org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.title="CampMate" \
      org.opencontainers.image.description="Camping trip planner for Home Assistant / Unraid" \
      net.unraid.docker.webui="http://[IP]:[PORT:3000]/" \
      net.unraid.docker.icon="https://raw.githubusercontent.com/google/material-design-icons/master/png/maps/terrain/materialicons/48dp/2x/baseline_terrain_black_48dp.png"

EXPOSE 3000

VOLUME ["/data"]

CMD ["node", "server.js"]
