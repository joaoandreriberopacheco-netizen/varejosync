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

      {/* FAB container */}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end gap-2">
        {/* Botões filhos — lista vertical */}
        {isExpanded && actions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            disabled={action.disabled}
            title={action.label}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium whitespace-nowrap active:scale-95 transition-all disabled:opacity-40 ${action.color}`}
            style={{
              animation: `fadeSlideUp 0.18s ease both`,
              animationDelay: `${idx * 30}ms`,
            }}
          >
            {action.icon}
            {action.label}
          </button>
        ))}

        {/* FAB principal */}
        <button
          onClick={() => setIsExpanded(prev => !prev)}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 ${
            isExpanded ? 'bg-gray-600 dark:bg-gray-500 rotate-45' : 'bg-gray-900 dark:bg-gray-700'
          } text-white`}
          title="Ações do pedido"
        >
          {isExpanded ? <X className="w-6 h-6" /> : <Compass className="w-6 h-6" />}
        </button>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}