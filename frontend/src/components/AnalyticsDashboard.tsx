import React, { useEffect, useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  Clock3, 
  DollarSign, 
  FolderKanban, 
  Layers, 
  Percent, 
  RefreshCw, 
  Sparkles, 
  Users, 
  XCircle,
  TrendingUp,
  MousePointerClick,
  Target,
  BarChart3,
  Bot,
  Pencil,
  Copy,
  Check,
  X,
  Search,
  Activity
} from 'lucide-react';
import { apiUrl } from '../api/client';

type Period = '7d' | '30d' | '12m';

type Analytics = {
  period: Period;
  kpis: {
    revenue: number | null;
    spend: number | null;
    activeUsers: number;
    conversions: number | null;
    retention: number | null;
    activeUsersVariation: number | null;
    conversionsVariation: number | null;
    retentionVariation: number | null;
    revenueVariation: number | null;
    activeCampaigns: number;
    totalClicks?: number;
    totalImpressions?: number;
    roas?: number;
  };
  trend: {
    label: string;
    clients: number;
    campaigns: number;
    aiRequests: number;
  }[];
  distribution: {
    category: string;
    value: number;
  }[];
  activity: {
    id: string;
    action: string;
    entity: string;
    userName: string;
    createdAt: string;
    status: string;
  }[];
};

type Campaign = {
  id: string;
  name: string;
  objective: string;
  offer?: string;
  audience?: string;
  channels?: string;
  budget?: string;
  isActive: boolean;
  spend?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  revenue?: number;
  aiDiagnostic?: string;
  aiDiagnosticAt?: string;
  client?: {
    id: string;
    name: string;
    segment?: string;
  };
};

const formatMoney = (v: number | null | undefined) => 
  v === null || v === undefined || isNaN(v) ? 'R$ 0,00' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatNumber = (v: number | null | undefined) => 
  v === null || v === undefined || isNaN(v) ? '0' : new Intl.NumberFormat('pt-BR').format(v);

const formatPercent = (v: number | null | undefined) => 
  v === null || v === undefined || isNaN(v) ? '0.0%' : v.toFixed(2) + '%';

const formatVariation = (v: number | null) => 
  v === null ? 'N/D' : (v >= 0 ? '+' : '') + v.toFixed(1) + '%';

const getActionLabel = (v: string) => {
  const map: Record<string, string> = {
    CAMPAIGN_CREATED: 'Campanha criada',
    CAMPAIGN_UPDATED: 'Campanha atualizada',
    CAMPAIGN_ACTIVATED: 'Campanha ativada',
    CAMPAIGN_DEACTIVATED: 'Campanha pausada',
    CAMPAIGN_STRATEGY_GENERATED: 'Estratégia gerada',
    CAMPAIGN_METRICS_UPDATED: 'Métricas de tráfego atualizadas',
    CAMPAIGN_AI_DIAGNOSTIC_GENERATED: 'Diagnóstico IA gerado',
    CLIENT_CREATED: 'Empresa cadastrada',
    CLIENT_UPDATED: 'Empresa atualizada',
    CLIENT_DELETED: 'Empresa excluída',
  };
  return map[v] || v.replace(/_/g, ' ');
};

const Skeleton = ({ className }: { className: string }) => (
  <div className={`animate-pulse rounded-xl bg-slate-200/70 dark:bg-zinc-800/60 ${className}`} />
);

