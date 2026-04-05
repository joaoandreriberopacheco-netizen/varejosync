import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Calendar, AlertCircle, DollarSign, Repeat2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

export default function AgefinPortal() {
  const [periodoInicio, setPeriodoInicio] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [periodoFim, setPeriodoFim] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });

  const [contas, setContas] = useState([]);
  const [recorrentes, setRecorrentes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [periodoInicio, periodoFim]);

  const loadData = async () => {
    try {
      setLoading(true);
      const contasData = await base44.entities.ContaPrevista.filter({}, '-data_vencimento', 100);
      const recorrentesData = await base44.entities.ContaRecorrente.filter({ ativa: true }, 'nome_despesa', 100);
      setContas(contasData || []);
      setRecorrentes(recorrentesData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const inicio = new Date(periodoInicio);
    const fim = new Date(periodoFim);

    const contasNoPeriodo = contas.filter(c => {
      const d = new Date(c.data_vencimento);
      return d >= inicio && d <= fim && c.status !== 'Pago';
    });

    const vencidas = contasNoPeriodo.filter(c => new Date(c.data_vencimento) < new Date());
    const pendentes = contasNoPeriodo.filter(c => c.status === 'Pendente').length;
    const valorTotal = contasNoPeriodo.reduce((sum, c) => sum + (c.valor || 0), 0);
    const comRecorrencia = recorrentes.filter(r => {
      if (!r.data_fim || new Date(r.data_fim) >= inicio) {
        return true;
      }
      return false;
    }).length;

    return {
      contasNoPeriodo,
      vencidas: vencidas.length,
      pendentes,
      valorTotal,
      comRecorrencia,
      recorrentesAusentes: recorrentes.filter(r => 
        !contasNoPeriodo.some(c => c.conta_recorrente_id === r.id)
      )
    };
  }, [contas, recorrentes, periodoInicio, periodoFim]);

  return (
    <div className="space-y-4">
      {/* Período Seletor */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-sm space-y-3">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Período</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)}
              className="flex-1 px-3 py-2 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-0 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={periodoFim}
              onChange={(e) => setPeriodoFim(e.target.value)}
              className="flex-1 px-3 py-2 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-0 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Contas com Vencimento */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-3xl p-4 shadow-sm border-l-4 border-blue-400">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Contas no período</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.contasNoPeriodo.length}</p>
              {stats.vencidas > 0 && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {stats.vencidas} vencida{stats.vencidas > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <DollarSign className="w-10 h-10 text-blue-300 dark:text-blue-700 opacity-40" />
          </div>
        </div>

        {/* Recorrências Ativas */}
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-3xl p-4 shadow-sm border-l-4 border-purple-400">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">Recorrências ativas</p>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{stats.comRecorrencia}</p>
              {stats.recorrentesAusentes.length > 0 && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {stats.recorrentesAusentes.length} sem conta
                </p>
              )}
            </div>
            <Repeat2 className="w-10 h-10 text-purple-300 dark:text-purple-700 opacity-40" />
          </div>
        </div>
      </div>

      {/* Valor Total */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Valor total</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          R$ {(stats.valorTotal / 1000).toFixed(1)}k
        </p>
      </div>

      {/* Recorrências Sem Conta no Período */}
      {stats.recorrentesAusentes.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-3xl p-4 shadow-sm space-y-3 border-l-4 border-orange-400">
          <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">
            ⚠️ {stats.recorrentesAusentes.length} recorrência{stats.recorrentesAusentes.length > 1 ? 's' : ''} sem conta no período
          </p>
          <div className="space-y-2">
            {stats.recorrentesAusentes.slice(0, 3).map((r) => (
              <div key={r.id} className="text-xs text-orange-700 dark:text-orange-300 flex items-center justify-between">
                <span className="truncate">{r.nome_despesa}</span>
                <span className="text-orange-600 dark:text-orange-400 font-medium">R$ {r.valor_previsto?.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <Button
            onClick={() => window.location.href = '/Agefin'}
            className="w-full rounded-2xl h-10 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium"
          >
            Gerar contas faltantes
          </Button>
        </div>
      )}

      {/* Botão Abrir Agefin */}
      <Dialog>
        <DialogTrigger asChild>
          <Button className="w-full rounded-2xl h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm">
            <ChevronRight className="w-4 h-4 mr-2" />
            Gerenciar contas no Agefin
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 rounded-3xl border-0 shadow-lg overflow-hidden">
          <iframe
            src="/Agefin"
            className="w-full h-[90vh] border-0"
            title="Agefin Portal"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}