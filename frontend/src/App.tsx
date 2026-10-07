import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  Bot, 
  Building2, 
  ChevronLeft, 
  ChevronRight, 
  FileText,
  FolderKanban, 
  HelpCircle,
  History, 
  LogOut, 
  Menu, 
  MessageSquare, 
  Moon,
  Search, 
  ShieldCheck, 
  Sparkles, 
  Sun,
  Users, 
  Wand2,
  X
} from 'lucide-react';

import { useTheme } from './context/ThemeContext';
import { WarRoomChat } from './components/WarRoomChat';
import { SpecialistManager } from './components/SpecialistManager';
import { apiUrl } from './api/client';
import { AIProvidersSettings } from './components/AIProvidersSettings';
import { UserManagement } from './components/UserManagement';
import { AuditLogViewer } from './components/AuditLogViewer';
import { ClientContextManager } from './components/ClientContextManager';
import { CampaignManager } from './components/CampaignManager';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { AdStudio } from './components/AdStudio';
import { ExecutiveReports } from './components/ExecutiveReports';
import { HelpGuideModal } from './components/HelpGuideModal';
import { CommandPalette } from './components/CommandPalette';
import { APP_VERSION, APP_BUILD_TIME, APP_BUILD_DATE, RELEASE_HISTORY } from './version';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog';

