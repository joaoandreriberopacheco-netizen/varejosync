import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw, ChevronDown, ChevronRight, Lock, Search, RotateCcw, AlertTriangle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { runOperacaoAuthBypass } from '@/components/auth/runOperacaoAuthBypass';
import { openPrintWindowOrShareHtml } from '@/lib/mobilePrintAndShare';
import { isPedidoVendaNoTurnoCaixa } from '@/lib/pdvCaixaTurnoVendas';

const fmt = (v) => (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const isRecolhimentoMovimento = (m) => m.tipo === 'Sangria' || m.tipo === 'Recolhimento de Caixa';

function TurnoRow({ turno, vendas, movimentos, despesas, onReabrir, currentUser }) {
  const [expanded, setExpanded] = useState(false);

  const reforcos = movimentos.filter(m => m.tipo === 'Reforço' && m.turno_caixa_id === turno.id);
  const recolhimentos = movimentos.filter(m => isRecolhimentoMovimento(m) && m.turno_caixa_id === turno.id);
  const despesasTurno = despesas.filter(
    (d) => d.turno_caixa_id === turno.id && d.referencia_tipo !== 'MovimentosCaixa'
  );
  const vendasIdsSnapshot = new Set((turno.vendas_ids || []).map((id) => String(id)));
  const vendasTurno = vendas.filter(
    (v) =>
      vendasIdsSnapshot.has(String(v.id)) ||
      isPedidoVendaNoTurnoCaixa(v, {
        turno,
        caixa: { id: turno.conta_caixa_pdv_id },
        incluirRetrocompatSemTurno: false,
      })
  );

  const duracao = () => {
    if (!turno.data_abertura || !turno.data_fechamento) return '-';
    const diff = new Date(turno.data_fechamento) - new Date(turno.data_abertura);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}min`;
  };

  const diferenca = turno.diferenca || 0;

  const imprimirRelatorio = async () => {
    const linhasVendas = vendasTurno.map(v => {
      const pagamentos = v.pagamentos || [];
      const formas = pagamentos.map(p => `${p.forma_pagamento} R$ ${fmt(p.valor)}`).join(' · ');
      return `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;border-bottom:1px solid #f3f4f6"><span>${v.numero} · ${v.cliente_nome || 'Consumidor'}${formas ? ` · ${formas}` : ''}</span><span><b>R$ ${fmt(v.valor_total)}</b></span></div>`;
    }).join('') || '<p style="color:#9ca3af;font-size:11px;margin:4px 0">Nenhuma venda registrada</p>';

    const linhasReforcos = reforcos
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
      .map(m => `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px"><span>${m.numero} · ${format(new Date(m.created_date), 'HH:mm')}${m.observacao ? ` · ${m.observacao}` : ''}</span><span style="color:#059669">+R$ ${fmt(m.valor)}</span></div>`)
      .join('') || '<p style="color:#9ca3af;font-size:11px;margin:4px 0">Nenhum reforço</p>';

    const linhasRecolhimentos = recolhimentos
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
      .map(m => `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px"><span>${m.numero} · ${format(new Date(m.created_date), 'HH:mm')}${m.observacao ? ` · ${m.observacao}` : ''}</span><span style="color:#2563eb">-R$ ${fmt(m.valor)}</span></div>`)
      .join('') || '<p style="color:#9ca3af;font-size:11px;margin:4px 0">Nenhum recolhimento</p>';

    const linhasDespesas = despesasTurno
      .sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0))
      .map(d => `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px"><span>${d.descricao || 'Despesa'} · ${d.created_date ? format(new Date(d.created_date), 'HH:mm') : '-'}</span><span style="color:#dc2626">-R$ ${fmt(d.valor)}</span></div>`)
      .join('') || '<p style="color:#9ca3af;font-size:11px;margin:4px 0">Nenhuma despesa</p>';

    const dinheiroNaGaveta = (turno.recebimentos_dinheiro || 0) + (turno.saldo_inicial || 0) + (turno.total_reforcos || 0) - (turno.total_sangrias || 0) - (turno.total_despesas || 0);

    const html = `<html><head><title>Fechamento ${turno.numero}</title><style>
      body{font-family:Inter,sans-serif;font-size:13px;padding:20px;max-width:760px;margin:0 auto;color:#111827}
      h2{font-size:14px;font-weight:600;margin:14px 0 6px;color:#374151}
      .row{display:flex;justify-content:space-between;padding:4px 0;font-size:12px}
      .dashed{border-top:1px dashed #9ca3af;margin:10px 0}
      .total{font-size:15px;font-weight:700}
    </style></head><body>
      <div style="text-align:center;margin-bottom:14px"><b style="font-size:16px">VAREJOSYNC</b><br/><span style="color:#9ca3af;font-size:11px">Relatório de Fechamento de Caixa</span></div>
      <div class="dashed"></div>
      <h2>Turno</h2>
      <div class="row"><span>Número:</span><b>${turno.numero}</b></div>
      <div class="row"><span>Caixa:</span><span>${turno.conta_caixa_pdv_nome || '-'}</span></div>
      <div class="row"><span>Abertura:</span><span>${turno.data_abertura ? format(new Date(turno.data_abertura), 'dd/MM/yyyy HH:mm') : '-'}</span></div>
      <div class="row"><span>Fechamento:</span><span>${turno.data_fechamento ? format(new Date(turno.data_fechamento), 'dd/MM/yyyy HH:mm') : '-'}</span></div>
      <div class="row"><span>Operador:</span><span>${turno.usuario_abertura_nome || '-'}</span></div>
      <div class="row"><span>Fechado por:</span><span>${turno.usuario_fechamento_nome || '-'}</span></div>
      <div class="dashed"></div>
      <h2>Movimentações</h2>
      <div class="row"><span>Saldo Inicial:</span><span>R$ ${fmt(turno.saldo_inicial || 0)}</span></div>
      <div class="row"><span>+ Vendas:</span><span>R$ ${fmt(turno.total_vendas || 0)}</span></div>
      <div class="row"><span>+ Reforços:</span><span>R$ ${fmt(turno.total_reforcos || 0)}</span></div>
      <div class="row"><span>− Recolhimentos:</span><span>R$ ${fmt(turno.total_sangrias || 0)}</span></div>
      <div class="row"><span>− Despesas:</span><span>R$ ${fmt(turno.total_despesas || 0)}</span></div>
      <div class="row total"><span>Saldo do Turno:</span><span>R$ ${fmt(turno.saldo_final || 0)}</span></div>
      <div class="dashed"></div>
      <h2>Recebimentos</h2>
      <div class="row"><span>Dinheiro na Gaveta:</span><span>R$ ${fmt(dinheiroNaGaveta)}</span></div>
      <div class="row"><span>Dinheiro:</span><span>R$ ${fmt(turno.recebimentos_dinheiro || 0)}</span></div>
      <div class="row"><span>PIX:</span><span>R$ ${fmt(turno.recebimentos_pix || 0)}</span></div>
      <div class="row"><span>Cartão Débito:</span><span>R$ ${fmt(turno.recebimentos_debito || 0)}</span></div>
      <div class="row"><span>Cartão Crédito:</span><span>R$ ${fmt(turno.recebimentos_credito || 0)}</span></div>
      <div class="row"><span>Vale Troca:</span><span>R$ ${fmt(turno.recebimentos_vale_troca || 0)}</span></div>
      <div class="row"><span>Total Conferido:</span><span>R$ ${fmt(turno.dinheiro_conferido || 0)}</span></div>
      <div class="row total"><span>Diferença:</span><span>${diferenca >= 0 ? '+' : ''}R$ ${fmt(diferenca)}</span></div>
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
      <h2>Vendas (${vendasTurno.length})</h2>
      ${linhasVendas}
      <div class="dashed"></div>
      <p style="text-align:center;font-size:10px;color:#9ca3af;margin-top:14px">Não é documento fiscal</p>
    </body></html>`;
    try {
      await openPrintWindowOrShareHtml(html, `fechamento-turno-${turno.numero}.html`, `Fechamento ${turno.numero}`, {
        windowFeatures: 'width=800,height=900',
      });
    } catch {
      alert('Permita pop-ups para imprimir.');
    }
  };

  return (
    <div className="border-b border-gray-100 dark:border-gray-700 last:border-0">
      {/* Linha principal */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{turno.numero}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">·</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{turno.conta_caixa_pdv_nome}</span>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {turno.data_abertura ? format(new Date(turno.data_abertura), "dd/MM/yy HH:mm", { locale: ptBR }) : '-'}
            {' → '}
            {turno.data_fechamento ? format(new Date(turno.data_fechamento), "HH:mm", { locale: ptBR }) : '-'}
            {' · '}{duracao()}
            {' · '}{turno.usuario_abertura_nome}
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-gray-400 dark:text-gray-500">Total Vendas</div>
            <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">R$ {fmt(turno.total_vendas)}</div>
          </div>
          <div className="text-right hidden md:block">
            <div className="text-xs text-gray-400 dark:text-gray-500">Diferença</div>
            <div className={`text-sm font-semibold ${Math.abs(diferenca) < 0.01 ? 'text-gray-400 dark:text-gray-500' : diferenca > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              {diferenca > 0 ? '+' : ''}{fmt(diferenca)}
            </div>
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Detalhes expandidos */}
      {expanded && (
        <div className="px-4 pb-4 bg-gray-50/50 dark:bg-gray-800/20">
          {/* Saldos e Movimentação */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mb-3 mt-3">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Saldos do Turno</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Saldo Inicial:</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono">R$ {fmt(turno.saldo_inicial || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">+ Vendas:</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono">R$ {fmt(turno.total_vendas || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">+ Reforços:</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono">R$ {fmt(turno.total_reforcos || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">− Recolhimentos:</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono">R$ {fmt(turno.total_sangrias || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">− Despesas:</span>
                <span className="font-semibold text-red-600 dark:text-red-400 font-mono">R$ {fmt(turno.total_despesas || 0)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 font-bold">
                <span className="text-gray-800 dark:text-gray-200">Saldo do Turno:</span>
                <span className="text-gray-900 dark:text-white font-mono">R$ {fmt(turno.saldo_final || 0)}</span>
              </div>
            </div>
          </div>

          {/* Recebimentos */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mb-3">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">RECEBIMENTOS</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Dinheiro:</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono">R$ {fmt(turno.recebimentos_dinheiro || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">PIX:</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono">R$ {fmt(turno.recebimentos_pix || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Cartão Débito:</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono">R$ {fmt(turno.recebimentos_debito || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Cartão Crédito:</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono">R$ {fmt(turno.recebimentos_credito || 0)}</span>
              </div>
            </div>
          </div>

          {/* Movimentos de caixa: reforço, recolhimento, despesa */}
          {(reforcos.length > 0 || recolhimentos.length > 0 || despesasTurno.length > 0) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mb-3 space-y-4">
              {reforcos.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Reforços</div>
                  <div className="space-y-1">
                    {reforcos.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)).map(m => (
                      <div key={m.id} className="flex justify-between items-center text-xs py-1.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                        <span className="text-gray-500 dark:text-gray-400">
                          {m.numero} · {format(new Date(m.created_date), 'HH:mm')}
                          {m.observacao ? ` · ${m.observacao}` : ''}
                        </span>
                        <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">+R$ {fmt(m.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {recolhimentos.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Recolhimentos</div>
                  <div className="space-y-1">
                    {recolhimentos.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)).map(m => (
                      <div key={m.id} className="flex justify-between items-center text-xs py-1.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                        <span className="text-gray-500 dark:text-gray-400">
                          {m.numero} · {format(new Date(m.created_date), 'HH:mm')}
                          {m.observacao ? ` · ${m.observacao}` : ''}
                        </span>
                        <span className="font-semibold tabular-nums text-blue-600 dark:text-blue-400">-R$ {fmt(m.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {despesasTurno.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Despesas</div>
                  <div className="space-y-1">
                    {despesasTurno.sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0)).map(d => (
                      <div key={d.id} className="flex justify-between items-center text-xs py-1.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                        <span className="text-gray-500 dark:text-gray-400">
                          {d.descricao || 'Despesa'}
                          {d.created_date ? ` · ${format(new Date(d.created_date), 'HH:mm')}` : ''}
                        </span>
                        <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">-R$ {fmt(d.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Vendas do turno */}
          {vendasTurno.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Vendas ({vendasTurno.length})</div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {vendasTurno.map(v => (
                  <div key={v.id} className="flex justify-between items-start text-xs py-1.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">{v.numero}</span>
                      <span className="text-gray-400 dark:text-gray-500"> · {v.cliente_nome}</span>
                      {(v.pagamentos || []).length > 1 && (
                        <div className="mt-0.5 space-y-0.5">
                          {(v.pagamentos || []).map((p, i) => (
                            <div key={i} className="text-gray-400 dark:text-gray-500 pl-2">↳ {p.forma_pagamento} R$ {fmt(p.valor)}</div>
                          ))}
                        </div>
                      )}
                      {(v.pagamentos || []).length === 1 && (
                        <span className="text-gray-400 dark:text-gray-500"> · {v.pagamentos[0].forma_pagamento}</span>
                      )}
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white tabular-nums ml-3">R$ {fmt(v.valor_total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conferência Final */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">CONFERÊNCIA</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Dinheiro na Gaveta:</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono">R$ {fmt((turno.recebimentos_dinheiro || 0) + (turno.saldo_inicial || 0) + (turno.total_reforcos || 0) - (turno.total_sangrias || 0) - (turno.total_despesas || 0))}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-gray-800 dark:text-gray-200">Total Conferido:</span>
                <span className="text-gray-900 dark:text-white font-mono">R$ {fmt(turno.dinheiro_conferido || 0)}</span>
              </div>
              <div className={`flex justify-between font-bold pt-2 border-t border-gray-300 dark:border-gray-600 ${
                Math.abs(diferenca) < 0.01 
                  ? 'text-gray-400 dark:text-gray-500' 
                  : diferenca > 0 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-red-600 dark:text-red-400'
              }`}>
                <span>Diferença:</span>
                <span className="font-mono">{diferenca >= 0 ? '+' : ''}R$ {fmt(diferenca)}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-center">
              <span className="text-gray-400 dark:text-gray-500">Fechado por: </span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{turno.usuario_fechamento_nome || '-'}</span>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    imprimirRelatorio();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium text-sm shadow-sm hover:shadow-md transition-shadow active:scale-[0.98]"
                  style={{ minHeight: '48px' }}
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Fechamento
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReabrir(turno);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm shadow-sm hover:shadow-md transition-shadow active:scale-[0.98]"
                  style={{ minHeight: '48px' }}
                >
                  <RotateCcw className="w-4 h-4" />
                  Solicitar Reabertura
                </button>
              </div>
              <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2.5 rounded-xl">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>Reabertura requer autenticação do gestor responsável</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TurnosFechadosPage() {
  const [turnos, setTurnos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [turnoParaReabrir, setTurnoParaReabrir] = useState(null);
  const [reabrindo, setReabrindo] = useState(false);

  useEffect(() => {
    loadData();
    base44.auth.me().then(setCurrentUser).catch(console.error);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [t, v, m, d] = await Promise.all([
        base44.entities.TurnoCaixa.filter({ status: 'Fechado' }, '-data_fechamento', 100),
        base44.entities.PedidoVenda.filter({ tipo: 'PDV' }, '-created_date', 500),
        base44.entities.MovimentosCaixa.list('-created_date', 500),
        base44.entities.LancamentoFinanceiro.filter({ tipo: 'Despesa' }, '-created_date', 2000),
      ]);
      setTurnos(t);
      setVendas(v);
      setMovimentos(m);
      setDespesas(d);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
    setIsLoading(false);
  };

  const turnosFiltrados = turnos.filter(t => {
    const matchBusca = !busca || 
      (t.numero || '').toLowerCase().includes(busca.toLowerCase()) ||
      (t.conta_caixa_pdv_nome || '').toLowerCase().includes(busca.toLowerCase()) ||
      (t.usuario_abertura_nome || '').toLowerCase().includes(busca.toLowerCase());
    const matchData = !filtroData || (t.data_abertura || '').startsWith(filtroData);
    return matchBusca && matchData;
  });

  const totalVendasFiltrado = turnosFiltrados.reduce((s, t) => s + (t.total_vendas || 0), 0);
  const totalDiferencas = turnosFiltrados.reduce((s, t) => s + (t.diferenca || 0), 0);

  const handleReabrirTurno = async (turno) => {
    setTurnoParaReabrir(turno);
    void runOperacaoAuthBypass((authData) => handleAuthSuccess(authData, turno));
  };

  const handleAuthSuccess = async (authData, turnoOverride) => {
    const turno = turnoOverride ?? turnoParaReabrir;
    if (!turno) {
      return;
    }
    
    setReabrindo(true);
    
    try {
      console.log('Reabertura autenticada por:', authData.intervenienteName);
      // Verificar se existe outro turno aberto para o mesmo caixa
      const turnosAbertos = await base44.entities.TurnoCaixa.filter({ 
        conta_caixa_pdv_id: turno.conta_caixa_pdv_id,
        status: 'Aberto'
      });

      if (turnosAbertos.length > 0) {
        toast.error('Reabertura bloqueada', {
          description: `Existe outro turno aberto (${turnosAbertos[0].numero}) neste caixa. Feche-o antes de reabrir este turno.`,
          duration: 5000
        });
        return;
      }

      // Buscar contas financeiras para reverter transferência
      const todasContas = await base44.entities.ContasFinanceiras.list();
      const caixaPDV = todasContas.find(c => c.id === turno.conta_caixa_pdv_id);
      const caixaGeral = todasContas.find(c => c.is_caixa_geral === true);

      const dinheiroConferido = turno.dinheiro_conferido || 0;

      // Reverter transferência do fechamento (se houve)
      if (caixaPDV && caixaGeral && dinheiroConferido > 0) {
        // Devolver dinheiro do Caixa Geral para o Caixa PDV
        await base44.entities.ContasFinanceiras.update(caixaPDV.id, {
          saldo_atual: caixaPDV.saldo_atual + dinheiroConferido
        });
        await base44.entities.ContasFinanceiras.update(caixaGeral.id, {
          saldo_atual: caixaGeral.saldo_atual - dinheiroConferido
        });

        // Registrar movimento de estorno
        await base44.entities.MovimentosCaixa.create({
          numero: `MCX-ESTORNO-${String(Date.now()).slice(-5)}`,
          tipo: 'Reforço',
          valor: dinheiroConferido,
          observacao: `Estorno de fechamento - Reabertura do turno ${turno.numero}`,
          conta_id: caixaPDV.id,
          turno_caixa_id: turno.id,
          usuario_responsavel_id: currentUser?.id,
          usuario_responsavel_nome: currentUser?.full_name
        });
      }

      // Reabrir o turno (com dados de auditoria)
      await base44.entities.TurnoCaixa.update(turno.id, {
        status: 'Aberto',
        data_fechamento: null,
        usuario_fechamento_id: null,
        usuario_fechamento_nome: null,
        observacoes: (turno.observacoes || '') + 
          `\n[REABERTURA] ${format(new Date(), 'dd/MM/yyyy HH:mm')} - Autorizado por ${authData.intervenienteName} (${authData.operationCode})`
      });

      // Remover o turno da lista local imediatamente
      setTurnos(prev => prev.filter(t => t.id !== turno.id));
      
      toast.success('Turno reaberto com sucesso!', {
        description: `Turno ${turno.numero} reaberto. Autorizado por: ${authData.intervenienteName}`,
      });

      // Recarregar dados do servidor em background
      setTimeout(() => loadData(), 500);
    } catch (error) {
      console.error('Erro ao reabrir turno:', error);
      toast.error('Erro ao reabrir turno', {
        description: error.message
      });
    } finally {
      setReabrindo(false);
      setTurnoParaReabrir(null);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-400" />
              Turnos Fechados
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Auditoria de caixa por turno</p>
          </div>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Barra de Busca */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar turno, caixa ou operador..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <Input
            type="date"
            value={filtroData}
            onChange={e => setFiltroData(e.target.value)}
            className="w-44"
          />
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />)}
          </div>
        ) : turnosFiltrados.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-600">
            <Lock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum turno fechado encontrado</p>
          </div>
        ) : (
          <P38MobileLineList>
            {turnosFiltrados.map((t, index) => (
              <TurnoRow key={t.id} turno={t} vendas={vendas} movimentos={movimentos} despesas={despesas} onReabrir={handleReabrirTurno} currentUser={currentUser} striped={index % 2 === 1} />
            ))}
          </P38MobileLineList>
        )}
      </div>

      {/* Modal de Autenticação */}
    </div>
  );
}