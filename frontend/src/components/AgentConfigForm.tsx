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
  const [provider, setProvider] = useState<'openai' | 'groq' | 'ollama'>(initialData?.provider || 'openai');
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

  const handleProviderChange = (newProvider: 'openai' | 'groq' | 'ollama') => {
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
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-6 py-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white tracking-wide">Configuração do Agente de IA</h1>
          <p className="text-xs text-slate-400">Parametrize o comportamento, motor de inferência e RTCE Prompt.</p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
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
      <div className="flex border-b border-slate-800 bg-slate-950/40 px-6">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center space-x-2 py-4 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'general'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Informações Gerais</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('engine')}
          className={`flex items-center space-x-2 py-4 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'engine'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Motor de IA & Modelos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('instructions')}
          className={`flex items-center space-x-2 py-4 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'instructions'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode2 className="w-4 h-4" />
          <span>Instruções (RTCE Prompt)</span>
        </button>
      </div>

      {/* Conteúdo das Abas */}
      <div className="p-6">
        {/* ABA GERAL */}
        {activeTab === 'general' && (
          <div className="space-y-6 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Nome do Agente</label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                placeholder="Ex: Concierge Imobiliário"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Nicho / Segmento do Cliente</label>
              <input
                type="text"
                value={marketNiche}
                onChange={(e) => setMarketNiche(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                placeholder="Ex: E-commerce de Moda, Clínica Médica, Advocacia"
              />
            </div>
          </div>
        )}

        {/* ABA MOTOR DE IA */}
        {activeTab === 'engine' && (
          <div className="space-y-6 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Provedor de IA</label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="openai">OpenAI (Oficial)</option>
                <option value="groq">Groq (Incrível Velocidade LPU)</option>
                <option value="ollama">Ollama (Self-Hosted / Local)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Modelo de Inferência</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
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
                <label className="text-xs font-semibold text-slate-300">Temperatura (Criatividade vs Precisão)</label>
                <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
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
                className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0.0 (Focado & Rígido)</span>
                <span>0.5 (Balanceado)</span>
                <span>1.0 (Mais Criativo)</span>
              </div>
            </div>
          </div>
        )}

        {/* ABA INSTRUÇÕES (PROMPT GENERATOR) */}
        {activeTab === 'instructions' && (
          <div>
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
