import React, { useEffect, useState } from 'react';
import { Database, RefreshCw, Trash2, Loader2, AlertCircle, CheckCircle2, Clock3 } from 'lucide-react';
import { apiUrl } from '../api/client';
import { KnowledgeUpload } from './KnowledgeUpload';

interface KnowledgeFile {
  id: string;
  agentId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  chunksCount: number;
  status: 'PROCESSING' | 'READY' | 'ERROR';
  errorMessage?: string | null;
  embeddingModel: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  agentId: string;
  agentName: string;
  jwtToken: string;
  onChanged?: () => void;
}

export const KnowledgeBaseManager: React.FC<Props> = ({ agentId, agentName, jwtToken, onChanged }) => {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl('/api/rag/knowledge'), {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setFiles((data.data || []).filter((file: KnowledgeFile) => file.agentId === agentId));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [agentId, jwtToken]);

  const reprocess = async (id: string) => {
    setBusyId(id);
    try {
      const response = await fetch(apiUrl(`/api/rag/knowledge/${id}/reprocess`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || 'Não foi possível reprocessar o arquivo.');
      }
      await load();
      onChanged?.();
    } catch (error: any) {
      window.alert(error.message || 'Erro ao reprocessar.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string, fileName: string) => {
    if (!window.confirm(`Excluir "${fileName}" da base de conhecimento?`)) return;

    setBusyId(id);
    try {
      const response = await fetch(apiUrl(`/api/rag/knowledge/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || 'Não foi possível excluir o arquivo.');
      }
      await load();
      onChanged?.();
    } catch (error: any) {
      window.alert(error.message || 'Erro ao excluir.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <KnowledgeUpload
        agentId={agentId}
        jwtToken={jwtToken}
        onSuccess={() => {
          load();
          onChanged?.();
        }}
      />

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              <h4 className="text-sm font-bold text-white">Documentos indexados</h4>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{agentName} • base isolada por empresa e agente</p>
          </div>
          <button type="button" onClick={load} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Carregando base...</div>
        ) : files.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">Nenhum documento indexado para este agente.</div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div key={file.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{file.fileName}</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {(file.fileSize / 1024).toFixed(1)} KB • {file.chunksCount} chunks • {file.embeddingModel}
                  </p>
                  {file.status === 'ERROR' && file.errorMessage && (
                    <p className="text-[10px] text-rose-400 mt-1 truncate">{file.errorMessage}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {file.status === 'READY' && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" /> Pronto
                    </span>
                  )}
                  {file.status === 'PROCESSING' && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-400">
                      <Clock3 className="w-3 h-3" /> Processando
                    </span>
                  )}
                  {file.status === 'ERROR' && (
                    <span className="flex items-center gap-1 text-[10px] text-rose-400">
                      <AlertCircle className="w-3 h-3" /> Erro
                    </span>
                  )}

                  {(file.status === 'ERROR' || file.status === 'READY') && (
                    <button
                      type="button"
                      disabled={busyId === file.id}
                      onClick={() => reprocess(file.id)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
                      title="Reprocessar"
                    >
                      {busyId === file.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={busyId === file.id}
                    onClick={() => remove(file.id, file.fileName)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 disabled:opacity-40"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
