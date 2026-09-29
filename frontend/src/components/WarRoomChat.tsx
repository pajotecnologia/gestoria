import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Users, 
  Send, 
  Sparkles, 
  Plus, 
  Download, 
  User, 
  Palette, 
  PenTool, 
  Video, 
  TrendingUp, 
  BrainCircuit, 
  Loader2,
  Image as ImageIcon,
  MessageSquare,
  Trash2,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
  Building2,
  Megaphone,
  Filter
} from 'lucide-react';
import { apiUrl } from '../api/client';
import { Specialist } from './SpecialistManager';

interface ClientOption {
  id: string;
  name: string;
  segment?: string | null;
  targetAudience?: string | null;
  brandVoice?: string | null;
  productsOffers?: string | null;
  goals?: string | null;
  description?: string | null;
}

interface CampaignOption {
  id: string;
  clientId: string;
  name: string;
  objective: string;
  offer?: string | null;
  audience?: string | null;
  channels?: string | null;
  budget?: string | null;
  period?: string | null;
  brief?: string | null;
  strategy?: string | null;
}

interface Room {
  id: string;
  title: string;
  topic: string;
  targetAudience?: string;
  objective?: string;
  clientId?: string | null;
  campaignId?: string | null;
  client?: { id: string; name: string; segment?: string | null } | null;
  campaign?: { id: string; name: string } | null;
  createdAt: string;
  _count?: { messages: number };
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface RoomMessage {
  id: string;
  senderType: 'USER' | 'AGENT';
  agentRole: 'STRATEGIST' | 'COPYWRITER' | 'DESIGNER' | 'VIDEOMAKER' | 'TRAFFIC_MANAGER' | 'HUMAN' | string;
  senderName: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
}

interface WarRoomChatProps {
  jwtToken: string;
  onClose?: () => void;
  isModal?: boolean;
}

const ROLE_TRANSLATIONS: Record<string, { label: string; shortRole: string; tag: string }> = {
  STRATEGIST: { label: 'Estrategista & CMO', shortRole: 'Estrategista', tag: '@Estrategista' },
  COPYWRITER: { label: 'Copywriter Sênior', shortRole: 'Copywriter', tag: '@Copywriter' },
  DESIGNER: { label: 'Diretor de Arte & Design', shortRole: 'Designer', tag: '@Designer' },
  VIDEOMAKER: { label: 'Roteirista de Vídeos', shortRole: 'Roteirista', tag: '@Roteirista' },
  TRAFFIC_MANAGER: { label: 'Gestora de Tráfego', shortRole: 'Tráfego', tag: '@Tráfego' },
  TAX_ADVISOR: { label: 'Consultor Tributário', shortRole: 'Tributário', tag: '@Tributário' },
  TRIBUTARIO: { label: 'Consultor Tributário', shortRole: 'Tributário', tag: '@Tributário' },
  FULLSTACK_DEV: { label: 'Engenheiro FullStack', shortRole: 'Desenvolvedor', tag: '@Dev' },
  DEV: { label: 'Engenheiro FullStack', shortRole: 'Desenvolvedor', tag: '@Dev' },
  SEO_SPECIALIST: { label: 'Especialista em SEO', shortRole: 'SEO', tag: '@SEO' },
  SEO: { label: 'Especialista em SEO', shortRole: 'SEO', tag: '@SEO' },
};

const getSpecialistDisplay = (spec: { roleKey: string; name: string; title?: string }) => {
  const trans = ROLE_TRANSLATIONS[spec.roleKey];
  const shortRole = trans ? trans.shortRole : (spec.title ? spec.title.split(' ')[0] : spec.roleKey);
  const displayName = spec.name.startsWith('Dr. ') ? spec.name.split(' ').slice(0, 2).join(' ') : spec.name.split(' ')[0];
  const tag = trans ? trans.tag : `@${shortRole}`;
  return { shortRole, displayName, tag, buttonLabel: `@${displayName} (${shortRole})` };
};

const ROLE_BADGES: Record<string, { label: string; tag: string; icon: any; gradient: string; textColor: string; borderColor: string }> = {
  STRATEGIST: {
    label: 'Estrategista & CMO',
    tag: '@Estrategista',
    icon: BrainCircuit,
    gradient: 'from-blue-600 to-indigo-600',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/30'
  },
  COPYWRITER: {
    label: 'Copywriter Sênior',
    tag: '@Copywriter',
    icon: PenTool,
    gradient: 'from-emerald-500 to-teal-600',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30'
  },
  DESIGNER: {
    label: 'Diretor de Arte & Design',
    tag: '@Designer',
    icon: Palette,
    gradient: 'from-purple-600 to-pink-600',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/30'
  },
  VIDEOMAKER: {
    label: 'Roteirista de Vídeos',
    tag: '@Roteirista',
    icon: Video,
    gradient: 'from-amber-500 to-orange-600',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30'
  },
  TRAFFIC_MANAGER: {
    label: 'Gestora de Tráfego',
    tag: '@Tráfego',
    icon: TrendingUp,
    gradient: 'from-cyan-500 to-blue-600',
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/30'
  },
  HUMAN: {
    label: 'Gestor da Agência',
    tag: '@Você',
    icon: User,
    gradient: 'from-slate-700 to-slate-800',
    textColor: 'text-slate-300',
    borderColor: 'border-slate-700'
  }
};

export const WarRoomChat: React.FC<WarRoomChatProps> = ({ jwtToken, onClose, isModal }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomsPagination, setRoomsPagination] = useState<Pagination>({ page: 1, pageSize: 50, total: 0, totalPages: 0 });
  const [roomError, setRoomError] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isDebating, setIsDebating] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [generatingMessageId, setGeneratingMessageId] = useState<string | null>(null);
  const [callingRole, setCallingRole] = useState<string | null>(null);

  // Filtro de empresa na barra lateral
  const [filterClientId, setFilterClientId] = useState<string>('ALL');

  // Modal de Criação de Nova Sala
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newAudience, setNewAudience] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fechar no ESC quando estiver em modo modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSpecialists = async () => {
    try {
      const res = await fetch(apiUrl('/api/specialists'), {
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSpecialists(data.data.filter((s: Specialist) => s.enabled !== false));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClientsAndCampaigns = async () => {
    try {
      const [resClients, resCampaigns] = await Promise.all([
        fetch(apiUrl('/api/clients'), { headers: { Authorization: `Bearer ${jwtToken}` } }),
        fetch(apiUrl('/api/campaigns'), { headers: { Authorization: `Bearer ${jwtToken}` } })
      ]);
      const dataClients = await resClients.json();
      const dataCampaigns = await resCampaigns.json();

      if (dataClients.success && Array.isArray(dataClients.data)) {
        setClients(dataClients.data);
      }
      if (dataCampaigns.success && Array.isArray(dataCampaigns.data)) {
        setCampaigns(dataCampaigns.data);
      }
    } catch (err) {
      console.error('Erro ao carregar clientes e campanhas:', err);
    }
  };

  const fetchRooms = async (page = 1, clientId?: string) => {
    setLoadingRooms(true);
    setRoomError('');
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: '50'
      });
      if (clientId && clientId !== 'ALL') {
        queryParams.set('clientId', clientId);
      }

      const res = await fetch(apiUrl(`/api/rooms?${queryParams.toString()}`), {
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setRooms(data.data);
        if (data.pagination) setRoomsPagination(data.pagination);
        if (data.data.length > 0 && (!selectedRoom || !data.data.some((r: Room) => r.id === selectedRoom.id))) {
          loadRoom(data.data[0]);
        } else if (data.data.length === 0) {
          setSelectedRoom(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRooms(false);
    }
  };

  const loadRoom = async (room: Room) => {
    setSelectedRoom(room);
    setLoadingMessages(true);
    try {
      const res = await fetch(apiUrl(`/api/rooms/${room.id}`), {
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível carregar a sala.');
      }
      if (data.success) {
        setSelectedRoom(data.data);
        setMessages(data.data.messages || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  // Campanhas disponíveis para o cliente selecionado no modal
  const modalAvailableCampaigns = useMemo(() => {
    if (!selectedClientId) return campaigns;
    return campaigns.filter(c => c.clientId === selectedClientId);
  }, [campaigns, selectedClientId]);

  // Handler de seleção de Empresa no Modal de Nova Sala
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedCampaignId('');

    if (clientId) {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        if (!newAudience && client.targetAudience) {
          setNewAudience(client.targetAudience);
        }
        if (!newTitle) {
          setNewTitle(`Planejamento Estratégico - ${client.name}`);
        }
      }
    }
  };

  // Handler de seleção de Campanha no Modal de Nova Sala
  const handleCampaignChange = (campaignId: string) => {
    setSelectedCampaignId(campaignId);

    if (campaignId) {
      const camp = campaigns.find(c => c.id === campaignId);
      if (camp) {
        // Se a empresa ainda não estiver definida, ajusta para a empresa da campanha
        if (!selectedClientId && camp.clientId) {
          setSelectedClientId(camp.clientId);
        }

        const client = clients.find(c => c.id === (camp.clientId || selectedClientId));
        const clientName = client ? client.name : '';

        setNewTitle(`Campanha: ${camp.name}${clientName ? ` (${clientName})` : ''}`);
        if (camp.objective) setNewObjective(camp.objective);
        if (camp.audience) setNewAudience(camp.audience);
        if (camp.brief || camp.offer) {
          setNewTopic(camp.brief || camp.offer || camp.objective);
        }
      }
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newTopic) return;
    setCreateLoading(true);

    try {
      const res = await fetch(apiUrl('/api/rooms'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`
        },
        body: JSON.stringify({
          title: newTitle,
          topic: newTopic,
          targetAudience: newAudience,
          objective: newObjective,
          clientId: selectedClientId || null,
          campaignId: selectedCampaignId || null,
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsCreatingRoom(false);
        setNewTitle('');
        setNewTopic('');
        setNewAudience('');
        setNewObjective('');
        setSelectedClientId('');
        setSelectedCampaignId('');
        await fetchRooms(1, filterClientId);
        loadRoom(data.data);
      } else {
        alert(data.error || 'Erro ao criar sala de reunião.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao criar sala de reunião.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedRoom) return;

    const userText = inputMessage;
    setInputMessage('');

    try {
      const res = await fetch(apiUrl(`/api/rooms/${selectedRoom.id}/message`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ content: userText })
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, data.data]);
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    }
  };

  const handleDeleteRoom = async (roomId: string, roomTitle: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Tem certeza que deseja excluir o projeto "${roomTitle}" e todo o histórico da mesa redonda?`)) return;
    try {
      const res = await fetch(apiUrl(`/api/rooms/${roomId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        if (selectedRoom?.id === roomId) {
          setSelectedRoom(null);
          setMessages([]);
        }
        await fetchRooms(1, filterClientId);
      } else {
        alert(data.error || 'Erro ao excluir projeto.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir projeto.');
    }
  };

  const handleDownloadImage = async (imageUrl: string, filename = 'arte_campanha.jpg') => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(imageUrl, '_blank');
    }
  };

  const handleGenerateImageForMessage = async (messageId: string, promptText: string) => {
    if (!selectedRoom || generatingMessageId) return;
    setGeneratingMessageId(messageId);
    try {
      const res = await fetch(apiUrl(`/api/rooms/${selectedRoom.id}/generate-image`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ prompt: promptText, messageId })
      });
      const data = await res.json();
      if (data.success && data.data?.imageUrl) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, imageUrl: data.data.imageUrl } : m));
      } else {
        alert(data.error || 'Não foi possível gerar a imagem.');
      }
    } catch (err: any) {
      alert(err.message || 'Falha ao gerar imagem.');
    } finally {
      setGeneratingMessageId(null);
    }
  };

  const extractPrompt = (content: string): string => {
    const bracketMatch = content.match(/\[IMAGE_PROMPT:\s*([\s\S]*?)\]/i);
    if (bracketMatch && bracketMatch[1]) return bracketMatch[1].trim();
    const boldMatch = content.match(/\*\*Prompt(?: DALL-E| de Imagem| para o Designer)?:\*\*\s*["']?([\s\S]*?)["']?(?:\n\n|\n[0-9]\.|\n\*|\n#|$)/i);
    if (boldMatch && boldMatch[1]) return boldMatch[1].trim();
    const simpleMatch = content.match(/Prompt:\s*["']?([\s\S]*?)["']?(?:\n\n|\n[0-9]\.|\n\*|\n#|$)/i);
    if (simpleMatch && simpleMatch[1]) return simpleMatch[1].trim();
    return content.slice(0, 300);
  };

  const handleTriggerDebateRound = async (specificRole?: string) => {
    if (!selectedRoom || isDebating) return;
    setIsDebating(true);
    setCallingRole(specificRole || null);

    try {
      const res = await fetch(apiUrl(`/api/rooms/${selectedRoom.id}/debate-round`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ specificRole })
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setMessages(prev => [...prev, ...data.data]);
        setTimeout(scrollToBottom, 200);
      } else {
        alert(data.error || 'Não foi possível convocar o especialista. Verifique os provedores de IA nas configurações.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro de conexão com o servidor ao convocar especialista.');
    } finally {
      setIsDebating(false);
      setCallingRole(null);
    }
  };

  const handleExportPlan = async () => {
    if (!selectedRoom) return;
    try {
      const res = await fetch(apiUrl(`/api/rooms/${selectedRoom.id}/export`), {
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || data?.error || 'Não foi possível exportar o plano.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Plano_Campanha_${selectedRoom.id}.md`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Erro ao exportar plano:', err);
      window.alert(err.message || 'Não foi possível exportar o plano.');
    }
  };

  useEffect(() => {
    fetchRooms(1, filterClientId);
    fetchSpecialists();
    fetchClientsAndCampaigns();
  }, [jwtToken]);

  useEffect(() => {
    fetchRooms(1, filterClientId);
  }, [filterClientId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Renderizador Inteligente de Conteúdo de Mensagem com Destaques
  const renderMessageContent = (text: string) => {
    if (!text) return null;

    // Processar parágrafos e formatações básicas
    const lines = text.split('\n');
    return (
      <div className="space-y-2 text-xs leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1.5" />;

          // Títulos ou seções em destaque
          if (trimmed.startsWith('###') || trimmed.startsWith('##') || (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length < 80)) {
            const cleanTitle = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
            return (
              <div key={idx} className="font-bold text-slate-900 dark:text-white text-xs pt-1.5 pb-0.5 flex items-center gap-1.5 border-b border-slate-200/60 dark:border-zinc-800/60">
                <Sparkles className="h-3 w-3 text-indigo-500" />
                <span>{cleanTitle}</span>
              </div>
            );
          }

          // Itens de Lista com Marcador
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
            const content = trimmed.replace(/^[-*]\s+|\d+\.\s+/, '');
            const formatted = content.split(/(\*\*.*?\*\*)/g).map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={pIdx} className="font-semibold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
              }
              return part;
            });

            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span className="text-slate-700 dark:text-zinc-300">{formatted}</span>
              </div>
            );
          }

          // Texto com Negritos Inline
          const formatted = trimmed.split(/(\*\*.*?\*\*)/g).map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx} className="font-semibold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
            }
            return part;
          });

          return (
            <p key={idx} className="text-slate-700 dark:text-zinc-300">
              {formatted}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`shadcn-card p-0 w-full max-w-full min-w-0 flex flex-col overflow-hidden ${
      isModal ? 'h-full flex-1 border-0 shadow-none rounded-2xl' : 'h-[calc(100vh-140px)] min-h-[640px]'
    }`}>
      {/* Top Header do War Room */}
      <div className="px-5 py-3.5 border-b border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                Mesa Redonda Multi-Agente (War Room)
              </h1>
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                Squad Autônomo
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
              Debate interdisciplinar entre Estrategista, Copywriter, Designer, Roteirista e Tráfego.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedRoom && (
            <>
              <button
                type="button"
                onClick={handleExportPlan}
                className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition cursor-pointer"
                title="Exportar plano da campanha em Markdown"
              >
                <Download className="h-3.5 w-3.5 text-indigo-500" />
                <span className="hidden sm:inline">Exportar (.md)</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleDeleteRoom(selectedRoom.id, selectedRoom.title, e)}
                className="flex h-9 items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 text-xs font-medium text-rose-600 hover:bg-rose-500/20 dark:text-rose-400 transition cursor-pointer"
                title="Excluir este projeto"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Excluir</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsCreatingRoom(true)}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-3.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Sala</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white transition shadow-sm cursor-pointer ml-1"
              title="Fechar Mesa Redonda (ESC)"
            >
              <X className="h-4 w-4 text-rose-500" />
              <span>Fechar</span>
              <kbd className="hidden sm:inline-block ml-1 rounded bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.2 text-[9px] font-mono text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">ESC</kbd>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        {/* Sidebar Esquerda: Projetos & Squad */}
        <div className="w-80 shrink-0 border-r border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/60 p-3.5 flex flex-col justify-between hidden md:flex min-w-0">
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col min-w-0">
            <div className="flex items-center justify-between px-1 shrink-0">
              <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Salas de Reunião
              </span>
              <span className="rounded-full bg-slate-200 dark:bg-zinc-800 px-2 py-0.2 text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                {rooms.length}
              </span>
            </div>

            {/* Filtro por Empresa */}
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-1 text-[11px] font-medium text-slate-600 dark:text-zinc-400">
                <Filter className="h-3 w-3 text-indigo-500" />
                <span>Filtrar por Empresa:</span>
              </div>
              <select
                value={filterClientId}
                onChange={(e) => setFilterClientId(e.target.value)}
                className="shadcn-input text-xs py-1.5 px-2 w-full bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-lg cursor-pointer"
              >
                <option value="ALL">🏢 Todas as Empresas</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.segment ? `(${c.segment})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {roomError && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2 text-[10px] text-rose-600 dark:text-rose-400">
                {roomError}
              </div>
            )}

            <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
              {loadingRooms ? (
                <div className="text-xs text-slate-400 p-3 text-center">Carregando salas...</div>
              ) : rooms.length === 0 ? (
                <div className="text-xs text-slate-400 p-4 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl space-y-2">
                  <p>Nenhuma sala encontrada.</p>
                  <button
                    type="button"
                    onClick={() => setIsCreatingRoom(true)}
                    className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:underline"
                  >
                    + Criar nova reunião
                  </button>
                </div>
              ) : (
                rooms.map((room) => {
                  const isSelected = selectedRoom?.id === room.id;
                  return (
                    <div
                      key={room.id}
                      onClick={() => loadRoom(room)}
                      className={`group w-full text-left p-2.5 rounded-xl border transition-all flex flex-col gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-900 dark:text-white shadow-xs'
                          : 'bg-white dark:bg-zinc-900/60 border-slate-200/80 dark:border-zinc-800/80 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <MessageSquare className={`h-4 w-4 shrink-0 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-500'}`} />
                          <p className={`text-xs font-semibold truncate ${isSelected ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-800 dark:text-zinc-200'}`}>
                            {room.title}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteRoom(room.id, room.title, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition shrink-0 cursor-pointer"
                          title="Excluir projeto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Badges de Empresa & Campanha */}
                      {(room.client || room.campaign) && (
                        <div className="flex items-center flex-wrap gap-1 mt-0.5">
                          {room.client && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-[10px] font-medium text-blue-600 dark:text-blue-400 border border-blue-500/20 max-w-[150px] truncate">
                              <Building2 className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{room.client.name}</span>
                            </span>
                          )}
                          {room.campaign && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 text-[10px] font-medium text-purple-600 dark:text-purple-400 border border-purple-500/20 max-w-[150px] truncate">
                              <Megaphone className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{room.campaign.name}</span>
                            </span>
                          )}
                        </div>
                      )}

                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">{room.topic}</p>
                    </div>
                  );
                })
              )}
            </div>

            {roomsPagination.totalPages > 1 && (
              <div className="pt-2 flex items-center justify-between gap-1 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  disabled={roomsPagination.page <= 1 || loadingRooms}
                  onClick={() => fetchRooms(roomsPagination.page - 1, filterClientId)}
                  className="flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[10px] text-slate-700 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                >
                  <ChevronLeft className="h-3 w-3" />
                  <span>Ant.</span>
                </button>
                <span className="text-[10px] text-slate-400 font-mono">
                  {roomsPagination.page}/{roomsPagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={roomsPagination.page >= roomsPagination.totalPages || loadingRooms}
                  onClick={() => fetchRooms(roomsPagination.page + 1, filterClientId)}
                  className="flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[10px] text-slate-700 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                >
                  <span>Próx.</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Squad Roster */}
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-zinc-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block px-1">
              Especialistas Disponíveis
            </span>
            <div className="space-y-1 text-[11px] max-h-36 overflow-y-auto pr-1">
              {specialists.length === 0 ? (
                <>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/60 text-slate-700 dark:text-zinc-300">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="truncate">Dr. Arthur (Estratégia)</span>
                    </div>
                    <span className="text-[9px] font-mono text-blue-500 font-semibold">@Estrategista</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/60 text-slate-700 dark:text-zinc-300">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="truncate">Camila (Copywriting)</span>
                    </div>
                    <span className="text-[9px] font-mono text-emerald-500 font-semibold">@Copywriter</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/60 text-slate-700 dark:text-zinc-300">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="h-2 w-2 rounded-full bg-purple-500" />
                      <span className="truncate">Lucas (Design & Arte)</span>
                    </div>
                    <span className="text-[9px] font-mono text-purple-500 font-semibold">@Designer</span>
                  </div>
                </>
              ) : (
                specialists.map((spec) => {
                  const display = getSpecialistDisplay(spec);
                  return (
                    <div
                      key={spec.roleKey}
                      onClick={() => handleTriggerDebateRound(spec.roleKey)}
                      className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/60 text-slate-700 dark:text-zinc-300 hover:border-indigo-500/40 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="truncate">{spec.name}</span>
                      </div>
                      <span className="text-[9px] font-mono text-indigo-500 dark:text-indigo-400 font-semibold">
                        {display.tag}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Chat / Feed Principal */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-100/40 dark:bg-zinc-950/40">
          {/* Header Contextual da Sala Selecionada */}
          {selectedRoom && (
            <div className="px-4 py-2 bg-slate-50 dark:bg-zinc-950/90 border-b border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center flex-wrap gap-2 min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {selectedRoom.title}
                </span>

                {selectedRoom.client && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-[11px] font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                    <Building2 className="h-3 w-3" />
                    <span>{selectedRoom.client.name}</span>
                    {selectedRoom.client.segment && (
                      <span className="text-[10px] opacity-75 font-normal">({selectedRoom.client.segment})</span>
                    )}
                  </span>
                )}

                {selectedRoom.campaign && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-[11px] font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                    <Megaphone className="h-3 w-3" />
                    <span>Campanha: {selectedRoom.campaign.name}</span>
                  </span>
                )}

                {selectedRoom.objective && (
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 hidden lg:inline-block truncate max-w-xs">
                    • <b>Objetivo:</b> {selectedRoom.objective}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Barra Superior de Invocação de Agentes */}
          <div className="px-4 py-2.5 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center flex-wrap gap-1.5 min-w-0 flex-1">
              <span className="text-slate-500 dark:text-zinc-400 text-[11px] font-semibold mr-1 shrink-0">
                Chamar Especialista:
              </span>
              {(specialists.length === 0 ? [
                { roleKey: 'STRATEGIST', label: '@Arthur (Estratégia)', color: 'text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10' },
                { roleKey: 'COPYWRITER', label: '@Camila (Copy)', color: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
                { roleKey: 'DESIGNER', label: '@Lucas (Design)', color: 'text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/10' },
                { roleKey: 'VIDEOMAKER', label: '@Gabriel (Vídeo)', color: 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10' },
                { roleKey: 'TRAFFIC_MANAGER', label: '@Renata (Tráfego)', color: 'text-cyan-600 dark:text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
              ] : specialists.map(s => ({
                roleKey: s.roleKey,
                label: getSpecialistDisplay(s).buttonLabel,
                color: 'text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/10'
              }))).map((spec) => {
                const isCurrent = callingRole === spec.roleKey;
                return (
                  <button
                    key={spec.roleKey}
                    type="button"
                    disabled={isDebating}
                    onClick={() => handleTriggerDebateRound(spec.roleKey)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      isCurrent
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm animate-pulse'
                        : `${spec.color} hover:opacity-80`
                    }`}
                  >
                    {isCurrent && <Loader2 className="h-3 w-3 animate-spin" />}
                    <span>{spec.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={isDebating || !selectedRoom}
              onClick={() => handleTriggerDebateRound()}
              className="shrink-0 flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 transition cursor-pointer whitespace-nowrap"
            >
              {isDebating && !callingRole ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Squad Criando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Iniciar Rodada Completa</span>
                </>
              )}
            </button>
          </div>

          {/* Feed de Mensagens do Chat */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
            {loadingMessages ? (
              <div className="text-center py-20 text-slate-400 text-xs">Carregando mensagens da sala...</div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 dark:text-zinc-500">
                <Users className="h-10 w-10 text-indigo-500/40 mb-3" />
                <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">Sala de Reunião Pronta</p>
                <p className="text-xs max-w-sm mt-1">
                  Clique em <b>"Iniciar Rodada Completa"</b> ou envie uma instrução abaixo para convocar o squad.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const badge = ROLE_BADGES[msg.agentRole] || ROLE_BADGES.HUMAN;
                const IconComponent = badge.icon;
                const isHuman = msg.senderType === 'USER';
                const hasPrompt = msg.content.includes('Prompt') || msg.content.includes('IMAGE_PROMPT') || msg.agentRole === 'DESIGNER';
                const isGeneratingThis = generatingMessageId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isHuman ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isHuman && (
                      <div className={`h-9 w-9 rounded-xl bg-gradient-to-tr ${badge.gradient} flex items-center justify-center text-white shadow-md shrink-0 mt-0.5`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                    )}

                    <div className={`max-w-2xl rounded-2xl p-4 border shadow-sm ${
                      isHuman
                        ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/50 rounded-tr-xs'
                        : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-tl-xs'
                    }`}>
                      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-zinc-800/80 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">{msg.senderName}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badge.textColor} ${badge.borderColor} bg-slate-50 dark:bg-zinc-950 font-medium`}>
                            {badge.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Renderizador Formatado e Inteligente */}
                      {renderMessageContent(msg.content)}

                      {/* Botão de Gerar Imagem */}
                      {!msg.imageUrl && hasPrompt && !isHuman && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3">
                          <span className="text-[11px] text-purple-600 dark:text-purple-400 flex items-center gap-1.5 font-medium">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Prompt de arte visual identificado</span>
                          </span>
                          <button
                            type="button"
                            disabled={isGeneratingThis}
                            onClick={() => handleGenerateImageForMessage(msg.id, extractPrompt(msg.content))}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white text-[11px] font-bold rounded-xl shadow-sm transition cursor-pointer"
                          >
                            {isGeneratingThis ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Renderizando Arte...</span>
                              </>
                            ) : (
                              <>
                                <Palette className="h-3.5 w-3.5" />
                                <span>🎨 Gerar Imagem da Campanha</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Exibição da Imagem Gerada */}
                      {msg.imageUrl && (
                        <div className="mt-3.5 p-3 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                              <ImageIcon className="h-4 w-4" />
                              <span>Arte Visual Gerada pela IA</span>
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleDownloadImage(msg.imageUrl!, `Arte_Campanha_${msg.id.slice(0, 8)}.jpg`)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-semibold transition cursor-pointer shadow-xs"
                              >
                                <Download className="h-3 w-3" />
                                <span>Baixar</span>
                              </button>

                              <a
                                href={msg.imageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 px-2 py-1 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 rounded-lg text-[10px] transition"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>Abrir</span>
                              </a>
                            </div>
                          </div>

                          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-black/10">
                            <img
                              src={msg.imageUrl}
                              alt="Arte da Campanha"
                              className="w-full max-h-96 object-contain rounded-xl"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {isHuman && (
                      <div className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300 shadow-sm shrink-0 mt-0.5">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input de Mensagem */}
          <div className="p-3.5 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2.5">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Instrua o squad ou pergunte (Ex: @Designer, elabore um criativo minimalista para feed)..."
                className="shadcn-input flex-1 py-2.5"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isDebating}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-md shadow-indigo-500/20 transition cursor-pointer shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Modal de Criação de Sala */}
      {isCreatingRoom && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 text-slate-900 dark:text-slate-100 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-zinc-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-500" />
                  <span>Nova Sala de Reunião & Campanha</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Selecione a empresa e a campanha para alimentar automaticamente a inteligência dos especialistas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingRoom(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3.5">
              {/* Seleção de Empresa / Cliente */}
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-blue-500" />
                    <span>Empresa / Cliente</span>
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="shadcn-input text-xs py-2 w-full bg-white dark:bg-zinc-900 cursor-pointer"
                  >
                    <option value="">🏢 Geral (Sem Empresa Fixa)</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.segment ? `• ${c.segment}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Seleção de Campanha */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Megaphone className="h-3.5 w-3.5 text-purple-500" />
                    <span>Campanha Vinculada</span>
                  </label>
                  <select
                    value={selectedCampaignId}
                    onChange={(e) => handleCampaignChange(e.target.value)}
                    className="shadcn-input text-xs py-2 w-full bg-white dark:bg-zinc-900 cursor-pointer"
                  >
                    <option value="">🎯 Geral (Nova Ideação / Estratégia)</option>
                    {modalAvailableCampaigns.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedClientId && (
                <div className="rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 p-2.5 text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                  <div>
                    <b>Contexto Integrado:</b> O squad receberá todo o perfil de marca, público e posicionamento da empresa selecionada durante os debates.
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Nome da Sala / Projeto *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Lançamento Coleção Outono - Lumina"
                  className="shadcn-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Briefing / Tópico Principal da Reunião *</label>
                <textarea
                  rows={3}
                  required
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Ex: Campanha de atração com foco em ofertas de 30% no WhatsApp e criativos para feed/reels."
                  className="shadcn-input resize-y"
                />
              </div>

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Público-Alvo Específico</label>
                  <input
                    type="text"
                    value={newAudience}
                    onChange={(e) => setNewAudience(e.target.value)}
                    placeholder="Ex: Mulheres 25-45 anos, classe A/B"
                    className="shadcn-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Objetivo da Reunião</label>
                  <input
                    type="text"
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    placeholder="Ex: Gerar leads qualificados"
                    className="shadcn-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingRoom(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow transition cursor-pointer"
                >
                  {createLoading ? 'Criando...' : 'Iniciar Reunião'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
