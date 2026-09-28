# ==========================================
# ESTÁGIO 1: Build do Frontend (React / Vite)
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ==========================================
# ESTÁGIO 2: Build do Backend (TypeScript + Prisma)
# ==========================================
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm install
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# ==========================================
# ESTÁGIO 3: Imagem Final de Produção (Full-Stack)
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm install --only=production

COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder /app/backend/node_modules/@prisma ./node_modules/@prisma
COPY --from=frontend-builder /app/frontend/dist ./public

EXPOSE 3000
EXPOSE 3014

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
