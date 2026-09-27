import React, { useState, useEffect } from 'react';
import { Bot, Plus, QrCode, FileUp, Settings, Trash2, Database } from 'lucide-react';
import { WhatsAppConnectModal } from './WhatsAppConnectModal';
import { KnowledgeUpload } from './KnowledgeUpload';
import { AgentConfigForm } from './AgentConfigForm';

interface Agent {
  id: string;
  name: string;
  niche: string;
  provider: string;
  model: string;
  whatsappStatus: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';
  knowledgeFiles?: any[];
  createdAt: string;
}

interface AgentsDashboardProps {
  jwtToken: string;
}

export const AgentsDashboard: React.FC<AgentsDashboardProps> = ({ jwtToken }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais e Telas
  const [selectedAgentForQR, setSelectedAgentForQR] = useState<Agent | null>(null);
  const [selectedAgentForRAG, setSelectedAgentForRAG] = useState<Agent | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null | 'new'>(null);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agents', {
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setAgents(data.data);
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
      await fetch(`/api/agents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      fetchAgents();
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
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
          >
            &larr; Voltar para Lista de Agentes
          </button>
        </div>
        <AgentConfigForm
          initialData={editingAgent === 'new' ? null : editingAgent}
          jwtToken={jwtToken}
          onSaved={() => {
            setEditingAgent(null);
            fetchAgents();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Estatísticas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white">Central de Agentes de IA</h2>
          <p className="text-xs text-slate-400 mt-1">
            Gerencie instâncias de WhatsApp, prompts RTCE e bases de conhecimento para seus clientes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setEditingAgent('new')}
          className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Novo Agente</span>
        </button>
      </div>

      {/* Grid de Agentes */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">Carregando agentes...</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-4">
          <Bot className="w-12 h-12 text-slate-600 mx-auto" />
          <div>
            <p className="text-sm font-semibold text-slate-300">Nenhum agente configurado</p>
            <p className="text-xs text-slate-500">Crie seu primeiro agente de IA para conectar ao WhatsApp.</p>
          </div>
          <button
            type="button"
            onClick={() => setEditingAgent('new')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
          >
            Criar Primeiro Agente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => {
            const isOnline = agent.whatsappStatus === 'CONNECTED';
            const isConnecting = agent.whatsappStatus === 'CONNECTING';

            return (
              <div
                key={agent.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      {agent.niche}
                    </span>

                    {/* Badge de Status WhatsApp */}
                    <div className="flex items-center space-x-1.5 text-[11px] font-medium">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isOnline ? 'bg-emerald-500' : isConnecting ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                        }`}
                      />
                      <span
                        className={
                          isOnline ? 'text-emerald-400' : isConnecting ? 'text-amber-400' : 'text-rose-400'
                        }
                      >
                        {isOnline ? 'WhatsApp Online' : isConnecting ? 'Aguardando QR' : 'Desconectado'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center space-x-3">
                    <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{agent.name}</h3>
                      <p className="text-[11px] text-slate-400 font-mono">{agent.provider} &bull; {agent.model}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Database className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{agent.knowledgeFiles?.length || 0} arquivos RAG</span>
                    </span>
                  </div>
                </div>

                {/* Ações Rápidas */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedAgentForQR(agent)}
                    className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-[10px] font-medium transition"
                  >
                    <QrCode className="w-4 h-4 text-emerald-400 mb-1" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAgentForRAG(agent)}
                    className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-[10px] font-medium transition"
                  >
                    <FileUp className="w-4 h-4 text-indigo-400 mb-1" />
                    <span>Base RAG</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingAgent(agent)}
                    className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-[10px] font-medium transition"
                  >
                    <Settings className="w-4 h-4 text-amber-400 mb-1" />
                    <span>Ajustar</span>
                  </button>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleDelete(agent.id)}
                    className="text-[10px] text-rose-400/80 hover:text-rose-300 flex items-center space-x-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Excluir Agente</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Conexão WhatsApp */}
      {selectedAgentForQR && (
        <WhatsAppConnectModal
          agentId={selectedAgentForQR.id}
          agentName={selectedAgentForQR.name}
          isOpen={!!selectedAgentForQR}
          onClose={() => {
            setSelectedAgentForQR(null);
            fetchAgents();
          }}
          jwtToken={jwtToken}
        />
      )}

      {/* Modal Upload RAG */}
      {selectedAgentForRAG && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl relative">
            <button
              type="button"
              onClick={() => {
                setSelectedAgentForRAG(null);
                fetchAgents();
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white z-10"
            >
              Fechar &times;
            </button>
            <KnowledgeUpload
              agentId={selectedAgentForRAG.id}
              jwtToken={jwtToken}
              onSuccess={() => fetchAgents()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
