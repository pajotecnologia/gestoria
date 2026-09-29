import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Plus,
  Save,
  Trash2,
  Link2,
  Upload,
  FileText,
  ExternalLink,
  Pencil,
  Search,
  Filter,
  X,
} from 'lucide-react';
import { apiUrl } from '../api/client';

type ClientStatus = 'ACTIVE' | 'ARCHIVED';

interface ClientCounts {
  resources: number;
  knowledgeFiles: number;
  campaigns: number;
}

interface ClientResource {
  id: string;
  title: string;
  url: string;
  type: string;
  notes?: string | null;
}

interface KnowledgeFileSummary {
  id: string;
  agentId?: string | null;
  fileName: string;
  mimeType: string;
  chunksCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

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
  status?: ClientStatus;
  createdAt?: string;
  updatedAt?: string;
  resources?: ClientResource[];
  knowledgeFiles?: KnowledgeFileSummary[];
  _count?: ClientCounts;
}

type ClientForm = Omit<
  Client,
  'id' | 'resources' | 'knowledgeFiles' | '_count' | 'createdAt' | 'updatedAt'
>;

const createEmptyForm = (): ClientForm => ({
  name: '',
  legalName: '',
  document: '',
  segment: '',
  website: '',
  instagram: '',
  linkedin: '',
  description: '',
  targetAudience: '',
  productsOffers: '',
  brandVoice: '',
  goals: '',
  competitors: '',
  restrictions: '',
  notes: '',
  status: 'ACTIVE',
});

const statusLabel: Record<ClientStatus, string> = {
  ACTIVE: 'Ativa',
  ARCHIVED: 'Arquivada',
};

