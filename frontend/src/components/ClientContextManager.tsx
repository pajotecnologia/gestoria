import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Plus,
  Save,
  Trash2,
  Link2,
  Upload,
  FileText,
  RefreshCw,
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar empresa.');

      await load();

      if (selected) {
        await open(data.data.id);
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
      <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-zinc-900/80 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <Building2 className="h-5 w-5 text-indigo-400" /> Contexto das Empresas
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Cadastre empresas, organize contexto, referências e materiais para alimentar campanhas e estratégias.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {clients.length} {clients.length === 1 ? 'empresa cadastrada' : 'empresas cadastradas'}
            {search || statusFilter !== 'ALL' ? ' • ' + filteredClients.length + ' encontradas' : ''}
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
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:from-indigo-400 hover:to-violet-500"
        >
          <Plus className="h-4 w-4" /> Criar Nova Empresa
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          className={
            'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ' +
            (feedback.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/20 bg-rose-500/10 text-rose-300')
          }
        >
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} aria-label="Fechar mensagem">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-zinc-900/80 p-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-zinc-100">Empresas cadastradas</h3>
            <p className="mt-1 text-[11px] text-zinc-500">Selecione uma empresa para editar seus dados ou gerenciar referências e materiais.</p>
          </div>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por empresa, razão social, documento ou segmento..."
              className="w-full rounded-xl border border-white/[0.07] bg-zinc-950 py-2.5 pl-9 pr-9 text-xs text-white outline-none focus:border-indigo-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Limpar pesquisa"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 lg:w-48">
            <Filter className="h-4 w-4 text-zinc-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | ClientStatus)}
              className="w-full rounded-xl border border-white/[0.07] bg-zinc-950 px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
            >
              <option value="ALL">Todos os status</option>
              <option value="ACTIVE">Ativas</option>
              <option value="ARCHIVED">Arquivadas</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800/80 disabled:opacity-50"
          >
            <RefreshCw className={'h-3.5 w-3.5 ' + (loading ? 'animate-spin' : '')} /> Atualizar
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/80 p-8 text-center text-xs text-zinc-500">
            Carregando empresas...
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/80 p-10 text-center">
            <Building2 className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-3 text-sm font-semibold text-white">
              {clients.length === 0 ? 'Nenhuma empresa cadastrada.' : 'Nenhuma empresa encontrada.'}
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-zinc-500">
              {clients.length === 0
                ? 'Cadastre sua primeira empresa para começar a criar contextos, campanhas e estratégias.'
                : 'Tente alterar os termos da pesquisa ou remover os filtros.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setForm(createEmptyForm());
                setShowForm(true);
                setFeedback(null);
              }}
              className="mx-auto mt-4 flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20"
            >
              <Plus className="mr-1 h-4 w-4" /> Criar Nova Empresa
            </button>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {filteredClients.map((client) => (
              <article
                key={client.id}
                className={
                  'rounded-2xl border bg-zinc-900/80 p-5 transition-all duration-200 ease-in-out ' +
                  (selected?.id === client.id
                    ? 'border-indigo-500/50 ring-1 ring-indigo-500/20'
                    : 'border-white/[0.07] hover:border-white/[0.10]')
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-white">{client.name}</h3>
                    <p className="mt-1 truncate text-[11px] text-zinc-500">
                      {client.legalName || client.segment || 'Empresa'}
                    </p>
                  </div>
                  {renderStatus(client.status || 'ACTIVE')}
                </div>

                <div className="mt-4 space-y-1.5 text-[11px] text-zinc-400">
                  {client.document && <p className="truncate">Documento: {client.document}</p>}
                  {client.segment && <p className="truncate">Segmento: {client.segment}</p>}
                  {client.updatedAt && (
                    <p>Atualizada em {new Date(client.updatedAt).toLocaleDateString('pt-BR')}</p>
                  )}
                </div>

                <div className="mt-4 grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg bg-zinc-950 p-2 text-center">
                    <p className="text-sm font-bold text-white">{client._count?.knowledgeFiles || 0}</p>
                    <p className="text-[9px] text-zinc-500">Materiais</p>
                  </div>
                  <div className="rounded-lg bg-zinc-950 p-2 text-center">
                    <p className="text-sm font-bold text-white">{client._count?.resources || 0}</p>
                    <p className="text-[9px] text-zinc-500">Referências</p>
                  </div>
                  <div className="rounded-lg bg-zinc-950 p-2 text-center">
                    <p className="text-sm font-bold text-white">{client._count?.campaigns || 0}</p>
                    <p className="text-[9px] text-zinc-500">Campanhas</p>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void open(client.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-indigo-500"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Alterar
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeClient(client)}
                    disabled={deleting}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <section className="rounded-2xl border border-white/[0.07] bg-zinc-900/80 p-5">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-white">
              {selected ? 'Editar contexto da empresa' : 'Nova empresa'}
            </h3>
            <p className="mt-1 text-[11px] text-zinc-500">
              {selected ? 'Atualize os dados da empresa selecionada.' : 'Preencha os dados para cadastrar uma nova empresa.'}
            </p>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-white/[0.07] px-3 py-2 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-800/80"
          >
            <X className="h-3.5 w-3.5" /> Voltar para empresas
          </button>
        </div>

        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {[
              ['name', 'Nome da empresa *'],
              ['legalName', 'Razão social'],
              ['document', 'CNPJ/Documento'],
              ['segment', 'Segmento'],
              ['website', 'Site'],
              ['instagram', 'Instagram'],
              ['linkedin', 'LinkedIn'],
            ].map(([key, label]) => (
              <div key={key} className={key === 'name' ? 'md:col-span-2' : ''}>
                <label className="text-[11px] font-semibold text-zinc-300">{label}</label>
                <input
                  required={key === 'name'}
                  value={form[key as keyof ClientForm] || ''}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/[0.07] bg-zinc-950 px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
            ))}
          </div>

          {[
            ['description', 'Sobre a empresa'],
            ['targetAudience', 'Público-alvo / personas'],
            ['productsOffers', 'Produtos, serviços e ofertas'],
            ['brandVoice', 'Posicionamento e tom de voz'],
            ['goals', 'Objetivos de marketing/negócio'],
            ['competitors', 'Concorrentes e referências'],
            ['restrictions', 'Restrições, compliance e o que não pode ser prometido'],
            ['notes', 'Observações internas da agência'],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="text-[11px] font-semibold text-zinc-300">{label}</label>
              <textarea
                rows={3}
                value={form[key as keyof ClientForm] || ''}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/[0.07] bg-zinc-950 px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>
          ))}

          <div className="flex flex-col-reverse gap-2 border-t border-white/[0.07] pt-4 sm:flex-row sm:justify-end">
            {selected && (
              <button
                type="button"
                onClick={() => void removeClient(selected)}
                disabled={deleting}
                className="flex items-center justify-center gap-2 rounded-xl bg-rose-500/10 px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir empresa
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {saving ? 'Salvando...' : selected ? 'Salvar alterações' : 'Cadastrar empresa'}
            </button>
          </div>
        </form>

        {selected && (
          <div className="mt-7 space-y-5 border-t border-white/[0.07] pt-6">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <Link2 className="h-4 w-4 text-cyan-400" /> Sites e referências
              </h3>
              <form onSubmit={addResource} className="mt-3 grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  required
                  placeholder="Título"
                  value={resource.title}
                  onChange={(e) => setResource({ ...resource, title: e.target.value })}
                  className="rounded-lg border border-white/[0.07] bg-zinc-950 px-3 py-2 text-xs text-white"
                />
                <input
                  required
                  type="url"
                  placeholder="https://..."
                  value={resource.url}
                  onChange={(e) => setResource({ ...resource, url: e.target.value })}
                  className="rounded-lg border border-white/[0.07] bg-zinc-950 px-3 py-2 text-xs text-white md:col-span-2"
                />
                <button className="rounded-lg bg-cyan-600 text-xs font-semibold text-white hover:bg-cyan-500">Adicionar</button>
              </form>
              <div className="mt-3 space-y-2">
                {(selected.resources || []).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.07] bg-zinc-950 p-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs text-white">{item.title}</p>
                      <p className="truncate text-[10px] text-zinc-500">{item.url}</p>
                    </div>
                    <a href={item.url} target="_blank" rel="noreferrer" className="text-cyan-400" aria-label={'Abrir ' + item.title}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <FileText className="h-4 w-4 text-indigo-400" /> Materiais da empresa
              </h3>
              <p className="mt-1 text-[11px] text-zinc-500">PDF/TXT ficam vinculados à empresa e podem alimentar a estratégia.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="flex-1 text-xs text-zinc-400"
                />
                <button
                  type="button"
                  disabled={!file}
                  onClick={() => void uploadMaterial()}
                  className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
                >
                  <Upload className="h-3.5 w-3.5" /> Indexar material
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {(selected.knowledgeFiles || []).map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-zinc-950 p-2.5">
                    <FileText className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="truncate text-xs text-zinc-300">{item.fileName}</span>
                    <span className="ml-auto text-[10px] text-emerald-400">{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        </section>
      )}
    </div>
  );
};
