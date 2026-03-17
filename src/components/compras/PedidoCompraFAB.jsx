import React, { useState } from 'react';
import { Save, FileText, Paperclip, Compass, X, Send, Wrench } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

// Raio em px — aumentado para não sair da tela
const RADIUS = 72;

export default function PedidoCompraFAB({
  pedido,
  onSave,
  isSaving,
  isDisabled,
  onEnviarFinanceiro,
  mostrarEnviarFinanceiro,
  onOpenAnexos,
  onSolicitarEdicao,
  mostrarSolicitarEdicao,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const handlePrintPDF = async () => {
    if (!pedido?.id) {
      toast({ title: 'Salve o pedido antes de gerar o PDF', variant: 'destructive' });
      return;
    }
    try {
      toast({ title: 'Gerando PDF...', description: 'Aguarde...' });
      const response = await base44.functions.invoke('gerarRelatorioPedido', { pedido_id: pedido.id });
      if (!response?.data) throw new Error('Resposta inválida');
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Pedido_${pedido.numero || pedido.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
    setIsExpanded(false);
  };

  // Monta lista de ações dinamicamente
  const actions = [
    mostrarEnviarFinanceiro && {
      icon: <Send className="w-5 h-5" style={{ transform: 'rotate(-45deg)' }} />,
      label: 'Financeiro',
      onClick: () => { onEnviarFinanceiro?.(); setIsExpanded(false); },
      color: 'bg-emerald-600 text-white',
    },
    mostrarSolicitarEdicao && {
      icon: <Wrench className="w-5 h-5" />,
      label: 'Reabrir',
      onClick: () => { onSolicitarEdicao?.(); setIsExpanded(false); },
      color: 'bg-amber-500 text-white',
    },
    {
      icon: <Paperclip className="w-5 h-5" />,
      label: 'Anexos',
      onClick: () => { onOpenAnexos?.(); setIsExpanded(false); },
      disabled: !pedido?.id,
      color: 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200',
    },
    {
      icon: <FileText className="w-5 h-5" />,
      label: 'PDF',
      onClick: handlePrintPDF,
      disabled: !pedido?.id,
      color: 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200',
    },
    {
      icon: <Save className="w-5 h-5" />,
      label: 'Salvar',
      onClick: () => { onSave(); setIsExpanded(false); },
      disabled: isDisabled || isSaving,
      color: 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200',
    },
  ].filter(Boolean);

  // Distribui em arco acima-esquerda do FAB (90° a 180°)
  // Para N ações, distribui igualmente no arco
  const n = actions.length;
  const arcStart = 90;   // começa em cima
  const arcEnd = 195;    // termina à esquerda
  const step = n > 1 ? (arcEnd - arcStart) / (n - 1) : 0;

  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-[2px] bg-black/20"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Wrapper — grande o suficiente para conter o arco radial */}
      <div
        className="fixed z-50"
        style={{
          bottom: 24,
          right: 24,
          // O FAB fica no canto inferior direito do wrapper (offset RADIUS+btn/2)
          width:  RADIUS + 56 + 48,  // espaço à esquerda para botões
          height: RADIUS + 56 + 24,  // espaço acima para botões
          pointerEvents: 'none',
        }}
      >
        {/* Botões radiais — posicionados em torno do FAB no canto inferior direito */}
        {isExpanded && actions.map((action, idx) => {
          const angleDeg = arcStart + idx * step;
          const rad = (angleDeg * Math.PI) / 180;
          // FAB está no canto inferior direito do wrapper
          const fabX = RADIUS + 56 + 48 - 28; // centro FAB X relativo ao wrapper
          const fabY = RADIUS + 56 + 24 - 28; // centro FAB Y relativo ao wrapper
          const dx = -Math.round(Math.cos(rad) * RADIUS);
          const dy = -Math.round(Math.sin(rad) * RADIUS);

          return (
            <div
              key={idx}
              className="absolute flex flex-col items-center gap-0.5"
              style={{
                left: fabX + dx - 22,
                top:  fabY + dy - 22,
                transition: `all 0.22s cubic-bezier(0.34,1.56,0.64,1)`,
                transitionDelay: `${idx * 35}ms`,
                whiteSpace: 'nowrap',
                pointerEvents: 'auto',
              }}
            >
              <span className="text-[10px] font-semibold text-white drop-shadow-sm mb-0.5">
                {action.label}
              </span>
              <button
                onClick={action.onClick}
                disabled={action.disabled}
                title={action.label}
                className={`h-11 w-11 rounded-full shadow-lg flex items-center justify-center transition-all disabled:opacity-40 ${action.color}`}
              >
                {action.icon}
              </button>
            </div>
          );
        })}

        {/* FAB principal — fixado no canto inferior direito do wrapper */}
        <button
          onClick={() => setIsExpanded(prev => !prev)}
          className={`h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 ${
            isExpanded
              ? 'bg-gray-600 dark:bg-gray-500 rotate-45'
              : 'bg-gray-900 dark:bg-gray-700'
          } text-white`}
          title="Ações do pedido"
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            pointerEvents: 'auto',
          }}
        >
          {isExpanded ? <X className="w-6 h-6" /> : <Compass className="w-6 h-6" />}
        </button>
      </div>
    </>
  );
}