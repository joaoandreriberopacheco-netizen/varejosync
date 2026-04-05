import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, ChevronRight, AlertCircle, CheckCircle2, Calendar, DollarSign, FileText } from 'lucide-react';
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

  useEffect(() => {
    loadContas();
  }, []);

  const loadContas = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.ContaPrevista.list('-data_vencimento', 100);
      setContas(data || []);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = contas.length;
    const pendentes = contas.filter(c => c.status === 'Pendente').length;
    const comBoleto = contas.filter(c => c.boleto_url).length;
    const desatualizadas = contas.filter(c => c.valor_desatualizado).length;
    const vencidas = contas.filter(c => new Date(c.data_vencimento) < new Date() && c.status !== 'Pago').length;
    
    return { total, pendentes, comBoleto, desatualizadas, vencidas };
  }, [contas]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 shadow-sm">
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-quicksand font-bold text-gray-900 dark:text-white">
                Agefin
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Gestão de contas a pagar
              </p>
            </div>
            <Button
              onClick={() => setShowImportDialog(true)}
              className="rounded-2xl h-14 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium text-base"
            >
              <Upload className="w-5 h-5 mr-2" />
              Importar
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Pendentes" value={stats.pendentes} variant="warning" />
            <StatCard label="Boletos" value={stats.comBoleto} variant="info" />
            <StatCard label="Desatualizar" value={stats.desatualizadas} variant="alert" />
            <StatCard label="Vencidas" value={stats.vencidas} variant="danger" />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full border-t border-gray-200 dark:border-gray-800">
          <TabsList className="w-full justify-start rounded-none border-0 bg-transparent px-4 md:px-6 h-auto p-0">
            <TabsTrigger
              value="contas"
              className="rounded-none border-b-2 px-0 py-3 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=inactive]:border-transparent"
            >
              Contas a Pagar
            </TabsTrigger>
            <TabsTrigger
              value="recorrentes"
              className="rounded-none border-b-2 px-6 py-3 ml-4 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=inactive]:border-transparent"
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

function StatCard({ label, value, variant = 'default' }) {
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
    info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
    alert: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
    danger: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  };

  return (
    <div className={`${variants[variant]} rounded-2xl p-3 text-center shadow-sm`}>
      <p className="text-xs md:text-sm font-medium opacity-75 mb-1">{label}</p>
      <p className="text-2xl md:text-3xl font-bold">{value}</p>
    </div>
  );
}