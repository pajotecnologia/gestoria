import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  Bot, 
  Building2, 
  FolderKanban, 
  History, 
  LogOut, 
  MessageSquare, 
  Radio, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  Users, 
  X,
  LucideIcon
} from 'lucide-react';

interface PaletteAction {
  id: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  view?: string;
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
  onLogout: () => void;
  userRole?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectView,
  onOpenReleases,
  onLogout,
  userRole
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const items: PaletteCategory[] = [
    {
      category: 'Navegação Principal',
      actions: [
        { id: 'analytics', label: 'Painel & Métricas', desc: 'Métricas, KPIs e evolução operacional em tempo real', icon: BarChart3, view: 'analytics' },
        { id: 'clients', label: 'Empresas & Clientes', desc: 'Gestão de empresas e base de conhecimento RAG', icon: Building2, view: 'clients' },
        { id: 'campaigns', label: 'Campanhas & Estratégias', desc: 'Ciclo de vida e briefings de campanhas', icon: FolderKanban, view: 'campaigns' },
      ]
    },
    {
      category: 'Inteligência Artificial & Especialistas',
      actions: [
        { id: 'warroom', label: 'Mesa Redonda Multi-IA', desc: 'Brainstorming e debate multi-agente em tempo real', icon: MessageSquare, view: 'warroom' },
        { id: 'agents', label: 'Agentes WhatsApp', desc: 'Gatilhos Evolution API e automações de atendimento', icon: Radio, view: 'agents' },
        { id: 'specialists', label: 'Equipe de Especialistas', desc: 'Personas, diretrizes e tom de voz dos agentes', icon: Sparkles, view: 'specialists' },
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
      category: 'Sistema',
      actions: [
        { id: 'releases', label: 'Notas de Atualização', desc: 'Ver novidades e melhorias da versão atual', icon: History, custom: onOpenReleases },
        { id: 'logout', label: 'Encerrar Sessão', desc: 'Sair da conta da agência', icon: LogOut, custom: onLogout },
      ]
    }
  ];

  const filtered = items.map(cat => ({
    ...cat,
    actions: cat.actions.filter(a => 
      a.label.toLowerCase().includes(query.toLowerCase()) || 
      a.desc.toLowerCase().includes(query.toLowerCase())
    )
  })).filter(cat => cat.actions.length > 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-16 sm:pt-24 bg-black/70 backdrop-blur-md animate-in fade-in duration-150" onClick={onClose}>
      <div 
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/80 ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-zinc-800 px-4 py-3 bg-zinc-900/50">
          <Search className="h-5 w-5 text-zinc-400 mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar telas, comandos, especialistas ou ações..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400 border border-zinc-700">
            ESC
          </kbd>
          <button 
            onClick={onClose}
            className="sm:hidden ml-2 text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-4">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              Nenhum comando ou tela encontrado para "{query}".
            </div>
          ) : (
            filtered.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {cat.category}
                </p>
                {cat.actions.map((act) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={act.id}
                      onClick={() => {
                        if (act.custom) {
                          act.custom();
                        } else if (act.view) {
                          onSelectView(act.view);
                        }
                        onClose();
                      }}
                      className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition-colors hover:bg-zinc-800/80 group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-indigo-400 group-hover:border-indigo-500/30 group-hover:bg-indigo-500/10 transition-colors">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-200 group-hover:text-white">{act.label}</p>
                          <p className="text-[11px] text-zinc-500 line-clamp-1">{act.desc}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400">Ir ↵</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-zinc-800/80 bg-zinc-900/30 px-4 py-2 text-[10px] text-zinc-500">
          <div className="flex items-center gap-2">
            <span>Navegação Rápida</span>
            <span>•</span>
            <span>Gestor IA SaaS</span>
          </div>
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">↑↓</kbd> navegar</span>
            <span><kbd className="font-mono bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">↵</kbd> selecionar</span>
          </div>
        </div>
      </div>
    </div>
  );
};
