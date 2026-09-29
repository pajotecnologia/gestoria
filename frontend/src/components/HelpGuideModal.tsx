import React, { useState } from 'react';
import { 
  Building2, 
  FolderKanban, 
  MessageSquare, 
  Wand2, 
  BarChart3, 
  FileDown, 
  CheckCircle2, 
  ArrowRight, 
  BookOpen, 
  Lightbulb
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToView?: (view: any) => void;
}

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({
  isOpen,
  onClose,
  onNavigateToView,
}) => {
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    {
      step: 1,
      id: 'clients',
      icon: Building2,
      badge: 'Fase 1: Fundamentação',
      title: 'Context Hub & Clientes',
      subtitle: 'Alimente a base de inteligência com o DNA de cada cliente',
      color: 'from-blue-600 to-indigo-600',
      description: 'Antes de planejar anúncios, cadastre a empresa no Context Hub. A IA usará esses dados como verdade absoluta para nunca alucinar ofertas ou dados errados.',
      keyPoints: [
        'Cadastre Nome, Segmento, Público-Alvo e Tom de Voz da Marca.',
        'Adicione Produtos, Ofertas Atuais, Diferenciais e Restrições de Mercado.',
        'Faça upload de PDFs, Apresentações ou Manuais na Base RAG (Qdrant) para a IA ler todo o material da empresa.',
      ],
      actionLabel: 'Ir para Context Hub & Clientes',
      viewTarget: 'clients',
    },
    {
      step: 2,
      id: 'campaigns',
      icon: FolderKanban,
      badge: 'Fase 2: Briefing da Campanha',
      title: 'Campanhas & Estratégias',
      subtitle: 'Defina o objetivo, orçamento e canais de veiculação',
      color: 'from-violet-600 to-purple-600',
      description: 'Crie uma nova campanha vinculada à empresa do cliente. Defina com clareza o que a agência precisa alcançar.',
      keyPoints: [
        'Escolha o Objetivo: Geração de Leads, Vendas Diretas, Agendamentos ou Tráfego.',
        'Defina Canais (Meta Ads, Google, TikTok) e Orçamento planejado.',
        'Clique em "Compilar Estratégia com IA" para que o Estrategista Roberto crie um plano tático com funil, posicionamento e KPIs.',
      ],
      actionLabel: 'Ir para Campanhas & Estratégias',
      viewTarget: 'campaigns',
    },
    {
      step: 3,
      id: 'warroom',
      icon: MessageSquare,
      badge: 'Fase 3: Mesa Redonda Multi-IA (Ctrl+M)',
      title: 'War Room de Especialistas',
      subtitle: 'Debate estratégico colaborativo entre os melhores especialistas de IA',
      color: 'from-pink-600 to-rose-600',
      description: 'Abra a Mesa Redonda a qualquer momento pelo atalho Ctrl+M ou pelo menu lateral para debater sua campanha com o squad completo de IAs.',
      keyPoints: [
        'Dr. Arthur / Roberto (CMO & Estrategista): Arquitetura de posicionamento e funil.',
        'Sofia Martins / Camila (Copywriter): Ângulos emocionais e argumentos de venda.',
        'Bruno Castro / Lucas (Designer): Conceito visual, paletas de cor e briefing.',
        'Renata Dias (Gestora de Tráfego): Segmentações, teste A/B e público ideal.',
        'Clique em "Iniciar Rodada Completa" para que todos debatam juntos e gerem ideias inovadoras.',
      ],
      actionLabel: 'Abrir Mesa Redonda Multi-IA',
      viewTarget: 'warroom',
    },
    {
      step: 4,
      id: 'adstudio',
      icon: Wand2,
      badge: 'Fase 4: Criação & Produção',
      title: 'Ad Creative Studio & Imagens com IA',
      subtitle: 'Gere ganchos magnéticos, copies persuasivas, roteiros e imagens',
      color: 'from-amber-500 to-orange-600',
      description: 'Transforme o planejamento aprovado em peças de anúncios prontas para veicular nos canais de mídia paga.',
      keyPoints: [
        '5 Hooks de Alta Retenção para os primeiros 3 segundos de vídeo ou títulos de imagem.',
        '3 Copies Completas formatadas nos frameworks AIDA, PAS e Storytelling.',
        '2 Roteiros de Vídeo para Reels / TikTok com marcação de cena e tempo.',
        'Gerador de Imagens com IA: Crie criativos visuais em 1:1 (Feed) ou 9:16 (Story) na hora.',
      ],
      actionLabel: 'Ir para Ad Creative Studio',
      viewTarget: 'adstudio',
    },
    {
      step: 5,
      id: 'analytics',
      icon: BarChart3,
      badge: 'Fase 5: Mídia Paga & Performance',
      title: 'Meta Ads Graph API & Benchmarking',
      subtitle: 'Acompanhe métricas reais de investimento, ROAS e CPL',
      color: 'from-emerald-500 to-teal-600',
      description: 'Analise o retorno real sobre o investimento (ROAS) e descubra quais campanhas e canais geram mais lucro para sua agência.',
      keyPoints: [
        'Sincronização com 1 Clique via Meta Marketing Graph API puxando Gastos, Cliques e Conversões.',
        'Diagnóstico de Otimização por IA: A Gestora de Tráfego analisa seus números e dá sugestões táticas de melhoria.',
        'Aba de Benchmarking: Compare o desempenho entre todas as campanhas da agência lado a lado.',
      ],
      actionLabel: 'Ir para Painel & Métricas',
      viewTarget: 'analytics',
    },
    {
      step: 6,
      id: 'export',
      icon: FileDown,
      badge: 'Fase 6: Entrega & Relatórios',
      title: 'Exportação Executiva em PDF',
      subtitle: 'Apresente resultados e estratégias aos seus clientes com padrão executivo',
      color: 'from-indigo-600 to-cyan-600',
      description: 'Gere relatórios limpos, estruturados e com visual executivo para reuniões de alinhamento com clientes e diretoria.',
      keyPoints: [
        'Exportação de Relatório de Métricas com KPIs, investimento e ROAS.',
        'Exportação de Estratégias Compiladas com todo o plano de ação da IA.',
        'Exportação do Manual de Criativos & Copies do Ad Studio para o time de design e mídia.',
        'Gera arquivo PDF limpo e formatado nativamente no navegador.',
      ],
      actionLabel: 'Explorar Dashboard',
      viewTarget: 'analytics',
    },
  ];

  const current = steps.find(s => s.step === activeStep) || steps[0];

  const handleAction = () => {
    if (onNavigateToView && current.viewTarget) {
      onNavigateToView(current.viewTarget);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl rounded-3xl">
        {/* Header Visual Moderno */}
        <div className="relative overflow-hidden p-6 sm:p-8 bg-gradient-to-br from-indigo-950/80 via-zinc-950 to-slate-950 border-b border-slate-800 text-white">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-indigo-600/30 border border-indigo-500/30 text-indigo-400">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Guia do Gestor IA: Passo a Passo Completo
                </DialogTitle>
                <span className="rounded-full border border-indigo-500/40 bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                  Fluxo Recomendado
                </span>
              </div>
              <DialogDescription className="text-xs text-zinc-400 mt-1">
                Aprenda o ciclo ideal de trabalho para criar campanhas magnéticas, criativos de alta conversão e relatórios executivos.
              </DialogDescription>
            </div>
          </div>

          {/* Stepper Tabs Bar */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {steps.map((s) => {
              const Icon = s.icon;
              const isActive = s.step === activeStep;
              return (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setActiveStep(s.step)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                  }`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                    isActive ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    <Icon className="h-3 w-3" />
                  </span>
                  <span className="text-[11px] font-medium truncate">{s.title.split('&')[0].trim()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body of Active Step */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-zinc-800/80">
            <div>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                {current.badge}
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                Passo {current.step}: {current.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                {current.subtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={handleAction}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-xs font-bold transition shadow-md shadow-indigo-600/20 cursor-pointer shrink-0"
            >
              <span>{current.actionLabel}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800">
            {current.description}
          </p>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>O que fazer nesta etapa:</span>
            </h4>
            <div className="grid gap-2.5">
              {current.keyPoints.map((point, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <span className="text-xs text-slate-700 dark:text-zinc-300 leading-normal">
                    {point}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Atalhos e Dicas Rápidas */}
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-indigo-950 dark:text-indigo-200">
              <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
              <span><b>Dica de Produtividade:</b> Use <code>Ctrl+M</code> para convocar a Mesa Redonda Multi-IA ou <code>Ctrl+K</code> para buscar qualquer tela rapidamente.</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {activeStep > 1 && (
                <button
                  type="button"
                  onClick={() => setActiveStep(prev => prev - 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  Anterior
                </button>
              )}
              {activeStep < steps.length && (
                <button
                  type="button"
                  onClick={() => setActiveStep(prev => prev + 1)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500"
                >
                  Próximo Passo
                </button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
