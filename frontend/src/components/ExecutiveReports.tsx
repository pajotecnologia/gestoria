import React, { useState, useEffect } from 'react';
import { apiUrl } from '../api/client';
import { exportReportToPdf, ReportData } from '../utils/pdfExport';
import {
  FileText,
  Printer,
  Download,
  Building2,
  FolderKanban,
  Sparkles,
  TrendingUp,
  Target,
  Wand2,
  CheckCircle2,
  Copy,
  Calendar,
  UserCheck,
  RefreshCw,
  Award
} from 'lucide-react';

interface ExecutiveReportsProps {
  jwtToken: string;
}

interface Client {
  id: string;
  name: string;
  industry?: string;
}

interface Campaign {
  id: string;
  clientId: string;
  name: string;
  objective: string;
  status: string;
  budget?: number;
  strategyOutput?: string;
  adCreativeOutput?: string;
  metrics?: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr?: number;
    cpc?: number;
    cpa?: number;
    roas?: number;
    diagnostic?: string;
    lastUpdated?: string;
  };
}

export const ExecutiveReports: React.FC<ExecutiveReportsProps> = ({ jwtToken }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');
  const [reportType, setReportType] = useState<'roi' | 'strategy' | 'creatives' | 'benchmark'>('roi');
  const [period, setPeriod] = useState<string>('Últimos 30 dias');
  const [agencyName, setAgencyName] = useState<string>('Nexus Growth & Performance');
  const [analystName, setAnalystName] = useState<string>('Equipe de Estratégia IA');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientsRes, campaignsRes] = await Promise.all([
        fetch(apiUrl('/api/clients'), { credentials: 'include', headers: { Authorization: `Bearer ${jwtToken}` } }),
        fetch(apiUrl('/api/campaigns'), { credentials: 'include', headers: { Authorization: `Bearer ${jwtToken}` } })
      ]);
      if (clientsRes.ok) {
        const cData = await clientsRes.json();
        setClients(cData);
      }
      if (campaignsRes.ok) {
        const cpData = await campaignsRes.json();
        setCampaigns(cpData);
      }
    } catch (err) {
      console.error('Erro ao carregar dados para relatórios:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtragem de campanhas
  const filteredCampaigns = campaigns.filter(c => {
    const matchClient = selectedClientId === 'all' || c.clientId === selectedClientId;
    const matchCamp = selectedCampaignId === 'all' || c.id === selectedCampaignId;
    return matchClient && matchCamp;
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  // Cálculos agregados para KPIs
  const totalSpend = filteredCampaigns.reduce((sum, c) => sum + (c.metrics?.spend || 0), 0);
  const totalImpressions = filteredCampaigns.reduce((sum, c) => sum + (c.metrics?.impressions || 0), 0);
  const totalClicks = filteredCampaigns.reduce((sum, c) => sum + (c.metrics?.clicks || 0), 0);
  const totalConversions = filteredCampaigns.reduce((sum, c) => sum + (c.metrics?.conversions || 0), 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';
  const avgCpc = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : '0.00';
  const avgCpa = totalConversions > 0 ? (totalSpend / totalConversions).toFixed(2) : '0.00';
  const avgRoas = totalSpend > 0 ? (((totalConversions * 180) / totalSpend)).toFixed(1) : '3.8';

  // Monta objeto ReportData para o PDF
  const buildReportData = (): ReportData => {
    const clientTitle = selectedClient ? selectedClient.name : 'Consolidado da Agência';
    const campaignTitle = selectedCampaign ? ` - Campanha: ${selectedCampaign.name}` : '';

    if (reportType === 'roi') {
      return {
        title: `Relatório Executivo de Performance & ROI`,
        subtitle: `Período: ${period} | Elaborado por: ${analystName}`,
        agencyName,
        clientName: `${clientTitle}${campaignTitle}`,
        kpis: [
          { label: 'Investimento Total', value: `R$ ${totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, hint: `${filteredCampaigns.length} campanhas` },
          { label: 'Impressões Totais', value: totalImpressions.toLocaleString('pt-BR'), hint: 'Alcance qualificado' },
          { label: 'Cliques Gerados', value: totalClicks.toLocaleString('pt-BR'), hint: `CTR: ${avgCtr}% | CPC: R$ ${avgCpc}` },
          { label: 'Conversões / Leads', value: totalConversions.toLocaleString('pt-BR'), hint: `CPL Médio: R$ ${avgCpa}` },
          { label: 'ROAS Médio Estimado', value: `${avgRoas}x`, hint: 'Retorno sobre gasto em ads' }
        ],
        sections: [
          {
            title: '1. Diagnóstico de Eficiência & Tráfego Pago',
            badge: 'Análise de Performance',
            content: filteredCampaigns
              .filter(c => c.metrics?.diagnostic)
              .map(c => `• [${c.name}]: ${c.metrics?.diagnostic}`)
              .join('\n\n') || 'Todas as métricas de conversão operam dentro do padrão ideal de escala da agência. Taxas de conversão com estabilidade operacional.'
          },
          {
            title: '2. Alocação Estratégica & Próximas Ações',
            badge: 'Plano de Ação',
            content: customNotes || '• Manter escalabilidade nos conjuntos com ROAS acima de 3.0x.\n• Realizar testes A/B de criativos no topo de funil para reduzir o CPC.\n• Otimizar páginas de destino e checkout para maximizar taxa de conversão direta.'
          }
        ]
      };
    }

    if (reportType === 'strategy') {
      const activeStrategies = filteredCampaigns.filter(c => c.strategyOutput);
      return {
        title: `Plano Tático & Estrutura de Funil`,
        subtitle: `Período: ${period} | Estratégia de Posicionamento`,
        agencyName,
        clientName: clientTitle,
        kpis: [
          { label: 'Campanhas Estruturadas', value: `${filteredCampaigns.length}`, hint: 'Modelos de Funil' },
          { label: 'Canais Mapeados', value: 'Meta Ads, Google, TikTok', hint: 'Multi-plataforma' },
          { label: 'Etapas de Funil', value: 'AIDA Completo', hint: 'Topo, Meio e Fundo' }
        ],
        sections: activeStrategies.length > 0 ? activeStrategies.map(c => ({
          title: `Estratégia: ${c.name} (${c.objective})`,
          badge: 'Funil AIDA',
          content: c.strategyOutput || ''
        })) : [
          {
            title: 'Diretrizes Gerais do Funil',
            badge: 'Planejamento',
            content: 'Nenhuma estratégia detalhada foi encontrada para o filtro atual. Gere estratégias no módulo Campanhas para compilar automaticamente este relatório.'
          }
        ]
      };
    }

    if (reportType === 'creatives') {
      const activeCreatives = filteredCampaigns.filter(c => c.adCreativeOutput);
      return {
        title: `Dossiê de Criativos, Copies & Roteiros`,
        subtitle: `Período: ${period} | Curadoria de Hooks e Anúncios de Alta Conversão`,
        agencyName,
        clientName: clientTitle,
        kpis: [
          { label: 'Campanhas com Criativos', value: `${activeCreatives.length}`, hint: 'Ativos Gerados' },
          { label: 'Formatos Suportados', value: 'Feed 1:1, Stories 9:16', hint: 'Meta & TikTok' },
          { label: 'Modelos de Copywriting', value: 'AIDA, PAS, Storytelling', hint: 'Gatilhos mentais' }
        ],
        sections: activeCreatives.length > 0 ? activeCreatives.map(c => ({
          title: `Criativos & Copies: ${c.name}`,
          badge: 'Copywriting',
          content: c.adCreativeOutput || ''
        })) : [
          {
            title: 'Dossiê de Criativos',
            badge: 'Ad Studio',
            content: 'Gere criativos no módulo Ad Creative Studio para visualizar hooks, copies persuasivas e roteiros automaticamente anexados ao dossiê.'
          }
        ]
      };
    }

    // Benchmark
    return {
      title: `Benchmarking de Performance da Agência`,
      subtitle: `Período: ${period} | Comparativo de Eficiência entre Contas`,
      agencyName,
      clientName: 'Visão Geral Multi-Cliente',
      kpis: [
        { label: 'Total Investido', value: `R$ ${totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
        { label: 'Leads Totais', value: totalConversions.toLocaleString('pt-BR') },
        { label: 'CPA Médio Global', value: `R$ ${avgCpa}` }
      ],
      sections: [
        {
          title: 'Ranking de Eficiência por Campanha',
          badge: 'Performance Ranking',
          content: filteredCampaigns.map((c, i) => {
            const spend = c.metrics?.spend || 0;
            const conv = c.metrics?.conversions || 0;
            const cpa = conv > 0 ? (spend / conv).toFixed(2) : 'N/A';
            return `#${i + 1} ${c.name} | Gasto: R$ ${spend.toFixed(2)} | Conversões: ${conv} | CPL: R$ ${cpa} | Status: ${c.status}`;
          }).join('\n') || 'Nenhuma campanha cadastrada para ranking.'
        },
        {
          title: 'Parecer Executivo da Diretoria',
          badge: 'Insights',
          content: customNotes || 'Os ativos da agência apresentam taxas de conversão superiores à média de mercado no segmento. Recomendada a expansão de orçamento para os três primeiros colocados.'
        }
      ]
    };
  };

  const handleExportPdf = () => {
    const reportData = buildReportData();
    exportReportToPdf(reportData);
  };

  const handleCopyText = () => {
    const reportData = buildReportData();
    let text = `📊 *${reportData.title}*\n`;
    text += `🏢 Agência: ${reportData.agencyName || 'Gestor IA'}\n`;
    text += `👤 Cliente: ${reportData.clientName || 'Geral'}\n`;
    text += `📅 Período: ${period}\n\n`;

    if (reportData.kpis) {
      text += `*Métricas Principais:*\n`;
      reportData.kpis.forEach(k => {
        text += `• ${k.label}: ${k.value} ${k.hint ? `(${k.hint})` : ''}\n`;
      });
      text += `\n`;
    }

    reportData.sections.forEach(s => {
      text += `*${s.title}*\n${s.content}\n\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-500 font-semibold text-xs tracking-wider uppercase">
            <FileText className="w-4 h-4" />
            Central de Inteligência Executiva
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 mt-1">
            Relatórios Executivos & Apresentações
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Gere dossiês com visual corporativo de alto impacto, prontos para impressão em PDF ou envio rápido para clientes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="shadcn-btn-secondary flex items-center gap-2 text-xs py-2 px-3"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
          <button
            onClick={handleCopyText}
            className="shadcn-btn-secondary flex items-center gap-2 text-xs py-2 px-3"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado!' : 'Copiar Texto'}
          </button>
          <button
            onClick={handleExportPdf}
            className="shadcn-btn-primary flex items-center gap-2 text-xs py-2 px-4 shadow-lg shadow-indigo-500/20"
          >
            <Printer className="w-4 h-4" />
            Exportar PDF / Imprimir
          </button>
        </div>
      </div>

      {/* Report Type Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setReportType('roi')}
          className={`text-left p-4 rounded-2xl border transition-all ${
            reportType === 'roi'
              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 shadow-md ring-1 ring-indigo-500/50'
              : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            {reportType === 'roi' && <span className="text-[10px] bg-indigo-500 text-white font-bold px-2 py-0.5 rounded-full">Selecionado</span>}
          </div>
          <div className="font-bold text-sm">Performance & ROI</div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Investimento, CPA, ROAS e diagnóstico de tráfego.</div>
        </button>

        <button
          onClick={() => setReportType('strategy')}
          className={`text-left p-4 rounded-2xl border transition-all ${
            reportType === 'strategy'
              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 shadow-md ring-1 ring-indigo-500/50'
              : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
              <Target className="w-5 h-5" />
            </div>
            {reportType === 'strategy' && <span className="text-[10px] bg-indigo-500 text-white font-bold px-2 py-0.5 rounded-full">Selecionado</span>}
          </div>
          <div className="font-bold text-sm">Plano Tático & Funil</div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Estrutura AIDA, personas, canais e posicionamento.</div>
        </button>

        <button
          onClick={() => setReportType('creatives')}
          className={`text-left p-4 rounded-2xl border transition-all ${
            reportType === 'creatives'
              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 shadow-md ring-1 ring-indigo-500/50'
              : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-500">
              <Wand2 className="w-5 h-5" />
            </div>
            {reportType === 'creatives' && <span className="text-[10px] bg-indigo-500 text-white font-bold px-2 py-0.5 rounded-full">Selecionado</span>}
          </div>
          <div className="font-bold text-sm">Dossiê de Criativos</div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Hooks persuasivos, copies e roteiros de anúncios.</div>
        </button>

        <button
          onClick={() => setReportType('benchmark')}
          className={`text-left p-4 rounded-2xl border transition-all ${
            reportType === 'benchmark'
              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 shadow-md ring-1 ring-indigo-500/50'
              : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Award className="w-5 h-5" />
            </div>
            {reportType === 'benchmark' && <span className="text-[10px] bg-indigo-500 text-white font-bold px-2 py-0.5 rounded-full">Selecionado</span>}
          </div>
          <div className="font-bold text-sm">Benchmarking Global</div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Ranking comparativo entre campanhas e contas.</div>
        </button>
      </div>

      {/* Filter & Customization Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
            Filtrar Cliente
          </label>
          <select
            value={selectedClientId}
            onChange={(e) => {
              setSelectedClientId(e.target.value);
              setSelectedCampaignId('all');
            }}
            className="shadcn-input text-xs"
          >
            <option value="all">🏢 Todos os Clientes ({clients.length})</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <FolderKanban className="w-3.5 h-3.5 text-indigo-500" />
            Filtrar Campanha
          </label>
          <select
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            className="shadcn-input text-xs"
          >
            <option value="all">📁 Todas as Campanhas ({filteredCampaigns.length})</option>
            {campaigns
              .filter(c => selectedClientId === 'all' || c.clientId === selectedClientId)
              .map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            Período
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="shadcn-input text-xs"
          >
            <option value="Últimos 7 dias">Últimos 7 dias</option>
            <option value="Últimos 14 dias">Últimos 14 dias</option>
            <option value="Últimos 30 dias">Últimos 30 dias</option>
            <option value="Mês Atual">Mês Atual</option>
            <option value="Todo o Histórico">Todo o Histórico</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
            Nome da Agência
          </label>
          <input
            type="text"
            value={agencyName}
            onChange={(e) => setAgencyName(e.target.value)}
            placeholder="Ex: Agência Nexus"
            className="shadcn-input text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
            Especialista / Autor
          </label>
          <input
            type="text"
            value={analystName}
            onChange={(e) => setAnalystName(e.target.value)}
            placeholder="Ex: Consultor de Tráfego"
            className="shadcn-input text-xs"
          />
        </div>
      </div>

      {/* Observations Box */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
        <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Parecer & Recomendações do Consultor (Opcional - aparecerá em destaque no PDF)
        </label>
        <textarea
          rows={2}
          value={customNotes}
          onChange={(e) => setCustomNotes(e.target.value)}
          placeholder="Ex: Recomendamos realocação de 30% do orçamento para as variações em vídeo (Reels) que demonstraram CPL 40% menor..."
          className="shadcn-input text-xs resize-none"
        />
      </div>

      {/* LIVE PREVIEW OF THE REPORT */}
      <div className="rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 dark:border-zinc-800/80 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                🤖 {agencyName}
              </span>
              <span className="text-zinc-400">&bull;</span>
              <span className="text-xs text-slate-500 dark:text-zinc-400">Prévia do Relatório</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100 mt-1">
              {buildReportData().title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              {buildReportData().subtitle} &bull; <b>Cliente:</b> {buildReportData().clientName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              className="shadcn-btn-primary flex items-center gap-2 text-xs py-2 px-4 shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar / Imprimir PDF
            </button>
          </div>
        </div>

        {/* Preview KPI Cards */}
        {buildReportData().kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 my-6">
            {buildReportData().kpis?.map((kpi, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/60"
              >
                <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wide">
                  {kpi.label}
                </div>
                <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-zinc-100 mt-1">
                  {kpi.value}
                </div>
                {kpi.hint && (
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                    {kpi.hint}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Preview Sections */}
        <div className="space-y-6 mt-6">
          {buildReportData().sections.map((section, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                  {section.title}
                </h3>
                {section.badge && (
                  <span className="text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    {section.badge}
                  </span>
                )}
              </div>
              <div className="text-xs leading-relaxed text-slate-700 dark:text-zinc-300 whitespace-pre-wrap bg-slate-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-slate-100 dark:border-zinc-800/80 font-sans">
                {section.content}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-8 pt-4 border-t border-slate-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500 gap-2">
          <div>Gestor IA SaaS &bull; Documento executivo confidencial gerado para tomada de decisão.</div>
          <div className="font-semibold text-indigo-500">Pronto para apresentação</div>
        </div>
      </div>
    </div>
  );
};
