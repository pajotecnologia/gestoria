import React, { useEffect, useState } from 'react';
import { UserPlus, Trash2, Users, X, Pencil, ShieldCheck } from 'lucide-react';
import { apiUrl } from '../api/client';

type UserRow = { id: string; name: string; email: string; role: string };

const emptyForm = { name: '', email: '', password: '', role: 'OPERATOR' };

export const UserManagement: React.FC<{ jwtToken: string }> = ({ jwtToken }) => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/users'), { headers: { Authorization: `Bearer ${jwtToken}` } });
      const data = await res.json();
      if (res.ok) setUsers(data.data || []);
      else setMessage(data.error || 'Não foi possível carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    void load(); 
  }, [jwtToken]);

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
    if (!res.ok) { 
      setMessage(data.error || 'Falha ao salvar usuário.'); 
      return; 
    }
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
    else { 
      setMessage('Usuário removido com sucesso.'); 
      await load(); 
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'AGENCY_ADMIN') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-500 dark:text-indigo-400">
          <ShieldCheck className="h-3 w-3" /> Admin Agência
        </span>
      );
    }
    if (role === 'CLIENT_ADMIN') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-violet-500 dark:text-violet-400">
          Admin Cliente
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        Operador
      </span>
    );
  };

  return (
    <section className="space-y-6">
      {/* Header Unificado & Ação Primária */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Gestão de Usuários & Acessos
            </h1>
            <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-500 dark:text-indigo-400">
              {users.length} {users.length === 1 ? 'usuário' : 'usuários'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Gerencie os membros da sua agência, atribua cargos e controle as permissões de acesso ao sistema.
          </p>
        </div>

        <button 
          type="button" 
          onClick={openCreate} 
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-400 hover:to-violet-500 cursor-pointer"
        >
          <UserPlus className="h-4 w-4" /> 
          <span>Novo Usuário</span>
        </button>
      </div>

      {message && (
        <div className="flex items-center justify-between rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3.5 text-xs text-indigo-600 dark:text-indigo-300">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage('')} className="cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400 dark:text-zinc-500">
          Carregando usuários...
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-zinc-800">
          <Users className="h-10 w-10 text-slate-400 dark:text-zinc-600 mb-3" />
          <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">Nenhum usuário cadastrado</p>
          <button 
            type="button" 
            onClick={openCreate} 
            className="mt-4 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Cadastrar Primeiro Usuário</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => (
            <article key={u.id} className="shadcn-card flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 text-xs font-bold text-indigo-500 dark:text-indigo-400">
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 truncate">
                      <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{u.name}</h3>
                      <p className="truncate text-xs text-slate-500 dark:text-zinc-400">{u.email}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 dark:text-zinc-500">Perfil de Acesso</span>
                  {getRoleBadge(u.role)}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                <button 
                  type="button" 
                  onClick={() => openEdit(u)} 
                  className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 transition cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" /> 
                  <span>Editar</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => void remove(u.id)} 
                  className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-500/20 dark:text-rose-400 transition cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" /> 
                  <span>Excluir</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-4 dark:border-zinc-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editing ? 'Editar Usuário' : 'Novo Usuário'}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                  Preencha as credenciais e nível de acesso.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Nome Completo *</label>
                <input 
                  required 
                  placeholder="Ex: Ana Clara" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  className="shadcn-input" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Email de Acesso *</label>
                <input 
                  required 
                  type="email" 
                  disabled={Boolean(editing)} 
                  placeholder="ana@agencia.com.br" 
                  value={form.email} 
                  onChange={e => setForm({...form, email: e.target.value})} 
                  className="shadcn-input disabled:opacity-50 disabled:cursor-not-allowed" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  {editing ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha de Acesso *'}
                </label>
                <input 
                  required={!editing} 
                  minLength={8} 
                  type="password" 
                  placeholder={editing ? '••••••••' : 'Mínimo 8 caracteres'} 
                  value={form.password} 
                  onChange={e => setForm({...form, password: e.target.value})} 
                  className="shadcn-input" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Cargo / Nível de Acesso *</label>
                <select 
                  value={form.role} 
                  onChange={e => setForm({...form, role: e.target.value})} 
                  className="shadcn-input"
                >
                  <option value="OPERATOR">Operador (Acesso às empresas, campanhas e chat)</option>
                  <option value="CLIENT_ADMIN">Administrador de Cliente</option>
                  <option value="AGENCY_ADMIN">Administrador da Agência (Acesso total)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-zinc-800">
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)} 
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow transition cursor-pointer"
                >
                  {editing ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
