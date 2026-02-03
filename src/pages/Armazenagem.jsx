import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, TrendingUp, History, BarChart3, ClipboardCheck, QrCode, Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { toast } from 'sonner';
import FilaSeparacao from '@/components/estoque/FilaSeparacao';
import MovimentacaoEstoqueForm from '@/components/estoque/MovimentacaoEstoqueForm';
import HistoricoMovimentacoes from '@/components/estoque/HistoricoMovimentacoes';

export default function Armazenagem() {
  const [currentUser, setCurrentUser] = useState(null);
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const user = await base44.auth.me();
    setCurrentUser(user);
    
    const produtosData = await base44.entities.Produto.list();
    setProdutos(produtosData);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-light text-gray-900 dark:text-white">Módulo de Estoque</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gerencie seu inventário, separação de pedidos, entradas, saídas e histórico completo
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="separacao" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm">
            <TabsTrigger 
              value="separacao" 
              className="flex items-center gap-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700"
            >
              <Package className="w-4 h-4" />
              <span className="hidden md:inline">Fila de Separação</span>
            </TabsTrigger>
            <TabsTrigger 
              value="movimentacao"
              className="flex items-center gap-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700"
            >
              <TrendingUp className="w-4 h-4" />
              <span className="hidden md:inline">Nova Movimentação</span>
            </TabsTrigger>
            <TabsTrigger 
              value="historico"
              className="flex items-center gap-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700"
            >
              <History className="w-4 h-4" />
              <span className="hidden md:inline">Histórico</span>
            </TabsTrigger>
            <TabsTrigger 
              value="inventario"
              className="flex items-center gap-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden md:inline">Inventário Atual</span>
            </TabsTrigger>
            <TabsTrigger 
              value="conferencia"
              className="flex items-center gap-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span className="hidden md:inline">Conferência</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="separacao" className="mt-6">
            <FilaSeparacao />
          </TabsContent>

          <TabsContent value="movimentacao" className="mt-6">
            <MovimentacaoEstoqueForm produtos={produtos} onSuccess={loadData} />
          </TabsContent>

          <TabsContent value="historico" className="mt-6">
            <HistoricoMovimentacoes />
          </TabsContent>

          <TabsContent value="inventario" className="mt-6">
            <InventarioAtual produtos={produtos} />
          </TabsContent>

          <TabsContent value="conferencia" className="mt-6">
            <ConferenciaManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function InventarioAtual({ produtos }) {
  const [inventario, setInventario] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarInventario();
  }, [produtos]);

  const carregarInventario = async () => {
    try {
      const produtosComEstoque = await Promise.all(
        produtos.map(async (produto) => {
          const estoque = produto.estoque_atual || 0;
          return { ...produto, estoque };
        })
      );
      setInventario(produtosComEstoque.filter(p => p.estoque > 0));
    } catch (error) {
      console.error('Erro ao carregar inventário:', error);
    } finally {
      setCarregando(false);
    }
  };

  if (carregando) {
    return <div className="text-center py-12 text-gray-500">Carregando inventário...</div>;
  }

  if (inventario.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Nenhum produto em estoque</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">PRODUTO</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">CÓDIGO</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">ESTOQUE</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">MÍN.</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {inventario.map((produto) => {
              const abaixoMinimo = produto.estoque < (produto.estoque_minimo || 0);
              return (
                <tr key={produto.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{produto.nome}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{produto.codigo_interno || '-'}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white font-medium">{produto.estoque}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500 dark:text-gray-400">{produto.estoque_minimo || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    {abaixoMinimo ? (
                      <span className="inline-flex px-2 py-1 text-xs rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                        Abaixo do Mínimo
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}