# ==========================================
# ESTÁGIO 1: Compilação do TypeScript & Prisma
# ==========================================
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=development

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --include=dev

COPY tsconfig.json ./
COPY src ./src/
COPY public ./public/

RUN npx prisma generate
RUN npm run build

# ==========================================
# ESTÁGIO 2: Imagem Final de Produção
# ==========================================
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

# Instala apenas dependências de produção
RUN npm install --omit=dev

# Copia build compilado, client Prisma e Frontend integrado
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/public ./public

EXPOSE 3000
EXPOSE 3014

# Executa migrações automáticas e inicia o servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
