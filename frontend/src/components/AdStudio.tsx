import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Printer, 
  FolderKanban, 
  Megaphone
} from 'lucide-react';
import { apiUrl } from '../api/client';
import { exportReportToPdf } from '../utils/pdfExport';

export const AdStudio: React.FC<{ jwtToken: string }> = ({ jwtToken }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  const loadData = async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        fetch(apiUrl('/api/clients'), { headers: { Authorization: 'Bearer ' + jwtToken } }).then(r => r.json()),
        fetch(apiUrl('/api/campaigns'), { headers: { Authorization: 'Bearer ' + jwtToken } }).then(r => r.json()),
      ]);
      setClients(c.data || []);
      const campList = p.data || [];
      setCampaigns(campList);
      if (campList.length > 0 && !selectedCampaignId) {
        setSelectedCampaignId(campList[0].id);
        setSelectedClientId(campList[0].clientId);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [jwtToken]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateCreatives = async () => {
    if (!selectedCampaignId) return;
    setGenerating(true);
    try {
      const res = await fetch(apiUrl(`/api/campaigns/${selectedCampaignId}/generate-ad-creatives`), {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + jwtToken,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao gerar criativos.');

      setCampaigns(prev => prev.map(c => c.id === selectedCampaignId ? { ...c, adCreatives: json.adCreatives, adCreativesGeneratedAt: json.generatedAt } : c));
    } catch (err: any) {
      window.alert(err.message || 'Falha ao gerar pacote de anúncios.');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportPdf = () => {
    if (!selectedCampaign || !selectedCampaign.adCreatives) return;
    exportReportToPdf({
      title: `Manual de Criativos & Anúncios: ${selectedCampaign.name}`,
      subtitle: `Objetivo: ${selectedCampaign.objective}`,
      clientName: selectedCampaign.client?.name || 'Cliente',
      sections: [
        {
          title: 'Briefing da Campanha & Oferta',
          content: `Empresa: ${selectedCampaign.client?.name || 'N/A'}\nObjetivo: ${selectedCampaign.objective}\nPúblico-Alvo: ${selectedCampaign.audience || 'Geral'}\nCanais: ${selectedCampaign.channels || 'Meta Ads / TikTok'}`,
          badge: 'Briefing',
        },
        {
          title: 'Pacote Completo de Anúncios, Copies & Roteiros (Sofia & Bruno)',
          content: selectedCampaign.adCreatives,
          badge: 'Ad Studio IA',
        },
      ],
    });
  };

  const filteredCampaigns = selectedClientId 
    ? campaigns.filter(c => c.clientId === selectedClientId)
    : campaigns;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Ad Studio: Criativos & Copies de Anúncios
            </h1>
            <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-500 dark:text-indigo-400">
              Sofia & Bruno IA
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Gere ganchos magnéticos (hooks), copies completas (AIDA/PAS), roteiros para Reels/TikTok e briefings visuais para designers.
          </p>
        </div>

        {selectedCampaign?.adCreatives && (
          <button
            type="button"
            onClick={handleExportPdf}
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer shadow-xs"
          >
            <Printer className="h-4 w-4 text-indigo-500" />
            <span>Exportar PDF / Imprimir</span>
          </button>
        )}
      </div>

      {/* Selectors Bar */}
      <div className="shadcn-card p-4 space-y-3">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              1. Selecione a Empresa / Cliente
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => {
                const nextClient = e.target.value;
                setSelectedClientId(nextClient);
                const firstCamp = campaigns.find(c => !nextClient || c.clientId === nextClient);
                if (firstCamp) setSelectedCampaignId(firstCamp.id);
              }}
              className="shadcn-input text-xs"
            >
              <option value="">Todas as empresas...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              2. Selecione a Campanha de Marketing
            </label>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="shadcn-input text-xs"
            >
              {filteredCampaigns.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.client?.name ? `(${c.client.name})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedCampaign && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
            <div className="text-xs text-slate-600 dark:text-zinc-400">
              <b>Objetivo:</b> {selectedCampaign.objective}
              {selectedCampaign.audience && <span> &bull; <b>Público:</b> {selectedCampaign.audience}</span>}
            </div>

            <button
              type="button"
              disabled={generating}
              onClick={handleGenerateCreatives}
              className="flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-50 transition cursor-pointer"
            >
              <Sparkles className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Criando Anúncios...' : selectedCampaign.adCreatives ? 'Regenerar Anúncios' : 'Gerar Pacote de Anúncios'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Studio View */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400 dark:text-zinc-500">
          Carregando Ad Studio...
        </div>
      ) : !selectedCampaign ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
          <FolderKanban className="h-10 w-10 text-slate-400 dark:text-zinc-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">Nenhuma campanha selecionada</p>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Crie ou selecione uma campanha acima para gerar criativos e copies.</p>
        </div>
      ) : generating ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="h-12 w-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Sofia Martins & Bruno Castro estão escrevendo seus anúncios...
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-md">
              Criando 5 variações de ganchos de alta atenção, 3 copies completas (AIDA/PAS), 2 roteiros de vídeo e briefings visuais para os criativos.
            </p>
          </div>
        </div>
      ) : selectedCampaign.adCreatives ? (
        <div className="space-y-6">
          {/* Quick Copy Whole Studio */}
          <div className="flex items-center justify-between p-3.5 bg-indigo-50/60 border border-indigo-500/20 rounded-2xl dark:bg-indigo-950/30">
            <div className="flex items-center gap-2 text-xs text-indigo-900 dark:text-indigo-200">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <span><b>Pacote Completo Gerado</b> com foco no nicho e no público da campanha.</span>
            </div>

            <button
              type="button"
              onClick={() => handleCopy(selectedCampaign.adCreatives, 'all')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-white text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:bg-zinc-900 dark:text-indigo-300 dark:hover:bg-zinc-800 transition cursor-pointer shadow-xs"
            >
              {copiedKey === 'all' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedKey === 'all' ? 'Copiado!' : 'Copiar Tudo'}</span>
            </button>
          </div>

          {/* Formatted Markdown Content Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 space-y-4">
            <div className="whitespace-pre-wrap font-sans leading-relaxed text-xs sm:text-sm text-slate-800 dark:text-zinc-200 bg-slate-50/50 dark:bg-zinc-950 p-6 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-inner">
              {selectedCampaign.adCreatives}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-16 text-center rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/30 p-8 space-y-3">
          <Megaphone className="h-10 w-10 text-indigo-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Criativos ainda não gerados para esta campanha</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
            Clique no botão <strong>"Gerar Pacote de Anúncios"</strong> para que a Copywriter Sofia e o Designer Bruno montem suas copies, ganchos e roteiros.
          </p>
          <button
            type="button"
            onClick={handleGenerateCreatives}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>Gerar Criativos & Copies Agora</span>
          </button>
        </div>
      )}
    </div>
  );
};
