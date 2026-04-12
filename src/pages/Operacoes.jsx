import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, TrendingUp, ShoppingCart } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function OperacoesPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header - SEM CORES */}
      <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-medium text-gray-800 dark:text-gray-200 mb-1">Operações</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Gestão de Estoque, Vendas e Compras</p>
      </div>

      {/* Links Rápidos - SEM CORES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Link to={createPageUrl('Estoque')}>
          <div className="p-6 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <Package className="w-8 h-8 text-gray-700 dark:text-gray-400 mb-3" />
            <h3 className="text-base font-normal text-gray-800 dark:text-gray-200 mb-1">Estoque</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Movimentações e controle</p>
          </div>
        </Link>

        <Link to={createPageUrl('VendasGestao')}>
          <div className="p-6 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <TrendingUp className="w-8 h-8 text-gray-700 dark:text-gray-400 mb-3" />
            <h3 className="text-base font-normal text-gray-800 dark:text-gray-200 mb-1">Vendas</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pedidos e orçamentos</p>
          </div>
        </Link>

        <Link to={createPageUrl('Compras')}>
          <div className="p-6 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <ShoppingCart className="w-8 h-8 text-gray-700 dark:text-gray-400 mb-3" />
            <h3 className="text-base font-normal text-gray-800 dark:text-gray-200 mb-1">Compras</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pedidos e recepção</p>
          </div>
        </Link>
      </div>
    </div>
  );
}