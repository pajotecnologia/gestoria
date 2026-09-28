import React, { useEffect, useState } from 'react';
import { UserPlus, Trash2, Users, X, Pencil } from 'lucide-react';
import { apiUrl } from '../api/client';

type UserRow = { id: string; name: string; email: string; role: string };

const emptyForm = { name: '', email: '', password: '', role: 'OPERATOR' };

export const UserManagement: React.FC<{ jwtToken: string }> = ({ jwtToken }) => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    const res = await fetch(apiUrl('/api/users'), { headers: { Authorization: `Bearer ${jwtToken}` } });
    const data = await res.json();
    if (res.ok) setUsers(data.data || []);
    else setMessage(data.error || 'Não foi possível carregar usuários.');
  };

  useEffect(() => { void load(); }, [jwtToken]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setMessage('');
    setShowForm(true);
  };

  const openEdit = (user: UserRow) => {
    setEditing(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role });
    setMessage('');
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    const url = editing ? '/api/users/' + editing.id : '/api/users';
    const method = editing ? 'PATCH' : 'POST';
    const payload = editing ? { name: form.name, role: form.role, ...(form.password ? { password: form.password } : {}) } : form;
    const res = await fetch(apiUrl(url), {
      method,
      headers: { Authorization: `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error || 'Falha ao salvar usuário.'); return; }
    setForm(emptyForm);
    setEditing(null);
    setShowForm(false);
    setMessage(editing ? 'Usuário atualizado com sucesso.' : 'Usuário criado com sucesso.');
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm('Remover este usuário?')) return;
    const res = await fetch(apiUrl('/api/users/' + id), { method: 'DELETE', headers: { Authorization: `Bearer ${jwtToken}` } });
    const data = await res.json();
    if (!res.ok) setMessage(data.error || 'Falha ao remover usuário.');
    else { setMessage('Usuário removido com sucesso.'); await load(); }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-zinc-900/80 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3"><Users className="h-6 w-6 text-indigo-400" /><div><h2 className="text-xl font-bold text-white">Usuários da agência</h2><p className="mt-1 text-xs text-zinc-400">Gerencie acesso e funções dentro do tenant.</p></div></div>
          <p className="mt-2 text-xs text-zinc-500">{users.length} {users.length === 1 ? 'usuário cadastrado' : 'usuários cadastrados'}</p>
        </div>
        <button type="button" onClick={openCreate} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20"><UserPlus className="h-4 w-4" /> Novo usuário</button>
      </div>

      {message && <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-zinc-900 p-3 text-xs text-zinc-300"><span>{message}</span><button type="button" onClick={() => setMessage('')}><X className="h-4 w-4" /></button></div>}

      {users.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/80 p-10 text-center"><Users className="mx-auto h-8 w-8 text-zinc-600" /><p className="mt-3 text-sm font-semibold text-white">Nenhum usuário cadastrado.</p><button type="button" onClick={openCreate} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white">Novo usuário</button></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => (
            <article key={u.id} className="rounded-2xl border border-white/[0.07] bg-zinc-900/80 p-5 transition hover:border-white/[0.12]">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-bold text-white">{u.name}</h3><p className="mt-1 truncate text-xs text-zinc-400">{u.email}</p></div><span className="shrink-0 rounded-full bg-indigo-500/10 px-2 py-1 text-[10px] font-semibold text-indigo-300">{u.role}</span></div>
              <div className="mt-5 flex gap-2"><button type="button" onClick={() => openEdit(u)} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-zinc-800 px-3 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"><Pencil className="h-3.5 w-3.5" /> Editar</button><button type="button" onClick={() => void remove(u.id)} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-rose-500/10 px-3 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"><Trash2 className="h-3.5 w-3.5" /> Excluir</button></div>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/[0.08] bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between border-b border-white/[0.07] pb-4"><div><h3 className="text-base font-bold text-white">{editing ? 'Editar usuário' : 'Novo usuário'}</h3><p className="mt-1 text-xs text-zinc-500">Preencha os dados de acesso.</p></div><button type="button" onClick={() => setShowForm(false)} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300"><X className="h-4 w-4" /></button></div>
            <form onSubmit={save} className="space-y-4">
              <input required placeholder="Nome" value={form.name} onChange={e => setForm({...form,name:e.target.value})} className="w-full rounded-xl border border-white/[0.07] bg-zinc-950 px-3 py-2.5 text-xs text-white" />
              <input required type="email" disabled={Boolean(editing)} placeholder="E-mail" value={form.email} onChange={e => setForm({...form,email:e.target.value})} className="w-full rounded-xl border border-white/[0.07] bg-zinc-950 px-3 py-2.5 text-xs text-white disabled:cursor-not-allowed disabled:opacity-50" />
              <input required={!editing} minLength={8} type="password" placeholder={editing ? 'Nova senha (opcional)' : 'Senha'} value={form.password} onChange={e => setForm({...form,password:e.target.value})} className="w-full rounded-xl border border-white/[0.07] bg-zinc-950 px-3 py-2.5 text-xs text-white" />
              <select value={form.role} onChange={e => setForm({...form,role:e.target.value})} className="w-full rounded-xl border border-white/[0.07] bg-zinc-950 px-3 py-2.5 text-xs text-white"><option value="OPERATOR">Operador</option><option value="CLIENT_ADMIN">Administrador cliente</option><option value="AGENCY_ADMIN">Administrador agência</option></select>
              <div className="flex justify-end gap-2 border-t border-white/[0.07] pt-4"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl px-4 py-2.5 text-xs text-zinc-400">Cancelar</button><button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white">Salvar</button></div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
