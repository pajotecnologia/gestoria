import React, { useEffect, useState } from 'react';
import { 
  BrainCircuit, 
  CheckCircle2, 
  Power, 
  Trash2, 
  Edit3, 
  Zap, 
  X, 
  AlertCircle,
  Clock,
  Sparkles
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

export const AIProvidersSettings: React.FC<{ jwtToken: string }> = ({ jwtToken }) => {
  const [accounts, setAccounts] = useState<ProviderAccount[]>([]);
  const [form, setForm] = useState({ name: '', provider: 'gemini', model: 'gemini-3.8-flash', apiKey: '', priority: 100 });
  const [message, setMessage] = useState('');
  const [usage, setUsage] = useState<UsageSummary | null>(null);

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
      const res = await fetch(apiUrl('/api/ai-providers'), { headers: { Authorization: `Bearer ${jwtToken}` } });
      const data = await res.json();
      if (res.ok) setAccounts(data.data || []);
      else setMessage(data.error || 'Não foi possível carregar os provedores.');
    } catch (err: any) {
      setMessage(err.message || 'Erro de conexão.');
    }
  };

  const loadUsage = async () => {
    try {
      const res = await fetch(apiUrl('/api/ai-usage/summary?days=30'), { headers: { Authorization: `Bearer ${jwtToken}` } });
      const data = await res.json();
      if (res.ok) setUsage(data.data || null);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    void load();
    void loadUsage();
  }, [jwtToken]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setFormTestResult(null);

    const res = await fetch(apiUrl('/api/ai-providers'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Falha ao cadastrar IA.');
      return;
    }
    setForm({ name: '', provider: 'gemini', model: 'gemini-3.8-flash', apiKey: '', priority: 100 });
    setMessage(`Provedor '${data.data?.name}' cadastrado com sucesso!`);
    await load();
    await loadUsage();
  };

  const handleTestUnsaved = async () => {
    if (!form.apiKey.trim()) {
      setFormTestResult({ success: false, message: 'Digite a chave de API ou URL para testar.' });
      return;
    }
    setFormTestLoading(true);
    setFormTestResult(null);

    try {
      const res = await fetch(apiUrl('/api/ai-providers/test-unsaved'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: form.provider,
          model: form.model,
          apiKey: form.apiKey
        })
      });
      const data = await res.json();
      if (res.ok) {
        setFormTestResult({ success: true, message: data.data?.message || 'Conexão validada com sucesso!' });
      } else {
        setFormTestResult({ success: false, message: data.message || data.error || 'Falha no teste de conexão.' });
      }
    } catch (err: any) {
      setFormTestResult({ success: false, message: `Erro: ${err.message}` });
    } finally {
      setFormTestLoading(false);
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
      if (res.ok) {
        setTestResults(prev => ({
          ...prev,
          [id]: { success: true, message: data.data?.message || 'Conectado!', latencyMs: data.data?.latencyMs }
        }));
      } else {
        setTestResults(prev => ({
          ...prev,
          [id]: { success: false, message: data.message || data.error || 'Erro na conexão' }
        }));
      }
      await load();
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [id]: { success: false, message: `Erro: ${err.message}` }
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleOpenEdit = (account: ProviderAccount) => {
    setEditingAccount(account);
    setEditForm({
      name: account.name,
      provider: account.provider,
      model: account.model,
      apiKey: '', // deixa em branco para não expor a chave existente
      priority: account.priority,
      enabled: account.enabled
    });
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-2xl shadow-lg shadow-indigo-600/30">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Provedores de IA & Modelos</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Cadastre e teste suas contas de IA (Google Gemini, OpenAI, Groq, Ollama). O sistema faz fallback e rotação de chaves automaticamente.
              </p>
            </div>
          </div>
        </div>
      </div>

      {usage && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="text-[11px] text-slate-400">Requisições (30 dias)</div>
            <div className="text-xl font-bold text-white mt-1">{usage.totals.requests}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="text-[11px] text-slate-400">Falhas / Fallbacks</div>
            <div className="text-xl font-bold text-white mt-1">{usage.totals.failures}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="text-[11px] text-slate-400">Tokens Processados</div>
            <div className="text-xl font-bold text-white mt-1">{usage.totals.totalTokens.toLocaleString('pt-BR')}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="text-[11px] text-slate-400">Custo Estimado</div>
            <div className="text-xl font-bold text-white mt-1">US$ {usage.totals.estimatedCost.toFixed(4)}</div>
          </div>
        </div>
      )}

      {/* Formulário de Cadastro */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Cadastrar Nova Chave / Servidor de IA</span>
        </h2>

        <form onSubmit={add} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nome Identificador</label>
              <input
                required
                placeholder="Ex: Gemini Flash Produção"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Provedor</label>
              <select
                value={form.provider}
                onChange={e => {
                  const provider = e.target.value;
                  const defaultModel = provider === 'gemini' ? 'gemini-3.8-flash' : provider === 'groq' ? 'llama-3.3-70b-versatile' : provider === 'ollama' ? 'llama3.1' : 'gpt-4o';
                  setForm({ ...form, provider, model: defaultModel });
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="gemini">Google Gemini (Recomendado)</option>
                <option value="openai">OpenAI (Oficial)</option>
                <option value="groq">Groq (Incrível Velocidade LPU)</option>
                <option value="ollama">Ollama (Self-Hosted / Local)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Modelo Padrão</label>
              <input
                required
                placeholder="Ex: gemini-3.8-flash, gemini-3.6-flash, gemini-flash-lite-latest"
                value={form.model}
                onChange={e => setForm({ ...form, model: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {form.provider === 'ollama' ? 'URL do Ollama / Open WebUI' : 'Chave de API (API Key)'}
              </label>
              <input
                required
                type="text"
                placeholder={form.provider === 'ollama' ? 'http://ollama:11434 ou https://ollama.pajotech.com.br|sk-...' : 'AIzaSy... ou sk-...'}
                value={form.apiKey}
                onChange={e => setForm({ ...form, apiKey: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              {form.provider === 'ollama' && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Dica: use <strong className="text-cyan-400">http://ollama:11434</strong> para o Ollama local na VPS (modelos <code className="text-amber-300">hermes3:8b</code> ou <code className="text-amber-300">llama3.1</code>) ou informe <code className="text-cyan-300">URL|CHAVE_API</code> para Open WebUI.
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Prioridade (1 = mais alta)</label>
              <input
                required
                type="number"
                min="1"
                max="1000"
                placeholder="100"
                value={form.priority}
                onChange={e => setForm({ ...form, priority: Number(e.target.value) || 100 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              disabled={formTestLoading || !form.apiKey.trim()}
              onClick={handleTestUnsaved}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition disabled:opacity-40"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{formTestLoading ? 'Testando Conexão...' : 'Testar Conexão Antes de Salvar'}</span>
            </button>

            <button
              type="submit"
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2.5 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              Cadastrar Provedor de IA
            </button>
          </div>

          {formTestResult && (
            <div className={`p-3 rounded-xl text-xs border ${formTestResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
              <div className="flex items-center space-x-2">
                {formTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                <span>{formTestResult.message}</span>
              </div>
            </div>
          )}
        </form>
      </div>

      {message && (
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-200 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Lista de Contas Cadastradas */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
          Contas e Chaves Ativas ({accounts.length})
        </h3>

        {accounts.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500">
            Nenhum provedor cadastrado. Cadastre acima sua chave do Gemini, OpenAI, Groq ou URL do Ollama.
          </div>
        ) : (
          <div className="grid gap-3">
            {accounts.map(account => {
              const testResult = testResults[account.id];
              const isTesting = testingId === account.id;

              return (
                <div
                  key={account.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xl transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold text-white">{account.name}</span>
                      {account.enabled ? (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Ativo
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                          Desativado
                        </span>
                      )}
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono">
                        Prioridade {account.priority}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center space-x-2 font-mono">
                      <span className="uppercase text-slate-300 font-bold">{account.provider}</span>
                      <span>•</span>
                      <span>Modelo: {account.model}</span>
                      {account.lastUsedAt && (
                        <>
                          <span>•</span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-sans">
                            <Clock className="w-3 h-3" />
                            Último uso: {new Date(account.lastUsedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Exibição de Status de Teste ou Erro */}
                    {testResult && (
                      <div className={`text-[11px] p-2 rounded-xl mt-2 flex items-center space-x-2 border ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                        {testResult.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                        <span>{testResult.message}</span>
                      </div>
                    )}

                    {!testResult && account.lastError && (
                      <div className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl mt-1.5 truncate max-w-xl">
                        ⚠️ Último erro: {account.lastError}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isTesting}
                      onClick={() => handleTestExisting(account.id)}
                      className="px-3 py-2 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                      title="Testar Conexão com a IA em tempo real"
                    >
                      <Zap className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-amber-400' : 'text-indigo-400'}`} />
                      <span>{isTesting ? 'Testando...' : 'Testar Conexão'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(account)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                      title="Editar Configurações"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void toggle(account.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${account.enabled ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'}`}
                      title={account.enabled ? 'Desativar Provedor' : 'Ativar Provedor'}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{account.enabled ? 'Desativar' : 'Ativar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void remove(account.id)}
                      className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                      title="Excluir Provedor"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Remover</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE EDIÇÃO DE PROVEDOR */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Editar Provedor de IA</h3>
                  <p className="text-xs text-slate-400">Atualize chaves, modelos ou prioridades.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome</label>
                <input
                  required
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Provedor</label>
                  <select
                    value={editForm.provider}
                    onChange={e => setEditForm({ ...editForm, provider: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="groq">Groq</option>
                    <option value="ollama">Ollama</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Modelo</label>
                  <input
                    required
                    type="text"
                    value={editForm.model}
                    onChange={e => setEditForm({ ...editForm, model: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nova Chave de API / URL (Opcional)
                </label>
                <input
                  type="password"
                  placeholder="Deixe em branco para manter a chave atual cadastrada"
                  value={editForm.apiKey}
                  onChange={e => setEditForm({ ...editForm, apiKey: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Prioridade</label>
                  <input
                    required
                    type="number"
                    min="1"
                    max="1000"
                    value={editForm.priority}
                    onChange={e => setEditForm({ ...editForm, priority: Number(e.target.value) || 100 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.enabled}
                      onChange={e => setEditForm({ ...editForm, enabled: e.target.checked })}
                      className="rounded accent-indigo-600 w-4 h-4"
                    />
                    <span>Ativo para uso no sistema</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
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
