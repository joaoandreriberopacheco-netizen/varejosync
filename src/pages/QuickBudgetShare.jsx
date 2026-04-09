import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Download, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatCurrency(value) {
  return `R$ ${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function QuickBudgetShare() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const { data, isLoading } = useQuery({
    queryKey: ['quick-budget-share', token],
    queryFn: async () => {
      const result = await base44.entities.QuickBudgetShare.filter({ share_token: token });
      return result?.[0] || null;
    },
    enabled: !!token,
  });

  const whatsappUrl = useMemo(() => {
    return `https://wa.me/?text=${encodeURIComponent(window.location.href)}`;
  }, []);

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center text-sm text-gray-500">Carregando orçamento...</div>;
  }

  if (!data) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center text-sm text-gray-500">Orçamento não encontrado.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto rounded-[28px] bg-white dark:bg-gray-900 shadow-sm p-5 md:p-7 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white font-glacial">{data.title || 'Orçamento rápido'}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{Number(data.summary?.quantidadeItens || 0)} unidades · {data.items?.length || 0} itens</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">{formatCurrency(data.summary?.total)}</p>
          </div>
        </div>

        <div className="space-y-2">
          {(data.items || []).map((item, index) => (
            <div key={index} className="rounded-2xl bg-gray-50 dark:bg-gray-800 px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{item.produto_nome}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.quantidade} x {formatCurrency(item.preco_unitario)}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(item.total)}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 px-4 py-4 space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300"><span>Subtotal</span><strong>{formatCurrency(data.summary?.subtotal)}</strong></div>
          {Number(data.summary?.desconto || 0) > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300"><span>Desconto</span><strong>{formatCurrency(data.summary?.desconto)}</strong></div>
          )}
          <div className="flex items-center justify-between text-base font-semibold text-gray-900 dark:text-white"><span>Total</span><strong>{formatCurrency(data.summary?.total)}</strong></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button onClick={() => window.print()} className="h-12 rounded-2xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 shadow-none">
            <Download className="w-4 h-4 mr-2" /> Baixar PDF
          </Button>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
            <Button variant="outline" className="w-full h-12 rounded-2xl border-0 bg-gray-100 dark:bg-gray-800 shadow-none text-gray-700 dark:text-gray-200">
              <MessageCircle className="w-4 h-4 mr-2" /> Compartilhar link
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}