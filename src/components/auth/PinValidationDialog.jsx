import React, { useState, useEffect, useRef } from 'react';
import { Shield, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { gerenciarPin } from '@/functions/gerenciarPin';

/**
 * PinValidationDialog — Solicita o PIN do usuário logado para autorizar ações críticas.
 * 
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   onSuccess: (userData) => void   — chamado após PIN válido
 *   operationName: string           — ex: "Cancelar Venda PV-00042"
 * 
 * Uso:
 *   <PinValidationDialog
 *     isOpen={showPin}
 *     onClose={() => setShowPin(false)}
 *     onSuccess={() => executarCancelamento()}
 *     operationName="Cancelar Venda"
 *   />
 */
export default function PinValidationDialog({ isOpen, onClose, onSuccess, operationName = 'Operação Crítica' }) {
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPin(''); setErro(''); setEmailEnviado(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleValidar = async () => {
    if (pin.length < 6) return setErro('PIN deve ter 6 dígitos.');
    setLoading(true); setErro('');
    try {
      const res = await gerenciarPin({ operacao: 'verify_pin', pin });
      if (res.data?.sucesso) {
        onSuccess?.();
        onClose();
      } else {
        setErro(res.data?.error || 'PIN incorreto.');
        setPin('');
      }
    } catch (e) {
      setErro(e?.response?.data?.error || 'PIN incorreto.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleResetEmail = async () => {
    setEnviandoEmail(true);
    try {
      await gerenciarPin({ operacao: 'reset_pin_email' });
      setEmailEnviado(true);
    } catch (e) {
      setErro('Não foi possível enviar o e-mail.');
    } finally {
      setEnviandoEmail(false);
    }
  };

  // PIN numérico estilo teclado virtual — 4 dots
  const dots = Array.from({ length: 6 }, (_, i) => i < pin.length);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xs bg-white dark:bg-gray-900 border-none shadow-xl text-center">
        <DialogHeader>
          <div className="flex justify-center mb-1">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Shield className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </div>
          </div>
          <DialogTitle className="font-glacial text-gray-800 dark:text-white text-center">
            Confirmação de Segurança
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-xs text-center">
            {operationName}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-5">
          {/* Dots indicator */}
          <div className="flex justify-center gap-3">
            {dots.map((filled, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all duration-150 ${
                  filled
                    ? 'bg-gray-800 dark:bg-white scale-110'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>

          {/* Input oculto para capturar teclado físico */}
          <input autoComplete="off"
            ref={inputRef}
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={e => {
              setErro('');
              setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
            }}
            onKeyDown={e => e.key === 'Enter' && handleValidar()}
            className="absolute opacity-0 w-0 h-0"
            maxLength={6}
          />

          {/* Teclado numérico visual */}
          <div className="grid grid-cols-3 gap-2 px-4">
            {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((key, i) => (
              <button
                key={i}
                onClick={() => {
                  if (key === '⌫') {
                    setPin(p => p.slice(0, -1));
                  } else if (key !== '') {
                    const next = (pin + key).slice(0, 6);
                    setPin(next);
                    setErro('');
                  }
                }}
                className={`h-12 rounded-xl text-lg font-medium transition-all active:scale-95 ${
                  key === ''
                    ? 'pointer-events-none'
                    : key === '⌫'
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          {erro && (
            <div className="flex items-center justify-center gap-1.5 text-red-500 text-xs">
              <AlertCircle className="w-3.5 h-3.5" />
              {erro}
            </div>
          )}

          {emailEnviado && (
            <div className="flex items-center justify-center gap-1.5 text-green-600 text-xs">
              <CheckCircle className="w-3.5 h-3.5" />
              PIN temporário enviado ao seu e-mail.
            </div>
          )}

          <Button
            onClick={handleValidar}
            disabled={loading || pin.length < 6}
            className="w-full bg-gray-900 dark:bg-white dark:text-gray-900 text-white"
          >
            {loading ? 'Verificando...' : 'Confirmar'}
          </Button>

          <button
            onClick={handleResetEmail}
            disabled={enviandoEmail || emailEnviado}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center justify-center gap-1 w-full"
          >
            <Mail className="w-3 h-3" />
            {enviandoEmail ? 'Enviando...' : 'Esqueci meu PIN'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}