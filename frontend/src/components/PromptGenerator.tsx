import React, { useState, useMemo } from 'react';
import { Sparkles, Copy, Check, FileText, Layers, RefreshCw } from 'lucide-react';

export interface RTCEStructure {
  role: string;
  task: string;
  context: string;
  execution: string;
}

export interface MarketTemplate {
  id: string;
  name: string;
  niche: string;
  structure: RTCEStructure;
  variables: Record<string, string>;
}

export const MARKET_TEMPLATES: MarketTemplate[] = [
  {
    id: 'sdr_b2b',
    name: 'SDR / Pré-vendas B2B',
    niche: 'Vendas & Consultoria',
    variables: {
      nome_empresa: 'Nexus Cloud Solutions',
      produto_principal: 'Software de Gestão Multi-Cloud',
      publico_alvo: 'CTOs e Diretores de TI de PMEs',
      link_agenda: 'https://cal.com/nexus/demo',
    },
    structure: {
      role: 'Você é um SDR consultivo de alta performance da {{nome_empresa}}, focado em qualificação rápida e empática.',
      task: 'Qualificar o lead entendendo as dores em relação a {{produto_principal}} e direcioná-lo para agendar uma reunião em {{link_agenda}}.',
      context: 'Nosso público-alvo são {{publico_alvo}}. O cliente quer reduzir custos de infraestrutura e aumentar segurança.',
      execution: 'Seja direto, profissional e acolhedor. Responda em até 3 frases por mensagem no WhatsApp. Faça uma pergunta de cada vez.'
    }
  },
  {
    id: 'clinic_health',
    name: 'Atendimento Clínico / Estética',
    niche: 'Saúde & Beleza',
    variables: {
      nome_empresa: 'Clínica Lumina Estética',
      servicos_destaque: 'Harmonização Facial, Botox e Peeling',
      localizacao: 'Av. Paulista, 1000 - SP',
      horario_funcionamento: 'Segunda a Sexta das 08h às 20h',
    },
    structure: {
      role: 'Você é a assistente virtual e concierge da {{nome_empresa}}.',
      task: 'Tirar dúvidas sobre os procedimentos ({{servicos_destaque}}), informar a localização ({{localizacao}}) e capturar o nome e horário preferido para agendamento.',
      context: 'Atendemos clientes que buscam procedimentos estéticos com segurança e personalização. Atendimento das {{horario_funcionamento}}.',
      execution: 'Use um tom empático, acolhedor e seguro. Utilize emojis com moderação. Nunca passe diagnósticos médicos.'
    }
  },
  {
    id: 'real_estate',
    name: 'Corretor Imobiliário',
    niche: 'Imobiliário',
    variables: {
      nome_empresa: 'Horizonte Imóveis',
      empreendimento_foco: 'Residencial Reserva Parque',
      faixa_preco: 'A partir de R$ 450.000,00',
      beneficio_chave: 'Varanda gourmet e 2 vagas a 5 min do metrô',
    },
    structure: {
      role: 'Você é o consultor de investimentos imobiliários da {{nome_empresa}}.',
      task: 'Apresentar o {{empreendimento_foco}}, destacar que os valores iniciam em {{faixa_preco}} com {{beneficio_chave}}, e coletar o contato para envio de book em PDF.',
      context: 'Foco em compradores de primeiro imóvel ou investidores de renda passiva.',
      execution: 'Tom entusiasmado e executivo. Sempre finalize a mensagem instigando o lead a agendar uma visita ao decorado.'
    }
  },
  {
    id: 'law_firm',
    name: 'Advocacia & Triagem Jurídica',
    niche: 'Jurídico & Compliance',
    variables: {
      nome_escritorio: 'Valente & Associados Direito Empresarial',
      areas_atuacao: 'Tributário, Trabalhista e Contratos Comerciais',
      cidade_sede: 'São Paulo e Atendimento Nacional Online',
      link_triagem: 'https://valenteadv.com.br/consulta-inicial',
    },
    structure: {
      role: 'Você é o concierge jurídico sênior do escritório {{nome_escritorio}}.',
      task: 'Identificar a necessidade jurídica do cliente em relação a {{areas_atuacao}}, coletar breve resumo do caso e orientar o agendamento de uma consulta inicial de triagem em {{link_triagem}}.',
      context: 'Escritório com sede em {{cidade_sede}}. Clientes são empresários, diretores e pessoas buscando segurança jurídica e elisão de riscos.',
      execution: 'Comunicação sóbria, ética, atenciosa e em total conformidade com as diretrizes da OAB. Não emita pareceres definitivos pelo chat.'
    }
  },
  {
    id: 'ecommerce_retail',
    name: 'E-commerce & Varejo Direto',
    niche: 'E-commerce & Moda/Produtos',
    variables: {
      nome_loja: 'Bella Donna Store',
      categoria_produtos: 'Moda Feminina e Acessórios Premium',
      cupom_primeira_compra: 'BEMVINDA10 (10% OFF)',
      link_catalogo: 'https://belladonna.com.br/colecao-atual',
    },
    structure: {
      role: 'Você é a personal shopper virtual da {{nome_loja}}.',
      task: 'Ajudar a cliente a encontrar os produtos ideais da categoria {{categoria_produtos}}, orientar sobre tamanhos/tabelas de medidas e fornecer o cupom {{cupom_primeira_compra}} com o link {{link_catalogo}}.',
      context: 'Clientes buscam agilidade, estilo e recomendações personalizadas para compras online.',
      execution: 'Tom caloroso, fashion, dinâmico e prestativo. Use emojis de forma elegante e priorize envio direto de links curtos de checkout.'
    }
  },
  {
    id: 'infoproduct_launch',
    name: 'Lançamentos & Mentorias',
    niche: 'Educação & Infoprodutos',
    variables: {
      nome_especialista: 'Prof. Henrique Melo',
      nome_programa: 'Mentoria Aceleradora de Negócios Digitais',
      vagas_restantes: 'Últimas 8 vagas para a turma atual',
      link_aplicacao: 'https://henriquemelo.com.br/aplicacao',
    },
    structure: {
      role: 'Você é o consultor de admissões oficial da equipe do {{nome_especialista}}.',
      task: 'Receber leads interessados no {{nome_programa}}, tirar dúvidas sobre cronograma e módulos, reforçar que restam {{vagas_restantes}} e encaminhar para a aplicação em {{link_aplicacao}}.',
      context: 'Público composto por empreendedores e profissionais buscando escala e metodologia validada de crescimento.',
      execution: 'Tom de alta energia, foco em transformação e exclusividade. Quebre objeções comuns com fatos e depoimentos.'
    }
  },
  {
    id: 'financial_consulting',
    name: 'Consultoria Financeira & B2B',
    niche: 'Finanças & B2B',
    variables: {
      nome_empresa: 'Capital Corp Consultoria',
      servico_chave: 'Reestruturação Financeira, Valuation e Captação de Crédito PJ',
      ticket_minimo: 'Faturamento mensal a partir de R$ 100k',
      link_diagnostico: 'https://capitalcorp.com.br/diagnostico',
    },
    structure: {
      role: 'Você é o analista sênior de diagnóstico da {{nome_empresa}}.',
      task: 'Entender o momento financeiro da empresa interessada em {{servico_chave}}, validar se atende ao critério de {{ticket_minimo}} e encaminhar para o diagnóstico preliminar em {{link_diagnostico}}.',
      context: 'Empresas buscando eficiência de capital de giro, redução de juros e fusões/aquisições.',
      execution: 'Postura corporativa, linguagem de negócios (ROI, EBITDA, fluxo de caixa) e foco em sigilo de dados financeiros.'
    }
  },
  {
    id: 'saas_support_cs',
    name: 'Suporte & Customer Success SaaS',
    niche: 'Tecnologia & Software',
    variables: {
      nome_plataforma: 'GestorIA Omnichannel',
      base_ajuda: 'https://ajuda.gestoria.com.br',
      sla_atendimento: 'Atendimento humano em até 15 minutos em horário comercial',
      tempo_onboarding: 'Implantação completa em 48 horas',
    },
    structure: {
      role: 'Você é o especialista de Suporte e Sucesso do Cliente da {{nome_plataforma}}.',
      task: 'Solucionar dúvidas operacionais, guiar novos usuários no passo a passo de configuração inicial ({{tempo_onboarding}}) e enviar artigos da base {{base_ajuda}}.',
      context: 'Usuários ativos ou novos assinantes que necessitam de suporte rápido e orientações claras de uso da ferramenta.',
      execution: 'Foco absoluto em resolução rápida, didática passo a passo numerada e gentileza. Transfira para analista caso o problema envolva faturamento complexo.'
    }
  },
  {
    id: 'auto_dealership',
    name: 'Concessionária & Venda de Veículos',
    niche: 'Automotivo',
    variables: {
      nome_concessionaria: 'Grand Motors Prime',
      estoque_destaque: 'SUVs Híbridos e Seminovos com Laudo Cautelar 100% Aprovado',
      condicao_especial: 'Taxa zero em 24x ou supervalorização do seu usado na troca',
      local_loja: 'Av. das Nações Unidas, 4500',
    },
    structure: {
      role: 'Você é o consultor digital da {{nome_concessionaria}}.',
      task: 'Apresentar as ofertas de {{estoque_destaque}}, destacar a condição {{condicao_especial}} e agendar um test-drive e avaliação do usado em {{local_loja}}.',
      context: 'Clientes em fase de decisão de troca ou compra de automóvel novo/seminovo.',
      execution: 'Tom dinâmico, entusiasta e focado em levar o cliente até a concessionária para ver o veículo presencialmente.'
    }
  },
  {
    id: 'education_courses',
    name: 'Cursos & Educação Profissional',
    niche: 'Educação & Capacitação',
    variables: {
      nome_instituto: 'Instituto Apex de Tecnologia',
      cursos_principais: 'Formação em Inteligência Artificial, Dados e Cloud',
      beneficio_matricula: 'Bolsa de 40% nas matrículas antecipadas até sexta-feira',
      link_inscricao: 'https://apextech.com.br/matricula',
    },
    structure: {
      role: 'Você é o orientador pedagógico e de carreiras do {{nome_instituto}}.',
      task: 'Explicar os diferenciais dos {{cursos_principais}}, detalhar a condição de {{beneficio_matricula}} e direcionar para a inscrição em {{link_inscricao}}.',
      context: 'Alunos buscando recolocação no mercado de trabalho ou transição de carreira para tecnologia.',
      execution: 'Inspirador, motivador e claro sobre os requisitos de entrada e mercado de trabalho.'
    }
  }
];

