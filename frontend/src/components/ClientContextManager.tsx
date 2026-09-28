import React, { useEffect, useState } from 'react';
import { Building2, Plus, Save, Trash2, Link2, Upload, FileText, RefreshCw, ExternalLink } from 'lucide-react';
import { apiUrl } from '../api/client';

interface Client {
  id: string;
  name: string;
  legalName?: string | null;
  document?: string | null;
  segment?: string | null;
  website?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  description?: string | null;
  targetAudience?: string | null;
  productsOffers?: string | null;
  brandVoice?: string | null;
  goals?: string | null;
  competitors?: string | null;
  restrictions?: string | null;
  notes?: string | null;
  resources?: ClientResource[];
  knowledgeFiles?: any[];
}

interface ClientResource {
  id: string;
  title: string;
  url: string;
  type: string;
  notes?: string | null;
}

const emptyForm: Partial<Client> = {
  name: '', legalName: '', document: '', segment: '', website: '', instagram: '', linkedin: '',
  description: '', targetAudience: '', productsOffers: '', brandVoice: '', goals: '', competitors: '', restrictions: '', notes: '',
};

export const ClientContextManager: React.FC<{ jwtToken: string }> = ({ jwtToken }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const [form, setForm] = useState<Partial<Client>>(emptyForm);
  const [resource, setResource] = useState({ title: '', url: '', type: 'WEBSITE', notes: '' });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/clients'), { headers: { Authorization: 'Bearer ' + jwtToken } });
      const data = await res.json();
      if (res.ok) setClients(data.data || []);
    } finally { setLoading(false); }
  };

  const open = async (id: string) => {
    const res = await fetch(apiUrl('/api/clients/' + id + '/context'), { headers: { Authorization: 'Bearer ' + jwtToken } });
    const data = await res.json();
    if (res.ok) { setSelected(data.data); setForm(data.data); }
  };

  useEffect(() => { load(); }, [jwtToken]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = selected ? 'PUT' : 'POST';
      const url = selected ? '/api/clients/' + selected.id : '/api/clients';
      const res = await fetch(apiUrl(url), {
        method,
        headers: { Authorization: 'Bearer ' + jwtToken, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar empresa.');
      await load();
      await open(data.data.id);
      window.alert('Dados da empresa salvos.');
    } catch (e: any) { window.alert(e.message); } finally { setSaving(false); }
  };

  const addResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const res = await fetch(apiUrl('/api/clients/' + selected.id + '/resources'), {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + jwtToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(resource),
    });
    const data = await res.json();
    if (!res.ok) { window.alert(data.error || 'Falha ao adicionar link.'); return; }
    setResource({ title: '', url: '', type: 'WEBSITE', notes: '' });
    await open(selected.id);
    await load();
  };

  const uploadMaterial = async () => {
    if (!selected || !file) return;
    const body = new FormData();
    body.append('file', file);
    body.append('clientId', selected.id);
    const res = await fetch(apiUrl('/api/rag/upload-knowledge'), {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + jwtToken },
      body,
    });
    const data = await res.json();
    if (!res.ok) { window.alert(data.message || data.error || 'Falha ao indexar material.'); return; }
    setFile(null);
    await open(selected.id);
    await load();
    window.alert('Material indexado na base de conhecimento da empresa.');
  };

  const removeClient = async () => {
    if (!selected || !window.confirm('Excluir esta empresa e todos os seus materiais/campanhas?')) return;
    const res = await fetch(apiUrl('/api/clients/' + selected.id), {
      method: 'DELETE', headers: { Authorization: 'Bearer ' + jwtToken },
    });
    if (res.ok) { setSelected(null); setForm(emptyForm); await load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Building2 className="w-5 h-5 text-indigo-400" /> Contexto das Empresas</h2>
          <p className="text-xs text-slate-400 mt-1">Cadastre a empresa, público, oferta, marca, referências e materiais que servirão de contexto para as campanhas.</p>
        </div>
        <button type="button" onClick={() => { setSelected(null); setForm(emptyForm); }} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2"><Plus className="w-4 h-4" /> Nova empresa</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-xs font-bold text-white">Clientes</span>
            <button type="button" onClick={load} className="p-1.5 text-slate-400"><RefreshCw className="w-3.5 h-3.5" /></button>
          </div>
          {loading ? <p className="p-3 text-xs text-slate-500">Carregando...</p> : clients.map((client) => (
            <button key={client.id} type="button" onClick={() => open(client.id)} className={'w-full text-left p-3 rounded-xl mb-1 transition ' + (selected?.id === client.id ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-slate-800')}>
              <p className="text-xs font-semibold text-white truncate">{client.name}</p>
              <p className="text-[10px] text-slate-500 mt-1">{client.segment || 'Segmento não informado'}</p>
              <p className="text-[10px] text-indigo-400 mt-1">{(client as any)._count?.knowledgeFiles || 0} materiais • {(client as any)._count?.resources || 0} links</p>
            </button>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ['name','Nome da empresa *'],['legalName','Razão social'],['document','CNPJ/Documento'],['segment','Segmento'],
                ['website','Site'],['instagram','Instagram'],['linkedin','LinkedIn']
              ].map(([key,label]) => (
                <div key={key} className={key === 'name' ? 'md:col-span-2' : ''}>
                  <label className="text-[11px] font-semibold text-slate-300">{label}</label>
                  <input required={key === 'name'} value={(form as any)[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500" />
                </div>
              ))}
            </div>
            {[
              ['description','Sobre a empresa'],
              ['targetAudience','Público-alvo / personas'],
              ['productsOffers','Produtos, serviços e ofertas'],
              ['brandVoice','Posicionamento e tom de voz'],
              ['goals','Objetivos de marketing/negócio'],
              ['competitors','Concorrentes e referências'],
              ['restrictions','Restrições, compliance e o que não pode ser prometido'],
              ['notes','Observações internas da agência'],
            ].map(([key,label]) => (
              <div key={key}>
                <label className="text-[11px] font-semibold text-slate-300">{label}</label>
                <textarea rows={3} value={(form as any)[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500" />
              </div>
            ))}
            <div className="flex justify-between gap-2">
              {selected && <button type="button" onClick={removeClient} className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Excluir</button>}
              <button type="submit" disabled={saving} className="ml-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2"><Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar contexto'}</button>
            </div>
          </form>

          {selected && (
            <div className="mt-7 pt-6 border-t border-slate-800 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><Link2 className="w-4 h-4 text-cyan-400" /> Sites e referências</h3>
                <form onSubmit={addResource} className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-3">
                  <input required placeholder="Título" value={resource.title} onChange={e => setResource({ ...resource, title: e.target.value })} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                  <input required type="url" placeholder="https://..." value={resource.url} onChange={e => setResource({ ...resource, url: e.target.value })} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white md:col-span-2" />
                  <button className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold">Adicionar</button>
                </form>
                <div className="mt-3 space-y-2">{(selected.resources || []).map(r => <div key={r.id} className="flex items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-lg p-2.5"><div className="min-w-0"><p className="text-xs text-white truncate">{r.title}</p><p className="text-[10px] text-slate-500 truncate">{r.url}</p></div><a href={r.url} target="_blank" rel="noreferrer" className="text-cyan-400"><ExternalLink className="w-3.5 h-3.5" /></a></div>)}</div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-400" /> Materiais da empresa</h3>
                <p className="text-[11px] text-slate-500 mt-1">PDF/TXT ficam vinculados à empresa e podem alimentar a estratégia.</p>
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <input type="file" accept=".pdf,.txt,application/pdf,text/plain" onChange={e => setFile(e.target.files?.[0] || null)} className="flex-1 text-xs text-slate-400" />
                  <button type="button" disabled={!file} onClick={uploadMaterial} className="px-4 py-2 bg-indigo-600 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-2"><Upload className="w-3.5 h-3.5" /> Indexar material</button>
                </div>
                <div className="mt-3 space-y-2">{(selected.knowledgeFiles || []).map((f: any) => <div key={f.id} className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-2.5"><FileText className="w-3.5 h-3.5 text-indigo-400" /><span className="text-xs text-slate-300 truncate">{f.fileName}</span><span className="ml-auto text-[10px] text-emerald-400">{f.status}</span></div>)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
