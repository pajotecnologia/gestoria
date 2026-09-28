import React, { useEffect, useState } from 'react';
import { ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiUrl } from '../api/client';

type Audit = { id: string; action: string; entity: string; entityId?: string | null; metadata?: Record<string, unknown>; createdAt: string };
type Pagination = { page: number; pageSize: number; total: number; totalPages: number };

export const AuditLogViewer: React.FC<{ jwtToken: string }> = ({ jwtToken }) => {
  const [items, setItems] = useState<Audit[]>([]);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 50, total: 0, totalPages: 1 });

  useEffect(() => {
    void (async () => {
      setError('');
      const res = await fetch(apiUrl(`/api/audit?page=${pagination.page}&pageSize=${pagination.pageSize}`), { headers: { Authorization: `Bearer ${jwtToken}` } });
      const data = await res.json();
      if (res.ok) { setItems(data.data || []); setPagination(data.pagination || pagination); }
      else setError(data.error || 'Não foi possível carregar a auditoria.');
    })();
  }, [jwtToken, pagination.page, pagination.pageSize]);

  return <section className="space-y-5">
    <div><div className="flex items-center gap-3"><ClipboardList className="w-6 h-6 text-indigo-400"/><h2 className="text-xl font-bold text-white">Auditoria</h2></div><p className="text-xs text-slate-400 mt-1">Histórico das principais ações administrativas e operacionais.</p></div>
    {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">{error}</div>}
    <div className="hidden overflow-x-auto rounded-2xl border border-white/[0.07] bg-zinc-900/80 md:block"><table className="w-full text-xs"><thead><tr className="border-b border-white/[0.07] text-left text-zinc-500"><th className="p-3">Data</th><th className="p-3">Ação</th><th className="p-3">Entidade</th><th className="p-3">ID</th><th className="p-3">Detalhes</th></tr></thead><tbody>{items.map(item=><tr key={item.id} className="border-b border-white/[0.05] text-zinc-300"><td className="p-3 whitespace-nowrap">{new Date(item.createdAt).toLocaleString('pt-BR')}</td><td className="p-3 font-medium text-white">{item.action}</td><td className="p-3">{item.entity}</td><td className="p-3 font-mono text-zinc-500">{item.entityId || '—'}</td><td className="max-w-sm truncate p-3 text-zinc-500">{item.metadata ? JSON.stringify(item.metadata) : '—'}</td></tr>)}</tbody></table></div>
    <div className="grid gap-3 md:hidden">{items.map(item=><article key={item.id} className="rounded-2xl border border-white/[0.07] bg-zinc-900/80 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-zinc-100">{item.action}</p><p className="mt-1 text-[11px] text-zinc-500">{item.entity}</p></div><span className="shrink-0 text-[10px] text-zinc-500">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</span></div><dl className="mt-3 grid gap-2 text-[11px]"><div><dt className="text-zinc-600">ID</dt><dd className="break-all font-mono text-zinc-400">{item.entityId || '—'}</dd></div><div><dt className="text-zinc-600">Data</dt><dd className="text-zinc-400">{new Date(item.createdAt).toLocaleString('pt-BR')}</dd></div><div><dt className="text-zinc-600">Detalhes</dt><dd className="break-words text-zinc-500">{item.metadata ? JSON.stringify(item.metadata) : '—'}</dd></div></dl></article>)}</div>
    <div className="flex flex-col gap-3 text-xs text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
      <span>Página {pagination.page} de {Math.max(1, pagination.totalPages)} • {pagination.total} registros</span>
      <div className="flex gap-2 self-end sm:self-auto"><button disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))} className="min-h-11 px-3 py-2 rounded-lg bg-zinc-900 border border-white/[0.07] text-zinc-300 disabled:opacity-40"><ChevronLeft className="w-4 h-4 inline mr-1"/>Anterior</button><button disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40">Próxima<ChevronRight className="w-4 h-4 inline ml-1"/></button></div>
    </div>
  </section>;
};
