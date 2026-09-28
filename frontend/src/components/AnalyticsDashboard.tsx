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
  XCircle
} from 'lucide-react';
import { apiUrl } from '../api/client';

type Period = '7d' | '30d' | '12m';

type Analytics = {
  period: Period;
  kpis: {
    revenue: number | null;
    activeUsers: number;
    conversions: number | null;
    retention: number | null;
    activeUsersVariation: number | null;
    conversionsVariation: number | null;
    retentionVariation: number | null;
    revenueVariation: number | null;
    activeCampaigns: number;
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

const formatMoney = (v: number | null) => 
  v === null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

const formatNumber = (v: number | null) => 
  v === null ? '—' : new Intl.NumberFormat('pt-BR').format(v);

const formatPercent = (v: number | null) => 
  v === null ? '—' : v.toFixed(1) + '%';

const formatVariation = (v: number | null) => 
  v === null ? 'N/D' : (v >= 0 ? '+' : '') + v.toFixed(1) + '%';

const getActionLabel = (v: string) => {
  const map: Record<string, string> = {
    CAMPAIGN_CREATED: 'Campanha criada',
    CAMPAIGN_UPDATED: 'Campanha atualizada',
    CAMPAIGN_ACTIVATED: 'Campanha ativada',
    CAMPAIGN_DEACTIVATED: 'Campanha pausada',
    CAMPAIGN_STRATEGY_GENERATED: 'Estratégia gerada',
    CLIENT_CREATED: 'Empresa cadastrada',
    CLIENT_UPDATED: 'Empresa atualizada',
    CLIENT_DELETED: 'Empresa excluída',
  };
  return map[v] || v.replace(/_/g, ' ');
};

const Skeleton = ({ className }: { className: string }) => (
  <div className={`animate-pulse rounded-xl bg-zinc-800/60 ${className}`} />
);

// Apex / Shadcn KPI Card
const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'indigo',
  unavailable = false,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend: number | null;
  accentColor?: 'indigo' | 'emerald' | 'cyan' | 'violet' | 'amber';
  unavailable?: boolean;
}) => {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-400',
      border: 'border-indigo-500/20',
      glow: 'group-hover:border-indigo-500/40',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      glow: 'group-hover:border-emerald-500/40',
    },
    cyan: {
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      border: 'border-cyan-500/20',
      glow: 'group-hover:border-cyan-500/40',
    },
    violet: {
      bg: 'bg-violet-500/10',
      text: 'text-violet-400',
      border: 'border-violet-500/20',
      glow: 'group-hover:border-violet-500/40',
    },
    amber: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      glow: 'group-hover:border-amber-500/40',
    },
  };

  const style = colorMap[accentColor];
  const isPositive = trend !== null && trend >= 0;

  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-5 backdrop-blur-xl transition-all duration-300 hover:bg-zinc-900/80 hover:shadow-lg hover:shadow-black/40 ${style.glow}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">{title}</span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${style.border} ${style.bg} ${style.text}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            {trend !== null ? (
              <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                isPositive 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {formatVariation(trend)}
              </span>
            ) : (
              <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                Sem histórico
              </span>
            )}
            <span className="text-[11px] text-zinc-500">
              {unavailable ? 'sem eventos' : 'vs. anterior'}
            </span>
          </div>
          {subtitle && <span className="text-[10px] text-zinc-500">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
};

