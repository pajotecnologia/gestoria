import React, { useEffect, useState } from 'react';
import { Megaphone, Plus, Sparkles, RefreshCw, Pencil, Power, Search, CalendarDays, Trash2, X } from 'lucide-react';
import { apiUrl } from '../api/client';

export const CampaignManager: React.FC<{ jwtToken: string }> = ({ jwtToken }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const emptyForm = { clientId: '', name: '', objective: '', offer: '', audience: '', channels: '', budget: '', period: '', brief: '', isActive: false, startDate: '', endDate: '' };
  const [form, setForm] = useState<any>(emptyForm);
  const [editing, setEditing] = useState<any>(null);
  const [strategy, setStrategy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        fetch(apiUrl('/api/clients'), { headers: { Authorization: 'Bearer ' + jwtToken } }).then(r => r.json()),
        fetch(apiUrl('/api/campaigns?' + new URLSearchParams({ ...(filterClient ? { clientId: filterClient } : {}), ...(filterStatus ? { status: filterStatus } : {}), ...(search.trim() ? { search: search.trim() } : {}) }).toString()), { headers: { Authorization: 'Bearer ' + jwtToken } }).then(r => r.json()),
      ]);
      setClients(c.data || []);
      setCampaigns(p.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [jwtToken, filterClient, filterStatus]);

  const openEdit = (campaign: any) => {
    setEditing(campaign);
    setShowForm(true);
    setForm({
      clientId: campaign.clientId, name: campaign.name, objective: campaign.objective,
      offer: campaign.offer || '', audience: campaign.audience || '', channels: campaign.channels || '',
      budget: campaign.budget || '', period: campaign.period || '', brief: campaign.brief || '',
      isActive: campaign.isActive, startDate: campaign.startDate ? campaign.startDate.slice(0, 10) : '',
      endDate: campaign.endDate ? campaign.endDate.slice(0, 10) : '',
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const endpoint = editing ? '/api/campaigns/' + editing.id : '/api/campaigns';
      const res = await fetch(apiUrl(endpoint), {
        method: editing ? 'PUT' : 'POST',
        headers: { Authorization: 'Bearer ' + jwtToken, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { window.alert(data.error || 'Falha ao salvar campanha.'); return; }
      setEditing(null);
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } finally { setSaving(false); }
  };

  const removeCampaign = async (campaign: any) => {
    if (!window.confirm(`Excluir a campanha "${campaign.name}"? Esta ação não poderá ser desfeita.`)) return;
    const res = await fetch(apiUrl('/api/campaigns/' + campaign.id), { method: 'DELETE', headers: { Authorization: 'Bearer ' + jwtToken } });
    const data = await res.json();
    if (!res.ok) { window.alert(data.error || 'Falha ao excluir campanha.'); return; }
    if (editing?.id === campaign.id) { setEditing(null); setForm(emptyForm); setShowForm(false); }
    await load();
  };

  const toggleActivation = async (campaign: any) => {
    const next = !campaign.isActive;
    if (next && (!campaign.startDate || !campaign.endDate)) {
      openEdit(campaign);
      window.alert('Defina o período de início e fim antes de ativar.');
      return;
    }
    const res = await fetch(apiUrl('/api/campaigns/' + campaign.id + '/activation'), {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + jwtToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: next }),
    });
    const data = await res.json();
    if (!res.ok) { window.alert(data.error || 'Falha ao alterar ativação.'); return; }
    await load();
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
      <div className="bg-zinc-900/80 border border-white/[0.07] rounded-2xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Megaphone className="w-5 h-5 text-indigo-400" /> Campanhas</h2>
            <p className="text-xs text-zinc-400 mt-1">Crie o briefing e gere uma estratégia usando o contexto cadastrado da empresa e os materiais indexados.</p>
          </div>
          <div className="flex items-center gap-2"><button type="button" onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }} className="flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20"><Plus className="h-4 w-4" /> Nova campanha</button><button type="button" onClick={load} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/[0.07] bg-zinc-800/80 text-zinc-300"><RefreshCw className="w-4 h-4" /></button></div>
        </div>
      </div>

      {showForm && <form onSubmit={save} className="bg-zinc-900/80 border border-white/[0.07] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-white">{editing ? 'Editar campanha' : 'Nova campanha'}</h3><button type="button" onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(false); }} className="flex min-h-11 items-center gap-1.5 rounded-xl border border-white/[0.07] bg-zinc-950 px-3 text-xs text-zinc-300 hover:bg-zinc-800"><X className="h-3.5 w-3.5" /> Voltar para campanhas</button></div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          <select required value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} className="bg-zinc-950 border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs text-white">
            <option value="">Selecione a empresa *</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input required placeholder="Nome da campanha *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-zinc-950 border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs text-white" />
        </div>
        <textarea required rows={3} placeholder="Objetivo da campanha * — ex.: gerar leads qualificados para..." value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} className="w-full bg-zinc-950 border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs text-white" />
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {[
            ['offer','Oferta / produto'],['audience','Público que você imagina'],['channels','Canais desejados'],['budget','Orçamento'],['period','Período textual / observações'],['brief','Briefing adicional']
          ].map(([k,p]) => <textarea key={k} rows={2} placeholder={p} value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} className="bg-zinc-950 border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs text-white" />)}
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          <label className="text-xs text-zinc-400">Início da campanha<input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="mt-1 w-full bg-zinc-950 border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs text-white" /></label>
          <label className="text-xs text-zinc-400">Fim da campanha<input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="mt-1 w-full bg-zinc-950 border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs text-white" /></label>
        </div>
        <div className="flex items-center justify-between border border-white/[0.07] rounded-xl p-3"><div><p className="text-xs font-semibold text-white">ATIVADA</p><p className="text-[11px] text-zinc-500">S/N. Ativação exige período completo.</p></div><button type="button" onClick={() => setForm({ ...form, isActive: !form.isActive })} aria-pressed={form.isActive} className={`relative inline-flex h-7 w-14 items-center rounded-full border transition-all duration-200 ease-in-out ${form.isActive ? 'bg-emerald-600 border-emerald-500' : 'bg-zinc-800/80 border-white/[0.10]'}`}><span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-8' : 'translate-x-1'}`} /></button></div>
        <button disabled={saving} type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2">{editing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {saving ? 'Salvando...' : editing ? 'Salvar ajustes da campanha' : 'Criar campanha'}</button>
      </form>}

      <div className="bg-zinc-900/80 border border-white/[0.07] rounded-2xl p-4">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" /><input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') load(); }} placeholder="Pesquisar campanha..." className="w-full bg-zinc-950 border border-white/[0.07] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white" /></div>
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="bg-zinc-950 border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs text-white"><option value="">Todas as empresas</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-zinc-950 border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs text-white"><option value="">Todos os status</option><option value="RASCUNHO">Rascunho</option><option value="AGENDADA">Agendada</option><option value="ATIVA">Ativa</option><option value="PAUSADA">Pausada</option><option value="ENCERRADA">Encerrada</option></select>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? <p className="text-xs text-zinc-500">Carregando...</p> : campaigns.map(c => (
          <div key={c.id} className="bg-zinc-900/80 border border-white/[0.07] rounded-2xl p-5 transition hover:border-white/[0.12]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white">{c.name}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1"><span className="text-[11px] text-indigo-400">{c.client?.name}</span><span className="text-[10px] px-2 py-1 rounded-full bg-zinc-800/80 text-zinc-300">{c.lifecycleStatus || c.status}</span></div>
                <p className="text-xs text-zinc-400 mt-2">{c.objective}</p><p className="text-[11px] text-zinc-500 mt-2"><CalendarDays className="inline w-3.5 h-3.5 mr-1" />{c.startDate ? new Date(c.startDate).toLocaleDateString('pt-BR') : 'Sem início'} — {c.endDate ? new Date(c.endDate).toLocaleDateString('pt-BR') : 'Sem fim'} • ATIVADA: {c.isActive ? 'S' : 'N'}</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end"><button type="button" onClick={() => openEdit(c)} className="flex min-h-11 items-center gap-1.5 px-3 py-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs"><Pencil className="w-3.5 h-3.5" />Editar</button><button type="button" onClick={() => toggleActivation(c)} className="flex min-h-11 items-center gap-1.5 px-3 py-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs"><Power className="inline w-3.5 h-3.5 mr-1" />{c.isActive ? 'Desativar' : 'Ativar'}</button><button type="button" onClick={() => generate(c.id) className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 rounded-xl text-xs font-semibold flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> Gerar estratégia</button><button type="button" onClick={() => void removeCampaign(c)} className="flex min-h-11 items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl text-xs"><Trash2 className="w-3.5 h-3.5" />Excluir</button></div>
            </div>
            {c.strategy && <details className="mt-4 border-t border-white/[0.07] pt-3"><summary className="text-xs text-zinc-300 cursor-pointer">Ver estratégia gerada</summary><pre className="mt-3 whitespace-pre-wrap text-xs text-zinc-300 leading-relaxed font-sans">{c.strategy}</pre></details>}
          </div>
        ))}
      </div>

      {strategy && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-4xl mx-auto mt-10 bg-zinc-900/80 border border-white/[0.07] rounded-2xl p-6">
            <div className="flex justify-between items-center"><h3 className="text-lg font-bold text-white">Estratégia gerada — {strategy.name}</h3><button onClick={() => setStrategy(null)} className="text-zinc-400">Fechar ×</button></div>
            <pre className="mt-5 whitespace-pre-wrap text-xs text-zinc-300 leading-relaxed font-sans">{strategy.strategy}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