export const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

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
  const [currentView, setCurrentView] = useState<'analytics' | 'clients' | 'campaigns' | 'adstudio' | 'reports' | 'warroom' | 'specialists' | 'ai' | 'users' | 'audit'>('analytics');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [warRoomModalOpen, setWarRoomModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  // Estados de Auth
  const [isRegistering, setIsRegistering] = useState(false);
  const [agencyName, setAgencyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Atalhos globais de teclado: Ctrl+K (Busca/Comandos) e Ctrl+M (Mesa Redonda)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K ou Cmd+K para Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Ctrl+M, Cmd+M ou Alt+M para abrir a Mesa Redonda Multi-IA diretamente
      if (((e.metaKey || e.ctrlKey || e.altKey) && e.key.toLowerCase() === 'm')) {
        e.preventDefault();
        setWarRoomModalOpen((prev) => !prev);
        return;
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
    if (view === 'warroom') {
      setWarRoomModalOpen(true);
    } else {
      setCurrentView(view);
    }
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
      title: 'VISÃO GERAL & PERFORMANCE',
      items: [
        { id: 'analytics', label: 'Painel & Métricas', icon: BarChart3, badge: 'Tempo Real' },
        { id: 'campaigns', label: 'Campanhas & Estratégias', icon: FolderKanban },
        { id: 'adstudio', label: 'Ad Creative Studio', icon: Wand2, badge: 'IA' },
        { id: 'reports', label: 'Relatórios Executivos', icon: FileText, badge: 'PDF' },
        { id: 'clients', label: 'Context Hub & Clientes', icon: Building2 },
      ]
    },
    {
      title: 'INTELIGÊNCIA ARTIFICIAL',
      items: [
        { id: 'warroom', label: 'Mesa Redonda Multi-IA', icon: MessageSquare, badge: 'Ctrl+M' },
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

  // Tela de Login/Registro Estilo Apex / Shadcn UI Dark
  if (!token || !user || !tenant) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-zinc-950 p-4 selection:bg-indigo-500/30 overflow-hidden">
        {/* Background glow accents & grid */}
        <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 h-96 w-96 rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

        <div className="relative w-full max-w-md rounded-3xl border border-zinc-800/90 bg-zinc-900/80 p-8 shadow-2xl shadow-black/80 backdrop-blur-2xl">
          {/* Theme Toggle in Login */}
          <div className="absolute right-6 top-6">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-700 transition"
              title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-400" />}
            </button>
          </div>

          {/* Header Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/20 to-violet-600/20 text-indigo-400 shadow-xl shadow-indigo-500/10 mb-3.5">
              <Bot className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Gestor IA SaaS</h1>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              {isRegistering 
                ? 'Cadastre sua agência e monte sua equipe de marketing com inteligência artificial'
                : 'Acesse o workspace da sua agência com IA Generativa e Gestão Estratégica de Tráfego'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Nome da Agência / Empresa</label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      className="shadcn-input pl-10"
                      placeholder="Ex: Agência Nexus Marketing"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Seu Nome Completo</label>
                  <div className="relative">
                    <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="shadcn-input pl-10"
                      placeholder="Ex: Carlos Silva"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Email Profissional</label>
              <div className="relative">
                <Search className="hidden" />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">@</div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="shadcn-input pl-10"
                  placeholder="seu.email@agencia.com.br"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Senha de Acesso</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="shadcn-input pl-10"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 text-white text-xs font-semibold shadow-xl shadow-indigo-500/25 transition-all duration-200 hover:from-indigo-400 hover:to-violet-500 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {authLoading 
                ? 'Processando autenticação...' 
                : isRegistering 
                  ? 'Criar Conta da Agência' 
                  : 'Acessar Workspace'}
            </button>
          </form>

          {/* Toggle between Login and Register */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setAuthError('');
              }}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              {isRegistering ? 'Já possui uma conta? Faça login' : 'Não tem conta? Cadastre sua agência'}
            </button>
          </div>

          {/* Security badge footer */}
          <div className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Ambiente seguro • Criptografia Multi-Tenant</span>
          </div>
        </div>
      </div>
    );
  }

  // Título e Ícone da view atual para o Breadcrumb
  const currentItem = navigationGroups.flatMap(g => g.items).find(i => i.id === currentView);
  const CurrentIcon = currentItem?.icon || BarChart3;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="h-screen w-screen max-w-full bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex overflow-hidden selection:bg-indigo-500/30">
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
            SIDEBAR LATERAL ESQUERDA ANIMADA (FRAMER MOTION + RADIX TOOLTIP)
            ========================================================================= */}
        <motion.aside 
          initial={false}
          animate={{ width: sidebarCollapsed ? 76 : 260 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="hidden md:flex flex-col border-r border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 z-30 shrink-0 select-none overflow-hidden"
        >
          {/* Workspace Brand Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-zinc-800/80 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
                <Bot className="h-5 w-5" />
              </div>
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.div 
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="min-w-0 flex-1 truncate"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight truncate">Gestor IA</span>
                      <span className="rounded-full bg-indigo-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
                        SaaS
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">{tenant?.name}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900 transition cursor-pointer"
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
                  <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    {group.title}
                  </p>
                ) : (
                  <div className="h-px bg-slate-200 dark:bg-zinc-800/60 my-2 mx-2" />
                )}

                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.id === 'warroom' ? warRoomModalOpen : (currentView === item.id && !warRoomModalOpen);
                  
                  const buttonElement = (
                    <button
                      type="button"
                      onClick={() => handleViewChange(item.id as typeof currentView)}
                      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200 group cursor-pointer ${
                        isActive
                          ? 'bg-slate-100 text-slate-900 dark:bg-zinc-900 dark:text-white border border-slate-200 dark:border-zinc-700/80 shadow-xs'
                          : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100/80 dark:hover:bg-zinc-900/60'
                      } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 transition-colors ${
                        isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-400 group-hover:text-slate-700 dark:group-hover:text-zinc-200'
                      }`} />

                      <AnimatePresence>
                        {!sidebarCollapsed && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex flex-1 items-center justify-between min-w-0"
                          >
                            <span className="truncate">{item.label}</span>
                            {item.badge && (
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold border ${
                                item.badge === 'Tempo Real'
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                              }`}>
                                {item.badge}
                              </span>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  );

                  if (sidebarCollapsed) {
                    return (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                          {buttonElement}
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return <React.Fragment key={item.id}>{buttonElement}</React.Fragment>;
                })}
              </div>
            ))}
          </div>

          {/* Sidebar Footer / User Profile Card */}
          <div className="border-t border-slate-200 dark:border-zinc-800/80 p-3 bg-slate-50/80 dark:bg-zinc-950/80 shrink-0">
            {!sidebarCollapsed ? (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 p-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 text-[11px] font-bold text-indigo-600 dark:text-indigo-300">
                    {user?.name?.slice(0, 2).toUpperCase() || 'US'}
                  </div>
                  <div className="min-w-0 truncate">
                    <p className="text-xs font-medium text-slate-900 dark:text-zinc-200 truncate">{user?.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-500 truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 dark:text-zinc-400 dark:hover:text-rose-400 transition cursor-pointer"
                  title="Encerrar Sessão"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="h-9 w-9 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-400 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 transition cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Encerrar Sessão</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </motion.aside>

        {/* =========================================================================
            CONTEÚDO PRINCIPAL (HEADER SUPERIOR + VIEW ATIVA)
            ========================================================================= */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto overflow-x-hidden">
          {/* Topbar Superior Estilo Apex / Shadcn */}
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/80 px-4 sm:px-6 backdrop-blur-xl shrink-0">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Mobile Menu Toggle Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 cursor-pointer"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Breadcrumb / Title */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 dark:text-zinc-500 font-medium hidden sm:inline">Gestor IA</span>
                <span className="text-slate-300 dark:text-zinc-600 hidden sm:inline">/</span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-zinc-200">
                  <CurrentIcon className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                  <span>{currentItem?.label || 'Visão Geral'}</span>
                </div>
              </div>
            </div>

            {/* Center / Search Quick Command (Ctrl+K) */}
            <div className="hidden lg:flex items-center max-w-sm w-full mx-4">
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-100/90 px-3.5 py-1.5 text-xs text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-300 transition shadow-sm cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
                  <span>Buscar telas, comandos ou agentes...</span>
                </div>
                <kbd className="rounded bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-500 border border-slate-200 shadow-xs dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700">
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
                className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 shadow-sm cursor-pointer"
                title="Buscar (Ctrl+K)"
              >
                <Search className="h-4 w-4" />
              </button>

              {/* Help & Guide Button (?) */}
              <button
                type="button"
                onClick={() => setHelpModalOpen(true)}
                className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer shadow-xs"
                title="Como Usar o Sistema (Passo a Passo)"
              >
                <HelpCircle className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                <span className="hidden sm:inline">Como Usar</span>
              </button>

              {/* System Version Changelog Pill */}
              <button
                type="button"
                onClick={() => setReleaseModalOpen(true)}
                className="flex flex-col items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20 transition cursor-pointer leading-tight min-w-[58px]"
                title={`Versão ${APP_VERSION} (${APP_BUILD_DATE} às ${APP_BUILD_TIME}) - Clique para ver notas de versão`}
              >
                <div className="flex items-center gap-1 text-[11px] font-bold">
                  <History className="h-3 w-3 text-indigo-500 shrink-0" />
                  <span>v{APP_VERSION}</span>
                </div>
                <span className="text-[9px] font-mono font-medium text-indigo-500/80 dark:text-indigo-400/80">
                  {APP_BUILD_TIME}
                </span>
              </button>

              {/* Theme Toggle Button (Light / Dark) */}
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:text-white dark:hover:border-zinc-700 transition cursor-pointer"
                title={theme === 'dark' ? 'Alternar para Tema Claro' : 'Alternar para Tema Escuro'}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
              </button>

              {/* Tenant Status Indicator */}
              <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs text-slate-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                <span className="font-medium text-slate-800 dark:text-zinc-300 truncate max-w-[120px]">{tenant?.name}</span>
              </div>
            </div>
          </header>

          {/* Mobile Navigation Drawer */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
                />
                <motion.aside 
                  initial={{ x: -280 }}
                  animate={{ x: 0 }}
                  exit={{ x: -280 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-4 shadow-2xl md:hidden flex flex-col"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Gestor IA</p>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400">{tenant?.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-white bg-slate-100 dark:bg-zinc-900 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto py-4 space-y-6">
                    {navigationGroups.map((group) => (
                      <div key={group.title} className="space-y-1">
                        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                          {group.title}
                        </p>
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = item.id === 'warroom' ? warRoomModalOpen : (currentView === item.id && !warRoomModalOpen);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleViewChange(item.id as typeof currentView)}
                              className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition cursor-pointer ${
                                isActive
                                  ? 'bg-slate-100 text-slate-900 border border-slate-200 dark:bg-zinc-900 dark:text-white dark:border-zinc-700 font-semibold'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-200'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-400'}`} />
                                <span>{item.label}</span>
                              </div>
                              {item.badge && (
                                <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold border border-indigo-500/30 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
                                  {item.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-200 dark:border-zinc-800 pt-3">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sair da Conta</span>
                    </button>
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* Release Notes Dialog (Radix UI) */}
          <Dialog open={releaseModalOpen} onOpenChange={setReleaseModalOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                  <DialogTitle>Atualizações do Sistema</DialogTitle>
                </div>
                <DialogDescription>Versão Atual: v{APP_VERSION} • Atualizado em {APP_BUILD_DATE} às {APP_BUILD_TIME}</DialogDescription>
              </DialogHeader>

              <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                {RELEASE_HISTORY.map((release) => (
                  <article key={release.version} className="rounded-xl border border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{release.title}</span>
                        {release.version === APP_VERSION && (
                          <span className="ml-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Atual
                          </span>
                        )}
                      </div>
                      <div className="text-right text-[10px] text-slate-500 dark:text-zinc-500">
                        <div className="font-mono text-indigo-600 dark:text-indigo-300 font-semibold">v{release.version}</div>
                        <div>{release.date}{release.time ? ` às ${release.time}` : ''}</div>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {release.changes.map((change) => (
                        <li key={change} className="flex gap-2 text-xs text-slate-600 dark:text-zinc-400">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* Guia Passo a Passo do Sistema */}
          <HelpGuideModal
            isOpen={helpModalOpen}
            onClose={() => setHelpModalOpen(false)}
            onNavigateToView={(v) => handleViewChange(v)}
          />

          {/* =========================================================================
              ÁREA PRINCIPAL DE CONTEÚDO ANIMADA (FRAMER MOTION)
              ========================================================================= */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {currentView === 'analytics' ? (
                  <AnalyticsDashboard jwtToken={token} />
                ) : currentView === 'clients' ? (
                  <ClientContextManager jwtToken={token} />
                ) : currentView === 'campaigns' ? (
                  <CampaignManager jwtToken={token} />
                ) : currentView === 'adstudio' ? (
                  <AdStudio jwtToken={token} />
                ) : currentView === 'reports' ? (
                  <ExecutiveReports jwtToken={token} />
                ) : currentView === 'warroom' ? (
                  <WarRoomChat jwtToken={token} />
                ) : currentView === 'specialists' ? (
                  <SpecialistManager jwtToken={token} />
                ) : currentView === 'ai' && user?.role === 'AGENCY_ADMIN' ? (
                  <AIProvidersSettings jwtToken={token} />
                ) : currentView === 'users' && user?.role === 'AGENCY_ADMIN' ? (
                  <UserManagement jwtToken={token} />
                ) : currentView === 'audit' && user?.role === 'AGENCY_ADMIN' ? (
                  <AuditLogViewer jwtToken={token} />
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60 p-6 text-sm text-slate-600 dark:text-zinc-400">
                    Esta seção está disponível apenas para administradores da agência.
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-200/80 dark:border-zinc-800/60 py-4 px-6 text-center text-xs text-slate-400 dark:text-zinc-500">
            Gestor IA SaaS &bull; Plataforma de Inteligência de Marketing, Ad Creative Studio & Performance de Mídia Paga
          </footer>
        </div>

        {/* =========================================================================
            MODAL EM TELA CHEIA - MESA REDONDA MULTI-IA
            ========================================================================= */}
        <AnimatePresence>
          {warRoomModalOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col p-2 sm:p-4"
            >
              <div className="w-full h-full rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden flex flex-col">
                <WarRoomChat
                  jwtToken={token}
                  isModal={true}
                  onClose={() => setWarRoomModalOpen(false)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Command Palette (Ctrl+K) */}
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          onSelectView={(v) => handleViewChange(v)}
          onOpenReleases={() => setReleaseModalOpen(true)}
          onOpenHelp={() => setHelpModalOpen(true)}
          onLogout={handleLogout}
          userRole={user?.role}
        />
      </div>
    </TooltipProvider>
  );
};
