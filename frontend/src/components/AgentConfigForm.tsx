import React, { useState } from 'react';
import { Settings, Cpu, FileCode2, Save, CheckCircle2 } from 'lucide-react';
import { PromptGenerator, RTCEStructure, MARKET_TEMPLATES } from './PromptGenerator';
import { apiUrl } from '../api/client';

type TabType = 'general' | 'engine' | 'instructions';

interface ModelOption {
  id: string;
  name: string;
}

const PROVIDER_MODELS: Record<string, ModelOption[]> = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o (Recomendado para Produção)' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Ultra Rápido & Baixo Custo)' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' }
  ],
  gemini: [
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Recomendado - Mais Recente)' },
    { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Estável & Rápido)' },
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite (Ultra Rápido & Econômico)' },
    { id: 'gemini-flash-lite-latest', name: 'Gemini Flash Lite (Mais Recente)' }
  ],
  groq: [
    { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B (Groq LPU Speed)' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Sub-second Latency)' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' }
  ],
  ollama: [
    { id: 'llama3:latest', name: 'Llama 3 Local (Privacidade Total)' },
    { id: 'mistral:latest', name: 'Mistral 7B Local' },
    { id: 'qwen2.5:latest', name: 'Qwen 2.5 Local' }
  ]
};

interface AgentConfigFormProps {
  initialData?: any;
  jwtToken?: string;
  onSaved?: () => void;
}

export const AgentConfigForm: React.FC<AgentConfigFormProps> = ({
  initialData,
  jwtToken = '',
  onSaved
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('general');

  // Aba Geral
  const [agentName, setAgentName] = useState(initialData?.name || 'Assistente de Conversão WhatsApp');
  const [marketNiche, setMarketNiche] = useState(initialData?.niche || 'Tecnologia B2B');

  // Aba Motor de IA
  const [provider, setProvider] = useState<'openai' | 'gemini' | 'groq' | 'ollama'>(initialData?.provider || 'openai');
  const [selectedModel, setSelectedModel] = useState(initialData?.model || PROVIDER_MODELS.openai[0].id);
  const [temperature, setTemperature] = useState(initialData?.temperature ?? 0.4);

  // Aba Instruções (Compilador RTCE)
  const [structure, setStructure] = useState<RTCEStructure>(
    initialData
      ? {
          role: initialData.roleText,
          task: initialData.taskText,
          context: initialData.contextText,
          execution: initialData.executionText
        }
      : MARKET_TEMPLATES[0].structure
  );
  const [variables, setVariables] = useState<Record<string, string>>(
    initialData?.variablesJson || MARKET_TEMPLATES[0].variables
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleProviderChange = (newProvider: 'openai' | 'gemini' | 'groq' | 'ollama') => {
    setProvider(newProvider);
    setSelectedModel(PROVIDER_MODELS[newProvider][0].id);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    const payload = {
      name: agentName,
      niche: marketNiche,
      provider,
      model: selectedModel,
      temperature,
      structure,
      variables,
    };

    try {
      const url = initialData?.id ? `/api/agents/${initialData.id}` : '/api/agents';
      const method = initialData?.id ? 'PUT' : 'POST';

      const res = await fetch(apiUrl(url), {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: jwtToken ? `Bearer ${jwtToken}` : ''
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Erro ao salvar agente');

      setSaveSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="shadcn-card p-0 w-full max-w-full min-w-0 overflow-hidden space-y-0">
      {/* Cabeçalho */}
      <div className="px-6 py-5 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-wide">Configuração do Agente de IA</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400">Parametrize o comportamento, motor de inferência e RTCE Prompt.</p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition cursor-pointer shrink-0"
        >
          {saveSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Salvo com Sucesso!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 px-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 py-3.5 px-4 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'general'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Informações Gerais</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('engine')}
          className={`flex items-center gap-2 py-3.5 px-4 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'engine'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Motor de IA & Modelos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('instructions')}
          className={`flex items-center gap-2 py-3.5 px-4 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'instructions'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <FileCode2 className="w-4 h-4" />
          <span>Instruções (RTCE Prompt)</span>
        </button>
      </div>

      {/* Conteúdo das Abas */}
      <div className="p-6 min-w-0 max-w-full">
        {/* ABA GERAL */}
        {activeTab === 'general' && (
          <div className="space-y-5 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Nome do Agente</label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="shadcn-input"
                placeholder="Ex: Concierge Imobiliário"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Nicho / Segmento do Cliente</label>
              <input
                type="text"
                value={marketNiche}
                onChange={(e) => setMarketNiche(e.target.value)}
                className="shadcn-input"
                placeholder="Ex: E-commerce de Moda, Clínica Médica, Advocacia"
              />
            </div>
          </div>
        )}

        {/* ABA MOTOR DE IA */}
        {activeTab === 'engine' && (
          <div className="space-y-5 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Provedor de IA</label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as any)}
                className="shadcn-input"
              >
                <option value="openai">OpenAI (Oficial)</option>
                <option value="gemini">Google Gemini (Oficial)</option>
                <option value="groq">Groq (Incrível Velocidade LPU)</option>
                <option value="ollama">Ollama (Self-Hosted / Local)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Modelo de Inferência</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="shadcn-input"
              >
                {PROVIDER_MODELS[provider].map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Temperatura (Criatividade vs Precisão)</label>
                <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {temperature}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 bg-slate-200 dark:bg-zinc-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-zinc-400 mt-1">
                <span>0.0 (Focado & Rígido)</span>
                <span>0.5 (Balanceado)</span>
                <span>1.0 (Mais Criativo)</span>
              </div>
            </div>
          </div>
        )}

        {/* ABA INSTRUÇÕES (PROMPT GENERATOR) */}
        {activeTab === 'instructions' && (
          <div className="min-w-0 max-w-full">
            <PromptGenerator
              initialStructure={structure}
              initialVariables={variables}
              onPromptCompiled={(_, st, vb) => {
                setStructure(st);
                setVariables(vb);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
