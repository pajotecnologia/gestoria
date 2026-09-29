import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Plus, 
  QrCode, 
  FileUp, 
  Settings, 
  Trash2, 
  Database,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Radio
} from 'lucide-react';
import { WhatsAppConnectModal } from './WhatsAppConnectModal';
import { KnowledgeBaseManager } from './KnowledgeBaseManager';
import { AgentConfigForm } from './AgentConfigForm';
import { apiUrl } from '../api/client';

interface Agent {
  id: string;
  name: string;
  niche: string;
  provider: string;
  model: string;
  whatsappStatus: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';
  _count?: { knowledgeFiles: number };
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface AgentsDashboardProps {
  jwtToken: string;
}

export const AgentsDashboard: React.FC<AgentsDashboardProps> = ({ jwtToken }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 50, total: 0, totalPages: 0 });

  // Modais e Telas
  const [selectedAgentForQR, setSelectedAgentForQR] = useState<Agent | null>(null);
  const [selectedAgentForRAG, setSelectedAgentForRAG] = useState<Agent | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null | 'new'>(null);

  const fetchAgents = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/agents?page=${page}&pageSize=50`), {
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setAgents(data.data);
        if (data.pagination) setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Erro ao carregar agentes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este agente?')) return;
    try {
      const res = await fetch(apiUrl(`/api/agents/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao excluir agente.');
      }
      await fetchAgents(pagination.page);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [jwtToken]);

  if (editingAgent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setEditingAgent(null);
              fetchAgents();
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar para Lista de Agentes</span>
          </button>
        </div>
        <AgentConfigForm
          initialData={editingAgent === 'new' ? null : editingAgent}
          jwtToken={jwtToken}
          onSaved={() => {
            setEditingAgent(null);
            fetchAgents(pagination.page);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Unificado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Agentes WhatsApp & Atendimento
            </h1>
            <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-500 dark:text-indigo-400">
              {agents.length} {agents.length === 1 ? 'agente' : 'agentes'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Gerencie instâncias de WhatsApp, prompts RTCE e bases de conhecimento para automatizar atendimentos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setEditingAgent('new')}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-400 hover:to-violet-500 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Criar Novo Agente</span>
        </button>
      </div>

      {/* Grid de Agentes */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 dark:text-zinc-500">
          Carregando agentes...
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-zinc-800">
          <Radio className="h-10 w-10 text-slate-400 dark:text-zinc-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200">Nenhum agente configurado</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 max-w-sm">
            Crie seu primeiro agente de IA para conectar ao WhatsApp e automatizar conversas inteligentes.
          </p>
          <button
            type="button"
            onClick={() => setEditingAgent('new')}
            className="mt-4 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Criar Primeiro Agente</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((agent) => {
            const isOnline = agent.whatsappStatus === 'CONNECTED';
            const isConnecting = agent.whatsappStatus === 'CONNECTING';

            return (
              <div
                key={agent.id}
                className="shadcn-card flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700">
                      {agent.niche || 'Geral'}
                    </span>

                    {/* Badge de Status WhatsApp */}
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isOnline ? 'bg-emerald-500' : isConnecting ? 'bg-amber-500 animate-pulse' : 'bg-slate-400 dark:bg-zinc-600'
                        }`}
                      />
                      <span
                        className={
                          isOnline ? 'text-emerald-500 dark:text-emerald-400' : isConnecting ? 'text-amber-500 dark:text-amber-400' : 'text-slate-500 dark:text-zinc-400'
                        }
                      >
                        {isOnline ? 'WhatsApp Online' : isConnecting ? 'Aguardando QR' : 'Desconectado'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 text-indigo-500 dark:text-indigo-400">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 truncate">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{agent.name}</h3>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono truncate">{agent.provider} &bull; {agent.model}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Database className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                      <span>{agent._count?.knowledgeFiles || 0} arquivos RAG</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(agent.id)}
                      className="text-[11px] text-slate-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 flex items-center gap-1 transition cursor-pointer"
                      title="Excluir Agente"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>

                {/* Ações Rápidas */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => setSelectedAgentForQR(agent)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-medium transition dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
                  >
                    <QrCode className="h-4 w-4 text-emerald-500 dark:text-emerald-400 mb-1" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAgentForRAG(agent)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-medium transition dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
                  >
                    <FileUp className="h-4 w-4 text-indigo-500 dark:text-indigo-400 mb-1" />
                    <span>Base RAG</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingAgent(agent)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-medium transition dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
                  >
                    <Settings className="h-4 w-4 text-amber-500 dark:text-amber-400 mb-1" />
                    <span>Ajustes</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 shadcn-card px-4 py-3">
          <span className="text-[11px] text-slate-500 dark:text-zinc-400">
            {pagination.total} agentes • Página {pagination.page} de {pagination.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => fetchAgents(pagination.page - 1)}
              className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Anterior</span>
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchAgents(pagination.page + 1)}
              className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
            >
              <span>Próxima</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modais de Conexão WhatsApp e Base de Conhecimento */}
      {selectedAgentForQR && (
        <WhatsAppConnectModal
          isOpen={Boolean(selectedAgentForQR)}
          agentId={selectedAgentForQR.id}
          agentName={selectedAgentForQR.name}
          jwtToken={jwtToken}
          onClose={() => {
            setSelectedAgentForQR(null);
            fetchAgents(pagination.page);
          }}
        />
      )}

      {selectedAgentForRAG && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Base de Conhecimento RAG • {selectedAgentForRAG.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedAgentForRAG(null);
                  fetchAgents(pagination.page);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <KnowledgeBaseManager
              agentId={selectedAgentForRAG.id}
              agentName={selectedAgentForRAG.name}
              jwtToken={jwtToken}
              onChanged={() => fetchAgents(pagination.page)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
