import React, { useEffect, useState } from 'react';
import { 
  Megaphone, 
  Plus, 
  Sparkles, 
  Pencil, 
  Power, 
  Search, 
  CalendarDays, 
  Trash2, 
  X,
  Copy,
  Check,
  Maximize2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { apiUrl } from '../api/client';

export const CampaignManager: React.FC<{ jwtToken: string }> = ({ jwtToken }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const emptyForm = { 
    clientId: '', 
    name: '', 
    objective: '', 
    offer: '', 
    audience: '', 
    channels: '', 
    budget: '', 
    period: '', 
    brief: '', 
    isActive: false, 
    startDate: '', 
    endDate: '' 
  };
  const [form, setForm] = useState<any>(emptyForm);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Estados para visualização expandida e modal de estratégia compilada
  const [viewingStrategyCampaign, setViewingStrategyCampaign] = useState<any | null>(null);
  const [expandedStrategies, setExpandedStrategies] = useState<Record<string, boolean>>({});
  const [copiedStrategy, setCopiedStrategy] = useState(false);

  const handleCopyStrategy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStrategy(true);
    setTimeout(() => setCopiedStrategy(false), 2000);
  };

  const toggleExpandStrategy = (campaignId: string) => {
    setExpandedStrategies(prev => ({
      ...prev,
      [campaignId]: !prev[campaignId]
    }));
  };

  const load = async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        fetch(apiUrl('/api/clients'), { headers: { Authorization: 'Bearer ' + jwtToken } }).then(r => r.json()),
        fetch(apiUrl('/api/campaigns?' + new URLSearchParams({ 
          ...(filterClient ? { clientId: filterClient } : {}), 
          ...(filterStatus ? { status: filterStatus } : {}), 
          ...(search.trim() ? { search: search.trim() } : {}) 
        }).toString()), { headers: { Authorization: 'Bearer ' + jwtToken } }).then(r => r.json()),
      ]);
      setClients(c.data || []);
      setCampaigns(p.data || []);
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    void load(); 
  }, [jwtToken, filterClient, filterStatus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showForm) {
        setEditing(null);
        setForm(emptyForm);
        setShowForm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm]);

  const openEdit = (campaign: any) => {
    setEditing(campaign);
    setShowForm(true);
    setForm({
      clientId: campaign.clientId, 
      name: campaign.name, 
      objective: campaign.objective,
      offer: campaign.offer || '', 
      audience: campaign.audience || '', 
      channels: campaign.channels || '',
      budget: campaign.budget || '', 
      period: campaign.period || '', 
      brief: campaign.brief || '',
      isActive: campaign.isActive, 
      startDate: campaign.startDate ? campaign.startDate.slice(0, 10) : '',
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
      if (!res.ok) { 
        window.alert(data.error || 'Falha ao salvar campanha.'); 
        return; 
      }
      setEditing(null);
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } finally { 
      setSaving(false); 
    }
  };

  const removeCampaign = async (campaign: any) => {
    if (!window.confirm(`Excluir a campanha "${campaign.name}"? Esta ação não poderá ser desfeita.`)) return;
    const res = await fetch(apiUrl('/api/campaigns/' + campaign.id), { 
      method: 'DELETE', 
      headers: { Authorization: 'Bearer ' + jwtToken } 
    });
    const data = await res.json();
    if (!res.ok) { 
      window.alert(data.error || 'Falha ao excluir campanha.'); 
      return; 
    }
    if (editing?.id === campaign.id) { 
      setEditing(null); 
      setForm(emptyForm); 
      setShowForm(false); 
    }
    await load();
  };

  const toggleActivation = async (campaign: any) => {
    const next = !campaign.isActive;
    if (next && (!campaign.startDate || !campaign.endDate)) {
      openEdit(campaign);
      window.alert('Defina a data de início e fim da campanha antes de ativá-la.');
      return;
    }
    const res = await fetch(apiUrl('/api/campaigns/' + campaign.id + '/activation'), {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + jwtToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: next }),
    });
    const data = await res.json();
    if (!res.ok) { 
      window.alert(data.error || 'Falha ao alterar ativação.'); 
      return; 
    }
    await load();
  };

  const generate = async (id: string) => {
    setGeneratingId(id);
    try {
      const res = await fetch(apiUrl('/api/campaigns/' + id + '/generate-strategy'), {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + jwtToken },
      });
      const data = await res.json();
      if (!res.ok) { 
        window.alert(data.error || 'Falha ao gerar estratégia.'); 
        return; 
      }
      await load();
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Unificado & Ação Primária */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Campanhas & Estratégias
            </h1>
            <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-500 dark:text-indigo-400">
              {campaigns.length} {campaigns.length === 1 ? 'campanha' : 'campanhas'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Defina briefings estratégicos e gere planos de ação com inteligência artificial baseada no contexto do cliente.
          </p>
        </div>

        <button 
          type="button" 
          onClick={() => { 
            setEditing(null); 
            setForm(emptyForm); 
            setShowForm(true); 
          }} 
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-400 hover:to-violet-500 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Campanha</span>
        </button>
      </div>

      {/* Modal Dialog Popup de Criação / Edição de Campanha */}
      {showForm && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(false); }}
        >
          <div 
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Megaphone className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {editing ? 'Editar Campanha' : 'Nova Campanha de Marketing'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Defina os objetivos, empresa e público-alvo para geração da estratégia de IA.
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => { 
                  setEditing(null); 
                  setForm(emptyForm); 
                  setShowForm(false); 
                }} 
                className="text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={save} className="space-y-4">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Empresa Vinculada *</label>
                  <select 
                    required 
                    value={form.clientId} 
                    onChange={e => setForm({ ...form, clientId: e.target.value })} 
                    className="shadcn-input"
                  >
                    <option value="">Selecione a empresa...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Nome da Campanha *</label>
                  <input 
                    required 
                    placeholder="Ex: Lançamento Verão 2026" 
                    value={form.name} 
                    onChange={e => setForm({ ...form, name: e.target.value })} 
                    className="shadcn-input" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Objetivo Estratégico *</label>
                <textarea 
                  required 
                  rows={2} 
                  placeholder="Ex: Gerar 150 leads qualificados B2B para o setor de energia solar..." 
                  value={form.objective} 
                  onChange={e => setForm({ ...form, objective: e.target.value })} 
                  className="shadcn-input resize-y" 
                />
              </div>

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Oferta Principal / Produto</label>
                  <textarea 
                    rows={2} 
                    placeholder="Ex: Consultoria gratuita + 20% de desconto na adesão" 
                    value={form.offer} 
                    onChange={e => setForm({ ...form, offer: e.target.value })} 
                    className="shadcn-input resize-y" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Público-Alvo</label>
                  <textarea 
                    rows={2} 
                    placeholder="Ex: Gestores de operações e diretores comerciais" 
                    value={form.audience} 
                    onChange={e => setForm({ ...form, audience: e.target.value })} 
                    className="shadcn-input resize-y" 
                  />
                </div>
              </div>

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Canais Desejados</label>
                  <input 
                    placeholder="Ex: WhatsApp, Meta Ads, Google" 
                    value={form.channels} 
                    onChange={e => setForm({ ...form, channels: e.target.value })} 
                    className="shadcn-input" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Orçamento Estimado</label>
                  <input 
                    placeholder="Ex: R$ 5.000,00" 
                    value={form.budget} 
                    onChange={e => setForm({ ...form, budget: e.target.value })} 
                    className="shadcn-input" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Observações de Período</label>
                  <input 
                    placeholder="Ex: 30 dias contínuos" 
                    value={form.period} 
                    onChange={e => setForm({ ...form, period: e.target.value })} 
                    className="shadcn-input" 
                  />
                </div>
              </div>

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Data de Início</label>
                  <input 
                    type="date" 
                    value={form.startDate} 
                    onChange={e => setForm({ ...form, startDate: e.target.value })} 
                    className="shadcn-input" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Data de Término</label>
                  <input 
                    type="date" 
                    value={form.endDate} 
                    onChange={e => setForm({ ...form, endDate: e.target.value })} 
                    className="shadcn-input" 
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">Ativação Automática</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">Ativa o monitoramento e sincronia com agentes</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setForm({ ...form, isActive: !form.isActive })} 
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    form.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-800'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    form.isActive ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
                <button 
                  type="button" 
                  onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(false); }} 
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  disabled={saving} 
                  type="submit" 
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-indigo-500 disabled:opacity-50 transition cursor-pointer"
                >
                  {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Campanha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="shadcn-card p-3">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Buscar campanha por nome ou objetivo..." 
              className="shadcn-input pl-9" 
            />
          </div>
          <select 
            value={filterClient} 
            onChange={e => setFilterClient(e.target.value)} 
            className="shadcn-input"
          >
            <option value="">Todas as empresas</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)} 
            className="shadcn-input"
          >
            <option value="">Todos os status</option>
            <option value="RASCUNHO">Rascunho</option>
            <option value="AGENDADA">Agendada</option>
            <option value="ATIVA">Ativa</option>
            <option value="PAUSADA">Pausada</option>
            <option value="ENCERRADA">Encerrada</option>
          </select>
        </div>
      </div>

      {/* Lista / Grid de Campanhas */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400 dark:text-zinc-500">
          Carregando campanhas...
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-zinc-800">
          <Megaphone className="h-10 w-10 text-slate-400 dark:text-zinc-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200">Nenhuma campanha cadastrada</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 max-w-sm">
            Clique no botão <strong>"+ Nova Campanha"</strong> no topo para estruturar seus briefings e estratégias com IA.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {campaigns.map((c) => {
            const isGenerating = generatingId === c.id;
            return (
              <div key={c.id} className="shadcn-card flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                          {c.name}
                        </h3>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          c.isActive 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                        }`}>
                          {c.isActive ? '● Ativa' : 'Pausada'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-indigo-500 dark:text-indigo-400 font-medium">
                        {c.client?.name || 'Empresa não vinculada'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        type="button" 
                        onClick={() => openEdit(c)} 
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition cursor-pointer" 
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => removeCampaign(c)} 
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:text-zinc-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition cursor-pointer" 
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-slate-600 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                    {c.objective}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-3 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>
                      {c.startDate ? new Date(c.startDate).toLocaleDateString('pt-BR') : 'Sem data'} - {c.endDate ? new Date(c.endDate).toLocaleDateString('pt-BR') : 'Sem data'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={() => toggleActivation(c)} 
                      className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium border transition cursor-pointer ${
                        c.isActive 
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20' 
                          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      <Power className="h-3.5 w-3.5" />
                      <span>{c.isActive ? 'Pausar' : 'Ativar'}</span>
                    </button>

                    <button 
                      type="button" 
                      disabled={isGenerating} 
                      onClick={() => generate(c.id)} 
                      className="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-3 text-xs font-semibold text-white shadow-sm hover:from-indigo-400 hover:to-violet-500 disabled:opacity-50 transition cursor-pointer"
                    >
                      <Sparkles className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                      <span>{isGenerating ? 'Gerando...' : 'Gerar Estratégia IA'}</span>
                    </button>
                  </div>
                </div>

                {/* Estratégia IA Gerada */}
                {c.strategy && (
                  <div className="mt-3 rounded-xl border border-indigo-500/20 bg-indigo-50/50 p-3.5 text-xs dark:border-indigo-500/20 dark:bg-indigo-950/30 space-y-2">
                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-indigo-500/15 dark:border-indigo-500/20">
                      <div className="flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-300">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Estratégia Compilada</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyStrategy(typeof c.strategy === 'string' ? c.strategy : JSON.stringify(c.strategy, null, 2))}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                          title="Copiar texto da estratégia"
                        >
                          {copiedStrategy ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedStrategy ? 'Copiado!' : 'Copiar'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setViewingStrategyCampaign(c)}
                          className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer shadow-xs"
                          title="Ver toda a estratégia em tela cheia"
                        >
                          <Maximize2 className="h-3 w-3" />
                          <span>Ver Toda</span>
                        </button>
                      </div>
                    </div>

                    <div className={`text-slate-700 dark:text-zinc-300 whitespace-pre-wrap text-[11px] leading-relaxed transition-all ${
                      expandedStrategies[c.id] ? 'max-h-96 overflow-y-auto pr-1' : 'line-clamp-4'
                    }`}>
                      {typeof c.strategy === 'string' ? c.strategy : JSON.stringify(c.strategy, null, 2)}
                    </div>

                    <div className="pt-1 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => toggleExpandStrategy(c.id)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        {expandedStrategies[c.id] ? (
                          <>
                            <ChevronUp className="h-3.5 w-3.5" />
                            <span>Recolher</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            <span>Expandir no Card</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setViewingStrategyCampaign(c)}
                        className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                      >
                        Abrir em Janela Inteira →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Visualização Completa da Estratégia Compilada */}
      {viewingStrategyCampaign && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-3xl max-h-[88vh] bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white animate-in zoom-in-95 duration-150">
            {/* Top Bar do Modal */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-4 bg-slate-50/75 dark:bg-zinc-900/75 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                      {viewingStrategyCampaign.name}
                    </h3>
                    <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                      Estratégia Compilada
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">
                    {viewingStrategyCampaign.client?.name ? `Empresa: ${viewingStrategyCampaign.client.name}` : 'Plano Estratégico Multidisciplinar'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyStrategy(
                    typeof viewingStrategyCampaign.strategy === 'string'
                      ? viewingStrategyCampaign.strategy
                      : JSON.stringify(viewingStrategyCampaign.strategy, null, 2)
                  )}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer shadow-xs"
                >
                  {copiedStrategy ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedStrategy ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewingStrategyCampaign(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900 transition cursor-pointer"
                  title="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo da Estratégia */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 leading-relaxed text-xs sm:text-sm text-slate-800 dark:text-zinc-200 bg-slate-50/30 dark:bg-zinc-950">
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/30 p-3.5 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p><b>Objetivo:</b> {viewingStrategyCampaign.objective}</p>
                  {viewingStrategyCampaign.audience && <p><b>Público-Alvo:</b> {viewingStrategyCampaign.audience}</p>}
                  {viewingStrategyCampaign.channels && <p><b>Canais:</b> {viewingStrategyCampaign.channels}</p>}
                </div>
              </div>

              <div className="whitespace-pre-wrap font-sans bg-white dark:bg-zinc-900 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs leading-relaxed text-xs sm:text-sm">
                {typeof viewingStrategyCampaign.strategy === 'string'
                  ? viewingStrategyCampaign.strategy
                  : JSON.stringify(viewingStrategyCampaign.strategy, null, 2)}
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-zinc-800 flex justify-end bg-slate-50/75 dark:bg-zinc-900/75 shrink-0">
              <button
                type="button"
                onClick={() => setViewingStrategyCampaign(null)}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-bold text-white transition shadow-sm cursor-pointer"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