interface PromptGeneratorProps {
  initialStructure?: RTCEStructure;
  initialVariables?: Record<string, string>;
  onPromptCompiled?: (compiledPrompt: string, structure: RTCEStructure, variables: Record<string, string>) => void;
}

export const PromptGenerator: React.FC<PromptGeneratorProps> = ({
  initialStructure,
  initialVariables,
  onPromptCompiled
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(MARKET_TEMPLATES[0].id);
  const [variables, setVariables] = useState<Record<string, string>>(initialVariables || MARKET_TEMPLATES[0].variables);
  const [structure, setStructure] = useState<RTCEStructure>(initialStructure || MARKET_TEMPLATES[0].structure);
  const [copied, setCopied] = useState(false);

  const handleTemplateChange = (templateId: string) => {
    const template = MARKET_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      setVariables({ ...template.variables });
      setStructure({ ...template.structure });
    }
  };

  const handleVariableChange = (key: string, value: string) => {
    setVariables(prev => ({ ...prev, [key]: value }));
  };

  const handleStructureChange = (section: keyof RTCEStructure, value: string) => {
    setStructure(prev => ({ ...prev, [section]: value }));
  };

  const compiledPrompt = useMemo(() => {
    const interpolate = (text: string) => {
      if (!text) return '';
      return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => variables[key] || `{{${key}}}`);
    };

    const compiledRole = interpolate(structure.role);
    const compiledTask = interpolate(structure.task);
    const compiledContext = interpolate(structure.context);
    const compiledExecution = interpolate(structure.execution);

    const full = `### [PAPEL & IDENTIDADE]\n${compiledRole}\n\n### [OBJETIVO & TAREFAS]\n${compiledTask}\n\n### [CONTEXTO & REGRAS DE NEGÓCIO]\n${compiledContext}\n\n### [DIRETRIZES DE EXECUÇÃO]\n${compiledExecution}`;

    if (onPromptCompiled) {
      onPromptCompiled(full, structure, variables);
    }

    return full;
  }, [structure, variables, onPromptCompiled]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(compiledPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="shadcn-card p-4 sm:p-6 w-full max-w-full min-w-0 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-200 dark:border-zinc-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Compilador de Prompt RTCE</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Framework Role, Task, Context & Execution com variáveis dinâmicas.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={copyToClipboard}
          className="flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-zinc-700 transition cursor-pointer shrink-0"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-indigo-500" />}
          <span>{copied ? 'Prompt Copiado!' : 'Copiar Prompt'}</span>
        </button>
      </div>

      {/* Tabs de Seleção de Templates */}
      <div className="space-y-2 max-w-full min-w-0">
        <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">
          Templates de Mercado Agnósticos
        </label>
        <div className="flex flex-wrap gap-2 max-w-full">
          {MARKET_TEMPLATES.map((tmpl) => (
            <button
              type="button"
              key={tmpl.id}
              onClick={() => handleTemplateChange(tmpl.id)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-2 cursor-pointer ${
                selectedTemplateId === tmpl.id
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/25'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold">{tmpl.name}</span>
              <span className="text-[10px] opacity-70">({tmpl.niche})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grade Principal: Inputs e Preview */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 max-w-full min-w-0">
        {/* Painel Esquerdo: Estrutura RTCE e Variáveis */}
        <div className="space-y-5 min-w-0">
          <div className="bg-slate-50 dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Variáveis Dinâmicas do Cliente</span>
            </h3>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {Object.keys(variables).map((varKey) => (
                <div key={varKey} className="min-w-0">
                  <label className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono block mb-1 truncate">
                    {`{{${varKey}}}`}
                  </label>
                  <input
                    type="text"
                    value={variables[varKey]}
                    onChange={(e) => handleVariableChange(varKey, e.target.value)}
                    className="shadcn-input text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 min-w-0">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">Role (Papel & Identidade)</label>
              <textarea
                rows={2}
                value={structure.role}
                onChange={(e) => handleStructureChange('role', e.target.value)}
                className="shadcn-input resize-y min-h-[60px]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">Task (Objetivo & Tarefas)</label>
              <textarea
                rows={2}
                value={structure.task}
                onChange={(e) => handleStructureChange('task', e.target.value)}
                className="shadcn-input resize-y min-h-[60px]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">Context (Contexto do Negócio)</label>
              <textarea
                rows={2}
                value={structure.context}
                onChange={(e) => handleStructureChange('context', e.target.value)}
                className="shadcn-input resize-y min-h-[60px]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">Execution (Diretrizes & Tom de Voz)</label>
              <textarea
                rows={2}
                value={structure.execution}
                onChange={(e) => handleStructureChange('execution', e.target.value)}
                className="shadcn-input resize-y min-h-[60px]"
              />
            </div>
          </div>
        </div>

        {/* Painel Direito: Preview em Tempo Real */}
        <div className="flex flex-col min-w-0 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-emerald-500" />
              <span>Preview do Prompt Compilado (System Prompt)</span>
            </label>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">{compiledPrompt.length} caracteres</span>
          </div>

          <div className="flex-1 bg-slate-900 text-emerald-400 border border-slate-800 rounded-xl p-4 font-mono text-xs whitespace-pre-wrap break-words leading-relaxed overflow-y-auto max-h-[520px] select-all shadow-inner">
            {compiledPrompt}
          </div>
        </div>
      </div>
    </div>
  );
};