// Apex Area/Line Chart Component
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <h4 className="text-sm font-semibold text-white">Evolução de Crescimento & Operação</h4>
          <p className="text-xs text-zinc-500">Fluxo de empresas ativas, campanhas geradas e chamadas aos Agentes de IA.</p>
        </div>

        {/* Legend / Filter buttons */}
        <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
          <button
            onClick={() => setActiveMetric('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
              activeMetric === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setActiveMetric('clients')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
              activeMetric === 'clients' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            Empresas
          </button>
          <button
            onClick={() => setActiveMetric('campaigns')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
              activeMetric === 'campaigns' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            Campanhas
          </button>
          <button
            onClick={() => setActiveMetric('aiRequests')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
              activeMetric === 'aiRequests' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-zinc-400 hover:text-zinc-200'
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
                <line x1={px} y1={y} x2={w - px} y2={y} stroke="#27272a" strokeDasharray="4 4" strokeWidth="1" />
                <text x={px - 8} y={y + 4} fill="#71717a" fontSize="10" textAnchor="end">
                  {Math.round(ratio * maxVal)}
                </text>
              </g>
            );
          })}

          {/* X Axis Labels */}
          {data.map((d, i) => (
            <text key={d.label} x={getX(i)} y={h - 8} fill="#71717a" fontSize="10" textAnchor="middle">
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
            <path d={getPath('campaigns')} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
          )}
          {(activeMetric === 'all' || activeMetric === 'aiRequests') && (
            <path d={getPath('aiRequests')} fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
          )}

          {/* Dots and interactive hover circles */}
          {data.map((d, i) => (
            <g key={i}>
              {(activeMetric === 'all' || activeMetric === 'clients') && (
                <circle cx={getX(i)} cy={getY(d.clients)} r="4" fill="#6366f1" stroke="#09090b" strokeWidth="2" className="transition hover:r-6">
                  <title>{`${d.label} • Empresas: ${d.clients}`}</title>
                </circle>
              )}
              {(activeMetric === 'all' || activeMetric === 'campaigns') && (
                <circle cx={getX(i)} cy={getY(d.campaigns)} r="4" fill="#22d3ee" stroke="#09090b" strokeWidth="2" className="transition hover:r-6">
                  <title>{`${d.label} • Campanhas: ${d.campaigns}`}</title>
                </circle>
              )}
              {(activeMetric === 'all' || activeMetric === 'aiRequests') && (
                <circle cx={getX(i)} cy={getY(d.aiRequests)} r="4" fill="#a855f7" stroke="#09090b" strokeWidth="2" className="transition hover:r-6">
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
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
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

  useEffect(() => {
    void load();
  }, [jwtToken, period]);

  return (
    <div className="space-y-6">
      {/* Page Header (Apex Style) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Visão Geral & Métricas
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Tempo Real
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Acompanhe a tração da sua agência, clientes ativos, volume de campanhas e consumo de IA.
          </p>
        </div>

        {/* Action controls & Segmented Period Tabs */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
            <button
              onClick={() => setPeriod('7d')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                period === '7d' 
                  ? 'bg-zinc-800 text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              7 Dias
            </button>
            <button
              onClick={() => setPeriod('30d')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                period === '30d' 
                  ? 'bg-zinc-800 text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              30 Dias
            </button>
            <button
              onClick={() => setPeriod('12m')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                period === '12m' 
                  ? 'bg-zinc-800 text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              12 Meses
            </button>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex h-9 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* KPI Cards Grid (Apex Shadcn Style) */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading || !data ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36" />)
        ) : (
          <>
            <MetricCard
              title="Receita Estimada"
              value={formatMoney(data.kpis.revenue)}
              icon={DollarSign}
              trend={data.kpis.revenueVariation}
              accentColor="emerald"
              unavailable={data.kpis.revenue === null}
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
              trend={data.kpis.conversionsVariation}
              accentColor="cyan"
            />
            <MetricCard
              title="Taxa de Retenção"
              value={formatPercent(data.kpis.retention)}
              icon={Percent}
              trend={data.kpis.retentionVariation}
              accentColor="violet"
              unavailable={data.kpis.retention === null}
            />
          </>
        )}
      </section>

      {/* Charts & Distribution Section */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main Growth Chart (2 Cols) */}
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-5 backdrop-blur-xl lg:col-span-2">
          {loading || !data ? (
            <Skeleton className="h-[340px]" />
          ) : (
            <InteractiveChart data={data.trend} />
          )}
        </div>

        {/* Distribution Card (1 Col) */}
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div>
              <h4 className="text-sm font-semibold text-white">Estágio das Campanhas</h4>
              <p className="text-xs text-zinc-500">Distribuição por status operacional.</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {loading || !data ? (
              <Skeleton className="h-48" />
            ) : data.distribution.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 p-8 text-center">
                <Sparkles className="h-6 w-6 text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-400">Nenhuma campanha cadastrada no período.</p>
              </div>
            ) : (
              data.distribution.map((item) => {
                const total = Math.max(1, ...data.distribution.map((d) => d.value));
                const pct = Math.round((item.value / total) * 100);
                return (
                  <div key={item.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-300">{item.category}</span>
                      <span className="font-semibold text-white">{item.value}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
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

      {/* Activity Timeline / Table (Apex Style) */}
      <section className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div>
            <h4 className="text-sm font-semibold text-white">Log de Atividades Recentes</h4>
            <p className="text-xs text-zinc-500">Ações executadas por usuários e agentes na sua organização.</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Clock3 className="h-3.5 w-3.5" />
            <span>Últimos registros</span>
          </div>
        </div>

        <div className="mt-4 divide-y divide-zinc-800/50">
          {loading || !data ? (
            [1, 2, 3, 4].map((i) => <Skeleton key={i} className="my-2 h-14" />)
          ) : data.activity.length === 0 ? (
            <p className="py-8 text-center text-xs text-zinc-500">Nenhuma atividade registrada ainda.</p>
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
                <div key={act.id} className="flex items-center justify-between py-3 hover:bg-zinc-950/40 px-2 rounded-xl transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 text-xs font-bold text-indigo-300">
                      {initials}
                    </div>
                    <div className="min-w-0 truncate">
                      <p className="truncate text-xs font-medium text-zinc-200">
                        {getActionLabel(act.action)}
                      </p>
                      <p className="truncate text-[11px] text-zinc-500">
                        Por <span className="text-zinc-400">{act.userName}</span> • {act.entity}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                      isError 
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-400' 
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {isError ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                      {isError ? 'Falha' : 'Sucesso'}
                    </span>
                    <time className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
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
  );
};