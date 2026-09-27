# 🤖 Workflows de IA do n8n para o Gestor IA

Esta pasta contém os fluxos prontos e otimizados para orquestração de IA, RAG multi-tenant e atendimento no WhatsApp.

---

## 📦 Fluxos Disponíveis

### 1. `01-ai-agent-rag-conversation.json` (Principal)
- **Função**: Recebe as mensagens do WhatsApp encaminhadas pelo `evolutionWebhook.ts`.
- **RAG Multi-Tenant**: Faz busca semântica na coleção `agency_saas_knowledge_base` do **Qdrant**, filtrando exclusivamente pelos payloads `tenantId` e `agentId` da requisição.
- **Memória de Sessão**: Mantém histórico de contexto da conversa (`Window Buffer Memory`) utilizando a chave `sessionId` (`instanceName_senderPhone`).
- **Geração de Resposta**: LLM (OpenAI GPT-4o / GPT-4o-mini) gera a resposta com o System Prompt dinâmico do agente e devolve HTTP 200 com JSON `{ output, sessionId }`.

### 2. `02-lead-qualification-webhook.json` (Opcional / Qualificador)
- **Função**: Avalia em tempo real a intenção de compra do lead (`HOT`, `WARM`, `COLD`), pontua um `leadScore` de 0 a 100 e sinaliza se o lead necessita de transbordo para um atendente humano.

---

## 🚀 Como Importar no n8n

1. Acesse o seu painel do n8n (ex: `http://localhost:5678` ou `https://n8n.seudominio.com`).
2. No menu superior direito de **Workflows**, clique nos três pontinhos `...` > **Import from File**.
3. Selecione o arquivo `01-ai-agent-rag-conversation.json`.
4. Configure as duas credenciais necessárias:
   - **OpenAI Credential**: Insira sua chave `OPENAI_API_KEY`.
   - **Qdrant Vector Store Credential**:
     - *Host*: `http://qdrant:6333` (se estiver no Coolify/Docker) ou `http://localhost:6333` (local).
     - *API Key*: (deixe em branco se não configurou senha no Qdrant).
5. Ative o Workflow no toggle **Active** (no topo direito).
