# ==========================================
# ESTÁGIO 1: Compilação do TypeScript & Prisma
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY tsconfig.json ./
COPY src ./src/

RUN npx prisma generate
RUN npm run build

# ==========================================
# ESTÁGIO 2: Imagem Final de Produção
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

# Instala apenas dependências de produção
RUN npm install --only=production

# Copia build compilado e client Prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000

# Executa migrações automáticas e inicia o servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
