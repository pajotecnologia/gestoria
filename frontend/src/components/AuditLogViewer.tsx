import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { apiUrl } from '../api/client';

type Audit = { id: string; action: string; entity: string; entityId?: string | null; metadata?: Record<string, unknown>; createdAt: string };
type Pagination = { page: number; pageSize: number; total: number; totalPages: number };

export const AuditLogViewer: React.FC<{ jwtToken: string }> = ({ jwtToken }) => {
  const [items, setItems] = useState<Audit[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 50, total: 0, totalPages: 1 });

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(apiUrl(`/api/audit?page=${pagination.page}&pageSize=${pagination.pageSize}`), { 
          headers: { Authorization: `Bearer ${jwtToken}` } 
        });
        const data = await res.json();
        if (res.ok) { 
          setItems(data.data || []); 
          setPagination(data.pagination || pagination); 
        } else {
          setError(data.error || 'Não foi possível carregar a auditoria.');
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar auditoria.');
      } finally {
        setLoading(false);
      }
    })();
  }, [jwtToken, pagination.page, pagination.pageSize]);

  return (
    <section className="space-y-6">
      {/* Header Unificado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Auditoria & Logs de Segurança
            </h1>
            <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-500 dark:text-indigo-400">
              {pagination.total} {pagination.total === 1 ? 'evento' : 'eventos'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Histórico imutável de ações administrativas, alterações de contexto e eventos do sistema.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Tabela Shadcn Desktop */}
      <div className="hidden md:block shadcn-card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left font-semibold text-slate-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                <th className="p-3.5">Data & Hora</th>
                <th className="p-3.5">Ação Realizada</th>
                <th className="p-3.5">Entidade</th>
                <th className="p-3.5">ID Alvo</th>
                <th className="p-3.5">Metadados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-zinc-500">
                    Carregando registros de auditoria...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-zinc-500">
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-950/40 transition">
                    <td className="p-3.5 whitespace-nowrap font-mono text-slate-500 dark:text-zinc-400">
                      {new Date(item.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                      <span className="inline-block rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        {item.action}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-slate-700 dark:text-zinc-300">
                      {item.entity}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-400 dark:text-zinc-500">
                      {item.entityId ? item.entityId.slice(0, 12) + '...' : '—'}
                    </td>
                    <td className="max-w-xs truncate p-3.5 font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                      {item.metadata ? JSON.stringify(item.metadata) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lista Cards Mobile */}
      <div className="grid gap-3 md:hidden">
        {items.map((item) => (
          <article key={item.id} className="shadcn-card p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-500 border border-indigo-500/20">
                  {item.action}
                </span>
                <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-white">{item.entity}</p>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                {new Date(item.createdAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
            {item.metadata && (
              <p className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 break-all">
                {JSON.stringify(item.metadata)}
              </p>
            )}
          </article>
        ))}
      </div>

      {/* Paginação */}
      <div className="flex flex-col gap-3 text-xs text-slate-500 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between shadcn-card px-4 py-3">
        <span>
          Página {pagination.page} de {Math.max(1, pagination.totalPages)} • {pagination.total} registros
        </span>
        <div className="flex gap-2">
          <button 
            disabled={pagination.page <= 1} 
            onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))} 
            className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 transition"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Anterior</span>
          </button>
          <button 
            disabled={pagination.page >= pagination.totalPages} 
            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} 
            className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 transition"
          >
            <span>Próxima</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
};
