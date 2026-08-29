# =====================================================================
# SIPELA — Multi-stage Production Dockerfile
# =====================================================================

# --- STAGE 1: Build Image ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependensi sistem yang dibutuhkan untuk compile native addons
RUN apk add --no-cache python3 make g++

# Salin definisi dependencies dan schema Prisma
COPY package*.json ./
COPY prisma ./prisma/

# Install seluruh dependencies termasuk devDependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Salin kode sumber aplikasi
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

# Build aplikasi NestJS ke Javascript (dist/)
RUN npm run build

# --- STAGE 2: Production Runtime Image ---
FROM node:20-alpine AS runner

WORKDIR /app

# Install openssl yang dibutuhkan Prisma Client di Alpine Linux
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=3001

# Salin package.json & Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install hanya dependencies production
RUN npm ci --omit=dev

# Salin file hasil generate prisma & build dari builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist

# Expose port aplikasi
EXPOSE 3001

# Jalankan server SIPELA
CMD ["node", "dist/main.js"]
