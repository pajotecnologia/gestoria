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
    <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-2xl"><table className="w-full text-xs"><thead><tr className="text-left text-slate-500 border-b border-slate-800"><th className="p-3">Data</th><th className="p-3">Ação</th><th className="p-3">Entidade</th><th className="p-3">ID</th><th className="p-3">Detalhes</th></tr></thead><tbody>{items.map(item=><tr key={item.id} className="border-b border-slate-800/70 text-slate-300"><td className="p-3 whitespace-nowrap">{new Date(item.createdAt).toLocaleString('pt-BR')}</td><td className="p-3 font-medium text-white">{item.action}</td><td className="p-3">{item.entity}</td><td className="p-3 font-mono text-slate-500">{item.entityId || '—'}</td><td className="p-3 max-w-sm truncate text-slate-500">{item.metadata ? JSON.stringify(item.metadata) : '—'}</td></tr>)}</tbody></table></div>
    <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
      <span>Página {pagination.page} de {Math.max(1, pagination.totalPages)} • {pagination.total} registros</span>
      <div className="flex gap-2"><button disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))} className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40"><ChevronLeft className="w-4 h-4 inline mr-1"/>Anterior</button><button disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40">Próxima<ChevronRight className="w-4 h-4 inline ml-1"/></button></div>
    </div>
  </section>;
};
