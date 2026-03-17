import React, { useState } from 'react';
import { Plus, FileText, X, Download, FileBarChart2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ActionMenuComprasV2({ onNovopedido, onImportarNF, onDownloadTemplate, grupos = [], kpis = {} }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [gerando, setGerando] = useState(false);

  const handleGerarRelatorio = async () => {
    setGerando(true);
    try {
      const resposta = await base44.functions.invoke('gerarRelatorioPedidosCompra', {
        grupos,
        filtros_desc: 'Todos os pedidos',
        kpis
      });
      
      const blob = new Blob([resposta.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RelatorioCompras_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Relatório gerado com sucesso');
      setIsExpanded(false);
    } catch (error) {
      toast.error('Erro ao gerar relatório');
      console.error(error);
    } finally {
      setGerando(false);
    }
  };

  const actions = [
    {
      icon: <Plus className="w-5 h-5" />,
      label: 'Novo Pedido',
      onClick: () => { onNovopedido(); setIsExpanded(false); },
      color: 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200',
    },
    {
      icon: <FileText className="w-5 h-5" />,
      label: 'Importar NF',
      onClick: () => { onImportarNF(); setIsExpanded(false); },
      color: 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200',
    },
    {
      icon: <Download className="w-5 h-5" />,
      label: 'Template',
      onClick: () => { onDownloadTemplate(); setIsExpanded(false); },
      color: 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200',
    },
    {
      icon: <FileBarChart2 className="w-5 h-5" />,
      label: 'Relatório',
      onClick: handleGerarRelatorio,
      color: 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200',
      disabled: gerando,
    },
  ];

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
      <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 flex flex-col-reverse items-end gap-2 max-h-[70vh] overflow-y-auto">
        {/* FAB principal */}
        <button
          onClick={() => setIsExpanded(prev => !prev)}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
            isExpanded ? 'bg-gray-600 dark:bg-gray-500 rotate-45' : 'bg-gray-900 dark:bg-gray-700'
          } text-white`}
          title="Ações de compras"
        >
          {isExpanded ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>

        {/* Botões filhos — lista vertical */}
        {isExpanded && actions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            disabled={action.disabled}
            title={action.label}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium whitespace-nowrap active:scale-95 transition-all disabled:opacity-40 flex-shrink-0 ${action.color}`}
            style={{
              animation: `fadeSlideUp 0.18s ease both`,
              animationDelay: `${idx * 30}ms`,
            }}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
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