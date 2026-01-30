import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QrCode, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function ConferenciaEntrada() {
  const [codigo, setCodigo] = useState('');
  const [validando, setValidando] = useState(false);
  const navigate = useNavigate();

  const handleValidarCodigo = async (e) => {
    e.preventDefault();
    
    if (!codigo.trim()) {
      toast.error('Digite o código de conferência');
      return;
    }

    try {
      setValidando(true);
      
      const response = await base44.functions.invoke('validateConferenceCode', {
        codigo: codigo.trim().toUpperCase()
      });

      if (response.data.success) {
        const { tipo, manifesto, manifesto_entrada } = response.data;
        
        toast.success('Código válido! Iniciando conferência...');
        
        // Redirecionar para a tela de conferência apropriada
        if (tipo === 'volumes') {
          navigate(`/ConferenciaVolumes?codigo=${codigo.trim().toUpperCase()}`);
        } else {
          navigate(`/ConferenciaItens?codigo=${codigo.trim().toUpperCase()}`);
        }
      } else {
        toast.error(response.data.error || 'Código inválido');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao validar código');
    } finally {
      setValidando(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center">
            <QrCode className="w-10 h-10 text-gray-700 dark:text-gray-300" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-gray-800 dark:text-gray-200">Conferência Cega</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Digite o código fornecido pelo supervisor
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleValidarCodigo} className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-3 block">
                Código de Conferência
              </label>
              <Input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="XXXXXXXX"
                className="h-16 text-center text-2xl font-mono font-bold tracking-wider bg-gray-50 dark:bg-gray-900 border-0 shadow-sm"
                autoFocus
                maxLength={8}
                disabled={validando}
              />
            </div>

            <Button
              type="submit"
              disabled={validando || !codigo.trim()}
              className="w-full h-14 text-base bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 shadow-lg gap-2"
            >
              {validando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  Iniciar Conferência
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </div>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-200">
                <p className="font-medium mb-1">Como funciona?</p>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• O supervisor gera um código único no Hub Logístico</li>
                  <li>• Você digita o código para iniciar a conferência</li>
                  <li>• Registre volumes ou itens sem ver os dados esperados</li>
                </ul>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}