export const ClientContextManager: React.FC<{ jwtToken: string }> = ({ jwtToken }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ClientForm>(createEmptyForm);
  const [resource, setResource] = useState({ title: '', url: '', type: 'WEBSITE', notes: '' });
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ClientStatus>('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const resetForm = () => {
    setSelected(null);
    setShowForm(false);
    setForm(createEmptyForm());
    setResource({ title: '', url: '', type: 'WEBSITE', notes: '' });
    setFile(null);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/clients'), {
        headers: { Authorization: 'Bearer ' + jwtToken },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar empresas.');
      setClients(data.data || []);
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Falha ao carregar empresas.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [jwtToken]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showForm) {
        resetForm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm]);

  const open = async (id: string) => {
    try {
      const res = await fetch(apiUrl('/api/clients/' + id + '/context'), {
        headers: { Authorization: 'Bearer ' + jwtToken },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar empresa.');
      const client = data.data as Client;
      setSelected(client);
      setShowForm(true);
      setForm({
        name: client.name || '',
        legalName: client.legalName || '',
        document: client.document || '',
        segment: client.segment || '',
        website: client.website || '',
        instagram: client.instagram || '',
        linkedin: client.linkedin || '',
        description: client.description || '',
        targetAudience: client.targetAudience || '',
        productsOffers: client.productsOffers || '',
        brandVoice: client.brandVoice || '',
        goals: client.goals || '',
        competitors: client.competitors || '',
        restrictions: client.restrictions || '',
        notes: client.notes || '',
        status: client.status || 'ACTIVE',
      });
      setFeedback(null);
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Falha ao carregar empresa.' });
    }
  };

  useEffect(() => {
    void load();
  }, [jwtToken]);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return clients.filter((client) => {
      const matchesStatus = statusFilter === 'ALL' || (client.status || 'ACTIVE') === statusFilter;
      if (!matchesStatus) return false;
      if (!term) return true;
      return [
        client.name,
        client.legalName,
        client.document,
        client.segment,
      ].some((value) => value?.toLocaleLowerCase().includes(term));
    });
  }, [clients, search, statusFilter]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const method = selected ? 'PUT' : 'POST';
      const url = selected ? '/api/clients/' + selected.id : '/api/clients';
      const res = await fetch(apiUrl(url), {
        method,
        headers: { Authorization: 'Bearer ' + jwtToken, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let errMsg = data.error || data.message || 'Falha ao salvar empresa.';
        if (typeof errMsg === 'object') {
          errMsg = Object.values(errMsg).flat().join(', ');
        }
        throw new Error(errMsg);
      }

      await load();

      if (selected) {
        resetForm();
        setFeedback({ type: 'success', message: 'Dados da empresa atualizados com sucesso.' });
      } else {
        resetForm();
        setFeedback({ type: 'success', message: 'Empresa cadastrada com sucesso.' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Falha ao salvar empresa.' });
    } finally {
      setSaving(false);
    }
  };

  const addResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      const res = await fetch(apiUrl('/api/clients/' + selected.id + '/resources'), {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + jwtToken, 'Content-Type': 'application/json' },
        body: JSON.stringify(resource),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao adicionar link.');
      setResource({ title: '', url: '', type: 'WEBSITE', notes: '' });
      await open(selected.id);
      await load();
      setFeedback({ type: 'success', message: 'Referência adicionada.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Falha ao adicionar link.' });
    }
  };

  const uploadMaterial = async () => {
    if (!selected || !file) return;
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('clientId', selected.id);
      const res = await fetch(apiUrl('/api/rag/upload-knowledge'), {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + jwtToken },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Falha ao indexar material.');
      setFile(null);
      await open(selected.id);
      await load();
      setFeedback({ type: 'success', message: 'Material indexado na base de conhecimento da empresa.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Falha ao indexar material.' });
    }
  };

  const removeClient = async (client: Client) => {
    const confirmed = window.confirm(
      'Excluir a empresa "' + client.name + '"? Os dados vinculados serão afetados conforme as regras do banco de dados.',
    );
    if (!confirmed) return;

    setDeleting(true);
    setFeedback(null);
    try {
      const res = await fetch(apiUrl('/api/clients/' + client.id), {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + jwtToken },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao excluir empresa.');

      if (selected?.id === client.id) resetForm();
      await load();
      setFeedback({ type: 'success', message: 'Empresa excluída com sucesso.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Falha ao excluir empresa.' });
    } finally {
      setDeleting(false);
    }
  };

  const renderStatus = (status: ClientStatus = 'ACTIVE') => (
    <span
      className={
        'inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ' +
        (status === 'ACTIVE'
          ? 'bg-emerald-500/10 text-emerald-400'
          : 'bg-slate-700 text-zinc-300')
      }
    >
      {statusLabel[status]}
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Header Unificado & Ação Primária */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Empresas & Contexto dos Clientes
            </h1>
            <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-500 dark:text-indigo-400">
              {clients.length} {clients.length === 1 ? 'empresa' : 'empresas'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Cadastre empresas, organize o contexto de marca, links de referência e materiais indexados na base RAG.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setForm(createEmptyForm());
            setResource({ title: '', url: '', type: 'WEBSITE', notes: '' });
            setFile(null);
            setFeedback(null);
            setShowForm(true);
          }}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-400 hover:to-violet-500 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> 
          <span>Criar Nova Empresa</span>
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          className={
            'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ' +
            (feedback.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
              : 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300')
          }
        >
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} aria-label="Fechar mensagem" className="cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="space-y-4">
        {/* Barra de Busca e Filtros */}
        <div className="shadcn-card p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por empresa, razão social, documento ou segmento..."
                className="shadcn-input pl-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Limpar pesquisa"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 sm:w-56">
              <Filter className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | ClientStatus)}
                className="shadcn-input"
              >
                <option value="ALL">Todos os status</option>
                <option value="ACTIVE">Ativas</option>
                <option value="ARCHIVED">Arquivadas</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 dark:text-zinc-500">
            Carregando empresas...
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-zinc-800">
            <Building2 className="h-10 w-10 text-slate-400 dark:text-zinc-600 mb-3" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
              {clients.length === 0 ? 'Nenhuma empresa cadastrada' : 'Nenhuma empresa encontrada'}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 max-w-sm">
              {clients.length === 0
                ? 'Clique no botão "+ Criar Nova Empresa" no topo para organizar diretrizes, links e base de conhecimento.'
                : 'Tente alterar os termos da pesquisa ou o filtro de status.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {filteredClients.map((client) => (
              <article
                key={client.id}
                className="shadcn-card flex flex-col justify-between space-y-4 hover:border-indigo-500/40 transition-all duration-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{client.name}</h3>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-zinc-400">
                        {client.legalName || client.segment || 'Empresa'}
                      </p>
                    </div>
                    {renderStatus(client.status || 'ACTIVE')}
                  </div>

                  <div className="mt-3 space-y-1 text-[11px] text-slate-600 dark:text-zinc-400">
                    {client.document && <p className="truncate">Documento: {client.document}</p>}
                    {client.segment && <p className="truncate">Segmento: {client.segment}</p>}
                    {client.updatedAt && (
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                        Atualizada em {new Date(client.updatedAt).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 grid gap-2 grid-cols-3">
                    <div className="rounded-lg bg-slate-100 dark:bg-zinc-950 p-2 text-center border border-slate-200/60 dark:border-zinc-800">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{client._count?.knowledgeFiles || 0}</p>
                      <p className="text-[9px] text-slate-500 dark:text-zinc-400">RAG</p>
                    </div>
                    <div className="rounded-lg bg-slate-100 dark:bg-zinc-950 p-2 text-center border border-slate-200/60 dark:border-zinc-800">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{client._count?.resources || 0}</p>
                      <p className="text-[9px] text-slate-500 dark:text-zinc-400">Links</p>
                    </div>
                    <div className="rounded-lg bg-slate-100 dark:bg-zinc-950 p-2 text-center border border-slate-200/60 dark:border-zinc-800">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{client._count?.campaigns || 0}</p>
                      <p className="text-[9px] text-slate-500 dark:text-zinc-400">Campanhas</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-zinc-800/80 gap-2">
                  <button
                    type="button"
                    onClick={() => void open(client.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 transition cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Editar & Contexto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void removeClient(client)}
                    disabled={deleting}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-500 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                    title="Excluir empresa"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Modal Dialog Popup de Cadastro / Edição da Empresa */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3.5 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selected ? 'Editar Contexto da Empresa' : 'Cadastrar Nova Empresa'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    {selected ? 'Atualize as diretrizes, links e base de conhecimento da marca.' : 'Preencha os dados e informações para orientar os agentes de IA.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={save} className="space-y-4">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                {[
                  ['name', 'Nome da Empresa *', true],
                  ['legalName', 'Razão Social', false],
                  ['document', 'CNPJ / Documento', false],
                  ['segment', 'Segmento de Atuação', false],
                  ['website', 'Website', false],
                  ['instagram', 'Instagram (@)', false],
                  ['linkedin', 'LinkedIn', false],
                ].map(([key, label, required]) => (
                  <div key={key as string} className={key === 'name' ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">{label}</label>
                    <input
                      required={Boolean(required)}
                      value={form[key as keyof ClientForm] || ''}
                      onChange={(e) => setForm({ ...form, [key as string]: e.target.value })}
                      className="shadcn-input"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Contexto Estratégico para os Agentes de IA
                </h4>
                
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {[
                    ['description', 'Sobre a Empresa & História'],
                    ['targetAudience', 'Público-Alvo & Personas'],
                    ['productsOffers', 'Produtos, Serviços & Ofertas Principais'],
                    ['brandVoice', 'Posicionamento & Tom de Voz'],
                    ['goals', 'Objetivos de Marketing / Negócio'],
                    ['competitors', 'Concorrentes & Referências'],
                    ['restrictions', 'Restrições, Compliance & Proibições'],
                    ['notes', 'Observações Internas da Agência'],
                  ].map(([key, label]) => (
                    <div key={key as string}>
                      <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">{label}</label>
                      <textarea
                        rows={3}
                        value={form[key as keyof ClientForm] || ''}
                        onChange={(e) => setForm({ ...form, [key as string]: e.target.value })}
                        className="shadcn-input resize-y"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-zinc-800">
                {selected ? (
                  <button
                    type="button"
                    onClick={() => void removeClient(selected)}
                    disabled={deleting}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-500/20 dark:text-rose-400 transition cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir Empresa
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-md shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saving ? 'Salvando...' : selected ? 'Salvar Alterações' : 'Cadastrar Empresa'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Links e Materiais RAG (quando editando empresa existente) */}
            {selected && (
              <div className="mt-6 space-y-5 border-t border-slate-200 pt-5 dark:border-zinc-800">
                <div>
                  <h4 className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    <Link2 className="h-4 w-4 text-indigo-500" />
                    <span>Links & Referências da Empresa</span>
                  </h4>
                  <form onSubmit={addResource} className="mt-3 grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <input
                      required
                      placeholder="Título (ex: Site Oficial)"
                      value={resource.title}
                      onChange={(e) => setResource({ ...resource, title: e.target.value })}
                      className="shadcn-input"
                    />
                    <input
                      required
                      type="url"
                      placeholder="https://..."
                      value={resource.url}
                      onChange={(e) => setResource({ ...resource, url: e.target.value })}
                      className="shadcn-input sm:col-span-2"
                    />
                    <button className="rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-500 py-2 cursor-pointer shadow">
                      Adicionar Link
                    </button>
                  </form>

                  <div className="mt-3 space-y-2">
                    {(selected.resources || []).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{item.title}</p>
                          <p className="truncate text-[10px] text-slate-500 dark:text-zinc-400">{item.url}</p>
                        </div>
                        <a href={item.url} target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-400" aria-label={'Abrir ' + item.title}>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    <FileText className="h-4 w-4 text-indigo-500" />
                    <span>Materiais da Empresa (Base RAG)</span>
                  </h4>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-zinc-400">PDFs e arquivos de texto para indexação no banco vetorial.</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="file"
                      accept=".pdf,.txt,application/pdf,text/plain"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="flex-1 text-xs text-slate-600 dark:text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-500/10 file:text-indigo-600 hover:file:bg-indigo-500/20 cursor-pointer"
                    />
                    <button
                      type="button"
                      disabled={!file}
                      onClick={() => void uploadMaterial()}
                      className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 transition cursor-pointer shadow"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Indexar Material</span>
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {(selected.knowledgeFiles || []).map((item) => (
                      <div key={item.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-900">
                        <FileText className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="truncate text-xs text-slate-700 dark:text-zinc-300">{item.fileName}</span>
                        <span className="ml-auto text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{item.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
