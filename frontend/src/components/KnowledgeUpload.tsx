import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { apiUrl } from '../api/client';

interface KnowledgeUploadProps {
  agentId: string;
  apiEndpoint?: string;
  jwtToken?: string;
  onSuccess?: () => void;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export const KnowledgeUpload: React.FC<KnowledgeUploadProps> = ({
  agentId,
  apiEndpoint = '/api/rag/upload-knowledge',
  jwtToken = '',
  onSuccess
}) => {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [uploadProgressDetails, setUploadProgressDetails] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    const allowedTypes = ['application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      setStatus('error');
      setErrorMessage('Apenas arquivos PDF ou TXT são suportados.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setStatus('error');
      setErrorMessage('O arquivo excede o limite de 15MB.');
      return;
    }
    setSelectedFile(file);
    setStatus('idle');
    setErrorMessage('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !agentId) return;

    setStatus('uploading');
    setUploadProgressDetails('Extraindo texto, gerando chunks e embeddings...');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('agentId', agentId);

    try {
      const response = await fetch(apiUrl(apiEndpoint), {
        method: 'POST',
        headers: {
          Authorization: jwtToken ? `Bearer ${jwtToken}` : '',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Falha ao processar arquivo no servidor.');
      }

      setStatus('success');
      setUploadProgressDetails(`${data.data?.chunksIndexed || 'Todos os'} chunks vetorizados com sucesso no Qdrant!`);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Erro inesperado durante o upload.');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setStatus('idle');
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
        <div>
          <h3 className="text-base font-bold text-white">Base de Conhecimento RAG</h3>
          <p className="text-xs text-slate-400">Envie PDFs ou TXTs para vetorização isolada por Tenant e Agente.</p>
        </div>
        <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-md">
          Agent: {agentId}
        </span>
      </div>

      {/* Área de Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          status === 'error'
            ? 'border-rose-500/50 bg-rose-500/5'
            : 'border-slate-700 hover:border-indigo-500 hover:bg-slate-800/40 bg-slate-950/50'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.txt"
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-full border border-indigo-500/30">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-200">
              Clique para selecionar ou arraste o arquivo aqui
            </p>
            <p className="text-[11px] text-slate-500 mt-1">PDF ou TXT (máx. 15MB)</p>
          </div>
        </div>
      </div>

      {/* Detalhes do Arquivo Selecionado */}
      {selectedFile && (
        <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-3 truncate">
            <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
            <div className="truncate">
              <p className="text-xs font-medium text-white truncate">{selectedFile.name}</p>
              <p className="text-[10px] text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>

          {status !== 'uploading' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Feedbacks de Status */}
      {status === 'uploading' && (
        <div className="mt-4 p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-center space-x-3 text-indigo-300">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          <span className="text-xs font-medium">{uploadProgressDetails}</span>
        </div>
      )}

      {status === 'success' && (
        <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center space-x-3 text-emerald-300">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{uploadProgressDetails}</span>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-4 p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl flex items-center space-x-3 text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="text-xs font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Botão de Disparo */}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || status === 'uploading'}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center space-x-2"
        >
          {status === 'uploading' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Processando RAG...</span>
            </>
          ) : (
            <span>Indexar na Base de Conhecimento</span>
          )}
        </button>
      </div>
    </div>
  );
};
