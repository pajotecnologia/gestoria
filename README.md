# 🚀 Gestor IA - Plataforma SaaS Multi-Tenant para Agências de IA

Plataforma SaaS de nível de produção para agências de marketing gerenciarem múltiplos agentes de IA de conversão/atendimento e operarem uma **Mesa Redonda de Agentes Especialistas (AI War Room)** para criação colaborativa de campanhas, copys, artes com IA (DALL-E 3) e roteiros de vídeo tanto pela **Aplicação Web** quanto pelo **WhatsApp**.

---

## 🛠️ Stack Tecnológica
- **Backend**: Node.js, TypeScript, Express, Prisma ORM, PostgreSQL, BullMQ, Redis, Multer, OpenAI SDK (Chat + Embeddings + DALL-E 3).
- **Frontend**: React.js, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **RAG & Vector Database**: Qdrant Vector DB com particionamento seguro por `tenantId` e `agentId`.
- **WhatsApp Gateway**: Evolution API com retentativas assíncronas, leitura de QR Code e suporte a Grupos.
- **Multi-Agent War Room**: Mesa redonda com Estrategista (CMO), Copywriter Sênior, Designer (DALL-E 3), Roteirista de Vídeos Curtos e Gestora de Tráfego.
- **Deploy & Hospedagem**: 100% pronto para **Coolify** e Docker Compose.

---

## 📱 Comandos do Squad no WhatsApp (Chat Privado ou Grupo da Agência)

Você pode criar um **Grupo no WhatsApp da sua Agência** e adicionar o bot. Os seguintes comandos são processados em tempo real:

| Comando no WhatsApp | O que o Squad faz |
| :--- | :--- |
| `!squad [seu briefing]` | Aciona a mesa redonda completa: **Estrategista**, **Copywriter**, **Designer (com imagem gerada)** e **Roteirista de Vídeo** criando em cadeia. |
| `@designer [ideia]` ou `!arte [ideia]` | O Diretor de Arte cria o conceito visual e **renderiza a imagem via DALL-E 3 enviando a foto direto no WhatsApp**. |
| `@copywriter [tema]` | A Copywriter cria 3 headlines magnéticas + 2 variações completas de copy (AIDA / PAS). |
| `@estrategista [tema]` | O Estrategista define posicionamento, público-alvo e 3 teses de conversão. |
| `@video [tema]` | O Roteirista cria roteiro de 30 a 45 segundos estruturado cena a cena para Reels / TikTok. |
| `@trafego [tema]` | A Gestora de Tráfego define segmentação de público, orçamento de teste e KPIs. |
| `!ajuda` | Exibe o menu com todos os comandos disponíveis no WhatsApp. |

---

## 👥 Squad de Especialistas na Mesa Redonda

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
│       ├── services/         # whatsappSquadService.ts (Comandos de Squad e DALL-E 3 no WhatsApp)
│       └── webhooks/         # Webhook assíncrono Evolution API (Suporte a Grupos e Privado)
├── frontend/                 # Painel SPA React + Vite + Tailwind CSS
├── coolify-stack.yml         # Stack de infraestrutura para Coolify
├── docker-compose.yml        # Infraestrutura para rodar localmente
├── n8n-workflow-saas-agent.json
└── .env.example              # Modelo de variáveis de ambiente
```

---

## 🚢 Como Fazer o Deploy no Coolify

### 1. Subir a Stack de Infraestrutura

1. No painel do **Coolify**, crie um **New Project** (ex.: `Gestor IA`).
2. Clique em **+ New Resource** > **Docker Compose**.
3. Use o `coolify-stack.yml` deste repositório.
4. Defina as variáveis de ambiente necessárias para os serviços que realmente serão utilizados.

> **PostgreSQL externo:** se o Backend utilizar o PostgreSQL externo informado por você, o serviço `postgres` da `coolify-stack.yml` não precisa ser utilizado como banco da aplicação. Nesse cenário, o `DATABASE_URL` do Backend aponta diretamente para o servidor PostgreSQL externo.

### 2. Conectar o Backend (Node.js)

1. Clique em **+ New Resource** > **Git Repository**.
2. Aponte para `https://github.com/pajotecnologia/gestoria.git`.
3. Configure:
   - **Base Directory**: `/backend`
   - **Build Pack**: `Dockerfile`
   - **Port**: `3000`
   - **Domain**: `https://api.seudominio.com`
4. Em **Environment Variables**, configure o PostgreSQL externo:
   - `DATABASE_URL=postgresql://postgres:SENHA@HOST:5432/gestoria?schema=public`
   - `JWT_SECRET` com pelo menos 32 caracteres
   - `EVOLUTION_WEBHOOK_SECRET` em produção
   - demais variáveis do `.env.example` conforme os serviços utilizados.
5. **Não** coloque a senha do PostgreSQL no GitHub, `.env.example`, Dockerfile ou `docker-compose.yml`. No Coolify, use a área **Environment Variables / Secrets** do recurso Backend.
6. Se o PostgreSQL estiver fora do Coolify, o servidor do Coolify precisa conseguir alcançar `HOST:5432` (firewall, ACL e configuração de acesso do PostgreSQL).
7. O Dockerfile executará `prisma migrate deploy` automaticamente antes de iniciar a API.

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
