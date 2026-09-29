import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  Bot, 
  Building2, 
  FolderKanban, 
  History, 
  LogOut, 
  MessageSquare, 
  Moon, 
  Radio, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  Sun, 
  Users, 
  Wand2,
  X,
  LucideIcon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface PaletteAction {
  id: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  view?: string;
  shortcut?: string;
  custom?: () => void;
}

interface PaletteCategory {
  category: string;
  actions: PaletteAction[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView: (view: any) => void;
  onOpenReleases: () => void;
  onOpenHelp?: () => void;
  onLogout: () => void;
  userRole?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectView,
  onOpenReleases,
  onOpenHelp,
  onLogout,
  userRole
}) => {
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items: PaletteCategory[] = [
    {
      category: 'Navegação Principal & Performance',
      actions: [
        { id: 'analytics', label: 'Painel & Métricas', desc: 'Métricas, KPIs, Benchmarking e evolução operacional em tempo real', icon: BarChart3, view: 'analytics' },
        { id: 'campaigns', label: 'Campanhas & Estratégias', desc: 'Ciclo de vida, briefings e estratégias compiladas de campanhas', icon: FolderKanban, view: 'campaigns' },
        { id: 'adstudio', label: 'Ad Creative Studio', desc: 'Gerador de Hooks, Copies (AIDA/PAS), Roteiros e Imagens de Anúncios com IA', icon: Wand2, view: 'adstudio' },
        { id: 'clients', label: 'Context Hub & Clientes', desc: 'Gestão de empresas e base de conhecimento contextual RAG', icon: Building2, view: 'clients' },
      ]
    },
    {
      category: 'Inteligência Artificial & Especialistas',
      actions: [
        { id: 'warroom', label: 'Mesa Redonda Multi-IA', desc: 'Brainstorming e debate multi-agente em tela cheia', icon: MessageSquare, view: 'warroom', shortcut: 'Ctrl+M' },
        { id: 'specialists', label: 'Equipe de Especialistas', desc: 'Personas, diretrizes e tom de voz dos agentes', icon: Sparkles, view: 'specialists' },
        { id: 'agents', label: 'Canais WhatsApp', desc: 'Gatilhos Evolution API e automações de atendimento', icon: Radio, view: 'agents' },
      ]
    },
    ...(userRole === 'AGENCY_ADMIN' ? [
      {
        category: 'Configurações da Agência (Administrador)',
        actions: [
          { id: 'ai', label: 'Provedores de IA', desc: 'Configurar chaves OpenAI, Anthropic, Gemini, Groq, DeepSeek', icon: Bot, view: 'ai' },
          { id: 'users', label: 'Gestão de Usuários', desc: 'Membros da equipe, colaboradores e permissões', icon: Users, view: 'users' },
          { id: 'audit', label: 'Auditoria de Eventos', desc: 'Rastreabilidade e logs de ações de segurança', icon: ShieldCheck, view: 'audit' },
        ]
      }
    ] : []),
    {
      category: 'Sistema & Ajuda',
      actions: [
        ...(onOpenHelp ? [{ id: 'help', label: 'Guia do Gestor IA (Passo a Passo)', desc: 'Aprenda o fluxo ideal de criação de campanhas e análise de métricas', icon: Sparkles, custom: onOpenHelp }] : []),
        { 
          id: 'theme', 
          label: theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro', 
          desc: 'Alternar entre visual escuro moderno e visual claro limpo', 
          icon: theme === 'dark' ? Sun : Moon, 
          custom: toggleTheme 
        },
        { id: 'releases', label: 'Notas de Atualização', desc: 'Ver novidades e melhorias da versão atual', icon: History, custom: onOpenReleases },
        { id: 'logout', label: 'Encerrar Sessão', desc: 'Sair da conta da agência', icon: LogOut, custom: onLogout },
      ]
    }
  ];

  const filtered = items.map(cat => ({
    ...cat,
    actions: cat.actions.filter(a => 
      a.label.toLowerCase().includes(query.toLowerCase()) || 
      a.desc.toLowerCase().includes(query.toLowerCase()) ||
      a.id.toLowerCase().includes(query.toLowerCase())
    )
  })).filter(cat => cat.actions.length > 0);

  const flatActions = filtered.flatMap(cat => cat.actions);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeAction = (act: PaletteAction) => {
    if (act.custom) {
      act.custom();
    } else if (act.view) {
      onSelectView(act.view);
    }
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (flatActions.length || 1));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + (flatActions.length || 1)) % (flatActions.length || 1));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (flatActions[selectedIndex]) {
          executeAction(flatActions[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flatActions, selectedIndex, onClose]);

  if (!isOpen) return null;

  let runningIndex = 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-16 sm:pt-24 bg-black/70 backdrop-blur-md animate-in fade-in duration-150" onClick={onClose}>
      <div 
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-2xl shadow-black/80 ring-1 ring-slate-900/5 dark:ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-slate-200 dark:border-zinc-800 px-4 py-3 bg-slate-50/80 dark:bg-zinc-900/50">
          <Search className="h-5 w-5 text-slate-400 dark:text-zinc-400 mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar telas, comandos (ex: Mesa Redonda, Provedores)..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-white dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 shadow-xs">
            ESC
          </kbd>
          <button 
            onClick={onClose}
            className="sm:hidden ml-2 text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-4">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-zinc-500">
              Nenhum comando ou tela encontrado para "{query}".
            </div>
          ) : (
            filtered.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  {cat.category}
                </p>
                {cat.actions.map((act) => {
                  const Icon = act.icon;
                  const itemIndex = runningIndex++;
                  const isSelected = itemIndex === selectedIndex;

                  return (
                    <button
                      key={act.id}
                      onClick={() => executeAction(act)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-500/10 text-indigo-900 dark:bg-zinc-900 dark:text-white border border-indigo-500/30' 
                          : 'hover:bg-slate-100 dark:hover:bg-zinc-900/60 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-100 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400'
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 truncate">
                          <p className="font-semibold text-slate-900 dark:text-zinc-100 truncate">{act.label}</p>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">{act.desc}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {act.shortcut && (
                          <kbd className="rounded bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-zinc-700">
                            {act.shortcut}
                          </kbd>
                        )}
                        <span className="text-[10px] text-slate-400 dark:text-zinc-600">Ir ↵</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-900/30 px-4 py-2 text-[10px] text-slate-500 dark:text-zinc-500">
          <div className="flex items-center gap-2">
            <span>Navegação Rápida</span>
            <span>•</span>
            <span>Atalho Mesa Redonda: <strong className="text-indigo-500">Ctrl+M</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-800">↑↓</kbd> navegar</span>
            <span><kbd className="font-mono bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-800">↵</kbd> selecionar</span>
          </div>
        </div>
      </div>
    </div>
  );
};
