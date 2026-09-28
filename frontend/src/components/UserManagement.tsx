import React, { useEffect, useState } from 'react';
import { UserPlus, Trash2, Users } from 'lucide-react';
import { apiUrl } from '../api/client';

type UserRow = { id: string; name: string; email: string; role: string };
export const UserManagement: React.FC<{ jwtToken: string }> = ({ jwtToken }) => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'OPERATOR' });
  const [message, setMessage] = useState('');

  const load = async () => {
    const res = await fetch(apiUrl('/api/users'), { headers: { Authorization: `Bearer ${jwtToken}` } });
    const data = await res.json();
    if (res.ok) setUsers(data.data || []);
    else setMessage(data.error || 'Não foi possível carregar usuários.');
  };
  useEffect(() => { void load(); }, [jwtToken]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setMessage('');
    const res = await fetch(apiUrl('/api/users'), { method: 'POST', headers: { Authorization: `Bearer ${jwtToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error || 'Falha ao criar usuário.'); return; }
    setForm({ name: '', email: '', password: '', role: 'OPERATOR' }); setMessage('Usuário criado.'); await load();
  };
  const remove = async (id: string) => {
    if (!confirm('Remover este usuário?')) return;
    const res = await fetch(apiUrl('/api/users/' + id), { method: 'DELETE', headers: { Authorization: `Bearer ${jwtToken}` } });
    const data = await res.json();
    if (!res.ok) setMessage(data.error || 'Falha ao remover usuário.'); else await load();
  };

  return <section className="space-y-5">
    <div><div className="flex items-center gap-3"><Users className="w-6 h-6 text-indigo-400"/><h2 className="text-xl font-bold text-white">Usuários da agência</h2></div><p className="text-xs text-slate-400 mt-1">Gerencie acesso e funções dentro do tenant.</p></div>
    <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <input required placeholder="Nome" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"/>
      <input required type="email" placeholder="E-mail" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"/>
      <input required minLength={8} type="password" placeholder="Senha" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"/>
      <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"><option value="OPERATOR">Operador</option><option value="CLIENT_ADMIN">Administrador cliente</option><option value="AGENCY_ADMIN">Administrador agência</option></select>
      <button className="rounded-xl bg-indigo-600 text-white text-xs font-semibold px-4 py-2"><UserPlus className="w-3.5 h-3.5 inline mr-1"/>Criar usuário</button>
    </form>
    {message && <div className="text-xs text-slate-300 bg-slate-900 border border-slate-800 rounded-xl p-3">{message}</div>}
    <div className="grid gap-3">{users.map(u=><div key={u.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><div className="text-sm font-semibold text-white">{u.name}</div><div className="text-xs text-slate-400">{u.email} • {u.role}</div></div><button onClick={()=>void remove(u.id)} className="px-3 py-2 rounded-lg bg-rose-500/10 text-rose-300 text-xs"><Trash2 className="w-3.5 h-3.5 inline mr-1"/>Remover</button></div>)}</div>
  </section>;
};
