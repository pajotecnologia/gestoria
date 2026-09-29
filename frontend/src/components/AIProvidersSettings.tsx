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
  Plus
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

export const PROVIDER_MODELS: Record<string, Array<{ id: string; name: string }>> = {
  gemini: [
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Recomendado - Mais Recente)' },
    { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Estável & Rápido)' },
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite (Ultra Rápido & Econômico)' },
    { id: 'gemini-flash-lite-latest', name: 'Gemini Flash Lite (Mais Recente)' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o (Recomendado para Produção)' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Ultra Rápido & Baixo Custo)' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'o1-mini', name: 'o1-mini (Raciocínio Rápido)' },
    { id: 'o1-preview', name: 'o1-preview (Raciocínio Avançado)' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq LPU Speed)' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Sub-second Latency)' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
  ],
  ollama: [
    { id: 'hermes3:8b', name: 'Hermes 3 (8B - Ideal para Especialistas & Debates)' },
    { id: 'llama3.1:latest', name: 'Llama 3.1 (8B - Instruções & Raciocínio)' },
    { id: 'qwen2.5:latest', name: 'Qwen 2.5 (Local)' },
    { id: 'mistral:latest', name: 'Mistral 7B (Local)' },
  ],
};

export const AIProvidersSettings: React.FC<{ jwtToken: string }> = ({ jwtToken }) => {
  const [accounts, setAccounts] = useState<ProviderAccount[]>([]);
  const [form, setForm] = useState({ name: '', provider: 'gemini', model: 'gemini-3.8-flash', apiKey: '', priority: 100 });
  const [customModelMode, setCustomModelMode] = useState(false);
  const [editCustomModelMode, setEditCustomModelMode] = useState(false);
  const [message, setMessage] = useState('');
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Estados de Teste de Conexão Live
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; latencyMs?: number }>>({});
  const [formTestLoading, setFormTestLoading] = useState(false);
  const [formTestResult, setFormTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Modal de Edição
  const [editingAccount, setEditingAccount] = useState<ProviderAccount | null>(null);
  const [editForm, setEditForm] = useState({ name: '', provider: 'gemini', model: '', apiKey: '', priority: 100, enabled: true });

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

  const handleTestUnsaved = async () => {
    if (!form.apiKey.trim()) {
      setFormTestResult({ success: false, message: 'Informe a API Key / URL antes de testar.' });
      return;
    }

    setFormTestLoading(true);
    setFormTestResult(null);

    try {
      const res = await fetch(apiUrl('/api/ai-providers/test-connection'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: form.provider,
          model: form.model,
          apiKey: form.apiKey
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFormTestResult({ success: true, message: `Conexão bem sucedida! Latência: ${data.latencyMs}ms. Resposta da IA: "${data.replyPreview}"` });
      } else {
        setFormTestResult({ success: false, message: data.error || data.details || 'Falha no teste de conexão.' });
      }
    } catch (err: any) {
      setFormTestResult({ success: false, message: err.message || 'Erro ao testar conexão.' });
    } finally {
      setFormTestLoading(false);
    }
  };

  const handleTestExisting = async (id: string) => {
    setTestingId(id);
    setTestResults(prev => ({ ...prev, [id]: { success: false, message: 'Testando conexão...' } }));

    try {
      const res = await fetch(apiUrl(`/api/ai-providers/${id}/test`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResults(prev => ({
          ...prev,
          [id]: { success: true, latencyMs: data.latencyMs, message: `Online! Latência: ${data.latencyMs}ms. Resposta: "${data.replyPreview}"` }
        }));
      } else {
        setTestResults(prev => ({
          ...prev,
          [id]: { success: false, message: data.error || data.details || 'Falha no teste.' }
        }));
      }
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [id]: { success: false, message: err.message || 'Erro no teste.' }
      }));
    } finally {
      setTestingId(null);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(apiUrl('/api/ai-providers'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível cadastrar o provedor.');

      setForm({ name: '', provider: 'gemini', model: 'gemini-3.8-flash', apiKey: '', priority: 100 });
      setFormTestResult(null);
      setShowForm(false);
      setMessage(`Provedor '${data.data?.name}' cadastrado com sucesso!`);
      await load();
      await loadUsage();
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  const handleOpenEdit = (account: ProviderAccount) => {
    setEditingAccount(account);
    setEditForm({
      name: account.name,
      provider: account.provider,
      model: account.model,
      apiKey: '',
      priority: account.priority,
      enabled: account.enabled
    });
    setEditCustomModelMode(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    try {
      const res = await fetch(apiUrl(`/api/ai-providers/${editingAccount.id}`), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível atualizar o provedor.');

      setEditingAccount(null);
      setMessage(`Provedor '${data.data?.name}' atualizado com sucesso!`);
      await load();
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
            Configure suas chaves do Google Gemini, OpenAI, Groq e Ollama com fallback automático e balanceamento.
          </p>
        </div>

        <button 
          type="button" 
          onClick={() => {
            setShowForm(true);
            setFormTestResult(null);
          }}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-400 hover:to-violet-500 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> 
          <span>Cadastrar Provedor</span>
        </button>
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

      {/* Formulário de Cadastro de Novo Provedor */}
      {showForm && (
        <form onSubmit={add} className="shadcn-card space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cadastrar Provedor de IA</h3>
            </div>
            <button 
              type="button" 
              onClick={() => setShowForm(false)} 
              className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-600 hover:bg-slate-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              <X className="h-3.5 w-3.5" />
              <span>Fechar</span>
            </button>
          </div>

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
                  placeholder="ID do modelo (ex: gemini-3.8-flash)"
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
          </div>

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                {form.provider === 'ollama' ? 'URL do Servidor Ollama' : 'Chave de API (API Key) *'}
              </label>
              <input
                required
                type="text"
                placeholder={form.provider === 'ollama' ? 'http://ollama:11434 ou https://...' : 'AIzaSy... ou sk-...'}
                value={form.apiKey}
                onChange={e => setForm({ ...form, apiKey: e.target.value })}
                className="shadcn-input"
              />
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

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <button
              type="button"
              disabled={formTestLoading || !form.apiKey.trim()}
              onClick={handleTestUnsaved}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-500/20 dark:text-amber-400 transition disabled:opacity-40 cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>{formTestLoading ? 'Testando Conexão...' : 'Testar Conexão'}</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow transition cursor-pointer"
              >
                Cadastrar Provedor
              </button>
            </div>
          </div>

          {formTestResult && (
            <div className={`p-3 rounded-xl text-xs border ${formTestResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300'}`}>
              <div className="flex items-center gap-2">
                {formTestResult.success ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />}
                <span>{formTestResult.message}</span>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Lista de Contas Cadastradas */}
      <div className="space-y-4">
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-zinc-800">
            <BrainCircuit className="h-10 w-10 text-slate-400 dark:text-zinc-600 mb-3" />
            <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">Nenhum provedor de IA cadastrado</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 max-w-sm">
              Cadastre sua chave da OpenAI, Gemini, Groq ou URL do Ollama para alimentar os agentes de IA.
            </p>
            <button 
              type="button" 
              onClick={() => setShowForm(true)} 
              className="mt-4 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Cadastrar Primeiro Provedor</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {accounts.map(account => {
              const testResult = testResults[account.id];
              const isTesting = testingId === account.id;

              return (
                <div
                  key={account.id}
                  className="shadcn-card flex flex-col justify-between space-y-4"
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

                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-mono text-slate-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                        Prioridade {account.priority}
                      </span>
                    </div>

                    {testResult && (
                      <div className={`text-[11px] p-2.5 rounded-xl mt-3 flex items-center gap-2 border ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300'}`}>
                        {testResult.success ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />}
                        <span className="line-clamp-2">{testResult.message}</span>
                      </div>
                    )}

                    {!testResult && account.lastError && (
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl mt-2 truncate">
                        ⚠️ Último erro: {account.lastError}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                    <button
                      type="button"
                      disabled={isTesting}
                      onClick={() => handleTestExisting(account.id)}
                      className="flex h-8 items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 text-xs font-semibold text-amber-600 hover:bg-amber-500/20 dark:text-amber-400 transition cursor-pointer"
                    >
                      <Zap className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>{isTesting ? 'Testando...' : 'Testar'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(account)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition cursor-pointer"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => void toggle(account.id)}
                        className={`h-8 w-8 flex items-center justify-center rounded-lg transition cursor-pointer ${
                          account.enabled 
                            ? 'text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:text-zinc-400 dark:hover:text-amber-400 dark:hover:bg-amber-500/10' 
                            : 'text-emerald-500 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10'
                        }`}
                        title={account.enabled ? 'Desativar Provedor' : 'Ativar Provedor'}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => void remove(account.id)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:text-zinc-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Editar Provedor de IA</h3>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Nome Identificador</label>
                <input
                  required
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="shadcn-input"
                />
              </div>

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Provedor</label>
                  <select
                    value={editForm.provider}
                    onChange={e => {
                      const provider = e.target.value;
                      const defaultModel = (PROVIDER_MODELS[provider] && PROVIDER_MODELS[provider][0]?.id) || 'gpt-4o';
                      setEditForm({ ...editForm, provider, model: defaultModel });
                      setEditCustomModelMode(false);
                    }}
                    className="shadcn-input"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="groq">Groq</option>
                    <option value="ollama">Ollama</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">Modelo</label>
                    <button
                      type="button"
                      onClick={() => setEditCustomModelMode(!editCustomModelMode)}
                      className="text-[10px] text-indigo-500 hover:underline dark:text-indigo-400"
                    >
                      {editCustomModelMode ? 'Ver Lista' : 'Digitar Outro'}
                    </button>
                  </div>
                  {editCustomModelMode ? (
                    <input
                      required
                      type="text"
                      value={editForm.model}
                      onChange={e => setEditForm({ ...editForm, model: e.target.value })}
                      className="shadcn-input"
                    />
                  ) : (
                    <select
                      value={editForm.model}
                      onChange={e => setEditForm({ ...editForm, model: e.target.value })}
                      className="shadcn-input"
                    >
                      {(PROVIDER_MODELS[editForm.provider] || []).map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Nova Chave de API / URL (Opcional - deixe em branco para manter)
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={editForm.apiKey}
                  onChange={e => setEditForm({ ...editForm, apiKey: e.target.value })}
                  className="shadcn-input"
                />
              </div>

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Prioridade</label>
                  <input
                    required
                    type="number"
                    min="1"
                    max="1000"
                    value={editForm.priority}
                    onChange={e => setEditForm({ ...editForm, priority: Number(e.target.value) || 100 })}
                    className="shadcn-input"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.enabled}
                      onChange={e => setEditForm({ ...editForm, enabled: e.target.checked })}
                      className="rounded accent-indigo-600 h-4 w-4"
                    />
                    <span>Ativo para uso nas requisições</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow transition cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
