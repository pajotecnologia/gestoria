import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  Send, 
  Bot, 
  Sparkles, 
  BrainCircuit, 
  PenTool, 
  Palette, 
  Video, 
  TrendingUp, 
  Code, 
  Scale, 
  ShieldCheck, 
  DollarSign, 
  MessageSquare, 
  X
} from 'lucide-react';
import { apiUrl } from '../api/client';
import { PROVIDER_MODELS } from './AIProvidersSettings';

export interface Specialist {
  id?: string;
  roleKey: string;
  name: string;
  title: string;
  avatarColor: string;
  iconName: string;
  provider: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  generateImage: boolean;
  isCustom: boolean;
  enabled: boolean;
}

const ICON_MAP: Record<string, any> = {
  BrainCircuit,
  PenTool,
  Palette,
  Video,
  TrendingUp,
  Code,
  Scale,
  ShieldCheck,
  DollarSign,
  Bot
};

const COLOR_PRESETS = [
  { label: 'Azul & Índigo', value: 'from-blue-600 to-indigo-600' },
  { label: 'Esmeralda & Verde', value: 'from-emerald-500 to-teal-600' },
  { label: 'Roxo & Rosa', value: 'from-purple-600 to-pink-600' },
  { label: 'Âmbar & Laranja', value: 'from-amber-500 to-orange-600' },
  { label: 'Ciano & Azul Celeste', value: 'from-cyan-500 to-blue-600' },
  { label: 'Vermelho & Carmim', value: 'from-rose-600 to-red-600' },
  { label: 'Violeta & Fúcsia', value: 'from-violet-600 to-fuchsia-600' }
];

const ROLE_TRANSLATIONS: Record<string, string> = {
  STRATEGIST: 'Estrategista',
  COPYWRITER: 'Copywriter',
  DESIGNER: 'Designer',
  VIDEOMAKER: 'Roteirista',
  TRAFFIC_MANAGER: 'Tráfego',
  TAX_ADVISOR: 'Tributário',
  TRIBUTARIO: 'Tributário',
  FULLSTACK_DEV: 'Dev',
  DEV: 'Dev',
  SEO_SPECIALIST: 'SEO',
  SEO: 'SEO',
};

const SPECIALIST_TEMPLATES = [
  {
    name: 'Dr. Roberto Mendes',
    roleKey: 'TAX_ADVISOR',
    title: 'Consultor Tributário & Planejamento Fiscal',
    avatarColor: 'from-emerald-500 to-teal-600',
    iconName: 'Scale',
    provider: 'gemini',
    model: 'gemini-3.8-flash',
    temperature: 0.2,
    systemPrompt: `Você é o Dr. Roberto Mendes, Consultor Tributário Sênior e Especialista em Planejamento Fiscal para Empresas.
Sua missão: Analisar o contexto do cliente/projeto e estruturar soluções fiscais, elisão tributária e conformidade com a legislação vigente.
Seja técnico, prudente, claro e focado em economia fiscal lícita.
Estruture suas respostas em:
1. ⚖️ Enquadramento e Base Legal
2. 💡 Oportunidades de Otimização Tributária
3. ⚠️ Riscos e Pontos de Atenção`
  },
  {
    name: 'Alexandre Torres',
    roleKey: 'FULLSTACK_DEV',
    title: 'Arquiteto de Software & Engenheiro FullStack',
    avatarColor: 'from-blue-600 to-indigo-600',
    iconName: 'Code',
    provider: 'gemini',
    model: 'gemini-3.8-flash',
    temperature: 0.3,
    systemPrompt: `Você é Alexandre Torres, Arquiteto de Software e Engenheiro FullStack Sênior.
Sua missão: Avaliar viabilidade técnica, arquitetura de sistemas, APIs, integrações e modelagem de dados para os projetos da agência.
Seja prático, focado em alta performance, código limpo e padrões de mercado.
Estruture suas respostas em:
1. 🏗️ Arquitetura Recomendada & Stack
2. 🔌 Integrações & Fluxo de Dados
3. 🚀 Passos Práticos de Implementação`
  },
  {
    name: 'Mariana Duarte',
    roleKey: 'SEO_SPECIALIST',
    title: 'Especialista em SEO & Conteúdo Orgânico',
    avatarColor: 'from-purple-600 to-pink-600',
    iconName: 'TrendingUp',
    provider: 'gemini',
    model: 'gemini-3.8-flash',
    temperature: 0.5,
    systemPrompt: `Você é Mariana Duarte, Especialista em SEO e Estratégia de Posicionamento Orgânico no Google.
Sua missão: Desenvolver clusters de palavras-chave, intenção de busca, arquitetura de links e otimização on-page/off-page.
Estruture suas respostas em:
1. 🔍 Termos-Chave de Alta Intenção Comercial
2. 📑 Estrutura de Conteúdo & Heading Tags (H1, H2, H3)
3. 📈 Estratégia de Link Building & Autoridade de Domínio`
  }
];

