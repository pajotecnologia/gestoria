import React, { useState, useEffect } from 'react';
import { QrCode, WifiOff, RefreshCw, CheckCircle2, Loader2, X } from 'lucide-react';

interface WhatsAppConnectModalProps {
  agentId: string;
  agentName: string;
  isOpen: boolean;
  onClose: () => void;
  jwtToken: string;
}

export const WhatsAppConnectModal: React.FC<WhatsAppConnectModalProps> = ({
  agentId,
  agentName,
  isOpen,
  onClose,
  jwtToken
}) => {
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [status, setStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');
  const [loading, setLoading] = useState(false);

  const fetchQRCode = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/connect/${agentId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      const data = await res.json();
      if (data.qrcode) {
        setQrCodeBase64(data.qrcode);
        setStatus('CONNECTING');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || status === 'CONNECTED') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/whatsapp/status/${agentId}`, {
          headers: { Authorization: `Bearer ${jwtToken}` }
        });
        const data = await res.json();
        if (data.state === 'open' || data.dbStatus === 'CONNECTED') {
          setStatus('CONNECTED');
          setQrCodeBase64(null);
        }
      } catch (e) {
        console.error(e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, agentId, status, jwtToken]);

  useEffect(() => {
    if (isOpen) {
      fetchQRCode();
    }
  }, [isOpen, agentId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Conectar WhatsApp</h3>
            <p className="text-xs text-slate-400">Agente: {agentName}</p>
          </div>
        </div>

        <div className="my-6 flex flex-col items-center justify-center">
          {status === 'CONNECTED' ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-white">WhatsApp Conectado com Sucesso!</p>
              <p className="text-xs text-slate-400">O agente agora responderá automaticamente às mensagens.</p>
            </div>
          ) : loading ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
              <p className="text-xs text-slate-400">Gerando sessão e QR Code...</p>
            </div>
          ) : qrCodeBase64 ? (
            <div className="text-center space-y-4">
              <div className="p-3 bg-white rounded-xl inline-block shadow-lg">
                <img
                  src={qrCodeBase64.startsWith('data:') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
                  alt="QR Code WhatsApp"
                  className="w-56 h-56 object-contain"
                />
              </div>
              <p className="text-xs text-slate-300">
                Abra o WhatsApp no celular &gt; <b>Aparelhos Conectados</b> &gt; <b>Conectar um aparelho</b>.
              </p>
            </div>
          ) : (
            <div className="py-8 text-center space-y-3">
              <WifiOff className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-xs text-rose-300">Não foi possível carregar o QR Code.</p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-slate-800">
          <div className="flex items-center space-x-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            <span className="text-slate-400">{status === 'CONNECTED' ? 'Online' : 'Aguardando Leitura'}</span>
          </div>

          <button
            type="button"
            onClick={fetchQRCode}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar QR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
