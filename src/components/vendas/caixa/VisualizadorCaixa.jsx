import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Receipt, Wallet, Plus, Minus, DollarSign, Eye, CheckCircle2, Printer, Lock, ArrowLeft, Clock, RefreshCw } from 'lucide-react';
import { formatarDataHora } from '@/components/utils/dateUtils';
import { format } from 'date-fns';
import VendasTurnoDialog from './VendasTurnoDialog';
import VendaDetalheDialog from './VendaDetalheDialog';
import ListaMovimentosDialog from './ListaMovimentosDialog';
import SaldoConsolidadoDialog from './SaldoConsolidadoDialog';
import { openPrintWindowOrShareHtml } from '@/lib/mobilePrintAndShare';
import { roundToTwoDecimals } from '@/lib/financialUtils';

/** Mesma regra de apuração do PDVCaixa.loadData — evita filter() da API retornar vazio. */
export default function VisualizadorCaixa({ turnoAtivo, caixaSelecionado, onVoltar }) {
  const [caixaData, setCaixaData] = useState({ saldoInicial: 0, liquidez: 0, totalVendas: 0, recebimentos: { dinheiro: 0, pix: 0, credito: 0, debito: 0, vale: 0 }, reforcos: 0, sangrias: 0, despesas: 0, despesasLista: [], fiado: 0, fiadoLista: [] });
  const [vendasFinalizadas, setVendasFinalizadas] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [activeTab, setActiveTab] = useState('balanco');
  const [showVendasDialog, setShowVendasDialog] = useState(false);
  const [showReforcosDialog, setShowReforcosDialog] = useState(false);
  const [showSangriasDialog, setShowSangriasDialog] = useState(false);
  const [showDespesasDialog, setShowDespesasDialog] = useState(false);
  const [vendaDetalhada, setVendaDetalhada] = useState(null);
  const [showSaldoConsolidadoDialog, setShowSaldoConsolidadoDialog] = useState(false);
  const [recebimentosDinheiro, setRecebimentosDinheiro] = useState('0,00');
  const [loading, setLoading] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);
  const debounceRef = useRef(null);

  const formatarValorExibicaoLocal = (valor) => {
    const n = roundToTwoDecimals(valor ?? 0);
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const loadData = useCallback(async ({ showSpinner = true } = {}) => {
    if (showSpinner) setLoading(true);
    try {
      const caixaId = caixaSelecionado?.id;
      const [todosPedidos, todasMovimentacoes, todasDespesasRaw, fiados] = await Promise.all([
        base44.entities.PedidoVenda.list(),
        base44.entities.MovimentosCaixa.list(),
        base44.entities.LancamentoFinanceiro.filter({ turno_caixa_id: turnoAtivo.id, tipo: 'Despesa' }),
        base44.entities.LancamentoFinanceiro.filter({ turno_caixa_id: turnoAtivo.id, tipo: 'Receita', forma_pagamento: 'Conta a Pagar' }),
      ]);

      const todasDespesas = todasDespesasRaw.filter((d) => d.referencia_tipo !== 'MovimentosCaixa');

      const statusOk = ['Financeiro OK', 'Pedido Concluído', 'Em Separação', 'Em Rota de Entrega'];
      const vendas = todosPedidos.filter(
        (p) => statusOk.includes(p.status) && p.turno_caixa_id === turnoAtivo.id
      );

      const movsTurnoConta = todasMovimentacoes.filter(
        (m) => m.turno_caixa_id === turnoAtivo.id && (!caixaId || m.conta_id === caixaId)
      );
      const movimentosAtivos = movsTurnoConta.filter((m) => m.status_registro !== 'Cancelado');

      const totalVendas = roundToTwoDecimals(vendas.reduce((s, v) => s + (v.valor_total || 0), 0));

      let totalDinheiro = 0;
      let totalPix = 0;
      let totalCredito = 0;
      let totalDebito = 0;
      let totalVale = 0;
      let totalFiadoPagamentos = 0;

      vendas.forEach((venda) => {
        (venda.pagamentos || []).forEach((pag) => {
          const fp = (pag.forma_pagamento || '').toLowerCase();
          if (fp === 'dinheiro') totalDinheiro += pag.valor || 0;
          else if (fp === 'pix') totalPix += pag.valor || 0;
          else if (fp.includes('crédito') || fp.includes('credito')) totalCredito += pag.valor || 0;
          else if (fp.includes('débito') || fp.includes('debito')) totalDebito += pag.valor || 0;
          else if (fp.includes('vale')) totalVale += pag.valor || 0;
          else if (fp.includes('conta a pagar') || fp.includes('fiado')) totalFiadoPagamentos += pag.valor || 0;
        });
      });

      const totalVendasMonetarias = totalDinheiro + totalPix + totalCredito + totalDebito + totalVale;

      const totalReforcos = movimentosAtivos
        .filter((m) => m.tipo === 'Reforço')
        .reduce((s, m) => s + (m.valor || 0), 0);
      const totalSangrias = movimentosAtivos
        .filter((m) => m.tipo === 'Sangria' || m.tipo === 'Recolhimento de Caixa')
        .reduce((s, m) => s + (m.valor || 0), 0);

      const despesasAtivas = todasDespesas.filter((d) => d.status !== 'Cancelado');
      const totalDespesas = despesasAtivas.reduce((s, d) => s + (d.valor || 0), 0);

      const totalFiadoLancamentos = fiados.filter((f) => f.status !== 'Cancelado').reduce((s, f) => s + (f.valor || 0), 0);
      const totalFiado = totalFiadoPagamentos > 0 ? totalFiadoPagamentos : totalFiadoLancamentos;

      const saldoInicial = roundToTwoDecimals(turnoAtivo.saldo_inicial || 0);
      const liquidez = roundToTwoDecimals(
        saldoInicial + totalVendasMonetarias + totalReforcos - totalSangrias - totalDespesas
      );

      setCaixaData({
        saldoInicial,
        liquidez,
        totalVendas,
        recebimentos: {
          dinheiro: roundToTwoDecimals(totalDinheiro),
          pix: roundToTwoDecimals(totalPix),
          credito: roundToTwoDecimals(totalCredito),
          debito: roundToTwoDecimals(totalDebito),
          vale: roundToTwoDecimals(totalVale),
        },
        reforcos: roundToTwoDecimals(totalReforcos),
        sangrias: roundToTwoDecimals(totalSangrias),
        despesas: roundToTwoDecimals(totalDespesas),
        despesasLista: despesasAtivas,
        fiado: roundToTwoDecimals(totalFiado),
        fiadoLista: fiados,
      });
      setVendasFinalizadas(vendas);
      setMovimentos(movimentosAtivos);

      const dinheiroNaGaveta = roundToTwoDecimals(
        liquidez - roundToTwoDecimals(totalPix) - roundToTwoDecimals(totalCredito) - roundToTwoDecimals(totalDebito) - roundToTwoDecimals(totalVale)
      );
      setRecebimentosDinheiro(formatarValorExibicaoLocal(dinheiroNaGaveta));
      setUltimaAtualizacao(new Date());
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [turnoAtivo, caixaSelecionado]);

  useEffect(() => {
    if (turnoAtivo && caixaSelecionado) {
      loadData({ showSpinner: true });
    }
  }, [turnoAtivo, caixaSelecionado, loadData]);

  useEffect(() => {
    if (!turnoAtivo?.id || !caixaSelecionado?.id) return undefined;

    const schedule = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        loadData({ showSpinner: false });
      }, 400);
    };

    const unsubs = [];
    try {
      unsubs.push(base44.entities.PedidoVenda.subscribe(schedule));
      unsubs.push(base44.entities.MovimentosCaixa.subscribe(schedule));
      unsubs.push(base44.entities.LancamentoFinanceiro.subscribe(schedule));
      unsubs.push(base44.entities.RascunhoPedidoVenda.subscribe(schedule));
    } catch (e) {
      console.warn('Subscribe espelho caixa:', e);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      unsubs.forEach((u) => {
        try {
          if (typeof u === 'function') u();
        } catch {
          /* noop */
        }
      });
    };
  }, [turnoAtivo?.id, caixaSelecionado?.id, loadData]);

  const formatValor = (valor) => {
    const num = valor || 0;
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Espelha PDVCaixa: liquidez já exclui fiado do núcleo monetário.
  const dinheiroNaGaveta = roundToTwoDecimals(
    (caixaData.liquidez || 0) -
      (caixaData.recebimentos?.pix || 0) -
      (caixaData.recebimentos?.credito || 0) -
      (caixaData.recebimentos?.debito || 0) -
      (caixaData.recebimentos?.vale || 0)
  );

  const imprimirRelatorio = async () => {
    const linhasVendas = (vendasFinalizadas || []).map(v => {
      const pagamentos = (v.pagamentos || []);
      const subLinhas = pagamentos.length > 1
        ? pagamentos.map(p => `<div style="display:flex;justify-content:space-between;padding:2px 0 2px 16px;font-size:10px;color:#6b7280"><span>${p.forma_pagamento}</span><span>R$ ${(p.valor || 0).toFixed(2)}</span></div>`).join('')
        : '';
      const formasSingle = pagamentos.length === 1 ? ` · ${pagamentos[0].forma_pagamento} R$ ${(pagamentos[0].valor || 0).toFixed(2)}` : '';
      return `<div style="border-bottom:1px solid #f3f4f6;padding:5px 0">
        <div style="display:flex;justify-content:space-between;font-size:11px">
          <span>${v.numero} · ${v.cliente_nome} · ${new Date(v.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}${formasSingle}</span>
          <span style="font-weight:600;color:#059669;white-space:nowrap;margin-left:8px">+R$ ${(v.valor_total || 0).toFixed(2)}</span>
        </div>${subLinhas}</div>`;
    }).join('');

    const linhasReforcos = movimentos.filter(m => m.tipo === 'Reforço').map(m =>
      `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px"><span>${m.numero} · ${format(new Date(m.created_date), 'HH:mm')}${m.observacao ? ' · ' + m.observacao : ''}</span><span style="color:#059669">+R$ ${(m.valor || 0).toFixed(2)}</span></div>`
    ).join('') || '<p style="color:#9ca3af;font-size:11px;margin:4px 0">Nenhum reforço</p>';

    const linhasRecolhimentos = movimentos.filter(m => m.tipo === 'Sangria' || m.tipo === 'Recolhimento de Caixa').map(m =>
      `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px"><span>${m.numero} · ${format(new Date(m.created_date), 'HH:mm')}${m.observacao ? ' · ' + m.observacao : ''}</span><span style="color:#2563eb">-R$ ${(m.valor || 0).toFixed(2)}</span></div>`
    ).join('') || '<p style="color:#9ca3af;font-size:11px;margin:4px 0">Nenhum recolhimento</p>';

    const linhasDespesas = (caixaData.despesasLista || []).map(d =>
      `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px"><span>${d.descricao} · ${d.created_date ? format(new Date(d.created_date), 'HH:mm') : ''}</span><span style="color:#dc2626">-R$ ${(d.valor || 0).toFixed(2)}</span></div>`
    ).join('') || '<p style="color:#9ca3af;font-size:11px;margin:4px 0">Nenhuma despesa</p>';

    const html = `<html><head><title>Relatório - ${caixaSelecionado.nome}</title><style>
      body{font-family:Inter,sans-serif;font-size:13px;padding:20px;max-width:700px;margin:0 auto}
      h2{font-size:14px;font-weight:600;margin:14px 0 6px;color:#374151}
      .row{display:flex;justify-content:space-between;padding:3px 0;font-size:12px}
      .total{font-size:15px;font-weight:700}
      .dashed{border-top:1px dashed #aaa;margin:8px 0}
    </style></head><body>
      <div style="text-align:center;margin-bottom:14px"><b style="font-size:16px">VAREJOSYNC</b><br/><span style="color:#9ca3af;font-size:11px">Relatório de Caixa - ${caixaSelecionado.nome}</span></div>
      <div class="dashed"></div>
      <h2>Turno</h2>
      <div class="row"><span>Número:</span><b>${turnoAtivo.numero}</b></div>
      <div class="row"><span>Abertura:</span><span>${new Date(turnoAtivo.data_abertura).toLocaleString('pt-BR')}</span></div>
      <div class="row"><span>Operador:</span><span>${turnoAtivo.usuario_abertura_nome}</span></div>
      <div class="row"><span>Status:</span><span>${turnoAtivo.status}</span></div>
      <div class="dashed"></div>
      <h2>Movimentações</h2>
      <div class="row"><span>Saldo Inicial:</span><span>R$ ${(caixaData.saldoInicial || 0).toFixed(2)}</span></div>
      <div class="row"><span>+ Total Vendas:</span><span>R$ ${(caixaData.totalVendas || 0).toFixed(2)}</span></div>
      <div class="row"><span>+ Reforços:</span><span>R$ ${(caixaData.reforcos || 0).toFixed(2)}</span></div>
      <div class="row"><span>− Recolhimentos:</span><span>R$ ${(caixaData.sangrias || 0).toFixed(2)}</span></div>
      <div class="row"><span>− Despesas:</span><span>R$ ${(caixaData.despesas || 0).toFixed(2)}</span></div>
      <div class="dashed"></div>
      <div class="row total"><span>Liquidez do Turno:</span><span>R$ ${(caixaData.liquidez || 0).toFixed(2)}</span></div>
      <div class="dashed"></div>
      <h2>Recebimentos por Forma</h2>
      <div class="row"><span>Dinheiro (gaveta):</span><span>R$ ${(caixaData.recebimentos.dinheiro || 0).toFixed(2)}</span></div>
      <div class="row"><span>PIX:</span><span>R$ ${(caixaData.recebimentos.pix || 0).toFixed(2)}</span></div>
      <div class="row"><span>Cartão Crédito:</span><span>R$ ${(caixaData.recebimentos.credito || 0).toFixed(2)}</span></div>
      <div class="row"><span>Cartão Débito:</span><span>R$ ${(caixaData.recebimentos.debito || 0).toFixed(2)}</span></div>
      <div class="dashed"></div>
      <h2>Reforços do Turno</h2>
      ${linhasReforcos}
      <div class="dashed"></div>
      <h2>Recolhimentos do Turno</h2>
      ${linhasRecolhimentos}
      <div class="dashed"></div>
      <h2>Despesas do Turno</h2>
      ${linhasDespesas}
      <div class="dashed"></div>
      <h2>Vendas do Turno (${(vendasFinalizadas || []).length})</h2>
      ${linhasVendas || '<p style="color:#9ca3af;font-size:11px">Nenhuma venda registrada</p>'}
      <div class="dashed"></div>
      <p style="text-align:center;font-size:10px;color:#9ca3af;margin-top:14px">Relatório gerado em ${new Date().toLocaleString('pt-BR')} - Não é documento fiscal</p>
    </body></html>`;
    try {
      await openPrintWindowOrShareHtml(html, `relatorio-caixa-${caixaSelecionado?.nome || 'caixa'}.html`, `Relatório ${caixaSelecionado?.nome || ''}`, {
        windowFeatures: 'width=800,height=900',
      });
    } catch {
      alert('Permita pop-ups para imprimir.');
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 dark:border-gray-700 dark:border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <button onClick={onVoltar} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" style={{ minWidth: '44px', minHeight: '44px' }}>
          <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
        
        <div className="flex-1 text-center min-w-0 px-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white font-glacial">
            {caixaSelecionado?.nome || 'Caixa'}
          </h1>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
            {ultimaAtualizacao ? `Atualizado · ${format(ultimaAtualizacao, 'HH:mm:ss')}` : '…'}
          </p>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => loadData({ showSpinner: false })}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            style={{ minWidth: '44px', minHeight: '44px' }}
            title="Atualizar"
          >
            <RefreshCw className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {format(new Date(), 'HH:mm')}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {/* KPIs - Desktop */}
          <div className="hidden md:block p-4 pb-0 bg-gray-50 dark:bg-gray-900">
            <div className="grid grid-cols-2 gap-3 max-w-4xl mx-auto">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Saldo do Turno</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white font-glacial">{formatValor(caixaData.liquidez)}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Inicial + vendas + reforços − recolhimentos</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Dinheiro na Gaveta</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white font-glacial">
                  {formatValor(dinheiroNaGaveta)}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Liquidez − (PIX + Crédito + Débito + Vale)</div>
              </div>
            </div>
          </div>

          {/* Tabs - Desktop */}
          <div className="hidden md:block border-b border-gray-100 dark:border-gray-700 px-4 bg-gray-50 dark:bg-gray-900">
            <TabsList className="h-auto bg-transparent border-0 gap-1 justify-start max-w-4xl mx-auto p-0">
              <TabsTrigger value="balanco" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm h-12 px-6 rounded-t-xl rounded-b-none border-0">
                <PieChart className="w-4 h-4" />
                <span className="text-sm">Balanço</span>
              </TabsTrigger>
              <TabsTrigger value="vendas" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm h-12 px-6 rounded-t-xl rounded-b-none border-0">
                <Receipt className="w-4 h-4" />
                <span className="text-sm">Vendas</span>
              </TabsTrigger>
              <TabsTrigger value="movimentos" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm h-12 px-6 rounded-t-xl rounded-b-none border-0">
                <Wallet className="w-4 h-4" />
                <span className="text-sm">Movimentos</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="balanco" className="flex-1 overflow-auto mt-0 p-4 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Movimentações */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-gray-900 mb-4 text-base font-semibold dark:text-white font-glacial">Movimentações do Turno</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-1">
                        <div className="w-7"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Saldo Inicial</span>
                      </div>
                      <span className="text-base font-medium text-gray-900 dark:text-gray-100 tabular-nums" style={{ minWidth: '110px', textAlign: 'right' }}>{formatValor(caixaData.saldoInicial)}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setShowVendasDialog(true)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0" style={{ minWidth: '28px', minHeight: '28px' }}>
                          <Eye className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        </button>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Vendas</span>
                      </div>
                      <span className="text-base font-medium text-gray-900 dark:text-gray-100 tabular-nums" style={{ minWidth: '110px', textAlign: 'right' }}>{formatValor(caixaData.totalVendas)}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setShowReforcosDialog(true)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0" style={{ minWidth: '28px', minHeight: '28px' }}>
                          <Eye className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        </button>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Reforços</span>
                      </div>
                      <span className="text-base font-medium text-gray-900 dark:text-gray-100 tabular-nums" style={{ minWidth: '110px', textAlign: 'right' }}>{formatValor(caixaData.reforcos)}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setShowSangriasDialog(true)} className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex-shrink-0" style={{ minWidth: '28px', minHeight: '28px' }}>
                          <Eye className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                        </button>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Recolhimentos</span>
                      </div>
                      <span className="text-base font-medium text-blue-600 dark:text-blue-400 tabular-nums" style={{ minWidth: '110px', textAlign: 'right' }}>{formatValor(caixaData.sangrias)}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setShowDespesasDialog(true)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0" style={{ minWidth: '28px', minHeight: '28px' }}>
                          <Eye className="w-4 h-4 text-red-400 dark:text-red-500" />
                        </button>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Despesas</span>
                      </div>
                      <span className="text-base font-medium text-red-600 dark:text-red-400 tabular-nums" style={{ minWidth: '110px', textAlign: 'right' }}>{formatValor(caixaData.despesas)}</span>
                    </div>
                    <div className="pt-3 mt-1 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Liquidez do Turno</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setShowSaldoConsolidadoDialog(true)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0" style={{ minWidth: '28px', minHeight: '28px' }}>
                            <Eye className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          </button>
                          <span className="text-2xl font-bold text-gray-900 dark:text-white font-glacial tabular-nums" style={{ minWidth: '110px', textAlign: 'right' }}>{formatValor(caixaData.liquidez)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">Inicial + vendas + reforços − recolhimentos</p>
                    </div>
                  </div>
                </div>

                {/* Recebimentos - BLOQUEADO */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-gray-900 mb-4 text-base font-semibold dark:text-white font-glacial">Recebimentos do Turno</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-60">
                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Dinheiro</span>
                        <p className="text-xs text-gray-400 dark:text-gray-500">somente leitura</p>
                      </div>
                      <span className="text-lg font-bold text-gray-500 dark:text-gray-400">{formatValor(dinheiroNaGaveta)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">PIX</span>
                      <span className="text-base font-medium text-gray-900 dark:text-gray-100">{formatValor(caixaData.recebimentos.pix)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Cartão Crédito</span>
                      <span className="text-base font-medium text-gray-900 dark:text-gray-100">{formatValor(caixaData.recebimentos.credito || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Cartão Débito</span>
                      <span className="text-base font-medium text-gray-900 dark:text-gray-100">{formatValor(caixaData.recebimentos.debito || 0)}</span>
                    </div>
                    {(caixaData.recebimentos.vale || 0) > 0 && (
                      <div className="flex items-center justify-between py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Vale Troca</span>
                          <span className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">não monetário</span>
                        </div>
                        <span className="text-base font-medium text-emerald-700 dark:text-emerald-300">{formatValor(caixaData.recebimentos.vale)}</span>
                      </div>
                    )}
                    {(caixaData.fiado || 0) > 0 && (
                      <div className="flex items-center justify-between py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Fiado</span>
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">a receber</span>
                        </div>
                        <span className="text-base font-medium text-gray-700 dark:text-gray-200">{formatValor(caixaData.fiado)}</span>
                      </div>
                    )}
                    
                    {/* Total Conferido - BLOQUEADO */}
                    <div className="pt-3 mt-1 border-t border-gray-100 dark:border-gray-700 space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Conferido</span>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">{formatValor(caixaData.liquidez)}</span>
                      </div>
                      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 opacity-60">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">✓ Valores Conferem</span>
                          <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 font-glacial">{formatValor(0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                <button onClick={imprimirRelatorio} className="w-full h-12 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-semibold flex items-center justify-center gap-2 text-sm hover:shadow-lg transition-shadow" style={{ minHeight: '48px' }}>
                  <Printer className="w-4 h-4" /> Imprimir Relatório
                </button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="vendas" className="flex-1 overflow-auto p-4 mt-0">
            <div className="max-w-4xl mx-auto space-y-3">
              <div className="mb-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Finalizadas</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">
                  {(vendasFinalizadas || []).length} {(vendasFinalizadas || []).length === 1 ? 'Venda' : 'Vendas'}
                </div>
              </div>
              {(vendasFinalizadas || []).map(v => (
                <div key={v.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm cursor-pointer" onClick={() => setVendaDetalhada(v)}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-medium text-gray-900 dark:text-white truncate">{v.cliente_nome}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{v.numero} · {v.created_date ? formatarDataHora(v.created_date).split(' ')[1] : ''}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">{formatValor(v.valor_total)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{v.itens?.length || 0} itens</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="movimentos" className="flex-1 overflow-auto p-4 mt-0">
            <div className="max-w-4xl mx-auto space-y-2">
              {(() => {
                const itensMovimentos = (movimentos || []).map(m => ({ id: m.id, tipo: m.tipo, valor: m.valor, descricao: m.observacao || m.tipo, hora: m.created_date, cor: m.tipo === 'Reforço' ? 'emerald' : 'blue' }));
                const itensDespesas = (caixaData?.despesasLista || []).map(d => ({ id: d.id, tipo: 'Despesa', valor: d.valor, descricao: d.descricao, hora: d.created_date, cor: 'red' }));
                const itensFiado = (caixaData?.fiadoLista || []).map(f => ({ id: f.id, tipo: 'Fiado', valor: f.valor, descricao: f.descricao || 'Lançamento fiado', hora: f.created_date, cor: 'gray' }));
                const todos = [...itensMovimentos, ...itensDespesas, ...itensFiado].sort((a, b) => new Date(a.hora) - new Date(b.hora));
                
                if (todos.length === 0) return (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-600">
                    <Wallet className="w-10 h-10 mb-2" />
                    <p className="text-sm">Nenhuma movimentação</p>
                  </div>
                );

                return todos.map(item => (
                  <div key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between gap-3">
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${item.cor === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/20' : item.cor === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20' : item.cor === 'gray' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-red-50 dark:bg-red-900/20'}`}>
                      {item.cor === 'emerald' ? <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : item.cor === 'blue' ? <Minus className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : item.cor === 'gray' ? <Receipt className="w-4 h-4 text-gray-600 dark:text-gray-300" /> : <DollarSign className="w-4 h-4 text-red-600 dark:text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.descricao}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{item.tipo} · {item.hora ? format(new Date(item.hora), 'HH:mm') : ''}</div>
                    </div>
                    <div className={`text-base font-bold font-glacial flex-shrink-0 ${item.cor === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : item.cor === 'blue' ? 'text-blue-600 dark:text-blue-400' : item.cor === 'gray' ? 'text-gray-700 dark:text-gray-200' : 'text-red-600 dark:text-red-400'}`}>
                      {item.cor === 'emerald' || item.cor === 'gray' ? '+' : '−'}{formatValor(item.valor)}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </TabsContent>

          {/* Bottom Nav - Mobile */}
          <TabsList className="md:hidden grid grid-cols-3 h-16 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 rounded-none p-0 flex-shrink-0">
            <TabsTrigger value="balanco" className="flex flex-col items-center justify-center gap-1 data-[state=active]:bg-gray-50 dark:data-[state=active]:bg-gray-700 h-full rounded-none border-0">
              <PieChart className="w-5 h-5" />
              <span className="text-xs">Balanço</span>
            </TabsTrigger>
            <TabsTrigger value="vendas" className="flex flex-col items-center justify-center gap-1 data-[state=active]:bg-gray-50 dark:data-[state=active]:bg-gray-700 h-full rounded-none border-0">
              <Receipt className="w-5 h-5" />
              <span className="text-xs">Vendas</span>
            </TabsTrigger>
            <TabsTrigger value="movimentos" className="flex flex-col items-center justify-center gap-1 data-[state=active]:bg-gray-50 dark:data-[state=active]:bg-gray-700 h-full rounded-none border-0">
              <Wallet className="w-5 h-5" />
              <span className="text-xs">Movimentos</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Dialogs */}
      <VendasTurnoDialog open={showVendasDialog} onOpenChange={setShowVendasDialog} vendasFinalizadas={vendasFinalizadas} turnoAtivo={turnoAtivo} caixaData={caixaData} formatValor={formatValor} onVerDetalhes={setVendaDetalhada} />
      <VendaDetalheDialog venda={vendaDetalhada} onClose={() => setVendaDetalhada(null)} formatValor={formatValor} />
      <ListaMovimentosDialog open={showReforcosDialog} onOpenChange={setShowReforcosDialog} tipo="reforcos" movimentos={movimentos} despesasLista={caixaData.despesasLista} totalReforcos={caixaData.reforcos} totalSangrias={caixaData.sangrias} totalDespesas={caixaData.despesas} formatValor={formatValor} onRefresh={() => loadData({ showSpinner: false })} />
      <ListaMovimentosDialog open={showSangriasDialog} onOpenChange={setShowSangriasDialog} tipo="sangrias" movimentos={movimentos} despesasLista={caixaData.despesasLista} totalReforcos={caixaData.reforcos} totalSangrias={caixaData.sangrias} totalDespesas={caixaData.despesas} formatValor={formatValor} onRefresh={() => loadData({ showSpinner: false })} />
      <ListaMovimentosDialog open={showDespesasDialog} onOpenChange={setShowDespesasDialog} tipo="despesas" movimentos={movimentos} despesasLista={caixaData.despesasLista} totalReforcos={caixaData.reforcos} totalSangrias={caixaData.sangrias} totalDespesas={caixaData.despesas} formatValor={formatValor} onRefresh={() => loadData({ showSpinner: false })} />
      <SaldoConsolidadoDialog open={showSaldoConsolidadoDialog} onOpenChange={setShowSaldoConsolidadoDialog} caixaData={caixaData} formatValor={formatValor} />
    </div>
  );
}