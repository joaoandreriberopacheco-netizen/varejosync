import React, { useState } from 'react';
import { Plus, FileText, X, Download, FileBarChart2, Send, CheckSquare, FileSpreadsheet, Smartphone, Loader2 } from 'lucide-react';
import { gerarRelatorioPedidosCompra } from '@/functions/gerarRelatorioPedidosCompra';
import { toast } from 'sonner';
import { dataHoje } from '@/components/utils/dateUtils';

export default function ActionMenuComprasV2({ onNovopedido, onImportarNF, onDownloadTemplate, onEnviarFinanceiroLote, onToggleModoSelecao, modoSelecao = false, quantidadeSelecionados = 0, enviandoLote = false, pedidos = [], filtrosDesc = 'Pedidos filtrados na tela', kpis = {}, grupos = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [gerando, setGerando] = useState('');

  const handleGerarRelatorio = async (version) => {
    setGerando(version);
    toast.loading('Gerando relatório...', { id: 'gerando-relatorio' });
    try {
      const resposta = await gerarRelatorioPedidosCompra({
        pedidos,
        version,
        filtros_desc: filtrosDesc,
        kpis,
        grupos,
      });

      const blob = new Blob([resposta.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RelatorioCompras_${version}_${dataHoje()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Relatório ${version} gerado com sucesso`, { id: 'gerando-relatorio' });
      setIsExpanded(false);
    } catch (error) {
      toast.error('Erro ao gerar relatório', { id: 'gerando-relatorio' });
      console.error(error);
    } finally {
      setGerando('');
    }
  };

  const actions = [
    {
      icon: <CheckSquare className="w-5 h-5" />,
      label: modoSelecao ? 'Cancelar seleção' : 'Selecionar embarques',
      onClick: () => { onToggleModoSelecao?.(); setIsExpanded(false); },
      color: modoSelecao ? 'bg-gray-900 dark:bg-gray-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200',
    },
    ...(modoSelecao ? [{
      icon: <Send className="w-5 h-5" />,
      label: enviandoLote ? 'Enviando...' : `Enviar ao financeiro${quantidadeSelecionados ? ` (${quantidadeSelecionados})` : ''}`,
      onClick: () => { onEnviarFinanceiroLote?.(); setIsExpanded(false); },
      color: 'bg-emerald-600 text-white',
      disabled: enviandoLote || quantidadeSelecionados === 0,
    }] : []),
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
      label: 'PDF compacto',
      onClick: () => handleGerarRelatorio('compacta'),
      color: 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200',
      disabled: !!gerando,
    },
    {
      icon: <FileSpreadsheet className="w-5 h-5" />,
      label: 'PDF expandido',
      onClick: () => handleGerarRelatorio('expandida'),
      color: 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200',
      disabled: !!gerando,
    },
    {
      icon: <Smartphone className="w-5 h-5" />,
      label: 'PDF mobile',
      onClick: () => handleGerarRelatorio('expandida_mobile'),
      color: 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200',
      disabled: !!gerando,
    },
    {
      icon: <Smartphone className="w-5 h-5" />,
      label: 'Mobile com alma',
      onClick: () => handleGerarRelatorio('mobile_com_alma'),
      color: 'bg-gray-900 dark:bg-gray-600 text-white',
      disabled: !!gerando,
    },
  ];

  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-[54] bg-black/20 backdrop-blur-[2px]"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* FAB container */}
      <div className="fixed right-4 z-[55] flex max-h-[70vh] flex-col-reverse items-end gap-2 overflow-y-auto p38-bottom-fab-mid lg:bottom-6 lg:right-6">
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium whitespace-nowrap active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 ${action.color}`}
            style={{
              animation: `fadeSlideUp 0.18s ease both`,
              animationDelay: `${idx * 30}ms`,
            }}
          >
            {gerando === (action.label === 'PDF compacto' ? 'compacta' : action.label === 'PDF expandido' ? 'expandida' : action.label === 'PDF mobile' ? 'expandida_mobile' : action.label === 'Mobile com alma' ? 'mobile_com_alma' : '')
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : action.icon}
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