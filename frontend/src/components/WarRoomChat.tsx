import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Send, 
  Sparkles, 
  Plus, 
  Download, 
  Bot, 
  User, 
  Palette, 
  PenTool, 
  Video, 
  TrendingUp, 
  BrainCircuit, 
  Loader2,
  Image as ImageIcon,
  MessageSquare
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
  agentRole: 'STRATEGIST' | 'COPYWRITER' | 'DESIGNER' | 'VIDEOMAKER' | 'TRAFFIC_MANAGER' | 'HUMAN';
  senderName: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
}

interface WarRoomChatProps {
  jwtToken: string;
}

const ROLE_BADGES: Record<string, { label: string; icon: any; gradient: string; textColor: string; borderColor: string }> = {
  STRATEGIST: {
    label: 'Estrategista & CMO',
    icon: BrainCircuit,
    gradient: 'from-blue-600 to-indigo-600',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/30'
  },
  COPYWRITER: {
    label: 'Copywriter Sênior',
    icon: PenTool,
    gradient: 'from-emerald-500 to-teal-600',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30'
  },
  DESIGNER: {
    label: 'Diretor de Arte & DALL-E',
    icon: Palette,
    gradient: 'from-purple-600 to-pink-600',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/30'
  },
  VIDEOMAKER: {
    label: 'Roteirista de Vídeos',
    icon: Video,
    gradient: 'from-amber-500 to-orange-600',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30'
  },
  TRAFFIC_MANAGER: {
    label: 'Gestora de Tráfego',
    icon: TrendingUp,
    gradient: 'from-cyan-500 to-blue-600',
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/30'
  },
  HUMAN: {
    label: 'Gestor da Agência',
    icon: User,
    gradient: 'from-slate-700 to-slate-800',
    textColor: 'text-slate-300',
    borderColor: 'border-slate-700'
  }
};

export const WarRoomChat: React.FC<WarRoomChatProps> = ({ jwtToken }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomsPagination, setRoomsPagination] = useState<Pagination>({ page: 1, pageSize: 50, total: 0, totalPages: 0 });
  const [roomError, setRoomError] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isDebating, setIsDebating] = useState(false);
  const [inputMessage, setInputMessage] = useState('');

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
      console.error(err);
    }
  };

  const handleTriggerDebateRound = async (specificRole?: string) => {
    if (!selectedRoom || isDebating) return;
    setIsDebating(true);

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
      if (data.success) {
        setMessages(prev => [...prev, ...data.data]);
        setTimeout(scrollToBottom, 200);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDebating(false);
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
              Estrategista, Copywriter, Designer (DALL-E 3), Roteirista de Vídeo e Gestora de Tráfego criando juntos.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {selectedRoom && (
            <button
              type="button"
              onClick={handleExportPlan}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Exportar Plano (.md)</span>
            </button>
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
            <button
              type="button"
              key={room.id}
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
          ))}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Esquerda: Lista de Salas */}
        <div className="w-72 bg-slate-950/60 border-r border-slate-800 p-4 flex flex-col justify-between hidden md:flex">
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
                  <button
                    type="button"
                    key={room.id}
                    onClick={() => loadRoom(room)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start space-x-2.5 ${
                      selectedRoom?.id === room.id
                        ? 'bg-indigo-600/15 border-indigo-500/40 text-white'
                        : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
                    <div className="truncate">
                      <p className="text-xs font-semibold text-white truncate">{room.title}</p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{room.topic}</p>
                    </div>
                  </button>
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
            <div className="space-y-1.5 text-[11px]">
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
                <span>Lucas Viana (Design & DALL-E)</span>
              </div>
              <div className="flex items-center space-x-2 text-amber-400">
                <Video className="w-3.5 h-3.5" />
                <span>Gabriel Sato (Vídeos & Reels)</span>
              </div>
              <div className="flex items-center space-x-2 text-cyan-400">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Renata Dias (Tráfego Pago)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat / Feed Principal */}
        <div className="flex-1 flex flex-col bg-slate-900/30">
          {/* Barra de Ações Rápidas do Squad */}
          <div className="px-6 py-2.5 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between overflow-x-auto">
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">Acionar Especialista:</span>
              <button
                type="button"
                disabled={isDebating}
                onClick={() => handleTriggerDebateRound('STRATEGIST')}
                className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[11px] transition"
              >
                @Estrategista
              </button>
              <button
                type="button"
                disabled={isDebating}
                onClick={() => handleTriggerDebateRound('COPYWRITER')}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] transition"
              >
                @Copywriter
              </button>
              <button
                type="button"
                disabled={isDebating}
                onClick={() => handleTriggerDebateRound('DESIGNER')}
                className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[11px] transition"
              >
                @Designer (Artes)
              </button>
              <button
                type="button"
                disabled={isDebating}
                onClick={() => handleTriggerDebateRound('VIDEOMAKER')}
                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] transition"
              >
                @Vídeos
              </button>
              <button
                type="button"
                disabled={isDebating}
                onClick={() => handleTriggerDebateRound('TRAFFIC_MANAGER')}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[11px] transition"
              >
                @Tráfego
              </button>
            </div>

            <button
              type="button"
              disabled={isDebating || !selectedRoom}
              onClick={() => handleTriggerDebateRound()}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition whitespace-nowrap ml-2"
            >
              {isDebating ? (
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

                      {/* Exibição de Imagem Gerada (DALL-E 3) */}
                      {msg.imageUrl && (
                        <div className="mt-4 p-2 bg-slate-900 rounded-xl border border-slate-800">
                          <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-[11px] font-semibold text-purple-400 flex items-center space-x-1">
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>Arte Gerada pela IA (DALL-E 3)</span>
                            </span>
                            <a
                              href={msg.imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 underline"
                            >
                              Abrir em Alta Resolução
                            </a>
                          </div>
                          <img
                            src={msg.imageUrl}
                            alt="Arte da Campanha"
                            className="w-full max-h-80 object-cover rounded-lg shadow-lg"
                          />
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
