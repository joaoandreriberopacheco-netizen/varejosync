import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, ChevronRight, AlertCircle, CheckCircle2, Calendar, DollarSign, FileText, Plus, Zap, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AgefinImportador from '@/components/agefin/AgefinImportador';
import AgefinLista from '@/components/agefin/AgefinLista';
import AgefinAtualizador from '@/components/agefin/AgefinAtualizador';

export default function Agefin() {
  const [activeTab, setActiveTab] = useState('contas');
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    loadContas();
  }, []);

  const loadContas = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.LancamentoFinanceiro.list('-data_vencimento', 1000);
      setContas((data || []).filter((item) => item && Array.isArray(item.tags) && item.tags.includes('conta_pagar')));
      setDataLoaded(true);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    } finally {
      setLoading(false);
    }
  };

  const criarDadosFicticios = async () => {
    const contas_ficticia = [
      {
        descricao: 'Aluguel Escritório Central',
        terceiro_id: 'forn_001',
        terceiro_nome: 'Imóvel Brasil Ltda',
        categoria_financeira_id: 'cat_aluguel',
        categoria_nome: 'Aluguel',
        valor: 5000,
        data_vencimento: '2026-04-10',
        natureza: 'Recorrente',
        status: 'Pendente'
      },
      {
        descricao: 'Energia Elétrica - Abril',
        terceiro_id: 'forn_002',
        terceiro_nome: 'Companhia de Energia',
        categoria_financeira_id: 'cat_utilidades',
        categoria_nome: 'Utilidades',
        valor: 1200,
        data_vencimento: '2026-04-08',
        natureza: 'Recorrente',
        status: 'Pendente'
      },
      {
        descricao: 'Fornecimento de Matéria Prima',
        terceiro_id: 'forn_003',
        terceiro_nome: 'Fornecedor Industrial XYZ',
        categoria_financeira_id: 'cat_compras',
        categoria_nome: 'Compras',
        valor: 8500,
        data_vencimento: '2026-04-15',
        natureza: 'Único',
        status: 'Boleto Anexado'
      },
      {
        descricao: 'Licença Software Mensal',
        terceiro_id: 'forn_004',
        terceiro_nome: 'TechSoft Solutions',
        categoria_financeira_id: 'cat_software',
        categoria_nome: 'Tecnologia',
        valor: 599,
        data_vencimento: '2026-03-28',
        natureza: 'Recorrente',
        status: 'Pendente'
      },
      {
        descricao: 'Consultoria Contábil',
        terceiro_id: 'forn_005',
        terceiro_nome: 'Contábil Prime',
        categoria_financeira_id: 'cat_servicos',
        categoria_nome: 'Serviços',
        valor: 2500,
        data_vencimento: '2026-04-05',
        natureza: 'Único',
        status: 'Pendente'
      }
    ];

    try {
      await base44.entities.ContaPrevista.bulkCreate(contas_ficticia);
      await loadContas();
    } catch (error) {
      console.error('Erro ao criar dados fictícios:', error);
    }
  };

  const stats = useMemo(() => {
    const hoje = new Date();
    const proxSete = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);

    const total = contas.length;
    const pendentes = contas.filter(c => c.status === 'Em Aberto').length;
    const comBoleto = contas.filter(c => c.forma_pagamento_tipo === 'Boleto' || c.forma_pagamento === 'Boleto').length;
    const vencidas = contas.filter(c => (c.status === 'Vencido') || (new Date(c.data_vencimento) < hoje && c.status !== 'Pago' && c.status !== 'Cancelado')).length;
    const proximosSete = contas.filter(c => {
      const d = new Date(c.data_vencimento);
      return d >= hoje && d <= proxSete && c.status !== 'Pago' && c.status !== 'Cancelado';
    }).length;
    const valorTotal = contas.reduce((sum, c) => sum + (c.valor || 0), 0);
    
    return { total, pendentes, comBoleto, vencidas, proximosSete, valorTotal };
  }, [contas]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 shadow-sm min-w-0">
        <div className="p-4 md:p-6 min-w-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6 min-w-0">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-quicksand font-bold text-gray-900 dark:text-white">
                Agefin
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Gestão unificada de lançamentos financeiros
              </p>
            </div>
            <Button
              onClick={() => setShowImportDialog(true)}
              className="rounded-2xl h-12 sm:h-14 px-5 sm:px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium text-base shadow-sm shrink-0 w-full sm:w-auto"
            >
              <Upload className="w-5 h-5 mr-2" />
              Importar
            </Button>
          </div>

          {/* Pathway KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Critical Actions */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-3xl p-5 border-l-4 border-red-500 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Ações Urgentes
                  </p>
                  <p className="text-4xl font-bold text-red-900 dark:text-red-100">{stats.vencidas}</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">contas vencidas aguardando pagamento</p>
                </div>
                <AlertCircle className="w-14 h-14 text-red-300 dark:text-red-700 opacity-40" />
              </div>
            </div>

            {/* Pending Next */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-3xl p-5 border-l-4 border-amber-500 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Próximos 7 dias
                  </p>
                  <p className="text-4xl font-bold text-amber-900 dark:text-amber-100">{stats.proximosSete}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">vencimentos previstos</p>
                </div>
                <Calendar className="w-14 h-14 text-amber-300 dark:text-amber-700 opacity-40" />
              </div>
            </div>
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <MetricPill label="Pendentes" value={stats.pendentes} icon={<DollarSign className="w-4 h-4" />} color="blue" />
            <MetricPill label="Com Boleto" value={stats.comBoleto} icon={<FileText className="w-4 h-4" />} color="green" />
            <MetricPill label="Valor Total" value={`R$ ${(stats.valorTotal / 1000).toFixed(1)}k`} icon={<TrendingUp className="w-4 h-4" />} color="purple" />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full border-t border-gray-200 dark:border-gray-800">
          <TabsList className="w-full justify-start rounded-none border-0 bg-transparent px-4 md:px-6 h-auto p-0">
            <TabsTrigger
              value="contas"
              className="rounded-none border-b-2 px-0 py-3 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=inactive]:border-transparent text-gray-700 dark:text-gray-300"
            >
              Contas a Pagar
            </TabsTrigger>
            <TabsTrigger
              value="recorrentes"
              className="rounded-none border-b-2 px-6 py-3 ml-4 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=inactive]:border-transparent text-gray-700 dark:text-gray-300"
            >
              Recorrências
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-800 dark:border-gray-700 dark:border-t-gray-200 rounded-full animate-spin" />
          </div>
        ) : !dataLoaded || contas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
              <FileText className="w-10 h-10 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Nenhuma conta cadastrada</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
              Comece importando contas ou crie dados de teste para explorar a plataforma.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowImportDialog(true)}
                className="rounded-2xl h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar Contas
              </Button>
              <Button
                onClick={criarDadosFicticios}
                variant="outline"
                className="rounded-2xl h-12 font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Dados de Teste
              </Button>
            </div>
          </div>
        ) : (
          <>
            <TabsContent value="contas" className="mt-0">
              <AgefinLista contas={contas} onRefresh={loadContas} />
            </TabsContent>
            <TabsContent value="recorrentes" className="mt-0">
              <AgefinAtualizador onRefresh={loadContas} />
            </TabsContent>
          </>
        )}
      </div>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="rounded-3xl border-0 shadow-lg">
          <AgefinImportador
            onSuccess={() => {
              setShowImportDialog(false);
              loadContas();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricPill({ label, value, icon, color }) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  };

  return (
    <div className={`${colors[color]} rounded-2xl p-4 text-center border shadow-sm`}>
      <div className="flex items-center justify-center gap-1.5 mb-1.5">{icon}</div>
      <p className="text-xs font-medium opacity-75 mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}