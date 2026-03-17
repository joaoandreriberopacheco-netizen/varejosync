import React, { useState } from 'react';
import { Save, FileText, Paperclip, Compass, X, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

// Posições radiais para 4 botões ao redor do FAB principal
// Ângulos: 180° (esq), 135° (sup-esq), 90° (cima), 45° (sup-dir)
const RADIUS = 80; // px
const ACTIONS_ANGLES = [180, 135, 90, 45]; // graus, no sentido horário desde o centro

function polarToXY(angleDeg, r) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Math.round(Math.cos(rad) * r),
    y: Math.round(-Math.sin(rad) * r), // negativo pois Y cresce pra baixo na tela
  };
}

export default function PedidoCompraFAB({
  pedido,
  onSave,
  isSaving,
  isDisabled,
  onEnviarFinanceiro,
  mostrarEnviarFinanceiro,
  onOpenAnexos,
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

  // Constrói lista de ações — Financeiro só aparece quando habilitado
  const actions = [
    mostrarEnviarFinanceiro && {
      icon: <Send className="w-5 h-5" style={{ transform: 'rotate(-45deg)' }} />,
      label: 'Financeiro',
      onClick: () => { onEnviarFinanceiro?.(); setIsExpanded(false); },
      disabled: false,
      color: 'bg-emerald-600 text-white',
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

  // Distribui os ângulos igualmente entre os botões disponíveis
  const totalActions = actions.length;
  const startAngle = 90;  // começa em cima
  const sweep = Math.min(180, (totalActions - 1) * 55); // arco máximo 180°
  const step = totalActions > 1 ? sweep / (totalActions - 1) : 0;

  return (
    <>
      {/* Backdrop blur quando expandido */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-[2px] bg-black/20"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Container do FAB */}
      <div className="fixed bottom-6 right-6 z-50" style={{ width: 56, height: 56 }}>

        {/* Botões radiais */}
        {isExpanded && actions.map((action, idx) => {
          const angle = startAngle + idx * step;
          const { x, y } = polarToXY(angle, RADIUS);
          return (
            <div
              key={idx}
              className="absolute flex flex-col items-center gap-1"
              style={{
                bottom: `calc(50% + ${y}px - 22px)`,
                right: `calc(50% + ${-x}px - 22px)`,
                transition: `all 0.25s cubic-bezier(0.34,1.56,0.64,1)`,
                transitionDelay: `${idx * 40}ms`,
              }}
            >
              <button
                onClick={action.onClick}
                disabled={action.disabled}
                title={action.label}
                className={`h-11 w-11 rounded-full shadow-lg flex items-center justify-center transition-all disabled:opacity-40 ${action.color}`}
              >
                {action.icon}
              </button>
              <span className="text-[10px] font-semibold text-white drop-shadow whitespace-nowrap">
                {action.label}
              </span>
            </div>
          );
        })}

        {/* FAB principal — Bússola */}
        <button
          onClick={() => setIsExpanded(prev => !prev)}
          className={`h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 ${
            isExpanded
              ? 'bg-gray-700 dark:bg-gray-500 rotate-45'
              : 'bg-gray-900 dark:bg-gray-700'
          } text-white`}
          title="Ações do pedido"
        >
          {isExpanded ? <X className="w-6 h-6" /> : <Compass className="w-6 h-6" />}
        </button>
      </div>
    </>
  );
}