import React, { useState } from 'react';
import { Bot, LogOut, ShieldCheck, Users, Radio, Sparkles } from 'lucide-react';
import { AgentsDashboard } from './components/AgentsDashboard';
import { WarRoomChat } from './components/WarRoomChat';
import { SpecialistManager } from './components/SpecialistManager';
import { apiUrl } from './api/client';
import { AIProvidersSettings } from './components/AIProvidersSettings';
import { UserManagement } from './components/UserManagement';
import { AuditLogViewer } from './components/AuditLogViewer';
import { ClientContextManager } from './components/ClientContextManager';
import { CampaignManager } from './components/CampaignManager';

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
  const [currentView, setCurrentView] = useState<'agents' | 'clients' | 'campaigns' | 'specialists' | 'warroom' | 'ai' | 'users' | 'audit'>('clients');

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
      <div className="relative min-h-screen overflow-hidden bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-3xl border border-white/[0.08] bg-zinc-900/80 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/15 to-violet-600/15 text-indigo-300 shadow-lg shadow-indigo-500/10 mb-3">
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
                    className="w-full rounded-xl border border-white/[0.08] bg-zinc-950/80 px-4 py-2.5 text-xs text-zinc-100 outline-none transition-all duration-200 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10"
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
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-50 cursor-pointer"
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
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Navbar Superior */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/[0.07] bg-zinc-950/80 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="rounded-xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/15 to-violet-600/15 p-2 text-indigo-300">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-wide text-zinc-100">Gestor IA SaaS</span>
              <span className="ml-2 rounded-full border border-white/[0.07] bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400">
                {tenant?.name}
              </span>
            </div>
          </div>

          {/* Navegação de Módulos */}
          <nav className="flex max-w-[58vw] items-center space-x-1 overflow-x-auto rounded-xl border border-white/[0.07] bg-zinc-900/70 p-1 backdrop-blur-md md:max-w-none">
            <button
              type="button"
              onClick={() => setCurrentView('clients')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${currentView === 'clients' ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/10' : 'text-zinc-400 hover:text-zinc-100'}`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Empresas</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('campaigns')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${currentView === 'campaigns' ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/10' : 'text-slate-400 hover:text-white'}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Campanhas</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('agents')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                currentView === 'agents'
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/10'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Agentes WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('ai')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${currentView === 'ai' ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/10' : 'text-slate-400 hover:text-white'}`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Provedores IA</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('specialists')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                currentView === 'specialists'
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/10'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">Especialistas Squad</span>
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
            className="premium-button flex items-center space-x-1 rounded-lg border border-white/[0.07] bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="mx-auto min-w-0 w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {currentView === 'clients' ? (
          <ClientContextManager jwtToken={token} />
        ) : currentView === 'campaigns' ? (
          <CampaignManager jwtToken={token} />
        ) : currentView === 'agents' ? (
          <AgentsDashboard jwtToken={token} />
        ) : currentView === 'specialists' ? (
          <SpecialistManager jwtToken={token} />
        ) : currentView === 'warroom' ? (
          <WarRoomChat jwtToken={token} />
        ) : currentView === 'ai' && user?.role === 'AGENCY_ADMIN' ? (
          <AIProvidersSettings jwtToken={token} />
        ) : currentView === 'users' && user?.role === 'AGENCY_ADMIN' ? (
          <UserManagement jwtToken={token} />
        ) : currentView === 'audit' && user?.role === 'AGENCY_ADMIN' ? (
          <AuditLogViewer jwtToken={token} />
        ) : (
          <div className="premium-surface rounded-2xl p-6 text-sm text-zinc-400">A configuração de provedores de IA está disponível apenas para administradores da agência.</div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] py-5 text-center text-xs text-zinc-600">
        Gestor IA &bull; Plataforma Multi-Tenant com RAG Qdrant, Evolution API e AI War Room
      </footer>
    </div>
  );
};