// KPI Card
const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'indigo',
  badge,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number | null;
  accentColor?: 'indigo' | 'emerald' | 'cyan' | 'violet' | 'amber' | 'rose';
  badge?: string;
}) => {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/10',
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-500/20',
      glow: 'group-hover:border-indigo-500/40',
    },
    emerald: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/10',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/20',
      glow: 'group-hover:border-emerald-500/40',
    },
    cyan: {
      bg: 'bg-cyan-500/10 dark:bg-cyan-500/10',
      text: 'text-cyan-600 dark:text-cyan-400',
      border: 'border-cyan-500/20',
      glow: 'group-hover:border-cyan-500/40',
    },
    violet: {
      bg: 'bg-violet-500/10 dark:bg-violet-500/10',
      text: 'text-violet-600 dark:text-violet-400',
      border: 'border-violet-500/20',
      glow: 'group-hover:border-violet-500/40',
    },
    amber: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/10',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/20',
      glow: 'group-hover:border-amber-500/40',
    },
    rose: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/10',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-500/20',
      glow: 'group-hover:border-rose-500/40',
    },
  };

  const style = colorMap[accentColor];
  const isPositive = trend !== undefined && trend !== null && trend >= 0;

  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md dark:border-zinc-800/90 dark:bg-zinc-900/60 dark:hover:bg-zinc-900/80 dark:hover:shadow-black/40 ${style.glow}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">{title}</span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${style.border} ${style.bg} ${style.text}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</span>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            {badge ? (
              <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.bg} ${style.text} border ${style.border}`}>
                {badge}
              </span>
            ) : trend !== undefined && trend !== null ? (
              <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                isPositive 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              }`}>
                {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {formatVariation(trend)}
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-zinc-800/80 dark:text-zinc-400">
                Métricas Ativas
              </span>
            )}
          </div>
          {subtitle && <span className="text-[10px] text-slate-400 dark:text-zinc-500 truncate max-w-[140px]">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
};

