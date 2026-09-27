import React, { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { apiUrl } from '../api/client';

type Audit = { id: string; action: string; entity: string; entityId?: string | null; metadata?: Record<string, unknown>; createdAt: string };
export const AuditLogViewer: React.FC<{ jwtToken: string }> = ({ jwtToken }) => {
  const [items, setItems] = useState<Audit[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    void (async () => {
      const res = await fetch(apiUrl('/api/audit?page=1&pageSize=100'), { headers: { Authorization: `Bearer ${jwtToken}` } });
      const data = await res.json();
      if (res.ok) setItems(data.data || []); else setError(data.error || 'Não foi possível carregar a auditoria.');
    })();
  }, [jwtToken]);
  return <section className="space-y-5">
    <div><div className="flex items-center gap-3"><ClipboardList className="w-6 h-6 text-indigo-400"/><h2 className="text-xl font-bold text-white">Auditoria</h2></div><p className="text-xs text-slate-400 mt-1">Histórico das principais ações administrativas e operacionais.</p></div>
    {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">{error}</div>}
    <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-2xl"><table className="w-full text-xs"><thead><tr className="text-left text-slate-500 border-b border-slate-800"><th className="p-3">Data</th><th className="p-3">Ação</th><th className="p-3">Entidade</th><th className="p-3">ID</th></tr></thead><tbody>{items.map(item=><tr key={item.id} className="border-b border-slate-800/70 text-slate-300"><td className="p-3 whitespace-nowrap">{new Date(item.createdAt).toLocaleString('pt-BR')}</td><td className="p-3 font-medium text-white">{item.action}</td><td className="p-3">{item.entity}</td><td className="p-3 font-mono text-slate-500">{item.entityId || '—'}</td></tr>)}</tbody></table></div>
  </section>;
};
