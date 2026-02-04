import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { QrCode, Copy, RefreshCw, Eye, Check, Clock, AlertCircle } from 'lucide-react';

export default function GestaoCodigosConferencia({ manifesto, tipo = 'volumes', onUpdate }) {
  const [gerando, setGerando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Determinar qual código e status usar baseado no tipo
  const codigo = tipo === 'volumes' 
    ? manifesto.codigo_conferencia_volumes 
    : manifesto.codigo_conferencia_itens;
    
  const status = tipo === 'volumes'
    ? manifesto.status_codigo_conferencia_volumes
    : manifesto.status_codigo_conferencia_itens;

  const handleGerarCodigo = async () => {
    // Verificar se já foi conferido
    if (status === 'Concluído') {
      toast.error('Esta conferência já foi finalizada');
      return;
    }

    try {
      setGerando(true);
      
      const response = await base44.functions.invoke('generateConferenceCode', {
        tipo: tipo,
        manifesto_id: manifesto.id
      });

      if (response.data.success) {
        toast.success(`Código de ${tipo} gerado com sucesso`);
        onUpdate?.();
      } else {
        toast.error(response.data.error || 'Erro ao gerar código');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao gerar código de conferência');
    } finally {
      setGerando(false);
    }
  };

  const handleCopiarCodigo = () => {
    if (codigo) {
      navigator.clipboard.writeText(codigo);
      setCopiado(true);
      toast.success('Código copiado!');
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  const getStatusInfo = () => {
    const configs = {
      'Pendente Geração': {
        color: 'bg-gray-100 text-gray-700',
        icon: Clock,
        label: 'Não Gerado'
      },
      'Gerado': {
        color: 'bg-blue-100 text-blue-700',
        icon: QrCode,
        label: 'Aguardando Uso'
      },
      'Em Uso': {
        color: 'bg-amber-100 text-amber-700',
        icon: Eye,
        label: 'Em Conferência'
      },
      'Concluído': {
        color: 'bg-emerald-100 text-emerald-700',
        icon: Check,
        label: 'Concluído'
      },
      'Expirado': {
        color: 'bg-red-100 text-red-700',
        icon: AlertCircle,
        label: 'Expirado'
      }
    };

    return configs[status] || configs['Pendente Geração'];
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Conferência de {tipo === 'volumes' ? 'Volumes' : 'Itens'}
          </span>
        </div>
        <Badge className={`${statusInfo.color} border-0 gap-1.5`}>
          <StatusIcon className="w-3 h-3" />
          {statusInfo.label}
        </Badge>
      </div>

      {codigo ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <code className="flex-1 text-base font-mono font-bold text-gray-900 dark:text-white tracking-wider">
              {codigo}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopiarCodigo}
              className="h-8 w-8 p-0"
              title="Copiar código"
            >
              {copiado ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          {status === 'Gerado' && (
            <p className="text-xs text-gray-500">
              Forneça este código ao conferente para iniciar a conferência cega.
            </p>
          )}

          {(status === 'Expirado' || status === 'Concluído') && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGerarCodigo}
              disabled={gerando}
              className="w-full gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${gerando ? 'animate-spin' : ''}`} />
              Gerar Novo Código
            </Button>
          )}
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleGerarCodigo}
          disabled={gerando}
          className="w-full gap-2"
        >
          <QrCode className="w-3.5 h-3.5" />
          {gerando ? 'Gerando...' : 'Gerar Código'}
        </Button>
      )}
    </div>
  );
}