import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, TrendingUp, History, ClipboardCheck } from 'lucide-react';
import FilaSeparacao from '@/components/estoque/FilaSeparacao';
import MovimentacaoEstoqueForm from '@/components/estoque/MovimentacaoEstoqueForm';
import HistoricoMovimentacoes from '@/components/estoque/HistoricoMovimentacoes';
import ListaConferencias from '@/components/estoque/auditoria/ListaConferencias';
import ConferenciaEditor from '@/components/estoque/auditoria/ConferenciaEditor';
import ConferenciaAuditoria from '@/components/estoque/auditoria/ConferenciaAuditoria';

export default function Armazenagem() {
  const [produtos, setProdutos] = useState([]);
  const [conferenciaAtiva, setConferenciaAtiva] = useState(null);
  const [conferenciaAuditoria, setConferenciaAuditoria] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const produtosData = await base44.entities.Produto.list();
    setProdutos(produtosData);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-light text-gray-900 dark:text-white">Módulo de Estoque</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gerencie seu inventário, separação de pedidos, entradas, saídas e histórico completo
          </p>
        </div>

        <Tabs defaultValue="separacao" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm">
            <TabsTrigger
              value="separacao"
              title="Fila de Separação"
              className="flex items-center gap-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700"
            >
              <Package className="w-4 h-4" />
              <span className="hidden md:inline">Fila de Separação</span>
            </TabsTrigger>
            <TabsTrigger
              value="movimentacao"
              title="Nova Movimentação"
              className="flex items-center gap-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700"
            >
              <TrendingUp className="w-4 h-4" />
              <span className="hidden md:inline">Nova Movimentação</span>
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              title="Histórico de Movimentações"
              className="flex items-center gap-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700"
            >
              <History className="w-4 h-4" />
              <span className="hidden md:inline">Histórico</span>
            </TabsTrigger>
            <TabsTrigger
              value="auditoria"
              title="Auditoria de Estoque"
              onClick={() => setConferenciaAtiva(null)}
              className="flex items-center gap-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span className="hidden md:inline">Auditoria de Estoque</span>
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

          <TabsContent value="auditoria" className="mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
              {conferenciaAuditoria ? (
                <ConferenciaAuditoria
                  conferencia={conferenciaAuditoria}
                  onVoltar={() => setConferenciaAuditoria(null)}
                  onAtualizar={() => setConferenciaAuditoria(null)}
                />
              ) : conferenciaAtiva ? (
                <ConferenciaEditor
                  conferencia={conferenciaAtiva}
                  onVoltar={() => setConferenciaAtiva(null)}
                />
              ) : (
                <ListaConferencias
                  onAbrirConferencia={setConferenciaAtiva}
                  onAbrirAuditoria={setConferenciaAuditoria}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}