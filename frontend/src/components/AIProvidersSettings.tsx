import React, { useEffect, useState } from 'react';
import { BrainCircuit, CheckCircle2, Power, Trash2 } from 'lucide-react';
import { apiUrl } from '../api/client';

type ProviderAccount = {
  id: string; name: string; provider: string; model: string; enabled: boolean; priority: number; lastError?: string | null; lastUsedAt?: string | null;
};

export const AIProvidersSettings: React.FC<{ jwtToken: string }> = ({ jwtToken }) => {
  const [accounts, setAccounts] = useState<ProviderAccount[]>([]);
  const [form, setForm] = useState({ name: '', provider: 'openai', model: 'gpt-4o', apiKey: '', priority: 100 });
  const [message, setMessage] = useState('');

  const load = async () => {
    const res = await fetch(apiUrl('/api/ai-providers'), { headers: { Authorization: `Bearer ${jwtToken}` } });
    const data = await res.json();
    if (res.ok) setAccounts(data.data || []);
    else setMessage(data.error || 'Não foi possível carregar os provedores.');
  };

  useEffect(() => { void load(); }, [jwtToken]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setMessage('');
    const res = await fetch(apiUrl('/api/ai-providers'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error || 'Falha ao cadastrar IA.'); return; }
    setForm({ ...form, name: '', apiKey: '' }); setMessage('Provedor cadastrado com segurança.'); await load();
  };

  const toggle = async (id: string) => {
    await fetch(apiUrl(`/api/ai-providers/${id}/toggle`), { method: 'PATCH', headers: { Authorization: `Bearer ${jwtToken}` } });
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm('Remover este provedor de IA?')) return;
    await fetch(apiUrl(`/api/ai-providers/${id}`), { method: 'DELETE', headers: { Authorization: `Bearer ${jwtToken}` } });
    await load();
  };

  return (
    <section className="space-y-6">
      <div>
        <div className="flex items-center gap-3"><BrainCircuit className="w-6 h-6 text-indigo-400" /><h2 className="text-xl font-bold text-white">Provedores de IA</h2></div>
        <p className="text-xs text-slate-400 mt-1">Cadastre várias contas. Se uma atingir quota, crédito ou rate limit, o sistema tenta automaticamente a próxima.</p>
      </div>
      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <input required placeholder="Nome" value={form.name} onChange={e => setForm({...form,name:e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
        <select value={form.provider} onChange={e => setForm({...form,provider:e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
          <option value="openai">OpenAI</option><option value="groq">Groq</option><option value="ollama">Ollama</option>
        </select>
        <input required placeholder="Modelo" value={form.model} onChange={e => setForm({...form,model:e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
        <input required type="password" placeholder={form.provider === "ollama" ? "URL do Ollama" : "API Key"} value={form.apiKey} onChange={e => setForm({...form,apiKey:e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
        <input required type="number" min="1" max="1000" placeholder="Prioridade" value={form.priority} onChange={e => setForm({...form,priority:Number(e.target.value) || 100})} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
        <button className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2">Cadastrar IA</button>
      </form>
      {message && <div className="text-xs text-slate-300 bg-slate-900 border border-slate-800 rounded-xl p-3">{message}</div>}
      <div className="grid gap-3">
        {accounts.map(account => (
          <div key={account.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div><div className="flex items-center gap-2 text-sm font-semibold text-white">{account.name}{account.enabled && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}</div><div className="text-xs text-slate-400 mt-1">{account.provider} • {account.model} • prioridade {account.priority}</div>{account.lastError && <div className="text-[11px] text-amber-400 mt-1 truncate max-w-xl">{account.lastError}</div>}</div>
            <div className="flex gap-2">
              <button onClick={() => void toggle(account.id)} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs"><Power className="w-3.5 h-3.5 inline mr-1" />{account.enabled ? 'Desativar' : 'Ativar'}</button>
              <button onClick={() => void remove(account.id)} className="px-3 py-2 rounded-lg bg-rose-500/10 text-rose-300 text-xs"><Trash2 className="w-3.5 h-3.5 inline mr-1" />Remover</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
