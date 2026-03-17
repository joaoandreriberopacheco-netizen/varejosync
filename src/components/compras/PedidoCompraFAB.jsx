import React, { useState } from 'react';
import { Save, FileText, Paperclip, Compass, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function PedidoCompraFAB({ 
  pedido, 
  onSave, 
  isSaving, 
  isDisabled, 
  onEnviarFinanceiro,
  mostrarEnviarFinanceiro,
  onOpenAnexos
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

  const actions = [
    {
      icon: <Paperclip className="w-4 h-4" />,
      label: 'Anexos',
      onClick: () => { onOpenAnexos?.(); setIsExpanded(false); },
      disabled: !pedido?.id,
    },
    {
      icon: <FileText className="w-4 h-4" />,
      label: 'PDF',
      onClick: handlePrintPDF,
      disabled: !pedido?.id,
    },
    {
      icon: <Save className="w-4 h-4" />,
      label: 'Salvar',
      onClick: () => { onSave(); setIsExpanded(false); },
      disabled: isDisabled || isSaving,
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50">


      {/* Ações expandidas */}
      {isExpanded && (
        <div className="flex flex-col items-end gap-2">
          {actions.map((action, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 shadow px-2 py-1 rounded-lg">
                {action.label}
              </span>
              <Button
                size="icon"
                variant="outline"
                onClick={action.onClick}
                disabled={action.disabled}
                className="h-11 w-11 rounded-full shadow-md bg-white dark:bg-gray-800 border-0"
              >
                {action.icon}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* FAB principal — Bússola */}
      <button
        onClick={() => setIsExpanded(prev => !prev)}
        className={`h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 ${
          isExpanded 
            ? 'bg-gray-700 dark:bg-gray-600' 
            : 'bg-gray-900 dark:bg-gray-700'
        } text-white`}
        title="Ações do pedido"
      >
        {isExpanded 
          ? <X className="w-6 h-6" />
          : <Compass className="w-6 h-6" />
        }
      </button>
    </div>
  );
}