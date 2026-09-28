import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Bot, 
  Building2, 
  ChevronLeft, 
  ChevronRight, 
  FolderKanban, 
  History, 
  LogOut, 
  Menu, 
  MessageSquare, 
  Radio, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  Users, 
  X
} from 'lucide-react';

import { AgentsDashboard } from './components/AgentsDashboard';
import { WarRoomChat } from './components/WarRoomChat';
import { SpecialistManager } from './components/SpecialistManager';
import { apiUrl } from './api/client';
import { AIProvidersSettings } from './components/AIProvidersSettings';
import { UserManagement } from './components/UserManagement';
import { AuditLogViewer } from './components/AuditLogViewer';
import { ClientContextManager } from './components/ClientContextManager';
import { CampaignManager } from './components/CampaignManager';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { CommandPalette } from './components/CommandPalette';
import { APP_VERSION, RELEASE_HISTORY } from './version';

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

  // Navegação Principal (Padrão: Analytics no estilo Apex)
  const [currentView, setCurrentView] = useState<'analytics' | 'clients' | 'campaigns' | 'warroom' | 'agents' | 'specialists' | 'ai' | 'users' | 'audit'>('analytics');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Estados de Auth
  const [isRegistering, setIsRegistering] = useState(false);
  const [agencyName, setAgencyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Atalho global Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const handleViewChange = (view: typeof currentView) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    setTenant(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    setMobileMenuOpen(false);
  };

  const navigationGroups = [
    {
      title: 'VISÃO GERAL',
      items: [
        { id: 'analytics', label: 'Painel & Métricas', icon: BarChart3, badge: 'Tempo Real' },
        { id: 'clients', label: 'Empresas & Clientes', icon: Building2 },
        { id: 'campaigns', label: 'Campanhas & Estratégias', icon: FolderKanban },
      ]
    },
    {
      title: 'INTELIGÊNCIA ARTIFICIAL',
      items: [
        { id: 'warroom', label: 'Mesa Redonda Multi-IA', icon: MessageSquare, badge: 'Multi-Agentes' },
        { id: 'agents', label: 'Agentes WhatsApp', icon: Radio },
        { id: 'specialists', label: 'Equipe de Especialistas', icon: Sparkles },
      ]
    },
    ...(user?.role === 'AGENCY_ADMIN' ? [
      {
        title: 'GOVERNANÇA & SISTEMA',
        items: [
          { id: 'ai', label: 'Provedores de IA', icon: Bot },
          { id: 'users', label: 'Gestão de Usuários', icon: Users },
          { id: 'audit', label: 'Auditoria de Eventos', icon: ShieldCheck },
        ]
      }
    ] : [])
  ];

  // Tela de Login/Registro Estilo Shadcn UI Dark
  if (!token || !user || !tenant) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-zinc-950 p-4 selection:bg-indigo-500/30">
        {/* Background glow accents */}
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-2xl shadow-black/80 backdrop-blur-xl">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/15 to-violet-600/15 text-indigo-400 shadow-lg shadow-indigo-500/10 mb-3">
              <Bot className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Gestor IA SaaS</h1>
            <p className="text-xs text-zinc-400 mt-1">Plataforma Multi-Tenant de Inteligência Artificial para Agências</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering && (
              <>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Nome da Agência / Empresa</label>
                  <input
                    type="text"
                    required
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="shadcn-input"
                    placeholder="Ex: Agência Nexus Marketing"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Seu Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="shadcn-input"
                    placeholder="Ex: Carlos Silva"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Email Profissional</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="shadcn-input"
                placeholder="seu.email@agencia.com.br"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Senha de Acesso</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="shadcn-input"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            {authError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-50 cursor-pointer"
            >
              {authLoading ? 'Processando autenticação...' : isRegistering ? 'Criar Conta da Agência' : 'Acessar Workspace'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setAuthError('');
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              {isRegistering ? 'Já possui conta? Faça login' : 'Não tem conta? Cadastre sua agência'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Título e Ícone da view atual para o Breadcrumb
  const currentItem = navigationGroups.flatMap(g => g.items).find(i => i.id === currentView);
  const CurrentIcon = currentItem?.icon || BarChart3;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex overflow-hidden selection:bg-indigo-500/30">
      {/* Command Palette Global Modal (Ctrl+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectView={handleViewChange}
        onOpenReleases={() => setReleaseModalOpen(true)}
        onLogout={handleLogout}
        userRole={user?.role}
      />

      {/* =========================================================================
          SIDEBAR LATERAL ESQUERDA (ESTILO APEX / SHADCN UI)
          ========================================================================= */}
      <aside 
        className={`hidden md:flex flex-col border-r border-zinc-800/80 bg-zinc-950 transition-all duration-300 z-30 shrink-0 select-none ${
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {/* Workspace Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
              <Bot className="h-5 w-5" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1 truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-white tracking-tight truncate">Gestor IA</span>
                  <span className="rounded-full bg-indigo-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-indigo-300 border border-indigo-500/20">
                    SaaS
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate">{tenant?.name}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
            title={sidebarCollapsed ? 'Expandir Menu' : 'Colapsar Menu'}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navigationGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {!sidebarCollapsed ? (
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  {group.title}
                </p>
              ) : (
                <div className="h-px bg-zinc-800/60 my-2 mx-2" />
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleViewChange(item.id as typeof currentView)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200 group cursor-pointer ${
                      isActive
                        ? 'bg-zinc-900 text-white border border-zinc-700/80 shadow-sm shadow-black/40'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60'
                    } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? 'text-indigo-400' : 'text-zinc-400 group-hover:text-zinc-200'
                    }`} />

                    {!sidebarCollapsed && (
                      <div className="flex flex-1 items-center justify-between min-w-0">
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold border ${
                            item.badge === 'Live'
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer / User Profile Card */}
        <div className="border-t border-zinc-800/80 p-3 bg-zinc-950/80">
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 text-[11px] font-bold text-indigo-300">
                  {user?.name?.slice(0, 2).toUpperCase() || 'US'}
                </div>
                <div className="min-w-0 truncate">
                  <p className="text-xs font-medium text-zinc-200 truncate">{user?.name}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                title="Encerrar Sessão"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleLogout}
                className="h-9 w-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 transition"
                title="Encerrar Sessão"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* =========================================================================
          CONTEÚDO PRINCIPAL (HEADER SUPERIOR + VIEW ATIVA)
          ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Topbar Superior Estilo Apex / Shadcn */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-4 sm:px-6 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-200"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumb / Title */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500 font-medium hidden sm:inline">Gestor IA</span>
              <span className="text-zinc-600 hidden sm:inline">/</span>
              <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
                <CurrentIcon className="h-4 w-4 text-indigo-400" />
                <span>{currentItem?.label || 'Visão Geral'}</span>
              </div>
            </div>
          </div>

          {/* Center / Search Quick Command (Ctrl+K) */}
          <div className="hidden lg:flex items-center max-w-sm w-full mx-4">
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-1.5 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 transition shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-zinc-500" />
                <span>Buscar telas, comandos ou agentes...</span>
              </div>
              <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 border border-zinc-700">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Action Icons & Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Search on Mobile */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300"
              title="Buscar (Ctrl+K)"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* System Version Changelog Pill */}
            <button
              type="button"
              onClick={() => setReleaseModalOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-2.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition cursor-pointer"
              title="Ver notas de versão"
            >
              <History className="h-3.5 w-3.5" />
              <span>v{APP_VERSION}</span>
            </button>

            {/* Tenant Status Indicator */}
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium text-zinc-300 truncate max-w-[120px]">{tenant?.name}</span>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
            />
            <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-zinc-800 bg-zinc-950 p-4 shadow-2xl md:hidden flex flex-col">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Gestor IA</p>
                    <p className="text-[11px] text-zinc-400">{tenant?.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-white bg-zinc-900"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-6">
                {navigationGroups.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      {group.title}
                    </p>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentView === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleViewChange(item.id as typeof currentView)}
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                            isActive
                              ? 'bg-zinc-900 text-white border border-zinc-700 font-semibold'
                              : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`} />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold border border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-800 pt-3">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair da Conta</span>
                </button>
              </div>
            </aside>
          </>
        )}

        {/* Release Notes Modal */}
        {releaseModalOpen && (
          <>
            <button
              type="button"
              onClick={() => setReleaseModalOpen(false)}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            />
            <section
              role="dialog"
              className="fixed left-1/2 top-1/2 z-[60] w-[min(92vw,42rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-indigo-400" />
                    <h2 className="text-sm font-semibold text-zinc-100">Atualizações do Sistema</h2>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500">Versão Atual: v{APP_VERSION}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReleaseModalOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-zinc-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-[70vh] space-y-3 overflow-y-auto p-5">
                {RELEASE_HISTORY.map((release) => (
                  <article key={release.version} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-semibold text-zinc-100">{release.title}</span>
                        {release.version === APP_VERSION && (
                          <span className="ml-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                            Atual
                          </span>
                        )}
                      </div>
                      <div className="text-right text-[10px] text-zinc-500">
                        <div className="font-mono text-indigo-300">v{release.version}</div>
                        <div>{release.date}</div>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {release.changes.map((change) => (
                        <li key={change} className="flex gap-2 text-xs text-zinc-400">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {/* =========================================================================
            ÁREA PRINCIPAL DE CONTEÚDO
            ========================================================================= */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentView === 'analytics' ? (
            <AnalyticsDashboard jwtToken={token} />
          ) : currentView === 'clients' ? (
            <ClientContextManager jwtToken={token} />
          ) : currentView === 'campaigns' ? (
            <CampaignManager jwtToken={token} />
          ) : currentView === 'warroom' ? (
            <WarRoomChat jwtToken={token} />
          ) : currentView === 'agents' ? (
            <AgentsDashboard jwtToken={token} />
          ) : currentView === 'specialists' ? (
            <SpecialistManager jwtToken={token} />
          ) : currentView === 'ai' && user?.role === 'AGENCY_ADMIN' ? (
            <AIProvidersSettings jwtToken={token} />
          ) : currentView === 'users' && user?.role === 'AGENCY_ADMIN' ? (
            <UserManagement jwtToken={token} />
          ) : currentView === 'audit' && user?.role === 'AGENCY_ADMIN' ? (
            <AuditLogViewer jwtToken={token} />
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-sm text-zinc-400">
              Esta seção está disponível apenas para administradores da agência.
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-800/60 py-4 px-6 text-center text-xs text-zinc-500">
          Gestor IA SaaS &bull; Plataforma Multi-Tenant com RAG Qdrant, Evolution API e War Room Multi-Agente
        </footer>
      </div>
    </div>
  );
};
