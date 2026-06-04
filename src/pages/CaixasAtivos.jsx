import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Banknote, Lock, PackageCheck, Eye, EyeOff, Printer, Ticket, RefreshCw } from 'lucide-react';
import VisualizadorCaixa from '@/components/vendas/caixa/VisualizadorCaixa';
import ConsumoDetalheDialog from '@/components/caixa/ConsumoDetalheDialog';
import { openPrintWindowOrShareHtml } from '@/lib/mobilePrintAndShare';
import { buildPedidoIdsReceitasTurno, isPedidoVendaNoTurnoCaixa } from '@/lib/pdvCaixaTurnoVendas';
import { buildSubstituicoesVendaCaixa } from '@/lib/substituicoesVendaCaixa';

export default function CaixasAtivosPage() {
  const [turnosAtivos, setTurnosAtivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [liquidezPorCaixa, setLiquidezPorCaixa] = useState({});
  const [turnoSelecionado, setTurnoSelecionado] = useState(null);
  const [caixaSelecionado, setCaixaSelecionado] = useState(null);
  const [rascunhoSelecionado, setRascunhoSelecionado] = useState(null);
  const [consumosHoje, setConsumosHoje] = useState([]);
  const [destinacoesExpandidas, setDestinacoesExpandidas] = useState({});
  const [showSenhasPage, setShowSenhasPage] = useState(false);
  const [consumoSelecionado, setConsumoSelecionado] = useState(null);

  useEffect(() => {
    loadTurnos();
    base44.auth.me().then(setCurrentUser).catch(console.error);
  }, []);

  const loadTurnos = async () => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const [turnos, contas, vendas, movs, despesas, consumos, rascunhos, todosVales, todasDevolucoes] = await Promise.all([
        base44.entities.TurnoCaixa.filter({ status: 'Aberto' }),
        base44.entities.ContasFinanceiras.list(),
        base44.entities.PedidoVenda.list(),
        base44.entities.MovimentosCaixa.list(),
        base44.entities.LancamentoFinanceiro.filter({ tipo: 'Despesa' }),
        base44.entities.ConsumoInterno.list('-created_date'),
        base44.entities.RascunhoPedidoVenda.list(),
        base44.entities.ValeCompra.list(),
        base44.entities.DevolucaoTroca.list(),
      ]);

      const turnosUnicos = turnos.filter((turno, index, array) =>
        array.findIndex(t => t.conta_caixa_pdv_id === turno.conta_caixa_pdv_id) === index
      );

      const receitasByTurnoId = {};
      await Promise.all(
        turnosUnicos.map(async (t) => {
          const rec = await base44.entities.LancamentoFinanceiro.filter({
            turno_caixa_id: t.id,
            tipo: 'Receita',
          });
          receitasByTurnoId[t.id] = rec;
        })
      );

      const rascunhosPendentesCaixa = rascunhos.filter((r) => {
        const registro = r.data || r;
        const status = registro.status;
        const convertido = registro.pedido_venda_final_id;
        const temSenha = !!registro.senha_atendimento;
        const temItens = Array.isArray(registro.itens) && registro.itens.length > 0;
        return status === 'Aguardando Caixa' && !convertido && temSenha && temItens;
      }).map((r) => ({ ...(r.data || r), id: r.id }));

      const rascunhosPorCaixa = {};

      const consumosDeHoje = consumos.filter(c => {
        const d = new Date(c.created_date);
        return d >= hoje;
      });
      setConsumosHoje(consumosDeHoje);

      const caixasPDV = contas.filter(c => c.ativo && (c.tipo === 'Caixa Físico' || c.tipo === 'Caixa PDV'));
      
      const liquidez = {};
      caixasPDV.forEach(caixa => {
        const turno = turnosUnicos.find(t => t.conta_caixa_pdv_id === caixa.id);
        if (turno) {
          const pedidoIdsReceita = buildPedidoIdsReceitasTurno(receitasByTurnoId[turno.id] || []);
          const vendasTurno = vendas.filter((v) =>
            isPedidoVendaNoTurnoCaixa(v, {
              turno,
              caixa,
              pedidoIdsDasReceitasDoTurno: pedidoIdsReceita,
              incluirRetrocompatSemTurno: !turno.data_fechamento,
            })
          );
          const subCtx = buildSubstituicoesVendaCaixa({
            vendas: vendasTurno,
            vales: todosVales,
            devolucoes: todasDevolucoes,
          });
          const totalVendas = subCtx.totalVendasUtil;
          let totalDinheiro = 0, totalPix = 0, totalCredito = 0, totalDebito = 0, totalVale = 0;
          vendasTurno.forEach(v => {
            (v.pagamentos || []).forEach(p => {
              const fp = (p.forma_pagamento || '').toLowerCase();
              if (fp === 'dinheiro') totalDinheiro += p.valor || 0;
              else if (fp === 'pix') totalPix += p.valor || 0;
              else if (fp.includes('crédito') || fp.includes('credito')) totalCredito += p.valor || 0;
              else if (fp.includes('débito') || fp.includes('debito')) totalDebito += p.valor || 0;
              else if (fp.includes('vale')) totalVale += p.valor || 0;
            });
          });
          const reforcos = movs.filter(m => m.turno_caixa_id === turno.id && m.tipo === 'Reforço').reduce((s, m) => s + (m.valor || 0), 0);
          const sangrias = movs.filter(m => m.turno_caixa_id === turno.id && (m.tipo === 'Sangria' || m.tipo === 'Recolhimento de Caixa')).reduce((s, m) => s + (m.valor || 0), 0);
          const despesasTurno = despesas.filter(d => d.turno_caixa_id === turno.id && d.referencia_tipo !== 'MovimentosCaixa').reduce((s, d) => s + (d.valor || 0), 0);
          const liquidezTurno = (turno.saldo_inicial || 0) + totalVendas + reforcos - sangrias - despesasTurno;
          const lancamentosFiado = (receitasByTurnoId[turno.id] || []).filter(
            (f) => f.forma_pagamento === 'Conta a Pagar'
          );
          const totalFiado = lancamentosFiado.reduce((s, f) => s + (f.valor || 0), 0);
          const dinheiroNaGaveta = liquidezTurno - totalPix - totalCredito - totalDebito - totalVale - totalFiado;
          const senhasAguardando = rascunhosPendentesCaixa;

          rascunhosPorCaixa[caixa.id] = senhasAguardando;

          liquidez[caixa.id] = {
            turnoAberto: true,
            saldoInicial: turno.saldo_inicial || 0,
            totalVendas,
            liquidez: liquidezTurno,
            dinheiroNaGaveta,
            totalFiado,
            quantidadeFiado: lancamentosFiado.length,
            senhasAguardando,
          };
        }
      });

      setLiquidezPorCaixa(liquidez);
      setTurnosAtivos(turnosUnicos);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar turnos:', error);
      setLoading(false);
    }
  };

  const handleSelecionarCaixa = async (turno) => {
    const caixa = await base44.entities.ContasFinanceiras.get(turno.conta_caixa_pdv_id);
    setCaixaSelecionado(caixa);
    setTurnoSelecionado(turno);
  };

  const consumosPorDestinacao = useMemo(() => {
    const map = {};
    consumosHoje.forEach(c => {
      const dest = c.destinacao || 'Sem destinação';
      if (!map[dest]) map[dest] = { total: 0, qtdItens: 0, registros: 0 };
      map[dest].total += c.valor_total || 0;
      map[dest].qtdItens += c.quantidade_total_itens || 0;
      map[dest].registros += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [consumosHoje]);

  const totalConsumoHoje = useMemo(() => consumosHoje.reduce((s, c) => s + (c.valor_total || 0), 0), [consumosHoje]);

  const anexosPorConsumoId = useMemo(() => {
    const mapa = {};
    consumosHoje.forEach((consumo) => {
      const anexos = [];
      if (consumo.assinatura_recolhedor_url) {
        anexos.push({
          id: `${consumo.id}-assinatura`,
          nome_arquivo: 'Assinatura',
          descricao: consumo.assinatura_recolhedor_nome || 'Assinatura do recolhedor',
          tipo_documento: 'Assinatura',
          url_drive: consumo.assinatura_recolhedor_url,
        });
      }
      if (Array.isArray(consumo.anexos)) {
        consumo.anexos.forEach((anexo, index) => {
          if (anexo?.url_drive) {
            anexos.push({
              id: anexo.id || `${consumo.id}-anexo-${index}`,
              nome_arquivo: anexo.nome_arquivo,
              descricao: anexo.descricao,
              tipo_documento: anexo.tipo_documento,
              url_drive: anexo.url_drive,
            });
          }
        });
      }
      mapa[consumo.id] = anexos;
    });
    return mapa;
  }, [consumosHoje]);

  const toggleDestinacao = (dest) => setDestinacoesExpandidas(prev => ({ ...prev, [dest]: !prev[dest] }));

  const imprimirRelatorioConsumo = async () => {
    const linhas = consumosPorDestinacao.map(([dest, data]) => {
      const itensAgrupados = {};
      consumosHoje
        .filter(c => (c.destinacao || 'Sem destinação') === dest)
        .forEach(c => (c.itens || []).forEach(it => {
          if (!itensAgrupados[it.produto_nome]) itensAgrupados[it.produto_nome] = { qtd: 0, subtotal: 0, unidade: it.unidade_medida || '' };
          itensAgrupados[it.produto_nome].qtd += it.quantidade || 0;
          itensAgrupados[it.produto_nome].subtotal += it.subtotal || 0;
        }));
      const itensHtml = Object.entries(itensAgrupados).map(([nome, v]) =>
        `<tr><td style="padding:2px 8px">${nome}</td><td style="padding:2px 8px;text-align:center">${v.qtd} ${v.unidade}</td><td style="padding:2px 8px;text-align:right">R$ ${v.subtotal.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td></tr>`
      ).join('');
      return `<tr style="background:#f3f4f6"><td colspan="3" style="padding:6px 8px;font-weight:600">${dest} — R$ ${data.total.toLocaleString('pt-BR',{minimumFractionDigits:2})} (${data.registros} registro${data.registros>1?'s':''})</td></tr>${itensHtml}`;
    }).join('');
    const html = `<html><head><title>Consumo Interno — Hoje</title><style>body{font-family:sans-serif;font-size:13px;padding:16px}table{width:100%;border-collapse:collapse}td{border-bottom:1px solid #e5e7eb}</style></head><body><h2 style="margin-bottom:8px">Consumo Interno — Hoje</h2><p style="margin-bottom:12px;color:#6b7280">Total: R$ ${totalConsumoHoje.toLocaleString('pt-BR',{minimumFractionDigits:2})}</p><table><tbody>${linhas}</tbody></table></body></html>`;
    try {
      await openPrintWindowOrShareHtml(html, `consumo-interno-${Date.now()}.html`, 'Consumo interno — hoje');
    } catch {
      /* popup bloqueado */
    }
  };

  const formatValor = (valor) => {
    const num = valor || 0;
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const senhasNaoProcessadas = useMemo(() => {
    const unicos = new Map();
    Object.values(liquidezPorCaixa).forEach((item) => {
      (item.senhasAguardando || []).forEach((rascunho) => {
        if (!unicos.has(rascunho.id)) unicos.set(rascunho.id, rascunho);
      });
    });
    return Array.from(unicos.values());
  }, [liquidezPorCaixa]);


  // Se já selecionou um caixa, mostra a view completa
  if (turnoSelecionado && caixaSelecionado) {
    return (
      <VisualizadorCaixa
        turnoAtivo={turnoSelecionado}
        caixaSelecionado={caixaSelecionado}
        onVoltar={() => { setTurnoSelecionado(null); setCaixaSelecionado(null); loadTurnos(); }}
      />
    );
  }

  // Tela de seleção de caixa
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-glacial mb-2">Caixas Ativos</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Visualize o balanço de caixas em operação</p>
          </div>
          <button onClick={loadTurnos} className="p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" style={{ minWidth: '48px', minHeight: '48px' }}>
            <RefreshCw className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 dark:border-gray-700 dark:border-t-white rounded-full animate-spin"></div>
          </div>
        ) : turnosAtivos.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-10 h-10 text-gray-400 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nenhum caixa aberto</h3>
            <p className="text-gray-500 dark:text-gray-400">Não há turnos ativos no momento</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {turnosAtivos.map(turno => {
                  const liq = liquidezPorCaixa[turno.conta_caixa_pdv_id];
                  return (
                    <button
                      key={turno.id}
                      onClick={() => handleSelecionarCaixa(turno)}
                      className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-left border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                          <Banknote className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-glacial mb-1">
                            {turno.conta_caixa_pdv_nome}
                          </h3>
                          {liq?.turnoAberto && (
                            <div className="space-y-0.5">
                              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                Turno aberto · Liquidez: {formatValor(liq.liquidez)}
                              </p>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                Dinheiro na gaveta: {formatValor(liq.dinheiroNaGaveta)}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                Saldo Inicial: {formatValor(liq.saldoInicial)} · Vendas: {formatValor(liq.totalVendas)}
                              </p>
                              {(liq.quantidadeFiado || 0) > 0 && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Fiado: {formatValor(liq.totalFiado)} · {liq.quantidadeFiado} lançamento{liq.quantidadeFiado > 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                      <Ticket className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white">Senhas aguardando caixa</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Acompanhe o volume pendente antes do processamento</p>
                    </div>
                  </div>
                  <button
                    onClick={() => senhasNaoProcessadas.length > 0 && setShowSenhasPage(true)}
                    className="text-right disabled:cursor-default"
                    disabled={senhasNaoProcessadas.length === 0}
                  >
                    <p className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">{senhasNaoProcessadas.length}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">pendente{senhasNaoProcessadas.length === 1 ? '' : 's'}</p>
                  </button>
                </div>

                {senhasNaoProcessadas.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Nenhuma senha aguardando processamento.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-900 px-3 py-3">
                      <p className="text-xs text-gray-400 dark:text-gray-500">Senhas</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white font-glacial">{senhasNaoProcessadas.length}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-900 px-3 py-3">
                      <p className="text-xs text-gray-400 dark:text-gray-500">Valor</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatValor(senhasNaoProcessadas.reduce((s, item) => s + (item.valor_total || 0), 0))}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Relatório de Consumo Interno do Dia */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Consumo Interno — Hoje</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{formatValor(totalConsumoHoje)}</span>
                  {consumosPorDestinacao.length > 0 && (
                    <button onClick={imprimirRelatorioConsumo} className="p-1.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" title="Imprimir relatório consolidado">
                      <Printer className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                  )}
                </div>
              </div>
              {consumosPorDestinacao.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Nenhum consumo registrado hoje.</p>
              ) : (
                <div className="space-y-2">
                  {consumosPorDestinacao.map(([dest, data]) => {
                    const expanded = destinacoesExpandidas[dest];
                    const registrosDestino = consumosHoje.filter(c => (c.destinacao || 'Sem destinação') === dest);
                    const itensAgrupados = {};
                    registrosDestino.forEach(c => (c.itens || []).forEach(it => {
                      if (!itensAgrupados[it.produto_nome]) itensAgrupados[it.produto_nome] = { qtd: 0, subtotal: 0, unidade: it.unidade_medida || '' };
                      itensAgrupados[it.produto_nome].qtd += it.quantidade || 0;
                      itensAgrupados[it.produto_nome].subtotal += it.subtotal || 0;
                    }));
                    return (
                      <div key={dest} className="rounded-xl bg-gray-50 dark:bg-gray-900 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{dest}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{data.registros} registro{data.registros > 1 ? 's' : ''} · {data.qtdItens} item(ns)</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{formatValor(data.total)}</p>
                            <button onClick={() => toggleDestinacao(dest)} className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                              {expanded ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                            </button>
                          </div>
                        </div>
                        {expanded && (
                          <div className="space-y-3 border-t border-gray-100 px-4 pb-3 pt-2 dark:border-gray-800">
                            {Object.entries(itensAgrupados).map(([nome, v]) => (
                              <div key={nome} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                                <span>{nome}</span>
                                <span className="flex items-center gap-3">
                                  <span className="text-gray-400">{v.qtd} {v.unidade}</span>
                                  <span className="font-medium text-gray-700 dark:text-gray-300">{formatValor(v.subtotal)}</span>
                                </span>
                              </div>
                            ))}
                            <div className="space-y-2 pt-2">
                              {registrosDestino.map((consumo) => (
                                <div key={consumo.id} className="flex items-center justify-between rounded-2xl bg-white px-3 py-3 shadow-sm dark:bg-gray-800/70">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{consumo.numero || 'Consumo interno'}</p>
                                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{consumo.usuario_solicitante_nome || consumo.created_by || '—'} · {consumo.interveniente_nome || consumo.interveniente || 'Sem interveniente'}</p>
                                  </div>
                                  <div className="ml-3 flex items-center gap-2">
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{formatValor(consumo.valor_total)}</p>
                                    <button
                                      type="button"
                                      onClick={() => setConsumoSelecionado(consumo)}
                                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500 shadow-sm hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                      aria-label="Ver detalhes do consumo"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {showSenhasPage && (
          <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Controle</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white font-glacial">Senhas aguardando caixa</div>
              </div>
              <button onClick={() => setShowSenhasPage(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 text-sm font-medium">
                Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(7rem+env(safe-area-inset-bottom))]">
              <div className="max-w-2xl mx-auto space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm">
                    <p className="text-xs text-gray-400 dark:text-gray-500">Senhas</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">{senhasNaoProcessadas.length}</p>
                  </div>
                  <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm">
                    <p className="text-xs text-gray-400 dark:text-gray-500">Valor total</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatValor(senhasNaoProcessadas.reduce((s, item) => s + (item.valor_total || 0), 0))}</p>
                  </div>
                </div>

                <P38MobileLineList>
                  {senhasNaoProcessadas.map((rascunho, index) => (
                    <P38MobileLine
                      key={rascunho.id}
                      striped={index % 2 === 1}
                      accent="warning"
                      title={`Senha ${String(rascunho.senha_atendimento || '').slice(-4) || '----'}`}
                      subtitle={`${rascunho.cliente_nome || 'Avulso'} · ${rascunho.vendedor_nome || 'Sem vendedor'}`}
                      value={formatValor(rascunho.valor_total)}
                      trailing={
                        <button
                          type="button"
                          onClick={() => {
                            setShowSenhasPage(false);
                            setRascunhoSelecionado(rascunho);
                          }}
                          className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary"
                          aria-label="Ver senha"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      }
                    />
                  ))}
                </P38MobileLineList>
              </div>
            </div>
          </div>
        )}

        <ConsumoDetalheDialog
          open={!!consumoSelecionado}
          onOpenChange={(open) => !open && setConsumoSelecionado(null)}
          consumo={consumoSelecionado}
          anexos={consumoSelecionado ? (anexosPorConsumoId[consumoSelecionado.id] || []) : []}
        />

        {rascunhoSelecionado && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">Senha</div>
                  <div className="text-3xl font-bold font-mono text-gray-900 dark:text-white">{String(rascunhoSelecionado.senha_atendimento || '').slice(-4) || '----'}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{rascunhoSelecionado.cliente_nome || 'Avulso'}</div>
                  <div className="text-xs text-gray-400">{rascunhoSelecionado.vendedor_nome || 'Sem vendedor'}</div>
                </div>
                <button onClick={() => setRascunhoSelecionado(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Fechar
                </button>
              </div>
              <div className="p-5 space-y-3">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Itens</div>
                {(rascunhoSelecionado.itens || []).map((item, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{item.produto_nome}</div>
                      <div className="text-xs text-gray-400 mt-0.5">R$ {(item.preco_unitario_praticado || 0).toFixed(2)} × {item.quantidade}</div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white flex-shrink-0">R$ {(item.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                ))}
                {rascunhoSelecionado.valor_desconto > 0 && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Desconto</span><span>-R$ {rascunhoSelecionado.valor_desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span>Total</span><span>{formatValor(rascunhoSelecionado.valor_total || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}