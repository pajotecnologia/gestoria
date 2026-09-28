import React, { useEffect, useState } from 'react';
import { Megaphone, Plus, Sparkles, RefreshCw } from 'lucide-react';
import { apiUrl } from '../api/client';

export const CampaignManager: React.FC<{ jwtToken: string }> = ({ jwtToken }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [form, setForm] = useState({ clientId: '', name: '', objective: '', offer: '', audience: '', channels: '', budget: '', period: '', brief: '' });
  const [strategy, setStrategy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        fetch(apiUrl('/api/clients'), { headers: { Authorization: 'Bearer ' + jwtToken } }).then(r => r.json()),
        fetch(apiUrl('/api/campaigns'), { headers: { Authorization: 'Bearer ' + jwtToken } }).then(r => r.json()),
      ]);
      setClients(c.data || []);
      setCampaigns(p.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [jwtToken]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(apiUrl('/api/campaigns'), {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + jwtToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { window.alert(data.error || 'Falha ao criar campanha.'); return; }
    setForm({ clientId: '', name: '', objective: '', offer: '', audience: '', channels: '', budget: '', period: '', brief: '' });
    await load();
    window.alert('Campanha criada. Agora a estratégia pode ser gerada usando o contexto da empresa.');
  };

  const generate = async (id: string) => {
    const res = await fetch(apiUrl('/api/campaigns/' + id + '/generate-strategy'), {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + jwtToken },
    });
    const data = await res.json();
    if (!res.ok) { window.alert(data.error || 'Falha ao gerar estratégia.'); return; }
    setStrategy(data.data);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Megaphone className="w-5 h-5 text-indigo-400" /> Campanhas</h2>
            <p className="text-xs text-slate-400 mt-1">Crie o briefing e gere uma estratégia usando o contexto cadastrado da empresa e os materiais indexados.</p>
          </div>
          <button type="button" onClick={load} className="p-2 rounded-lg bg-slate-800 text-slate-300"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <form onSubmit={create} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select required value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white">
            <option value="">Selecione a empresa *</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input required placeholder="Nome da campanha *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" />
        </div>
        <textarea required rows={3} placeholder="Objetivo da campanha * — ex.: gerar leads qualificados para..." value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            ['offer','Oferta / produto'],['audience','Público que você imagina'],['channels','Canais desejados'],['budget','Orçamento'],['period','Período'],['brief','Briefing adicional']
          ].map(([k,p]) => <textarea key={k} rows={2} placeholder={p} value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white" />)}
        </div>
        <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> Criar campanha</button>
      </form>

      <div className="space-y-3">
        {loading ? <p className="text-xs text-slate-500">Carregando...</p> : campaigns.map(c => (
          <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white">{c.name}</p>
                <p className="text-[11px] text-indigo-400 mt-1">{c.client?.name} • {c.status}</p>
                <p className="text-xs text-slate-400 mt-2">{c.objective}</p>
              </div>
              <button type="button" onClick={() => generate(c.id)} className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 rounded-xl text-xs font-semibold flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> Gerar estratégia</button>
            </div>
            {c.strategy && <details className="mt-4 border-t border-slate-800 pt-3"><summary className="text-xs text-slate-300 cursor-pointer">Ver estratégia gerada</summary><pre className="mt-3 whitespace-pre-wrap text-xs text-slate-300 leading-relaxed font-sans">{c.strategy}</pre></details>}
          </div>
        ))}
      </div>

      {strategy && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-4xl mx-auto mt-10 bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex justify-between items-center"><h3 className="text-lg font-bold text-white">Estratégia gerada — {strategy.name}</h3><button onClick={() => setStrategy(null)} className="text-slate-400">Fechar ×</button></div>
            <pre className="mt-5 whitespace-pre-wrap text-xs text-slate-300 leading-relaxed font-sans">{strategy.strategy}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
