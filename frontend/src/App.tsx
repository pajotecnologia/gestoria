import React, { useState } from 'react';
import { Bot, LogOut, ShieldCheck, Users, Radio } from 'lucide-react';
import { AgentsDashboard } from './components/AgentsDashboard';
import { WarRoomChat } from './components/WarRoomChat';
import { apiUrl } from './api/client';
import { AIProvidersSettings } from './components/AIProvidersSettings';
import { UserManagement } from './components/UserManagement';
import { AuditLogViewer } from './components/AuditLogViewer';

export const App: React.FC = () => {
  const [token, setToken] = useState<string>(() => {
    try { return localStorage.getItem('token') || ''; } catch { return ''; }
  });
  const [user, setUser] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });
  const [tenant, setTenant] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('tenant') || 'null'); } catch { return null; }
  });

  // Navegação Principal
  const [currentView, setCurrentView] = useState<'agents' | 'warroom' | 'ai' | 'users' | 'audit'>('agents');

  // Estados do Formulário de Auth
  const [isRegistering, setIsRegistering] = useState(false);
  const [agencyName, setAgencyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const body = isRegistering
        ? { agencyName, name, email, password }
        : { email, password };

      const res = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        let msg = data.message || data.error || 'Falha na autenticação.';
        if (data.details) {
          msg += ' - ' + Object.entries(data.details).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`).join('; ');
        }
        throw new Error(msg);
      }

      setToken(data.token);
      setUser(data.user);
      setTenant(data.tenant);

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('tenant', JSON.stringify(data.tenant));
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    setTenant(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
  };

  if (!token || !user || !tenant) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/30 mb-3">
              <Bot className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Gestor IA SaaS</h1>
            <p className="text-xs text-slate-400 mt-1">Plataforma Multi-Tenant de Agentes de IA para Agências</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nome da Agência / Empresa</label>
                  <input
                    type="text"
                    required
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Ex: Agência Nexus Marketing"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Seu Nome</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Ex: Carlos Silva"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Profissional</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Senha (Mínimo 8 caracteres)</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            {authError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              {authLoading ? 'Processando...' : isRegistering ? 'Criar Conta da Agência' : 'Acessar Painel'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setAuthError('');
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              {isRegistering ? 'Já possui conta? Faça login' : 'Não tem conta? Cadastre sua agência'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Navbar Superior */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-wide">Gestor IA SaaS</span>
              <span className="text-[10px] text-slate-400 ml-2 px-2 py-0.5 bg-slate-800 rounded-full border border-slate-700">
                {tenant?.name}
              </span>
            </div>
          </div>

          {/* Navegação de Módulos */}
          <nav className="flex items-center space-x-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-[58vw] md:max-w-none">
            <button
              type="button"
              onClick={() => setCurrentView('agents')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                currentView === 'agents'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Agentes WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('ai')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${currentView === 'ai' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Provedores IA</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('warroom')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                currentView === 'warroom'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden md:inline">Mesa Redonda</span>
            </button>
            {user?.role === 'AGENCY_ADMIN' && <button type="button" onClick={() => setCurrentView('users')} className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${currentView === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}><Users className="w-3.5 h-3.5"/><span className="hidden md:inline">Usuários</span></button>}
            {user?.role === 'AGENCY_ADMIN' && <button type="button" onClick={() => setCurrentView('audit')} className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${currentView === 'audit' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}><ShieldCheck className="w-3.5 h-3.5"/><span className="hidden md:inline">Auditoria</span></button>}
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{user?.email}</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {currentView === 'agents' ? (
          <AgentsDashboard jwtToken={token} />
        ) : currentView === 'warroom' ? (
          <WarRoomChat jwtToken={token} />
        ) : currentView === 'ai' && user?.role === 'AGENCY_ADMIN' ? (
          <AIProvidersSettings jwtToken={token} />
        ) : currentView === 'users' && user?.role === 'AGENCY_ADMIN' ? (
          <UserManagement jwtToken={token} />
        ) : currentView === 'audit' && user?.role === 'AGENCY_ADMIN' ? (
          <AuditLogViewer jwtToken={token} />
        ) : (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-sm text-slate-400">A configuração de provedores de IA está disponível apenas para administradores da agência.</div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-900 text-center text-xs text-slate-600">
        Gestor IA &bull; Plataforma Multi-Tenant com RAG Qdrant, Evolution API e AI War Room
      </footer>
    </div>
  );
};
