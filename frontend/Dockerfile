# ==========================================
# ESTÁGIO 1: Build da Aplicação React / Vite
# ==========================================
FROM node:20-alpine AS builder

ENV NODE_ENV=development

WORKDIR /app

COPY package*.json ./
RUN npm install --include=dev

COPY . .
RUN npm run build

# ==========================================
# ESTÁGIO 2: Nginx Web Server para SPA
# ==========================================
FROM nginx:alpine

# Configura Nginx para Single Page Application
RUN echo 'server { \
    listen 80; \
    location = /index.html { \
        root /usr/share/nginx/html; \
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always; \
    } \
    location /assets/ { \
        root /usr/share/nginx/html; \
        add_header Cache-Control "public, max-age=31536000, immutable" always; \
    } \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
