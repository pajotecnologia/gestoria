import React, { useEffect, useState } from 'react';
import { 
  BrainCircuit, 
  CheckCircle2, 
  Power, 
  Trash2, 
  Pencil, 
  Zap, 
  X, 
  AlertCircle,
  Sparkles,
  Plus,
  Coins,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { apiUrl } from '../api/client';

type UsageSummary = {
  totals: { requests: number; failures: number; totalTokens: number; estimatedCost: number };
  byProvider: Array<{ provider: string; taskType: string; requests: number; failures: number; totalTokens: number; estimatedCost: number }>;
};

type ProviderAccount = {
  id: string;
  name: string;
  provider: string;
  model: string;
  enabled: boolean;
  priority: number;
  lastError?: string | null;
  lastUsedAt?: string | null;
  createdAt?: string;
};

export type ProviderBalanceInfo = {
  provider: string;
  status: 'active' | 'no_credits' | 'rate_limit' | 'invalid_key' | 'error';
  balanceDisplay: string;
  hasCredits: boolean;
  totalGranted?: number;
  totalUsed?: number;
  totalAvailable?: number;
  billingUrl?: string;
  message: string;
  latencyMs: number;
};

export const PROVIDER_MODELS: Record<string, Array<{ id: string; name: string }>> = {
  gemini: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Recomendado - Ultra Rápido)' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Estável & Alta Capacidade)' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Raciocínio Avançado)' },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite (Econômico)' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o (Recomendado para Produção)' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Ultra Rápido & Baixo Custo)' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'o1-mini', name: 'o1-mini (Raciocínio Rápido)' },
    { id: 'o1-preview', name: 'o1-preview (Raciocínio Avançado)' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Recomendado - Groq LPU Speed)' },
    { id: 'llama3-70b-8192', name: 'Llama 3 70B (Alto Desempenho)' },
    { id: 'llama3-8b-8192', name: 'Llama 3 8B (Ultra Rápido)' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (32k Contexto)' },
  ],
  ollama: [
    { id: 'hermes3:8b', name: 'Hermes 3 (8B - Ideal para Especialistas & Debates)' },
    { id: 'llama3.1:latest', name: 'Llama 3.1 (8B - Instruções & Raciocínio)' },
    { id: 'qwen2.5:latest', name: 'Qwen 2.5 (Local)' },
    { id: 'mistral:latest', name: 'Mistral 7B (Local)' },
  ],
};

const emptyForm = {
  name: '',
  provider: 'gemini',
  model: 'gemini-2.0-flash',
  apiKey: '',
  priority: 100,
  enabled: true
};

