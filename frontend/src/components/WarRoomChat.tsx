import React, { useState, useEffect, useRef } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { apiUrl } from '../api/client';

interface Room {
  id: string;
  title: string;
  topic: string;
  targetAudience?: string;
  objective?: string;
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

import { Specialist } from './SpecialistManager';

export const WarRoomChat: React.FC<WarRoomChatProps> = ({ jwtToken }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomsPagination, setRoomsPagination] = useState<Pagination>({ page: 1, pageSize: 50, total: 0, totalPages: 0 });
  const [roomError, setRoomError] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isDebating, setIsDebating] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [generatingMessageId, setGeneratingMessageId] = useState<string | null>(null);
  const [callingRole, setCallingRole] = useState<string | null>(null);

  // Modal de Criação de Nova Sala
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newAudience, setNewAudience] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const fetchRooms = async (page = 1) => {
    setLoadingRooms(true);
    setRoomError('');
    try {
      const res = await fetch(apiUrl(`/api/rooms?page=${page}&pageSize=50`), {
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setRooms(data.data);
        if (data.pagination) setRoomsPagination(data.pagination);
        if (data.data.length > 0 && !selectedRoom) {
          loadRoom(data.data[0]);
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
        setMessages(data.data.messages || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
      setTimeout(scrollToBottom, 100);
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
          objective: newObjective
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsCreatingRoom(false);
        setNewTitle('');
        setNewTopic('');
        setNewAudience('');
        setNewObjective('');
        await fetchRooms();
        loadRoom(data.data);
      }
    } catch (err) {
      console.error(err);
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
        await fetchRooms();
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
    fetchRooms();
    fetchSpecialists();
  }, [jwtToken]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[82vh]">
      {/* Top Header */}
      <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-2xl shadow-lg shadow-indigo-600/30">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Mesa Redonda de Agentes Especialistas (War Room)</span>
              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                Multi-Agent Squad
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Estrategista, Copywriter, Designer, Roteirista de Vídeo e Gestora de Tráfego criando juntos.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {selectedRoom && (
            <>
              <button
                type="button"
                onClick={handleExportPlan}
                className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Exportar Plano (.md)</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleDeleteRoom(selectedRoom.id, selectedRoom.title, e)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium rounded-xl border border-rose-500/30 transition"
                title="Excluir este projeto"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Excluir Projeto</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsCreatingRoom(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Sala de Projeto</span>
          </button>
        </div>
      </div>

      {/* Seletor de salas para mobile */}
      <div className="md:hidden border-b border-slate-800 bg-slate-950/80 p-3 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {rooms.map((room) => (
            <div key={room.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => loadRoom(room)}
                className={`px-3 py-2 rounded-xl border text-left max-w-56 ${
                  selectedRoom?.id === room.id
                    ? 'bg-indigo-600/15 border-indigo-500/40 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <p className="text-xs font-semibold truncate">{room.title}</p>
                <p className="text-[10px] text-slate-500 truncate">{room.topic}</p>
              </button>
              <button
                type="button"
                onClick={(e) => handleDeleteRoom(room.id, room.title, e)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-rose-400 hover:bg-rose-500/20 transition"
                title="Excluir projeto"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        {/* Sidebar Esquerda: Lista de Salas */}
        <div className="w-72 shrink-0 bg-slate-950/60 border-r border-slate-800 p-4 flex flex-col justify-between hidden md:flex">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Projetos & Campanhas
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                {rooms.length}
              </span>
            </div>

            {roomError && (
              <div className="mb-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-2 text-[10px] text-rose-300">
                {roomError}
              </div>
            )}
            <div className="space-y-1.5 overflow-y-auto max-h-[60vh] pr-1">
              {loadingRooms ? (
                <div className="text-xs text-slate-500 p-3">Carregando salas...</div>
              ) : rooms.length === 0 ? (
                <div className="text-xs text-slate-500 p-3 text-center">Nenhum projeto ativo.</div>
              ) : (
                rooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => loadRoom(room)}
                    className={`group w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      selectedRoom?.id === room.id
                        ? 'bg-indigo-600/15 border-indigo-500/40 text-white'
                        : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-start space-x-2.5 min-w-0 flex-1 pr-2">
                      <MessageSquare className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-white truncate">{room.title}</p>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{room.topic}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteRoom(room.id, room.title, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                      title="Excluir projeto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
            {roomsPagination.totalPages > 1 && (
              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={roomsPagination.page <= 1 || loadingRooms}
                  onClick={() => fetchRooms(roomsPagination.page - 1)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-[10px] text-slate-300 disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-[10px] text-slate-500">
                  {roomsPagination.page}/{roomsPagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={roomsPagination.page >= roomsPagination.totalPages || loadingRooms}
                  onClick={() => fetchRooms(roomsPagination.page + 1)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-[10px] text-slate-300 disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>

          {/* Squad Roster */}
          <div className="bg-slate-900/80 border border-slate-800/80 p-3 rounded-2xl space-y-2">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Squad de Especialistas Convocados
            </span>
            {/* Lista dos Especialistas na Sidebar */}
            <div className="space-y-1.5 text-[11px] max-h-48 overflow-y-auto pr-1">
              {specialists.length === 0 ? (
                <>
                  <div className="flex items-center space-x-2 text-blue-400">
                    <BrainCircuit className="w-3.5 h-3.5" />
                    <span>Dr. Arthur (Estratégia)</span>
                  </div>
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Camila Rocha (Copywriting)</span>
                  </div>
                  <div className="flex items-center space-x-2 text-purple-400">
                    <Palette className="w-3.5 h-3.5" />
                    <span>Lucas Viana (Design & Arte)</span>
                  </div>
                  <div className="flex items-center space-x-2 text-amber-400">
                    <Video className="w-3.5 h-3.5" />
                    <span>Gabriel Sato (Roteiro de Vídeos)</span>
                  </div>
                  <div className="flex items-center space-x-2 text-cyan-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Renata Dias (Tráfego Pago)</span>
                  </div>
                </>
              ) : (
                specialists.map((spec) => {
                  const display = getSpecialistDisplay(spec);
                  return (
                    <div
                      key={spec.roleKey}
                      onClick={() => handleTriggerDebateRound(spec.roleKey)}
                      className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800/80 cursor-pointer transition text-slate-300 hover:text-white"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="truncate">{spec.name}</span>
                      </div>
                      <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
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
        <div className="flex-1 flex flex-col min-w-0 bg-slate-900/30">
          {/* Barra de Ações Rápidas do Squad */}
          <div className="px-4 sm:px-6 py-2.5 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center flex-wrap gap-1.5 min-w-0 flex-1 py-0.5">
              <span className="text-slate-400 text-[11px] font-medium mr-1 shrink-0">Chamar Especialista:</span>
              {specialists.length === 0 ? (
                <>
                  <button
                    type="button"
                    disabled={isDebating}
                    onClick={() => handleTriggerDebateRound('STRATEGIST')}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      callingRole === 'STRATEGIST'
                        ? 'bg-blue-600 text-white border-blue-400 shadow-md animate-pulse'
                        : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }`}
                  >
                    {callingRole === 'STRATEGIST' && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>@Dr. Arthur (Estrategista)</span>
                  </button>
                  <button
                    type="button"
                    disabled={isDebating}
                    onClick={() => handleTriggerDebateRound('COPYWRITER')}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      callingRole === 'COPYWRITER'
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-md animate-pulse'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {callingRole === 'COPYWRITER' && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>@Camila (Copywriter)</span>
                  </button>
                  <button
                    type="button"
                    disabled={isDebating}
                    onClick={() => handleTriggerDebateRound('DESIGNER')}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      callingRole === 'DESIGNER'
                        ? 'bg-purple-600 text-white border-purple-400 shadow-md animate-pulse'
                        : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/30'
                    }`}
                  >
                    {callingRole === 'DESIGNER' && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>@Lucas (Designer)</span>
                  </button>
                  <button
                    type="button"
                    disabled={isDebating}
                    onClick={() => handleTriggerDebateRound('VIDEOMAKER')}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      callingRole === 'VIDEOMAKER'
                        ? 'bg-amber-600 text-white border-amber-400 shadow-md animate-pulse'
                        : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {callingRole === 'VIDEOMAKER' && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>@Gabriel (Roteirista)</span>
                  </button>
                  <button
                    type="button"
                    disabled={isDebating}
                    onClick={() => handleTriggerDebateRound('TRAFFIC_MANAGER')}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      callingRole === 'TRAFFIC_MANAGER'
                        ? 'bg-cyan-600 text-white border-cyan-400 shadow-md animate-pulse'
                        : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                    }`}
                  >
                    {callingRole === 'TRAFFIC_MANAGER' && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>@Renata (Tráfego)</span>
                  </button>
                </>
              ) : (
                specialists.map((spec) => {
                  const display = getSpecialistDisplay(spec);
                  const isCurrent = callingRole === spec.roleKey;
                  return (
                    <button
                      key={spec.roleKey}
                      type="button"
                      disabled={isDebating}
                      onClick={() => handleTriggerDebateRound(spec.roleKey)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        isCurrent
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md animate-pulse'
                          : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white border-indigo-500/30'
                      }`}
                      title={spec.title}
                    >
                      {isCurrent && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>{display.buttonLabel}</span>
                    </button>
                  );
                })
              )}
            </div>

            <button
              type="button"
              disabled={isDebating || !selectedRoom}
              onClick={() => handleTriggerDebateRound()}
              className="shrink-0 flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition whitespace-nowrap"
            >
              {isDebating && !callingRole ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Squad em Reunião...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Iniciar Rodada Completa do Squad</span>
                </>
              )}
            </button>
          </div>

          {/* Feed de Mensagens */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {loadingMessages ? (
              <div className="text-center py-20 text-slate-500 text-xs">Carregando reunião...</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-20 text-slate-500 text-xs">
                Inicie a reunião clicando em <b>"Iniciar Rodada Completa do Squad"</b> ou envie uma mensagem abaixo.
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
                    className={`flex items-start space-x-3.5 ${isHuman ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isHuman && (
                      <div className={`w-9 h-9 rounded-2xl bg-gradient-to-tr ${badge.gradient} flex items-center justify-center text-white shadow-lg shrink-0 mt-0.5`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                    )}

                    <div className={`max-w-2xl rounded-2xl p-4 border shadow-xl ${
                      isHuman
                        ? 'bg-indigo-600 text-white border-indigo-500/50 rounded-tr-sm'
                        : 'bg-slate-950/90 text-slate-200 border-slate-800 rounded-tl-sm'
                    }`}>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white">{msg.senderName}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badge.textColor} ${badge.borderColor} bg-slate-900/50`}>
                            {badge.label}
                          </span>
                        </div>
                        <span className="text-[10px] opacity-60">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Conteúdo em Texto */}
                      <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans">
                        {msg.content}
                      </div>

                      {/* Botão de Gerar Imagem Sob Demanda se o Especialista sugeriu um Prompt */}
                      {!msg.imageUrl && hasPrompt && !isHuman && (
                        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                          <span className="text-[11px] text-purple-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                            <span>Prompt visual detectado nesta sugestão</span>
                          </span>
                          <button
                            type="button"
                            disabled={isGeneratingThis}
                            onClick={() => handleGenerateImageForMessage(msg.id, extractPrompt(msg.content))}
                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white text-[11px] font-semibold rounded-xl shadow-md transition cursor-pointer"
                          >
                            {isGeneratingThis ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Renderizando Arte...</span>
                              </>
                            ) : (
                              <>
                                <Palette className="w-3.5 h-3.5" />
                                <span>🎨 Gerar Imagem Agora</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Exibição da Imagem Gerada com Botão de Download */}
                      {msg.imageUrl && (
                        <div className="mt-4 p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[11px] font-semibold text-purple-400 flex items-center space-x-1.5">
                              <ImageIcon className="w-4 h-4 text-pink-400" />
                              <span>Arte Visual Gerada pela IA</span>
                            </span>

                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => handleDownloadImage(msg.imageUrl!, `Arte_Campanha_${msg.id.slice(0, 8)}.jpg`)}
                                className="flex items-center space-x-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-medium transition cursor-pointer shadow"
                                title="Baixar arquivo da imagem diretamente no computador"
                              >
                                <Download className="w-3 h-3" />
                                <span>Baixar Imagem</span>
                              </button>

                              <a
                                href={msg.imageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] transition"
                                title="Ver imagem em tamanho real"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Abrir</span>
                              </a>

                              <button
                                type="button"
                                disabled={isGeneratingThis}
                                onClick={() => handleGenerateImageForMessage(msg.id, extractPrompt(msg.content))}
                                className="p-1 text-slate-400 hover:text-white rounded transition"
                                title="Gerar outra versão desta arte"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingThis ? 'animate-spin text-purple-400' : ''}`} />
                              </button>
                            </div>
                          </div>

                          <div className="relative rounded-xl overflow-hidden border border-slate-800 group">
                            <img
                              src={msg.imageUrl}
                              alt="Arte da Campanha"
                              className="w-full max-h-96 object-contain bg-black/40 rounded-xl"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {isHuman && (
                      <div className="w-9 h-9 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-300 shadow-lg shrink-0 mt-0.5">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input de Mensagem do Gestor */}
          <div className="p-4 bg-slate-950 border-t border-slate-800">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Dê uma instrução para o squad ou faça uma pergunta (Ex: @Designer, crie uma arte minimalista)..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isDebating}
                className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Modal de Criação de Sala */}
      {isCreatingRoom && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 text-slate-100 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Criar Nova Sala de Reunião / Campanha</h3>
            <p className="text-xs text-slate-400 mb-6">
              Defina o briefing inicial para que o squad de especialistas inicie o desenvolvimento.
            </p>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Projeto / Campanha</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Campanha Black Friday - Clínica Lumina"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Briefing / Tópico Principal</label>
                <textarea
                  rows={3}
                  required
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Ex: Lançamento de pacote de harmonização facial com 30% de desconto nos primeiros 50 agendamentos."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Público-Alvo</label>
                  <input
                    type="text"
                    value={newAudience}
                    onChange={(e) => setNewAudience(e.target.value)}
                    placeholder="Ex: Mulheres de 25 a 50 anos"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Objetivo de Conversão</label>
                  <input
                    type="text"
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    placeholder="Ex: Agendamentos no WhatsApp"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingRoom(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition"
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
