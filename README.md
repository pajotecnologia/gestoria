# 🚀 Gestor IA - Plataforma SaaS Multi-Tenant para Agências de IA

Plataforma SaaS de nível de produção para agências de marketing gerenciarem múltiplos agentes de IA de conversão/atendimento e operarem uma **Mesa Redonda de Agentes Especialistas (AI War Room)** para criação colaborativa de campanhas, copys, artes com IA (DALL-E 3) e roteiros de vídeo.

---

## 🛠️ Stack Tecnológica
- **Backend**: Node.js, TypeScript, Express, Prisma ORM, PostgreSQL, BullMQ, Redis, Multer, OpenAI SDK (Chat + Embeddings + DALL-E 3).
- **Frontend**: React.js, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **RAG & Vector Database**: Qdrant Vector DB com particionamento seguro por `tenantId` e `agentId`.
- **WhatsApp Gateway**: Evolution API com retentativas assíncronas e leitura de QR Code.
- **Multi-Agent War Room**: Mesa redonda com Estrategista (CMO), Copywriter Sênior, Designer (DALL-E 3), Roteirista de Vídeos Curtos e Gestora de Tráfego.
- **Orquestração de IA**: n8n Workflow com memória de sessão e LLM Router.
- **Deploy & Hospedagem**: 100% pronto para **Coolify** e Docker Compose.

---

## 👥 Squad de Especialistas na Mesa Redonda (War Room)

| Especialista | Papel & Atuação | Entregável |
| :--- | :--- | :--- |
| **🧠 Dr. Arthur Valente** | Estrategista Chefe & CMO | Tese da campanha, público-alvo e 3 ângulos de conversão |
| **✍️ Camila Rocha** | Copywriter Sênior | Títulos magnéticos, textos de anúncios (AIDA/PAS) e CTAs |
| **🎨 Lucas Viana** | Diretor de Arte & Designer | Paleta visual, conceito e **geração de artes em alta resolução (DALL-E 3)** |
| **🎬 Gabriel Sato** | Roteirista de Vídeo | Roteiro estruturado segundo a segundo para Reels / TikTok / Shorts |
| **📊 Renata Dias** | Gestora de Tráfego | Segmentação de público, orçamento de teste e KPIs de escala |

---

## 📁 Estrutura do Projeto

```
GestorIA/
├── backend/                  # API REST TypeScript + Prisma + BullMQ
│   ├── Dockerfile            # Multi-stage production build
│   ├── prisma/schema.prisma  # Modelagem PostgreSQL Multi-Tenant (Tenants, Agents, Rooms, Messages)
│   └── src/
│       ├── index.ts          # Servidor Express
│       ├── middlewares/      # Isolamento JWT Multi-Tenant
│       ├── routes/           # Auth, Agents, RTCE Compiler, RAG, WhatsApp, Rooms (War Room)
│       └── webhooks/         # Webhook assíncrono Evolution API
├── frontend/                 # Painel SPA React + Vite + Tailwind CSS
│   ├── Dockerfile            # Multi-stage build com Nginx para SPA
│   └── src/
│       ├── components/       # PromptGenerator, AgentConfig, RAG Upload, QR Code Modal, Dashboard, WarRoomChat
│       └── App.tsx           # Layout autenticado, Navegação Central/War Room & Login/Register
├── coolify-stack.yml         # Stack pronta para deploy com 1-clique no Coolify
├── docker-compose.yml        # Infraestrutura para rodar localmente
├── n8n-workflow-saas-agent.json # Fluxo do n8n exportado
└── .env.example              # Modelo de variáveis de ambiente
```

---

## 🚢 Como Fazer o Deploy no Coolify

### 1. Subir a Stack de Infraestrutura
1. No painel do **Coolify**, crie um **New Project** (ex: `Gestor IA`).
2. Clique em **+ New Resource** > **Docker Compose**.
3. Cole o conteúdo de `coolify-stack.yml`.
4. Defina as variáveis de ambiente necessárias (`POSTGRES_PASSWORD`, `EVOLUTION_API_KEY`, etc.) e clique em **Deploy**.

### 2. Conectar o Backend (Node.js)
1. Clique em **+ New Resource** > **Git Repository**.
2. Aponte para `https://github.com/pajotecnologia/gestoria.git`.
3. Configure:
   - **Base Directory**: `/backend`
   - **Build Pack**: `Dockerfile`
   - **Port**: `3000`
   - **Domain**: `https://api.seudominio.com`
4. Em **Environment Variables**, adicione as variáveis de conexão interna (`DATABASE_URL`, `REDIS_HOST=redis`, `QDRANT_URL=http://qdrant:6333`, `OPENAI_API_KEY`, etc.).
5. Clique em **Deploy**. O Coolify executará o build e rodará as migrations automaticamente.

### 3. Conectar o Frontend (React)
1. Clique em **+ New Resource** > **Git Repository**.
2. Configure:
   - **Base Directory**: `/frontend`
   - **Build Pack**: `Dockerfile`
   - **Port**: `80`
   - **Domain**: `https://app.seudominio.com`
3. Em **Environment Variables**:
   - `VITE_API_URL`: `https://api.seudominio.com`
4. Clique em **Deploy**.

---

## 💻 Como Rodar Localmente

### 1. Iniciar containers da infraestrutura
```bash
docker compose up -d
```

### 2. Configurar o Backend
```bash
cd backend
npm install
cp ../.env.example .env
npx prisma migrate dev --name init_warroom
npm run dev
```

### 3. Configurar o Frontend
```bash
cd ../frontend
npm install
npm run dev
```
Acesse `http://localhost:5173` no navegador.
