import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Receipt, Wallet, Lock } from 'lucide-react';
import SeletorCaixaPDV from '@/components/vendas/SeletorCaixaPDV';
import BalancoTab from '@/components/vendas/caixa/BalancoTab';
import ProcessarVendasTab from '@/components/vendas/caixa/ProcessarVendasTab';
import MovimentosTab from '@/components/vendas/caixa/MovimentosTab';
import FechamentoCaixaButton from '@/components/vendas/FechamentoCaixaButton';

export default function CaixaPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [caixaSelecionado, setCaixaSelecionado] = useState(null);
  const [turnoAtivo, setTurnoAtivo] = useState(null);
  const [showSeletorCaixa, setShowSeletorCaixa] = useState(true);
  const [activeTab, setActiveTab] = useState('balanco');

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(console.error);
  }, []);

  const handleSelecionarCaixa = (caixa, turno, somenteLeitura) => {
    setCaixaSelecionado(caixa);
    setTurnoAtivo(turno);
    setShowSeletorCaixa(false);
  };

  const handleTrocarCaixa = () => {
    setShowSeletorCaixa(true);
    setCaixaSelecionado(null);
    setTurnoAtivo(null);
  };

  if (showSeletorCaixa) {
    return (
      <SeletorCaixaPDV 
        open={showSeletorCaixa} 
        onSelect={handleSelecionarCaixa}
        currentUser={currentUser}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-6">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white font-glacial">
              Gestão de Caixa
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
              {caixaSelecionado?.nome} · Turno {turnoAtivo?.numero}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleTrocarCaixa}
              className="h-10 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium shadow-sm hover:shadow-md transition-shadow"
            >
              Trocar Caixa
            </button>
            <FechamentoCaixaButton 
              turnoAtivo={turnoAtivo}
              caixaSelecionado={caixaSelecionado}
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-sm h-auto">
            <TabsTrigger 
              value="balanco" 
              className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gray-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-gray-900 py-3"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Balanço</span>
            </TabsTrigger>
            <TabsTrigger 
              value="processar" 
              className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gray-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-gray-900 py-3"
            >
              <Receipt className="w-4 h-4" />
              <span className="hidden sm:inline">Processar</span>
            </TabsTrigger>
            <TabsTrigger 
              value="movimentos" 
              className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gray-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-gray-900 py-3"
            >
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Movimentos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="balanco" className="mt-4">
            <BalancoTab 
              caixaSelecionado={caixaSelecionado}
              turnoAtivo={turnoAtivo}
            />
          </TabsContent>

          <TabsContent value="processar" className="mt-4">
            <ProcessarVendasTab 
              turnoAtivo={turnoAtivo}
            />
          </TabsContent>

          <TabsContent value="movimentos" className="mt-4">
            <MovimentosTab 
              turnoAtivo={turnoAtivo}
              caixaSelecionado={caixaSelecionado}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}