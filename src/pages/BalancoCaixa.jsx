import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Eye,
  Wallet,
  PieChart,
  Lock,
  Printer,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import SeletorCaixaPDV from '@/components/vendas/SeletorCaixaPDV';

export default function BalancoCaixaPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [caixaSelecionado, setCaixaSelecionado] = useState(null);
  const [turnoAtivo, setTurnoAtivo] = useState(null);
  const [showSeletorCaixa, setShowSeletorCaixa] = useState(true);
  const [caixaData, setCaixaData] = useState({
    saldoInicial: 0,
    saldoAtual: 0,
    liquidez: 0,
    totalVendas: 0,
    recebimentos: { dinheiro: 0, pix: 0, credito: 0, debito: 0, vale: 0 },
    reforcos: 0,
    sangrias: 0,
    despesas: 0,
  });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(console.error);
  }, []);

  const handleSelecionarCaixa = (caixa, turno, somenteLeitura) => {
    setCaixaSelecionado(caixa);
    setTurnoAtivo(turno);
    setShowSeletorCaixa(false);
    loadData(caixa, turno);
  };

  const loadData = async (caixa, turno) => {
    if (!caixa || !turno) return;
    
    try {
      const [vendas, movimentos, despesas] = await Promise.all([
        base44.entities.PedidoVenda.filter({ turno_caixa_id: turno.id }),
        base44.entities.MovimentosCaixa.filter({ turno_caixa_id: turno.id }),
        base44.entities.LancamentoFinanceiro.filter({ turno_caixa_id: turno.id, tipo: 'Despesa' })
      ]);

      const totalVendas = vendas.reduce((sum, v) => sum + (v.valor_total || 0), 0);
      let totalDinheiro = 0, totalPix = 0, totalCredito = 0, totalDebito = 0, totalVale = 0;
      
      vendas.forEach(v => {
        if (v.pagamentos) {
          v.pagamentos.forEach(p => {
            const fp = (p.forma_pagamento || '').toLowerCase();
            if (fp === 'dinheiro') totalDinheiro += p.valor || 0;
            else if (fp === 'pix') totalPix += p.valor || 0;
            else if (fp.includes('crédito')) totalCredito += p.valor || 0;
            else if (fp.includes('débito')) totalDebito += p.valor || 0;
            else if (fp.includes('vale')) totalVale += p.valor || 0;
          });
        }
      });

      const totalReforcos = movimentos.filter(m => m.tipo === 'Reforço').reduce((s, m) => s + (m.valor || 0), 0);
      const totalSangrias = movimentos.filter(m => m.tipo === 'Sangria').reduce((s, m) => s + (m.valor || 0), 0);
      const totalDespesas = despesas.reduce((s, d) => s + (d.valor || 0), 0);

      const saldoInicial = turno.saldo_inicial || 0;
      const saldoCaixa = saldoInicial + totalDinheiro + totalReforcos - totalSangrias - totalDespesas;
      const liquidez = saldoInicial + totalVendas + totalReforcos - totalSangrias - totalDespesas;

      setCaixaData({
        saldoInicial,
        saldoAtual: saldoCaixa,
        liquidez,
        totalVendas,
        recebimentos: { dinheiro: totalDinheiro, pix: totalPix, credito: totalCredito, debito: totalDebito, vale: totalVale },
        reforcos: totalReforcos,
        sangrias: totalSangrias,
        despesas: totalDespesas,
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const formatValor = (valor) => {
    return `R$ ${(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
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
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white font-glacial">
            Balanço do Caixa
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {caixaSelecionado?.nome} · Turno {turnoAtivo?.numero}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Liquidez Total</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">
              {formatValor(caixaData.liquidez)}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Dinheiro em Caixa</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">
              {formatValor(caixaData.saldoAtual)}
            </div>
          </div>
        </div>

        {/* Movimentações */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white font-glacial mb-4">
            Movimentações do Turno
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Saldo Inicial</span>
              <span className="text-base font-medium text-gray-900 dark:text-white">
                {formatValor(caixaData.saldoInicial)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Vendas</span>
              <span className="text-base font-medium text-emerald-600 dark:text-emerald-400">
                +{formatValor(caixaData.totalVendas)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Reforços</span>
              <span className="text-base font-medium text-emerald-600 dark:text-emerald-400">
                +{formatValor(caixaData.reforcos)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Recolhimentos</span>
              <span className="text-base font-medium text-blue-600 dark:text-blue-400">
                -{formatValor(caixaData.sangrias)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Despesas</span>
              <span className="text-base font-medium text-red-600 dark:text-red-400">
                -{formatValor(caixaData.despesas)}
              </span>
            </div>
          </div>
        </div>

        {/* Recebimentos */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white font-glacial mb-4">
            Recebimentos por Forma
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Dinheiro</span>
              <span className="text-base font-medium text-gray-900 dark:text-white">
                {formatValor(caixaData.recebimentos.dinheiro)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">PIX</span>
              <span className="text-base font-medium text-gray-900 dark:text-white">
                {formatValor(caixaData.recebimentos.pix)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Crédito</span>
              <span className="text-base font-medium text-gray-900 dark:text-white">
                {formatValor(caixaData.recebimentos.credito)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Débito</span>
              <span className="text-base font-medium text-gray-900 dark:text-white">
                {formatValor(caixaData.recebimentos.debito)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button 
            onClick={() => navigate(createPageUrl('ProcessarVendas'))}
            className="flex-1 h-12 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-semibold flex items-center justify-center gap-2"
          >
            Processar Vendas
          </button>
          <button 
            onClick={() => navigate(createPageUrl('MovimentosCaixa'))}
            className="flex-1 h-12 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-medium flex items-center justify-center gap-2"
          >
            Movimentos
          </button>
        </div>
      </div>
    </div>
  );
}