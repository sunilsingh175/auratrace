FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

COPY . .
RUN npm run build

# ── Runtime ──
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./

EXPOSE 3000

CMD ["npm", "start"]