// Growth Chart Component
const InteractiveChart = ({ data }: { data: Analytics['trend'] }) => {
  const [activeMetric, setActiveMetric] = useState<'all' | 'clients' | 'campaigns' | 'aiRequests'>('all');
  
  const w = 820;
  const h = 300;
  const px = 40;
  const py = 30;

  const maxVal = Math.max(1, ...data.flatMap(d => [d.clients, d.campaigns, d.aiRequests]));
  
  const getX = (i: number) => px + (i / Math.max(1, data.length - 1)) * (w - px * 2);
  const getY = (v: number) => h - py - (v / maxVal) * (h - py * 2);

  const getPath = (key: 'clients' | 'campaigns' | 'aiRequests') => {
    return data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d[key]).toFixed(1)}`).join(' ');
  };

  const getArea = (key: 'clients' | 'campaigns' | 'aiRequests') => {
    if (data.length === 0) return '';
    const line = getPath(key);
    const firstX = getX(0).toFixed(1);
    const lastX = getX(data.length - 1).toFixed(1);
    const bottomY = (h - py).toFixed(1);
    return `${line} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800/80 pb-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Evolução de Crescimento & Operação</h4>
          <p className="text-xs text-slate-500 dark:text-zinc-400">Fluxo de empresas ativas, campanhas geradas e chamadas aos Agentes de IA.</p>
        </div>

        {/* Legend / Filter buttons */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 dark:border-zinc-800 dark:bg-zinc-950 p-1">
          <button
            onClick={() => setActiveMetric('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
              activeMetric === 'all' 
                ? 'bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-white' 
                : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setActiveMetric('clients')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
              activeMetric === 'clients' ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            Empresas
          </button>
          <button
            onClick={() => setActiveMetric('campaigns')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
              activeMetric === 'campaigns' ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            Campanhas
          </button>
          <button
            onClick={() => setActiveMetric('aiRequests')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
              activeMetric === 'aiRequests' ? 'bg-violet-500/20 text-violet-600 dark:text-violet-300 border border-violet-500/30' : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            Chamadas IA
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-[290px] min-w-[700px] w-full">
          <defs>
            <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="violetGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = h - py - ratio * (h - py * 2);
            return (
              <g key={ratio}>
                <line 
                  x1={px} 
                  y1={y} 
                  x2={w - px} 
                  y2={y} 
                  stroke="currentColor" 
                  strokeDasharray="4 4" 
                  strokeWidth="1" 
                  className="text-slate-200 dark:text-zinc-800"
                />
                <text 
                  x={px - 8} 
                  y={y + 4} 
                  fontSize="10" 
                  textAnchor="end"
                  className="fill-slate-400 dark:fill-zinc-500 font-mono"
                >
                  {Math.round(ratio * maxVal)}
                </text>
              </g>
            );
          })}

          {/* X Axis Labels */}
          {data.map((d, i) => (
            <text 
              key={d.label} 
              x={getX(i)} 
              y={h - 8} 
              fontSize="10" 
              textAnchor="middle"
              className="fill-slate-400 dark:fill-zinc-500 font-mono"
            >
              {d.label}
            </text>
          ))}

          {/* Areas */}
          {(activeMetric === 'all' || activeMetric === 'clients') && (
            <path d={getArea('clients')} fill="url(#indigoGrad)" />
          )}
          {(activeMetric === 'all' || activeMetric === 'campaigns') && (
            <path d={getArea('campaigns')} fill="url(#cyanGrad)" />
          )}
          {(activeMetric === 'all' || activeMetric === 'aiRequests') && (
            <path d={getArea('aiRequests')} fill="url(#violetGrad)" />
          )}

          {/* Lines */}
          {(activeMetric === 'all' || activeMetric === 'clients') && (
            <path d={getPath('clients')} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
          )}
          {(activeMetric === 'all' || activeMetric === 'campaigns') && (
            <path d={getPath('campaigns')} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />
          )}
          {(activeMetric === 'all' || activeMetric === 'aiRequests') && (
            <path d={getPath('aiRequests')} fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
          )}

          {/* Dots */}
          {data.map((d, i) => (
            <g key={i}>
              {(activeMetric === 'all' || activeMetric === 'clients') && (
                <circle cx={getX(i)} cy={getY(d.clients)} r="4" fill="#6366f1" stroke="currentColor" strokeWidth="2" className="text-white dark:text-zinc-950 transition hover:r-6">
                  <title>{`${d.label} • Empresas: ${d.clients}`}</title>
                </circle>
              )}
              {(activeMetric === 'all' || activeMetric === 'campaigns') && (
                <circle cx={getX(i)} cy={getY(d.campaigns)} r="4" fill="#06b6d4" stroke="currentColor" strokeWidth="2" className="text-white dark:text-zinc-950 transition hover:r-6">
                  <title>{`${d.label} • Campanhas: ${d.campaigns}`}</title>
                </circle>
              )}
              {(activeMetric === 'all' || activeMetric === 'aiRequests') && (
                <circle cx={getX(i)} cy={getY(d.aiRequests)} r="4" fill="#a855f7" stroke="currentColor" strokeWidth="2" className="text-white dark:text-zinc-950 transition hover:r-6">
                  <title>{`${d.label} • Chamadas de IA: ${d.aiRequests}`}</title>
                </circle>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

export const AnalyticsDashboard: React.FC<{ jwtToken: string }> = ({ jwtToken }) => {
  const [activeTab, setActiveTab] = useState<'performance' | 'agency'>('performance');
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<Analytics | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchCampaign, setSearchCampaign] = useState('');

  // Modal de Edição de Métricas
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [metricForm, setMetricForm] = useState({
    spend: '',
    impressions: '',
    clicks: '',
    conversions: '',
    revenue: '',
  });
  const [savingMetrics, setSavingMetrics] = useState(false);

  // Modal de Diagnóstico IA
  const [diagnosticCampaign, setDiagnosticCampaign] = useState<Campaign | null>(null);
  const [diagnosticText, setDiagnosticText] = useState<string>('');
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [copiedDiagnostic, setCopiedDiagnostic] = useState(false);

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(apiUrl('/api/analytics?period=' + period), {
        headers: { Authorization: 'Bearer ' + jwtToken }
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Falha ao carregar analytics.');
      setData(j.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar analytics.');
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    setCampaignsLoading(true);
    try {
      const r = await fetch(apiUrl('/api/campaigns'), {
        headers: { Authorization: 'Bearer ' + jwtToken }
      });
      const j = await r.json();
      if (r.ok && j.data) {
        setCampaigns(j.data);
      }
    } catch {
      // Ignora erro silenciosamente
    } finally {
      setCampaignsLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
    void loadCampaigns();
  }, [jwtToken, period]);

  // Cálculos agregados de Performance das campanhas
  const totalSpend = campaigns.reduce((acc, c) => acc + (c.spend || 0), 0);
  const totalImpressions = campaigns.reduce((acc, c) => acc + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);
  const totalConversions = campaigns.reduce((acc, c) => acc + (c.conversions || 0), 0);
  const totalRevenue = campaigns.reduce((acc, c) => acc + (c.revenue || 0), 0);

  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const avgROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const netProfit = totalRevenue - totalSpend;

  const openMetricsModal = (c: Campaign) => {
    setEditingCampaign(c);
    setMetricForm({
      spend: c.spend !== undefined && c.spend !== null ? String(c.spend) : '',
      impressions: c.impressions !== undefined && c.impressions !== null ? String(c.impressions) : '',
      clicks: c.clicks !== undefined && c.clicks !== null ? String(c.clicks) : '',
      conversions: c.conversions !== undefined && c.conversions !== null ? String(c.conversions) : '',
      revenue: c.revenue !== undefined && c.revenue !== null ? String(c.revenue) : '',
    });
  };

  const handleSaveMetrics = async (e: React.FormEvent, generateAiAfter = false) => {
    e.preventDefault();
    if (!editingCampaign) return;
    setSavingMetrics(true);
    try {
      const payload = {
        spend: metricForm.spend ? parseFloat(metricForm.spend) : 0,
        impressions: metricForm.impressions ? parseInt(metricForm.impressions, 10) : 0,
        clicks: metricForm.clicks ? parseInt(metricForm.clicks, 10) : 0,
        conversions: metricForm.conversions ? parseInt(metricForm.conversions, 10) : 0,
        revenue: metricForm.revenue ? parseFloat(metricForm.revenue) : 0,
      };

      const res = await fetch(apiUrl(`/api/campaigns/${editingCampaign.id}/metrics`), {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer ' + jwtToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao salvar métricas.');

      const updatedCampaign = json.data;
      setCampaigns(prev => prev.map(c => c.id === updatedCampaign.id ? updatedCampaign : c));
      setEditingCampaign(null);
      void loadAnalytics();

      if (generateAiAfter) {
        void handleRunDiagnostic(updatedCampaign);
      }
    } catch (err: any) {
      window.alert(err.message || 'Falha ao salvar métricas.');
    } finally {
      setSavingMetrics(false);
    }
  };

  const handleRunDiagnostic = async (campaign: Campaign) => {
    setDiagnosticCampaign(campaign);
    setDiagnosticText(campaign.aiDiagnostic || '');
    setDiagnosticLoading(true);

    try {
      const res = await fetch(apiUrl(`/api/campaigns/${campaign.id}/analyze-metrics`), {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + jwtToken,
          'Content-Type': 'application/json',
        },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao gerar diagnóstico por IA.');

      setDiagnosticText(json.data.diagnostic);
      setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, aiDiagnostic: json.data.diagnostic, aiDiagnosticAt: json.data.diagnosticAt } : c));
    } catch (err: any) {
      window.alert(err.message || 'Falha ao analisar métricas.');
    } finally {
      setDiagnosticLoading(false);
    }
  };

  const handleCopyDiagnostic = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDiagnostic(true);
    setTimeout(() => setCopiedDiagnostic(false), 2000);
  };

  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(searchCampaign.toLowerCase()) || 
    c.client?.name?.toLowerCase().includes(searchCampaign.toLowerCase()) ||
    c.objective?.toLowerCase().includes(searchCampaign.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Performance & Inteligência de Tráfego
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              Tempo Real
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Acompanhe números de investimento, leads, CTR, ROAS e receba auditorias e diagnósticos acionáveis com IA.
          </p>
        </div>

        {/* Action controls & Tab Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 dark:border-zinc-800 dark:bg-zinc-950 p-1">
            <button
              onClick={() => setActiveTab('performance')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === 'performance' 
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-zinc-800 dark:text-indigo-400' 
                  : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Performance & IA</span>
            </button>
            <button
              onClick={() => setActiveTab('agency')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === 'agency' 
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-zinc-800 dark:text-indigo-400' 
                  : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Visão da Agência</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => { void loadAnalytics(); void loadCampaigns(); }}
            disabled={loading || campaignsLoading}
            className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading || campaignsLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* =========================================================================
          ABA 1: PERFORMANCE DE TRÁFEGO & DIAGNÓSTICO IA
          ========================================================================= */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* KPI Cards Grid de Tráfego Pago */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {campaignsLoading ? (
              [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36" />)
            ) : (
              <>
                <MetricCard
                  title="Investimento Total (Spend)"
                  value={formatMoney(totalSpend)}
                  icon={DollarSign}
                  badge="Tráfego Pago"
                  accentColor="indigo"
                  subtitle={`${formatNumber(totalImpressions)} impressões`}
                />
                <MetricCard
                  title="Receita / Faturamento"
                  value={formatMoney(totalRevenue)}
                  icon={TrendingUp}
                  badge={totalSpend > 0 ? `Lucro: ${formatMoney(netProfit)}` : 'Sem dados'}
                  accentColor="emerald"
                  subtitle={`ROAS Médio: ${avgROAS.toFixed(2)}x`}
                />
                <MetricCard
                  title="Leads & Conversões"
                  value={formatNumber(totalConversions)}
                  icon={Target}
                  badge={`CPL Médio: ${formatMoney(avgCPA)}`}
                  accentColor="cyan"
                  subtitle={`${campaigns.length} campanhas`}
                />
                <MetricCard
                  title="Cliques & CTR Médio"
                  value={formatNumber(totalClicks)}
                  icon={MousePointerClick}
                  badge={`CTR: ${formatPercent(avgCTR)}`}
                  accentColor="violet"
                  subtitle={`CPC Médio: ${formatMoney(avgCPC)}`}
                />
              </>
            )}
          </section>

          {/* Seção Principal de Campanhas e Diagnósticos */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur-xl dark:border-zinc-800/90 dark:bg-zinc-900/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-zinc-800/80 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-500" />
                  <span>Auditoria & Performance por Campanha</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Cadastre métricas reais e dispare diagnósticos com a Gestora de Tráfego Renata Dias e o CMO Dr. Arthur.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filtrar campanha ou cliente..."
                  value={searchCampaign}
                  onChange={(e) => setSearchCampaign(e.target.value)}
                  className="shadcn-input pl-9 text-xs"
                />
              </div>
            </div>

            {campaignsLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 dark:text-zinc-500">
                Carregando campanhas e métricas de anúncios...
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
                <FolderKanban className="h-8 w-8 text-slate-400 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700 dark:text-zinc-300">Nenhuma campanha encontrada</p>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">Crie campanhas na aba "Campanhas & Estratégias" para monitorar sua performance.</p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1">
                {filteredCampaigns.map((c) => {
                  const spend = c.spend || 0;
                  const clicks = c.clicks || 0;
                  const impressions = c.impressions || 0;
                  const conversions = c.conversions || 0;
                  const revenue = c.revenue || 0;

                  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
                  const cpc = clicks > 0 ? spend / clicks : 0;
                  const cpa = conversions > 0 ? spend / conversions : 0;
                  const roas = spend > 0 ? revenue / spend : 0;

                  return (
                    <div 
                      key={c.id} 
                      className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/40 hover:border-indigo-500/30 transition duration-200 space-y-3"
                    >
                      {/* Top Bar of Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{c.name}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              c.isActive 
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'
                            }`}>
                              {c.isActive ? 'Ativa' : 'Pausada'}
                            </span>
                          </div>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                            {c.client?.name || 'Empresa não vinculada'} {c.client?.segment ? `• ${c.client.segment}` : ''}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openMetricsModal(c)}
                            className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer shadow-xs"
                          >
                            <Pencil className="h-3.5 w-3.5 text-indigo-500" />
                            <span>Métricas</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRunDiagnostic(c)}
                            className="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-3 text-xs font-semibold text-white shadow-xs hover:from-indigo-400 hover:to-violet-500 transition cursor-pointer"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>{c.aiDiagnostic ? 'Ver Diagnóstico IA' : 'Gerar Diagnóstico IA'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Objective & Channels */}
                      <p className="text-xs text-slate-600 dark:text-zinc-300 line-clamp-1">
                        <b>Objetivo:</b> {c.objective}
                      </p>

                      {/* Performance Metric Badges Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2 border-t border-slate-200/60 dark:border-zinc-800/60 text-xs">
                        <div className="rounded-lg bg-white p-2 border border-slate-200/70 dark:bg-zinc-900/80 dark:border-zinc-800">
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">Investimento</span>
                          <span className="font-bold text-slate-900 dark:text-white">{formatMoney(spend)}</span>
                        </div>

                        <div className="rounded-lg bg-white p-2 border border-slate-200/70 dark:bg-zinc-900/80 dark:border-zinc-800">
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">Cliques & CTR</span>
                          <span className="font-bold text-slate-900 dark:text-white">{formatNumber(clicks)} <span className="text-[10px] font-normal text-indigo-500">({ctr.toFixed(1)}%)</span></span>
                        </div>

                        <div className="rounded-lg bg-white p-2 border border-slate-200/70 dark:bg-zinc-900/80 dark:border-zinc-800">
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">CPC Médio</span>
                          <span className="font-bold text-slate-900 dark:text-white">{formatMoney(cpc)}</span>
                        </div>

                        <div className="rounded-lg bg-white p-2 border border-slate-200/70 dark:bg-zinc-900/80 dark:border-zinc-800">
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">Conversões / Leads</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(conversions)}</span>
                        </div>

                        <div className="rounded-lg bg-white p-2 border border-slate-200/70 dark:bg-zinc-900/80 dark:border-zinc-800">
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">CPL / CPA</span>
                          <span className="font-bold text-slate-900 dark:text-white">{formatMoney(cpa)}</span>
                        </div>

                        <div className="rounded-lg bg-white p-2 border border-slate-200/70 dark:bg-zinc-900/80 dark:border-zinc-800">
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">ROAS & Receita</span>
                          <span className={`font-bold ${roas >= 1.5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                            {roas.toFixed(2)}x <span className="text-[10px] font-normal text-slate-400">({formatMoney(revenue)})</span>
                          </span>
                        </div>
                      </div>

                      {/* AI Diagnostic Preview if exists */}
                      {c.aiDiagnostic && (
                        <div className="rounded-xl border border-indigo-500/20 bg-indigo-50/40 p-3 text-xs dark:border-indigo-500/20 dark:bg-indigo-950/20 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <Bot className="h-4 w-4 text-indigo-500 shrink-0" />
                            <p className="text-slate-700 dark:text-zinc-300 truncate text-[11px]">
                              <b>Diagnóstico IA:</b> {c.aiDiagnostic.slice(0, 140)}...
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setDiagnosticCampaign(c); setDiagnosticText(c.aiDiagnostic || ''); }}
                            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer"
                          >
                            Abrir Relatório Completo →
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* =========================================================================
          ABA 2: VISÃO GERAL DA AGÊNCIA (GRÁFICOS, DISTRIBUIÇÃO & ATIVIDADES)
          ========================================================================= */}
      {activeTab === 'agency' && (
        <div className="space-y-6">
          {/* Segmented Period Tabs for Agency View */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Métricas de Crescimento da Agência</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Contas atendidas, volume de estratégias e trilhas de auditoria.</p>
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 dark:border-zinc-800 dark:bg-zinc-950 p-1">
              <button
                onClick={() => setPeriod('7d')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  period === '7d' 
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-white' 
                    : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                7 Dias
              </button>
              <button
                onClick={() => setPeriod('30d')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  period === '30d' 
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-white' 
                    : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                30 Dias
              </button>
              <button
                onClick={() => setPeriod('12m')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  period === '12m' 
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-white' 
                    : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                12 Meses
              </button>
            </div>
          </div>

          {/* KPI Cards Grid */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loading || !data ? (
              [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36" />)
            ) : (
              <>
                <MetricCard
                  title="Faturamento Agregado"
                  value={formatMoney(data.kpis.revenue)}
                  icon={DollarSign}
                  trend={data.kpis.revenueVariation}
                  accentColor="emerald"
                />
                <MetricCard
                  title="Empresas / Usuários"
                  value={formatNumber(data.kpis.activeUsers)}
                  icon={Users}
                  trend={data.kpis.activeUsersVariation}
                  accentColor="indigo"
                />
                <MetricCard
                  title="Campanhas Ativas"
                  value={formatNumber(data.kpis.activeCampaigns)}
                  icon={FolderKanban}
                  accentColor="cyan"
                />
                <MetricCard
                  title="Taxa de Retenção"
                  value={formatPercent(data.kpis.retention)}
                  icon={Percent}
                  trend={data.kpis.retentionVariation}
                  accentColor="violet"
                />
              </>
            )}
          </section>

          {/* Charts & Distribution Section */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Main Growth Chart (2 Cols) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur-xl dark:border-zinc-800/90 dark:bg-zinc-900/60 lg:col-span-2">
              {loading || !data ? (
                <Skeleton className="h-[340px]" />
              ) : (
                <InteractiveChart data={data.trend} />
              )}
            </div>

            {/* Distribution Card (1 Col) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur-xl dark:border-zinc-800/90 dark:bg-zinc-900/60">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Estágio das Campanhas</h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Distribuição por status operacional.</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Layers className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {loading || !data ? (
                  <Skeleton className="h-48" />
                ) : data.distribution.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 p-8 text-center">
                    <Sparkles className="h-6 w-6 text-slate-400 dark:text-zinc-600 mb-2" />
                    <p className="text-xs text-slate-500 dark:text-zinc-400">Nenhuma campanha cadastrada no período.</p>
                  </div>
                ) : (
                  data.distribution.map((item) => {
                    const total = Math.max(1, ...data.distribution.map((d) => d.value));
                    const pct = Math.round((item.value / total) * 100);
                    return (
                      <div key={item.category} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700 dark:text-zinc-300">{item.category}</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{item.value}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          {/* Activity Timeline */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur-xl dark:border-zinc-800/90 dark:bg-zinc-900/60">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Log de Atividades Recentes</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Ações executadas por usuários e agentes na sua organização.</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-zinc-500">
                <Clock3 className="h-3.5 w-3.5" />
                <span>Últimos registros</span>
              </div>
            </div>

            <div className="mt-4 divide-y divide-slate-100 dark:divide-zinc-800/50">
              {loading || !data ? (
                [1, 2, 3, 4].map((i) => <Skeleton key={i} className="my-2 h-14" />)
              ) : data.activity.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400 dark:text-zinc-500">Nenhuma atividade registrada ainda.</p>
              ) : (
                data.activity.map((act) => {
                  const initials = act.userName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                  const isError = act.status === 'ERROR';

                  return (
                    <div key={act.id} className="flex items-center justify-between py-3 hover:bg-slate-50 dark:hover:bg-zinc-950/40 px-2 rounded-xl transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 text-xs font-bold text-indigo-600 dark:text-indigo-300">
                          {initials}
                        </div>
                        <div className="min-w-0 truncate">
                          <p className="truncate text-xs font-medium text-slate-800 dark:text-zinc-200">
                            {getActionLabel(act.action)}
                          </p>
                          <p className="truncate text-[11px] text-slate-400 dark:text-zinc-500">
                            Por <span className="text-slate-600 dark:text-zinc-400">{act.userName}</span> • {act.entity}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          isError 
                            ? 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {isError ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                          {isError ? 'Falha' : 'Sucesso'}
                        </span>
                        <time className="text-[11px] font-mono text-slate-400 dark:text-zinc-500 hidden sm:inline">
                          {new Date(act.createdAt).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDITAR MÉTRICAS DE PERFORMANCE DA CAMPANHA
          ========================================================================= */}
      {editingCampaign && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setEditingCampaign(null)}
        >
          <div 
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 space-y-4 text-slate-900 dark:text-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Métricas de Performance da Campanha</h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate max-w-xs">{editingCampaign.name}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingCampaign(null)} 
                className="text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => handleSaveMetrics(e, false)} className="space-y-4">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Investimento / Spend (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 1500.00"
                    value={metricForm.spend}
                    onChange={(e) => setMetricForm({ ...metricForm, spend: e.target.value })}
                    className="shadcn-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Receita / Faturamento (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 7500.00"
                    value={metricForm.revenue}
                    onChange={(e) => setMetricForm({ ...metricForm, revenue: e.target.value })}
                    className="shadcn-input"
                  />
                </div>
              </div>

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Impressões
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 45000"
                    value={metricForm.impressions}
                    onChange={(e) => setMetricForm({ ...metricForm, impressions: e.target.value })}
                    className="shadcn-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Cliques no Link
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 1250"
                    value={metricForm.clicks}
                    onChange={(e) => setMetricForm({ ...metricForm, clicks: e.target.value })}
                    className="shadcn-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Leads / Conversões
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 85"
                    value={metricForm.conversions}
                    onChange={(e) => setMetricForm({ ...metricForm, conversions: e.target.value })}
                    className="shadcn-input"
                  />
                </div>
              </div>

              {/* Real-time KPI preview */}
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-50/50 p-3 dark:border-indigo-500/20 dark:bg-indigo-950/30 text-xs space-y-1.5">
                <p className="font-semibold text-indigo-700 dark:text-indigo-300">Cálculo Estimado:</p>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-700 dark:text-zinc-300">
                  <div>
                    <span className="text-slate-400 dark:text-zinc-500 block">CTR:</span>
                    <b>{metricForm.impressions && metricForm.clicks ? ((parseInt(metricForm.clicks) / parseInt(metricForm.impressions)) * 100).toFixed(2) + '%' : '0.00%'}</b>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-zinc-500 block">CPC:</span>
                    <b>{metricForm.spend && metricForm.clicks ? 'R$ ' + (parseFloat(metricForm.spend) / parseInt(metricForm.clicks)).toFixed(2) : 'R$ 0,00'}</b>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-zinc-500 block">ROAS:</span>
                    <b>{metricForm.spend && metricForm.revenue ? (parseFloat(metricForm.revenue) / parseFloat(metricForm.spend)).toFixed(2) + 'x' : '0.00x'}</b>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
                <button 
                  type="button" 
                  onClick={() => setEditingCampaign(null)} 
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={savingMetrics}
                  className="rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white px-4 py-2 text-xs font-semibold shadow-xs disabled:opacity-50 transition cursor-pointer"
                >
                  {savingMetrics ? 'Salvando...' : 'Salvar Métricas'}
                </button>
                <button 
                  type="button" 
                  disabled={savingMetrics}
                  onClick={(e) => handleSaveMetrics(e, true)}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow hover:from-indigo-400 hover:to-violet-500 disabled:opacity-50 transition cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Salvar & Diagnosticar IA</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DIAGNÓSTICO E AUDITORIA DE PERFORMANCE POR IA
          ========================================================================= */}
      {diagnosticCampaign && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white animate-in zoom-in-95 duration-150">
            {/* Top Bar */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-4 bg-slate-50/80 dark:bg-zinc-900/80 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                      Diagnóstico de Performance por IA
                    </h3>
                    <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                      Renata Dias & Dr. Arthur
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">
                    Campanha: {diagnosticCampaign.name} ({diagnosticCampaign.client?.name || 'Cliente'})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {diagnosticText && (
                  <button
                    type="button"
                    onClick={() => handleCopyDiagnostic(diagnosticText)}
                    className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer shadow-xs"
                  >
                    {copiedDiagnostic ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedDiagnostic ? 'Copiado!' : 'Copiar Relatório'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setDiagnosticCampaign(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Diagnostic Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm text-slate-800 dark:text-zinc-200 bg-slate-50/30 dark:bg-zinc-950">
              {diagnosticLoading ? (
                <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="h-10 w-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="font-semibold text-slate-800 dark:text-zinc-200 text-sm">
                    Renata Dias e Dr. Arthur estão analisando o funil de tráfego...
                  </p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm">
                    Avaliando taxas de cliques (CTR), custo por lead (CPL/CPA), taxa de conversão e elaborando recomendações de testes A/B.
                  </p>
                </div>
              ) : diagnosticText ? (
                <div className="space-y-4">
                  {/* Campaign numbers badge bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs">
                    <div>
                      <span className="text-slate-400 dark:text-zinc-500 text-[10px] block">Investimento</span>
                      <span className="font-bold text-slate-900 dark:text-white">{formatMoney(diagnosticCampaign.spend)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-zinc-500 text-[10px] block">Conversões</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(diagnosticCampaign.conversions)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-zinc-500 text-[10px] block">ROAS</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {diagnosticCampaign.spend && diagnosticCampaign.spend > 0 ? ((diagnosticCampaign.revenue || 0) / diagnosticCampaign.spend).toFixed(2) + 'x' : '0.00x'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-zinc-500 text-[10px] block">Faturamento</span>
                      <span className="font-bold text-slate-900 dark:text-white">{formatMoney(diagnosticCampaign.revenue)}</span>
                    </div>
                  </div>

                  {/* Markdown diagnostic content */}
                  <div className="whitespace-pre-wrap font-sans bg-white dark:bg-zinc-900 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs leading-relaxed text-xs sm:text-sm">
                    {diagnosticText}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400 dark:text-zinc-500">
                  Nenhum diagnóstico gerado ainda. Clique no botão abaixo para rodar a auditoria.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/80 dark:bg-zinc-900/80 shrink-0">
              <button
                type="button"
                disabled={diagnosticLoading}
                onClick={() => void handleRunDiagnostic(diagnosticCampaign)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer shadow-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${diagnosticLoading ? 'animate-spin' : ''}`} />
                <span>Re-analisar Campanha</span>
              </button>

              <button
                type="button"
                onClick={() => setDiagnosticCampaign(null)}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-bold text-white transition shadow-sm cursor-pointer"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};