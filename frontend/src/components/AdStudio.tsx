import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Printer, 
  FolderKanban, 
  Megaphone,
  Image as ImageIcon,
  Download,
  Wand2,
  Eye,
  Layers,
  RefreshCw,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { apiUrl } from '../api/client';
import { exportReportToPdf } from '../utils/pdfExport';

interface GeneratedImageItem {
  id: string;
  url: string;
  prompt: string;
  title: string;
  format: '1:1' | '9:16' | '16:9';
  provider: string;
  createdAt: string;
  hasError?: boolean;
}

export const AdStudio: React.FC<{ jwtToken: string }> = ({ jwtToken }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Estados de Geração de Imagem com IA
  const [imagePrompt, setImagePrompt] = useState<string>('');
  const [imageFormat, setImageFormat] = useState<'1:1' | '9:16' | '16:9'>('1:1');
  const [imageQuantity, setImageQuantity] = useState<number>(3);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageItem[]>([]);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

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

  // Atualiza o prompt inicial de imagem quando muda de campanha
  useEffect(() => {
    if (selectedCampaign) {
      const defaultIdea = `Anúncio profissional de alta conversão para ${selectedCampaign.name}. Empresa: ${selectedCampaign.client?.name || 'Marca'}. Objetivo: ${selectedCampaign.objective}. Visual moderno, iluminação de estúdio comercial, estética premium.`;
      setImagePrompt(defaultIdea);
    }
  }, [selectedCampaignId]);

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

  const handleGenerateImages = async (customPrompt?: string, customFormat?: '1:1' | '9:16' | '16:9') => {
    if (!selectedCampaignId) return;
    const promptToUse = (customPrompt || imagePrompt).trim();
    if (!promptToUse) return;

    const formatToUse = customFormat || imageFormat;

    setImageGenerating(true);
    try {
      const res = await fetch(apiUrl(`/api/campaigns/${selectedCampaignId}/generate-ad-image`), {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + jwtToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: promptToUse,
          title: `Arte: ${selectedCampaign?.name || 'Campanha'}`,
          format: formatToUse,
          quantity: imageQuantity,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao gerar imagens.');

      const newImagesList: GeneratedImageItem[] = (json.images || [json]).map((img: any, i: number) => ({
        id: String(Date.now() + i),
        url: img.imageUrl,
        prompt: img.prompt,
        title: img.title || `Variação ${i + 1}`,
        format: img.format || formatToUse,
        provider: img.provider || 'Flux',
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hasError: false,
      }));

      setGeneratedImages(prev => [...newImagesList, ...prev]);
    } catch (err: any) {
      window.alert(err.message || 'Falha na geração das imagens.');
    } finally {
      setImageGenerating(false);
    }
  };

  const handleRegenerateSingleImage = (img: GeneratedImageItem) => {
    // Regenera com nova semente e prompt higienizado
    const newSeed = Math.floor(Math.random() * 900000) + 100000;
    const cleanPrompt = img.prompt
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s,.-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 250);
    const width = img.format === '9:16' ? 720 : img.format === '16:9' ? 1280 : 1024;
    const height = img.format === '9:16' ? 1280 : img.format === '16:9' ? 720 : 1024;
    const newUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=${width}&height=${height}&nologo=true&model=flux&seed=${newSeed}`;

    setGeneratedImages(prev => prev.map(item => item.id === img.id ? { ...item, url: newUrl, hasError: false } : item));
  };

  const handleDeleteImage = (id: string) => {
    setGeneratedImages(prev => prev.filter(item => item.id !== id));
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
        ...(generatedImages.length > 0 ? [
          {
            title: `Artes e Conceitos Visuais Gerados por IA (${generatedImages.length} imagens)`,
            content: generatedImages.map((img, i) => `Arte #${i + 1} (${img.format}) - Prompt: ${img.prompt}\nLink Imagem HD: ${img.url}`).join('\n\n'),
            badge: 'Galeria Visual',
          }
        ] : []),
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
              Ad Studio: Criativos, Copies & Imagens com IA
            </h1>
            <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-500 dark:text-indigo-400">
              Sofia & Bruno IA
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Gere ganchos magnéticos (hooks), copies completas (AIDA/PAS), roteiros para Reels/TikTok e pacotes de imagens de alta conversão.
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
              <span>{generating ? 'Criando Anúncios...' : selectedCampaign.adCreatives ? 'Regenerar Anúncios & Copies' : 'Gerar Pacote de Anúncios'}</span>
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
      ) : (
        <div className="space-y-6">
          {/* =========================================================================
              MÓDULO 1: GERADOR DE IMAGENS DE ANÚNCIOS COM IA (FLUX / DALL-E 3)
              ========================================================================= */}
          <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 via-white to-violet-500/5 dark:from-indigo-950/20 dark:via-zinc-900/60 dark:to-violet-950/20 p-5 sm:p-6 shadow-sm space-y-5">
            {/* Cabeçalho do Gerador */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-xs">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Gerador de Imagens & Artes do Anúncio
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-semibold">
                      Flux / DALL-E 3
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Gere imagens publicitárias realistas e profissionais em alta resolução com 1 clique para campanhas de Meta Ads / Instagram.
                  </p>
                </div>
              </div>
            </div>

            {/* Linha de Configurações: Formato e Quantidade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/80 dark:bg-zinc-900/50 p-3.5 rounded-2xl border border-slate-200/70 dark:border-zinc-800">
              {/* Formato da Arte */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                  Formato do Anúncio
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-200/60 dark:bg-zinc-950 p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setImageFormat('1:1')}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition cursor-pointer text-center ${
                      imageFormat === '1:1'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    1:1 Feed
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageFormat('9:16')}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition cursor-pointer text-center ${
                      imageFormat === '9:16'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    9:16 Story / Reels
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageFormat('16:9')}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition cursor-pointer text-center ${
                      imageFormat === '16:9'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    16:9 Banner
                  </button>
                </div>
              </div>

              {/* Quantidade de Imagens */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                  Quantidade a Gerar
                </label>
                <div className="grid grid-cols-4 gap-1.5 bg-slate-200/60 dark:bg-zinc-950 p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
                  {[1, 2, 3, 4].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setImageQuantity(qty)}
                      className={`py-1.5 px-1.5 text-xs font-semibold rounded-lg transition cursor-pointer text-center ${
                        imageQuantity === qty
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {qty} {qty === 1 ? 'Imagem' : 'Imagens'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Prompt de Imagem e Botão Principal de Ação */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Descrição Visual do Anúncio (Prompt de Criação):
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Descreva o conceito da imagem do anúncio..."
                    className="shadcn-input text-xs"
                  />
                </div>

                <button
                  type="button"
                  disabled={imageGenerating || !imagePrompt.trim()}
                  onClick={() => handleGenerateImages()}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 transition cursor-pointer shrink-0"
                >
                  <Wand2 className={`h-4 w-4 ${imageGenerating ? 'animate-spin' : ''}`} />
                  <span>
                    {imageGenerating 
                      ? 'Gerando Imagens...' 
                      : `Gerar ${imageQuantity} ${imageQuantity === 1 ? 'Imagem' : 'Imagens'} com IA`}
                  </span>
                </button>
              </div>
            </div>

            {/* Galeria de Imagens Geradas */}
            {generatedImages.length > 0 && (
              <div className="pt-3 border-t border-slate-200/80 dark:border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Imagens Geradas ({generatedImages.length})</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setGeneratedImages([])}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-500 transition"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Limpar Galeria</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {generatedImages.map((img) => (
                    <div 
                      key={img.id}
                      className="group relative rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/90 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col"
                    >
                      {/* Top Action Bar (Sempre visível e clicável no topo do card) */}
                      <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRegenerateSingleImage(img);
                          }}
                          className="h-7 w-7 rounded-lg bg-black/70 text-white hover:bg-indigo-600 hover:text-white flex items-center justify-center transition cursor-pointer shadow-md"
                          title="Regerar esta imagem com nova semente"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteImage(img.id);
                          }}
                          className="h-7 w-7 rounded-lg bg-black/70 text-white hover:bg-rose-600 hover:text-white flex items-center justify-center transition cursor-pointer shadow-md"
                          title="Excluir esta imagem"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Tag de Formato e Provedor */}
                      <div className="absolute top-2.5 left-2.5 z-30 bg-black/70 backdrop-blur-md rounded-lg px-2 py-0.5 text-[10px] font-mono text-white pointer-events-none">
                        {img.format} &bull; {img.provider}
                      </div>

                      {/* Área da Imagem / Erro */}
                      <div className={`relative bg-slate-950 overflow-hidden ${img.format === '9:16' ? 'aspect-[9/16] max-h-96' : img.format === '16:9' ? 'aspect-[16/9]' : 'aspect-square'}`}>
                        {img.hasError ? (
                          <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-900 text-slate-400">
                            <AlertCircle className="h-8 w-8 text-rose-500" />
                            <div>
                              <p className="text-xs font-semibold text-slate-200">Falha ao carregar arte</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">O servidor de imagens oscilou momentaneamente.</p>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleRegenerateSingleImage(img)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                              >
                                <RefreshCw className="h-3 w-3" />
                                <span>Tentar Novamente</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteImage(img.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Excluir</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <img 
                              src={img.url} 
                              alt={img.title}
                              className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                              loading="lazy"
                              onError={() => {
                                setGeneratedImages(prev => prev.map(item => item.id === img.id ? { ...item, hasError: true } : item));
                              }}
                            />

                            {/* Botão de Zoom em Tela Cheia */}
                            <button
                              type="button"
                              onClick={() => setPreviewModalUrl(img.url)}
                              className="absolute inset-0 z-10 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 text-white text-xs font-semibold backdrop-blur-xs transition cursor-pointer"
                            >
                              <Eye className="h-4 w-4" />
                              <span>Ver em Tela Cheia</span>
                            </button>
                          </>
                        )}
                      </div>

                      {/* Rodapé do Card */}
                      <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                        <p className="text-[11px] text-slate-600 dark:text-zinc-400 line-clamp-2 italic">
                          "{img.prompt}"
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800 text-[10px]">
                          <span className="text-slate-400 dark:text-zinc-500">{img.createdAt}</span>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleDeleteImage(img.id)}
                              className="text-slate-400 hover:text-rose-500 transition font-medium"
                            >
                              Excluir
                            </button>
                            <a
                              href={img.url}
                              target="_blank"
                              rel="noreferrer"
                              download={`criativo_${img.id}.png`}
                              className="flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                              <Download className="h-3 w-3" />
                              <span>Baixar HD</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* =========================================================================
              MÓDULO 2: GANCHOS, COPIES (AIDA/PAS) E ROTEIROS DE VÍDEO
              ========================================================================= */}
          {generating ? (
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
            <div className="space-y-4">
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
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Copies & Roteiros ainda não gerados</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                Clique no botão <strong>"Gerar Pacote de Anúncios"</strong> para que a Copywriter Sofia e o Designer Bruno montem suas copies, ganchos e roteiros completos.
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
      )}

      {/* Modal Preview Imagem HD */}
      {previewModalUrl && (
        <div 
          onClick={() => setPreviewModalUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img 
              src={previewModalUrl} 
              alt="Preview HD" 
              className="max-h-[80vh] w-auto rounded-2xl shadow-2xl border border-white/10"
            />
            <div className="mt-3 flex items-center gap-3">
              <a
                href={previewModalUrl}
                target="_blank"
                rel="noreferrer"
                download="criativo_hd.png"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-lg"
              >
                <Download className="h-4 w-4" />
                <span>Baixar em Alta Resolução</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewModalUrl(null)}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