export const SpecialistManager: React.FC<{ jwtToken: string }> = ({ jwtToken }) => {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Modal de Criação/Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSpecialist, setEditingSpecialist] = useState<Specialist | null>(null);
  const [customModelMode, setCustomModelMode] = useState(false);
  const [form, setForm] = useState<Partial<Specialist>>({
    name: '',
    roleKey: '',
    title: '',
    avatarColor: COLOR_PRESETS[0].value,
    iconName: 'BrainCircuit',
    provider: 'gemini',
    model: 'gemini-3.8-flash',
    temperature: 0.7,
    systemPrompt: '',
    generateImage: false,
    enabled: true
  });

  // Modal / Painel de Teste Direto 1-a-1
  const [testingSpecialist, setTestingSpecialist] = useState<Specialist | null>(null);
  const [testPrompt, setTestPrompt] = useState('');
  const [testChatLog, setTestChatLog] = useState<Array<{ role: 'user' | 'assistant'; text: string; time: string }>>([]);
  const [testLoading, setTestLoading] = useState(false);

  const loadSpecialists = async () => {
    try {
      setLoading(true);
      const res = await fetch(apiUrl('/api/specialists'), {
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSpecialists(data.data || []);
      } else {
        setMessage(data.error || 'Erro ao carregar especialistas.');
      }
    } catch (err: any) {
      setMessage(err.message || 'Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSpecialists();
  }, [jwtToken]);

  const handleOpenCreate = () => {
    setEditingSpecialist(null);
    setForm({
      name: '',
      roleKey: '',
      title: '',
      avatarColor: COLOR_PRESETS[0].value,
      iconName: 'BrainCircuit',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      systemPrompt: '',
      generateImage: false,
      enabled: true
    });
    setIsModalOpen(true);
    setMessage('');
  };

  const handleOpenEdit = (spec: Specialist) => {
    setEditingSpecialist(spec);
    setForm({
      name: spec.name,
      roleKey: spec.roleKey,
      title: spec.title,
      avatarColor: spec.avatarColor,
      iconName: spec.iconName || 'BrainCircuit',
      provider: spec.provider || 'openai',
      model: spec.model || 'gpt-4o',
      temperature: spec.temperature ?? 0.7,
      systemPrompt: spec.systemPrompt,
      generateImage: spec.generateImage || false,
      enabled: spec.enabled !== false
    });
    setIsModalOpen(true);
    setMessage('');
  };

  const handleApplyTemplate = (tpl: typeof SPECIALIST_TEMPLATES[0]) => {
    setForm({
      ...form,
      name: tpl.name,
      roleKey: tpl.roleKey,
      title: tpl.title,
      avatarColor: tpl.avatarColor,
      iconName: tpl.iconName,
      provider: tpl.provider,
      model: tpl.model,
      temperature: tpl.temperature,
      systemPrompt: tpl.systemPrompt
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    try {
      const isEdit = Boolean(editingSpecialist);
      const url = isEdit
        ? `/api/specialists/${editingSpecialist?.id || editingSpecialist?.roleKey}`
        : '/api/specialists';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(apiUrl(url), {
        method,
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar especialista.');

      setIsModalOpen(false);
      setMessage(`Especialista ${form.name} salvo com sucesso!`);
      await loadSpecialists();
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  const handleDelete = async (spec: Specialist) => {
    if (!window.confirm(`Tem certeza que deseja remover o especialista '${spec.name}'?`)) return;

    try {
      const res = await fetch(apiUrl(`/api/specialists/${spec.id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Não foi possível excluir o especialista.');
      }
      setMessage(`Especialista ${spec.name} excluído com sucesso.`);
      await loadSpecialists();
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  const handleOpenTestChat = (spec: Specialist) => {
    setTestingSpecialist(spec);
    setTestChatLog([
      {
        role: 'assistant',
        text: `Olá! Sou ${spec.name}, ${spec.title}. Em que posso ajudar você ou sua equipe hoje?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setTestPrompt('');
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPrompt.trim() || !testingSpecialist || testLoading) return;

    const userText = testPrompt;
    setTestPrompt('');
    setTestChatLog(prev => [
      ...prev,
      {
        role: 'user',
        text: userText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setTestLoading(true);

    try {
      const res = await fetch(apiUrl('/api/specialists/test'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          specialistId: testingSpecialist.id,
          roleKey: testingSpecialist.roleKey,
          prompt: userText,
          systemPrompt: testingSpecialist.systemPrompt,
          provider: testingSpecialist.provider,
          model: testingSpecialist.model,
          temperature: testingSpecialist.temperature
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na resposta do especialista.');

      setTestChatLog(prev => [
        ...prev,
        {
          role: 'assistant',
          text: data.data.reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      setTestChatLog(prev => [
        ...prev,
        {
          role: 'assistant',
          text: `[Erro]: ${err.message}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-2xl shadow-lg shadow-indigo-600/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Especialistas do Squad & Treinamento</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Crie, treine e converse 1-a-1 com especialistas customizados da sua agência para debater na Mesa Redonda.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Novo Especialista</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Grid de Especialistas */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">Carregando especialistas...</div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-3">
          {specialists.map((spec) => {
            const IconComponent = ICON_MAP[spec.iconName] || BrainCircuit;
            return (
              <div
                key={spec.roleKey}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between shadow-xl transition space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-950 text-indigo-400 border border-slate-800">
                      @{ROLE_TRANSLATIONS[spec.roleKey] || spec.roleKey}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${spec.isCustom ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-slate-800 text-slate-400'}`}>
                      {spec.isCustom ? 'Customizado' : 'Nativo do Squad'}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center space-x-3.5">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${spec.avatarColor || 'from-indigo-600 to-purple-600'} flex items-center justify-center text-white shadow-lg shrink-0`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div className="truncate">
                      <h3 className="text-sm font-bold text-white truncate">{spec.name}</h3>
                      <p className="text-xs text-slate-400 truncate">{spec.title}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Motor IA:</span>
                      <span className="text-[11px] font-mono text-slate-300 uppercase">{spec.provider} • {spec.model}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Criatividade (Temp):</span>
                      <span className="text-[11px] font-mono text-slate-300">{spec.temperature}</span>
                    </div>
                  </div>

                  <div className="mt-3 bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 line-clamp-3 leading-relaxed font-mono">
                    {spec.systemPrompt}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenTestChat(spec)}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Conversar 1-a-1</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(spec)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
                    title="Editar Treinamento"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {spec.isCustom && (
                    <button
                      type="button"
                      onClick={() => handleDelete(spec)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs transition cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DO ESPECIALISTA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingSpecialist ? `Editar ${editingSpecialist.name}` : 'Criar Novo Especialista'}
                  </h2>
                  <p className="text-xs text-slate-400">Parametrize o papel, estilo e modelo de inferência da IA.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sugestões de Modelos Prontos */}
            {!editingSpecialist && (
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Modelos Prontos de Especialistas (Clique para Carregar):
                </label>
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {SPECIALIST_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.roleKey}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl)}
                      className="text-left p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-indigo-500/40 text-xs transition"
                    >
                      <span className="font-bold text-white block truncate">{tpl.name}</span>
                      <span className="text-[10px] text-slate-400 block truncate">{tpl.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nome do Especialista</label>
                  <input
                    required
                    type="text"
                    value={form.name || ''}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Dr. Roberto Silva"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tag / Identificador (@Comando)
                  </label>
                  <input
                    required
                    type="text"
                    disabled={Boolean(editingSpecialist)}
                    value={form.roleKey || ''}
                    onChange={(e) => setForm({ ...form, roleKey: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase() })}
                    placeholder="Ex: TRIBUTARIO, DEV, SEO"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Cargo / Especialidade Principal</label>
                <input
                  required
                  type="text"
                  value={form.title || ''}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Especialista em Direito Tributário & M&A"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Provedor de IA</label>
                  <select
                    value={form.provider || 'gemini'}
                    onChange={(e) => {
                      const p = e.target.value;
                      const defaultModel = (PROVIDER_MODELS[p] && PROVIDER_MODELS[p][0]?.id) || 'gpt-4o';
                      setForm({ ...form, provider: p, model: defaultModel });
                      setCustomModelMode(false);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="gemini">Google Gemini (Recomendado)</option>
                    <option value="openai">OpenAI</option>
                    <option value="groq">Groq (LPU Speed)</option>
                    <option value="ollama">Ollama (Local / Hermes 3)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">Modelo</label>
                    <button
                      type="button"
                      onClick={() => setCustomModelMode(!customModelMode)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 underline"
                    >
                      {customModelMode ? 'Ver Lista Padrão' : 'Digitar Outro'}
                    </button>
                  </div>
                  {customModelMode ? (
                    <input
                      required
                      type="text"
                      value={form.model || ''}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                      placeholder="gemini-3.8-flash"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  ) : (
                    <select
                      value={form.model || ''}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {(PROVIDER_MODELS[form.provider || 'gemini'] || []).map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Temperatura ({form.temperature})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={form.temperature ?? 0.7}
                    onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500 mt-2"
                  />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Cor do Avatar</label>
                  <select
                    value={form.avatarColor}
                    onChange={(e) => setForm({ ...form, avatarColor: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {COLOR_PRESETS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Ícone Visual</label>
                  <select
                    value={form.iconName}
                    onChange={(e) => setForm({ ...form, iconName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="BrainCircuit">Cérebro / Estratégia (BrainCircuit)</option>
                    <option value="PenTool">Caneta / Redação (PenTool)</option>
                    <option value="Palette">Paleta / Design (Palette)</option>
                    <option value="Video">Câmera / Vídeo (Video)</option>
                    <option value="TrendingUp">Gráfico / Tráfego (TrendingUp)</option>
                    <option value="Code">Código / Dev (Code)</option>
                    <option value="Scale">Balança / Jurídico (Scale)</option>
                    <option value="DollarSign">Cifrão / Financeiro (DollarSign)</option>
                    <option value="Bot">Robô / Geral (Bot)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Treinamento & System Prompt (Instruções RTCE do Especialista)
                </label>
                <textarea
                  required
                  rows={6}
                  value={form.systemPrompt || ''}
                  onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                  placeholder={`Você é [Nome], [Cargo] especialista em...\nSua missão é...\nEstruture suas respostas em:\n1. ...\n2. ...`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.generateImage || false}
                    onChange={(e) => setForm({ ...form, generateImage: e.target.checked })}
                    className="rounded accent-indigo-600 w-4 h-4"
                  />
                  <span>Gera Imagens com IA (DALL-E 3) automaticamente no Squad</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                >
                  Salvar Especialista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE SIMULADOR / PLAYGROUND 1-A-1 */}
      {testingSpecialist && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col h-[80vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${testingSpecialist.avatarColor} flex items-center justify-center text-white shadow-lg`}>
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Conversa Direta com {testingSpecialist.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400">
                      @{ROLE_TRANSLATIONS[testingSpecialist.roleKey] || testingSpecialist.roleKey}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">{testingSpecialist.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTestingSpecialist(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 my-2">
              {testChatLog.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex items-start space-x-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'assistant' && (
                    <div className={`w-7 h-7 rounded-xl bg-gradient-to-tr ${testingSpecialist.avatarColor} flex items-center justify-center text-white shrink-0 mt-0.5`}>
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-xl p-3.5 rounded-2xl text-xs leading-relaxed shadow-lg ${
                      m.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                        : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-tl-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1 mb-1 border-b border-white/10 text-[10px] opacity-70">
                      <span>{m.role === 'user' ? 'Você' : testingSpecialist.name}</span>
                      <span>{m.time}</span>
                    </div>
                    <div className="whitespace-pre-wrap font-sans">{m.text}</div>
                  </div>
                </div>
              ))}
              {testLoading && (
                <div className="flex items-center space-x-2 text-xs text-slate-400 py-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span>{testingSpecialist.name} está analisando e formulando resposta...</span>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendTestMessage} className="pt-3 border-t border-slate-800 flex items-center space-x-2">
              <input
                type="text"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder={`Envie uma pergunta ou briefing para testar ${testingSpecialist.name}...`}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!testPrompt.trim() || testLoading}
                className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