export const AIProvidersSettings: React.FC<{ jwtToken: string }> = ({ jwtToken }) => {
  const [accounts, setAccounts] = useState<ProviderAccount[]>([]);
  const [editingAccount, setEditingAccount] = useState<ProviderAccount | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [customModelMode, setCustomModelMode] = useState(false);
  const [message, setMessage] = useState('');
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  // Estados de Saldo e Teste de Conexão Live
  const [testingId, setTestingId] = useState<string | null>(null);
  const [balances, setBalances] = useState<Record<string, ProviderBalanceInfo>>({});
  const [checkingBalanceId, setCheckingBalanceId] = useState<string | null>(null);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [modalTestLoading, setModalTestLoading] = useState(false);
  const [modalTestResult, setModalTestResult] = useState<ProviderBalanceInfo | null>(null);

  const load = async () => {
    try {
      const res = await fetch(apiUrl('/api/ai-providers'), {
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      const data = await res.json();
      if (res.ok) setAccounts(data.data || []);
      else setMessage(data.error || 'Não foi possível carregar os provedores de IA.');
    } catch (err: any) {
      setMessage(err.message || 'Erro de conexão.');
    }
  };

  const loadUsage = async () => {
    try {
      const res = await fetch(apiUrl('/api/ai-usage/summary?days=30'), {
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      const data = await res.json();
      if (res.ok) setUsage(data.data || null);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void load();
    void loadUsage();
  }, [jwtToken]);

  // Fechar modal ao pressionar ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleOpenCreate = () => {
    setEditingAccount(null);
    setForm(emptyForm);
    setCustomModelMode(false);
    setModalTestResult(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (account: ProviderAccount) => {
    setEditingAccount(account);
    setForm({
      name: account.name,
      provider: account.provider,
      model: account.model,
      apiKey: '',
      priority: account.priority,
      enabled: account.enabled
    });
    setCustomModelMode(false);
    setModalTestResult(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
    setModalTestResult(null);
  };

  const handleTestInModal = async () => {
    if (!form.apiKey.trim() && !editingAccount) {
      setModalTestResult({
        provider: form.provider,
        status: 'error',
        balanceDisplay: 'Chave obrigatória',
        hasCredits: false,
        message: 'Informe a API Key / URL antes de testar.',
        latencyMs: 0
      });
      return;
    }

    setModalTestLoading(true);
    setModalTestResult(null);

    try {
      if (editingAccount && !form.apiKey.trim()) {
        const res = await fetch(apiUrl(`/api/ai-providers/${editingAccount.id}/balance`), {
          method: 'POST',
          headers: { Authorization: `Bearer ${jwtToken}` }
        });
        const data = await res.json();
        if (res.ok && data.data) {
          setModalTestResult(data.data);
          setBalances(prev => ({ ...prev, [editingAccount.id]: data.data }));
        } else {
          setModalTestResult({
            provider: form.provider,
            status: 'error',
            balanceDisplay: 'Falha no teste',
            hasCredits: false,
            message: data.error || 'Falha ao validar provedor.',
            latencyMs: 0
          });
        }
        return;
      }

      const res = await fetch(apiUrl('/api/ai-providers/check-balance'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: form.provider,
          model: form.model,
          apiKey: form.apiKey
        })
      });
      const data = await res.json();
      if (res.ok && data.balanceInfo) {
        setModalTestResult(data.balanceInfo);
      } else {
        setModalTestResult({
          provider: form.provider,
          status: 'error',
          balanceDisplay: 'Falha no teste',
          hasCredits: false,
          message: data.error || data.message || 'Falha ao validar credencial.',
          latencyMs: 0
        });
      }
    } catch (err: any) {
      setModalTestResult({
        provider: form.provider,
        status: 'error',
        balanceDisplay: 'Erro de conexão',
        hasCredits: false,
        message: err.message || 'Erro ao conectar com a API.',
        latencyMs: 0
      });
    } finally {
      setModalTestLoading(false);
    }
  };

  const handleCheckBalance = async (id: string) => {
    setCheckingBalanceId(id);
    try {
      const res = await fetch(apiUrl(`/api/ai-providers/${id}/balance`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setBalances(prev => ({ ...prev, [id]: data.data }));
      }
    } catch {
      // ignore
    } finally {
      setCheckingBalanceId(null);
    }
  };

  const handleCheckAllBalances = async () => {
    if (accounts.length === 0) return;
    setIsCheckingAll(true);
    try {
      await Promise.allSettled(
        accounts.filter(a => a.enabled).map(a => handleCheckBalance(a.id))
      );
    } finally {
      setIsCheckingAll(false);
    }
  };

  const handleTestExisting = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(apiUrl(`/api/ai-providers/${id}/test`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      const data = await res.json();
      if (res.ok && data.balanceInfo) {
        setBalances(prev => ({ ...prev, [id]: data.balanceInfo }));
      }
    } catch {
      // ignore
    } finally {
      setTestingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        const res = await fetch(apiUrl(`/api/ai-providers/${editingAccount.id}`), {
          method: 'PUT',
          headers: { Authorization: `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Não foi possível atualizar o provedor.');

        setMessage(`Provedor '${data.data?.name}' atualizado com sucesso!`);
      } else {
        const res = await fetch(apiUrl('/api/ai-providers'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Não foi possível cadastrar o provedor.');

        setMessage(`Provedor '${data.data?.name}' cadastrado com sucesso!`);
      }

      handleCloseModal();
      await load();
      await loadUsage();
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  const toggle = async (id: string) => {
    await fetch(apiUrl(`/api/ai-providers/${id}/toggle`), { method: 'PATCH', headers: { Authorization: `Bearer ${jwtToken}` } });
    await load();
    await loadUsage();
  };

  const remove = async (id: string) => {
    if (!window.confirm('Remover este provedor de IA?')) return;
    await fetch(apiUrl(`/api/ai-providers/${id}`), { method: 'DELETE', headers: { Authorization: `Bearer ${jwtToken}` } });
    await load();
    await loadUsage();
  };

  return (
    <section className="space-y-6">
      {/* Header Unificado & Ação Primária */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Provedores de Inteligência Artificial
            </h1>
            <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-500 dark:text-indigo-400">
              {accounts.length} {accounts.length === 1 ? 'provedor ativo' : 'provedores cadastrados'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Configure suas chaves do Google Gemini, OpenAI, Groq e Ollama com verificação de saldo em tempo real e contingência automática.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {accounts.length > 0 && (
            <button
              type="button"
              disabled={isCheckingAll}
              onClick={handleCheckAllBalances}
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
              title="Consultar saldo e cota de todos os provedores"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-indigo-500 ${isCheckingAll ? 'animate-spin' : ''}`} />
              <span>{isCheckingAll ? 'Consultando...' : 'Checar Saldos'}</span>
            </button>
          )}

          <button 
            type="button" 
            onClick={handleOpenCreate}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-400 hover:to-violet-500 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> 
            <span>Cadastrar Provedor</span>
          </button>
        </div>
      </div>

      {/* Métricas Rápidas de Consumo */}
      {usage && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="shadcn-card p-4">
            <div className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Requisições (30 dias)</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{usage.totals.requests}</div>
          </div>
          <div className="shadcn-card p-4">
            <div className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Falhas / Fallbacks</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{usage.totals.failures}</div>
          </div>
          <div className="shadcn-card p-4">
            <div className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Tokens Processados</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{usage.totals.totalTokens.toLocaleString('pt-BR')}</div>
          </div>
          <div className="shadcn-card p-4">
            <div className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Custo Estimado</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">US$ {usage.totals.estimatedCost.toFixed(4)}</div>
          </div>
        </div>
      )}

      {message && (
        <div className="flex items-center justify-between rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3.5 text-xs text-indigo-600 dark:text-indigo-300">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Lista de Contas Cadastradas */}
      <div className="space-y-4">
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-zinc-800">
            <BrainCircuit className="h-10 w-10 text-slate-400 dark:text-zinc-600 mb-3" />
            <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">Nenhum provedor de IA cadastrado</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 max-w-sm">
              Clique em <strong>"+ Cadastrar Provedor"</strong> no topo para adicionar chaves da OpenAI, Gemini, Groq ou URL do Ollama.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {accounts.map(account => {
              const balance = balances[account.id];
              const isCheckingThis = checkingBalanceId === account.id || testingId === account.id;

              return (
                <div
                  key={account.id}
                  className="shadcn-card flex flex-col justify-between space-y-4 relative overflow-hidden"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm">{account.name}</h3>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                            account.enabled 
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400' 
                              : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                          }`}>
                            {account.enabled ? '● Ativo' : 'Desativado'}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-indigo-600 dark:text-indigo-400 font-mono font-semibold uppercase">
                          {account.provider} &bull; {account.model}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(account)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 transition cursor-pointer"
                          title="Editar Provedor"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(account.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400 transition cursor-pointer"
                          title="Remover Provedor"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bloco de Saldo & Status da Cota em Tempo Real */}
                    <div className="mt-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/40">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          <Coins className="h-3.5 w-3.5 text-amber-500" />
                          <span>Saldo / Cota:</span>
                        </div>
                        <button
                          type="button"
                          disabled={isCheckingThis}
                          onClick={() => handleCheckBalance(account.id)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition cursor-pointer disabled:opacity-50"
                          title="Consultar saldo agora"
                        >
                          <RefreshCw className={`h-3 w-3 ${isCheckingThis ? 'animate-spin' : ''}`} />
                          <span>{isCheckingThis ? 'Consultando...' : 'Consultar'}</span>
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        {balance ? (
                          <div className="flex flex-col gap-1 w-full">
                            <div className="flex items-center justify-between">
                              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md ${
                                balance.status === 'active' 
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : balance.status === 'no_credits'
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                  : balance.status === 'rate_limit'
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              }`}>
                                {balance.status === 'active' && <CheckCircle2 className="h-3 w-3" />}
                                {(balance.status === 'no_credits' || balance.status === 'invalid_key' || balance.status === 'error') && <AlertCircle className="h-3 w-3" />}
                                {balance.balanceDisplay}
                              </span>
                              {balance.latencyMs > 0 && (
                                <span className="text-[10px] text-slate-400 font-mono">{balance.latencyMs}ms</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
                              {balance.message}
                            </p>
                            {balance.billingUrl && !balance.hasCredits && (
                              <a
                                href={balance.billingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 underline underline-offset-2"
                              >
                                <span>Adicionar créditos na plataforma</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        ) : account.lastError ? (
                          <div className="w-full">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                              <AlertCircle className="h-3 w-3 shrink-0" />
                              <span className="truncate">{account.lastError}</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 dark:text-zinc-500 italic">
                            Clique em "Consultar" para verificar saldo/cota
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                      <span>Prioridade: <strong className="text-slate-800 dark:text-zinc-200">{account.priority}</strong></span>
                      {account.lastUsedAt && (
                        <span>Último uso: {new Date(account.lastUsedAt).toLocaleDateString('pt-BR')}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                    <button
                      type="button"
                      disabled={isCheckingThis}
                      onClick={() => handleTestExisting(account.id)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-500 dark:text-amber-400 transition cursor-pointer disabled:opacity-50"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>{isCheckingThis ? 'Testando...' : 'Testar Conexão'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggle(account.id)}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                        account.enabled
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm'
                      }`}
                    >
                      <Power className="h-3.5 w-3.5" />
                      <span>{account.enabled ? 'Desativar' : 'Ativar'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL DIALOG POPUP UNIFICADO DE CADASTRO E EDIÇÃO
          ========================================================================= */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={handleCloseModal}
        >
          <div 
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingAccount ? 'Editar Provedor de IA' : 'Cadastrar Novo Provedor de IA'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    {editingAccount 
                      ? 'Atualize os dados e credenciais do provedor selecionado.' 
                      : 'Adicione uma nova chave de API para expandir a rede de inteligência do sistema.'}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={handleCloseModal} 
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900 transition cursor-pointer"
                title="Fechar (ESC)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Atalhos Rápidos (apenas ao criar novo) */}
            {!editingAccount && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">Atalhos rápidos:</span>
                <button
                  type="button"
                  onClick={() => {
                    setForm({ ...form, name: 'Google Gemini 2.5', provider: 'gemini', model: 'gemini-2.5-flash' });
                    setCustomModelMode(false);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-indigo-400 dark:hover:text-indigo-400 cursor-pointer transition"
                >
                  ⚡ Google Gemini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm({ ...form, name: 'OpenAI GPT-4o', provider: 'openai', model: 'gpt-4o' });
                    setCustomModelMode(false);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-indigo-400 dark:hover:text-indigo-400 cursor-pointer transition"
                >
                  🤖 OpenAI GPT-4o
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm({ ...form, name: 'Groq Llama 3.3', provider: 'groq', model: 'llama-3.3-70b-versatile' });
                    setCustomModelMode(false);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-indigo-400 dark:hover:text-indigo-400 cursor-pointer transition"
                >
                  🚀 Groq LPU
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm({ ...form, name: 'Ollama Hermes 3 Local', provider: 'ollama', model: 'hermes3:8b', apiKey: 'http://localhost:11434' });
                    setCustomModelMode(false);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-indigo-400 dark:hover:text-indigo-400 cursor-pointer transition"
                >
                  🦙 Ollama Local
                </button>
              </div>
            )}

            {/* Formulário do Modal */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Nome Identificador *</label>
                  <input
                    required
                    placeholder="Ex: Gemini Flash Produção"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="shadcn-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Provedor *</label>
                  <select
                    value={form.provider}
                    onChange={e => {
                      const provider = e.target.value;
                      const defaultModel = (PROVIDER_MODELS[provider] && PROVIDER_MODELS[provider][0]?.id) || 'gpt-4o';
                      setForm({ ...form, provider, model: defaultModel });
                      setCustomModelMode(false);
                    }}
                    className="shadcn-input"
                  >
                    <option value="gemini">Google Gemini (Recomendado)</option>
                    <option value="openai">OpenAI (Oficial)</option>
                    <option value="groq">Groq (Velocidade LPU)</option>
                    <option value="ollama">Ollama (Self-Hosted / Local)</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">Modelo *</label>
                    <button
                      type="button"
                      onClick={() => setCustomModelMode(!customModelMode)}
                      className="text-[10px] text-indigo-500 hover:underline dark:text-indigo-400"
                    >
                      {customModelMode ? 'Ver Lista' : 'Digitar Outro'}
                    </button>
                  </div>
                  {customModelMode ? (
                    <input
                      required
                      placeholder="ID do modelo (ex: gemini-2.5-flash)"
                      value={form.model}
                      onChange={e => setForm({ ...form, model: e.target.value })}
                      className="shadcn-input"
                    />
                  ) : (
                    <select
                      value={form.model}
                      onChange={e => setForm({ ...form, model: e.target.value })}
                      className="shadcn-input"
                    >
                      {(PROVIDER_MODELS[form.provider] || []).map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Prioridade de Rotação (1 = Máxima)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    max="1000"
                    value={form.priority}
                    onChange={e => setForm({ ...form, priority: Number(e.target.value) || 100 })}
                    className="shadcn-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  {form.provider === 'ollama' 
                    ? 'URL do Servidor Ollama' 
                    : editingAccount 
                      ? 'Nova Chave de API (Opcional - deixe em branco para manter a atual)' 
                      : 'Chave de API (API Key) *'}
                </label>
                <input
                  required={!editingAccount}
                  type={form.provider === 'ollama' ? 'text' : 'password'}
                  placeholder={form.provider === 'ollama' ? 'http://ollama:11434 ou http://localhost:11434' : editingAccount ? '••••••••••••••••' : 'AIzaSy... ou sk-...'}
                  value={form.apiKey}
                  onChange={e => setForm({ ...form, apiKey: e.target.value })}
                  className="shadcn-input"
                />
              </div>

              {editingAccount && (
                <div className="pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      onChange={e => setForm({ ...form, enabled: e.target.checked })}
                      className="rounded accent-indigo-600 h-4 w-4"
                    />
                    <span>Ativo para uso nas requisições do sistema</span>
                  </label>
                </div>
              )}

              {modalTestResult && (
                <div className={`p-3.5 rounded-xl text-xs border ${
                  modalTestResult.status === 'active' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' 
                    : modalTestResult.status === 'no_credits'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold">
                      {modalTestResult.hasCredits ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />}
                      <span>{modalTestResult.balanceDisplay}</span>
                    </div>
                    {modalTestResult.latencyMs > 0 && (
                      <span className="text-[10px] opacity-75 font-mono">{modalTestResult.latencyMs}ms</span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed">{modalTestResult.message}</p>
                  {modalTestResult.billingUrl && !modalTestResult.hasCredits && (
                    <a
                      href={modalTestResult.billingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 underline"
                    >
                      <span>Acessar painel de recarga na plataforma</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  disabled={modalTestLoading || (!form.apiKey.trim() && !editingAccount)}
                  onClick={handleTestInModal}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-500/20 dark:text-amber-400 transition disabled:opacity-40 cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>{modalTestLoading ? 'Verificando Saldo...' : 'Testar Conexão & Saldo'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 transition cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{editingAccount ? 'Salvar Alterações' : 'Cadastrar Provedor'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
