import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO, isToday, isPast, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronUp, ArrowRightLeft, X, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ConciliacaoBancaria({ contaId, contaNome, onClose, onConciliado }) {
  const [lancamentos, setLancamentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selecionados, setSelecionados] = useState([]);
  const [expandidos, setExpandidos] = useState({});
  const [dialogConfirm, setDialogConfirm] = useState(false);
  const [valorConfirmado, setValorConfirmado] = useState('');
  const [dataEfetiva, setDataEfetiva] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [processing, setProcessing] = useState(false);
  const [contas, setContas] = useState([]);
  const [contaBancariaDestino, setContaBancariaDestino] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadPendentes();
  }, [contaId]);

  const loadPendentes = async () => {
    setIsLoading(true);
    const [dados, todasContas] = await Promise.all([
      contaId
        ? base44.entities.LancamentoFinanceiro.filter({
            conta_financeira_id: contaId,
            status_conciliacao: 'Pendente'
          })
        : base44.entities.LancamentoFinanceiro.filter({
            status_conciliacao: 'Pendente'
          }),
      base44.entities.ContasFinanceiras.list()
    ]);
    setLancamentos(dados.sort((a, b) => new Date(a.data_liquidacao_prevista) - new Date(b.data_liquidacao_prevista)));
    setContas(todasContas.filter(c => c.id !== contaId && c.ativo));
    setIsLoading(false);
  };

  // Agrupa por data de liquidação prevista
  const grupos = useMemo(() => {
    const mapa = {};
    lancamentos.forEach(l => {
      const chave = l.data_liquidacao_prevista || l.data_vencimento || 'sem-data';
      if (!mapa[chave]) mapa[chave] = [];
      mapa[chave].push(l);
    });
    return Object.entries(mapa).sort(([a], [b]) => new Date(a) - new Date(b));
  }, [lancamentos]);

  const toggleSelecionado = (id) => {
    setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleGrupo = (data) => {
    const ids = grupos.find(([d]) => d === data)?.[1].map(l => l.id) || [];
    const todosSelecionados = ids.every(id => selecionados.includes(id));
    if (todosSelecionados) {
      setSelecionados(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelecionados(prev => [...new Set([...prev, ...ids])]);
    }
  };

  const toggleExpandido = (data) => {
    setExpandidos(prev => ({ ...prev, [data]: !prev[data] }));
  };

  const selecionadosData = lancamentos.filter(l => selecionados.includes(l.id));
  const totalSelecionado = selecionadosData.reduce((s, l) => s + (l.valor_liquido || l.valor || 0), 0);
  const todosIds = lancamentos.map(l => l.id);
  const todosSelecionados = todosIds.length > 0 && todosIds.every(id => selecionados.includes(id));
  const toggleSelecionarTodos = () => {
    if (todosSelecionados) {
      setSelecionados([]);
    } else {
      setSelecionados(todosIds);
    }
  };

  const abrirConciliacao = () => {
    if (selecionados.length === 0) {
      toast({ title: 'Selecione ao menos um lançamento', variant: 'destructive' });
      return;
    }
    setValorConfirmado(totalSelecionado.toFixed(2));
    setDialogConfirm(true);
  };

  const confirmarConciliacao = async () => {
    const idsSnapshot = [...selecionados];
    const itensSnapshot = lancamentos.filter((l) => idsSnapshot.includes(l.id));
    if (itensSnapshot.length === 0) return;

    setProcessing(true);
    try {
      const valorReal = parseFloat(valorConfirmado);
      const grupoId = `CONC-${Date.now()}`;
      const dataEfetivaISO = dataEfetiva;

      const atualizacoes = itensSnapshot.map(l => {
        const status = Math.abs((l.valor_liquido || l.valor) - valorReal / itensSnapshot.length) > 0.01
          ? 'Ajustado' : 'Conciliado';
        return base44.entities.LancamentoFinanceiro.update(l.id, {
          status_conciliacao: status,
          data_liquidacao_efetiva: dataEfetivaISO,
          status: 'Pago',
          conciliacao_grupo_id: grupoId
        });
      });

      await Promise.all(atualizacoes);

      if (contaBancariaDestino) {
        const contaDestino = contas.find(c => c.id === contaBancariaDestino);
        await base44.entities.LancamentoFinanceiro.create({
          tipo: 'Receita',
          descricao: `Conciliação ${grupoId} - ${contaNome} (${itensSnapshot.length} lançamentos)`,
          valor: valorReal,
          valor_liquido: valorReal,
          conta_financeira_id: contaBancariaDestino,
          conta_financeira_nome: contaDestino?.nome,
          categoria: 'Transferência entre Contas',
          status: 'Pago',
          status_conciliacao: 'N/A',
          data_vencimento: dataEfetivaISO,
          data_pagamento: dataEfetivaISO,
          referencia_tipo: 'Conciliacao',
          referencia_numero: grupoId,
          conciliacao_grupo_id: grupoId,
          observacoes: `Consolidação de ${itensSnapshot.length} lançamentos de ${contaNome}`
        });

        if (contaDestino) {
          await base44.entities.ContasFinanceiras.update(contaBancariaDestino, {
            saldo_atual: (contaDestino.saldo_atual || 0) + valorReal
          });
        }
      }

      toast({
        title: 'Conciliação realizada',
        description: `${itensSnapshot.length} lançamento(s) conciliado(s) — ${fmt(valorReal)}`,
        className: 'bg-green-50 text-green-800'
      });

      setDialogConfirm(false);
      setSelecionados([]);
      await loadPendentes();
      onConciliado?.();
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro na conciliação',
        description: error?.message || 'Não foi possível concluir a operação.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusData = (dataStr) => {
    if (!dataStr) return { cor: 'text-muted-foreground', label: 'Sem data' };
    const d = parseISO(dataStr);
    if (isPast(d) && !isToday(d)) return { cor: 'text-red-500', label: 'Atrasado' };
    if (isToday(d)) return { cor: 'text-amber-500', label: 'Hoje' };
    return { cor: 'text-muted-foreground', label: format(d, "dd/MM", { locale: ptBR }) };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
      </div>
    );
  }

  if (lancamentos.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7 text-green-500" />
        </div>
        <p className="font-medium text-foreground/90">Nada pendente</p>
        <p className="text-sm text-muted-foreground">Todos os lançamentos desta conta estão conciliados.</p>
        <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
    {/* Header Info */}
    <div className="bg-muted/50/50 rounded-2xl p-4 mb-4 flex items-start gap-3 border border-border/40">
        <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-1 text-foreground/90">Como conciliar</p>
          <p className="text-xs leading-relaxed">Selecione os lançamentos que você confirmou no extrato bancário. Você pode conciliar individualmente ou agrupar vários do mesmo dia. Se o valor real for diferente, informe o valor exato recebido.</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-3 px-1">
        <div>
          <p className="text-xs font-semibold text-foreground/90">{contaNome || 'Todas as contas'}</p>
          <p className="text-[11px] text-muted-foreground">{lancamentos.length} lançamento{lancamentos.length !== 1 ? 's' : ''} pendente{lancamentos.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={toggleSelecionarTodos} className="rounded-xl text-xs">
          {todosSelecionados ? 'Limpar tudo' : 'Selecionar tudo'}
        </Button>
      </div>

      {/* Lista agrupada por data */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 pb-4">
        {grupos.map(([data, items]) => {
          const totalGrupo = items.reduce((s, l) => s + (l.valor_liquido || l.valor || 0), 0);
          const idsDaData = items.map(l => l.id);
          const todosSelecionados = idsDaData.every(id => selecionados.includes(id));
          const algumSelecionado = idsDaData.some(id => selecionados.includes(id));
          const isExpanded = expandidos[data] !== false; // expandido por padrão
          const { cor, label } = getStatusData(data);

          return (
            <div key={data} className="bg-card rounded-2xl shadow-sm overflow-hidden border border-border/40">
              {/* Header do grupo */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleExpandido(data)}
              >
                {/* Checkbox grupo */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleGrupo(data); }}
                  className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                    todosSelecionados
                      ? 'bg-primary dark:bg-gray-300'
                      : algumSelecionado
                        ? 'bg-gray-400'
                        : 'border-2 border-gray-300 dark:border-gray-500'
                  }`}
                >
                  {(todosSelecionados || algumSelecionado) && (
                    <Check className="w-3 h-3 text-white dark:text-gray-800" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-medium ${cor}`}>{label}</span>
                    <span className="text-xs text-gray-300 dark:text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{items.length} lançamento{items.length > 1 ? 's' : ''}</span>
                  </div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{fmt(totalGrupo)}</p>
                </div>

                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>

              {/* Itens do grupo */}
              {isExpanded && (
                <div className="border-t border-border/40">
                  {items.map(l => {
                    const isSel = selecionados.includes(l.id);
                    return (
                      <div
                        key={l.id}
                        onClick={() => toggleSelecionado(l.id)}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                          isSel ? 'bg-muted/40 dark:bg-muted/30' : 'hover:bg-muted/40/50 dark:hover:bg-primary/90/20'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSel ? 'bg-primary dark:bg-gray-300' : 'border-2 border-border/40'
                        }`}>
                          {isSel && <Check className="w-2.5 h-2.5 text-white dark:text-gray-800" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground/90 truncate">{l.descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            {l.forma_pagamento || l.forma_pagamento_tipo || '—'}
                            {l.referencia_numero ? ` • ${l.referencia_numero}` : ''}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{fmt(l.valor_liquido || l.valor)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer com ação */}
      {selecionados.length > 0 && (
        <div className="bg-primary dark:bg-muted rounded-2xl p-4 flex items-center justify-between gap-4 shadow-lg">
          <div className="text-white">
            <p className="text-xs text-gray-300 dark:text-muted-foreground">{selecionados.length} selecionado{selecionados.length > 1 ? 's' : ''}</p>
            <p className="text-xl font-bold">{fmt(totalSelecionado)}</p>
          </div>
          <Button
            onClick={abrirConciliacao}
            className="bg-white text-gray-800 hover:bg-muted/40 gap-2 flex-shrink-0 rounded-xl font-medium shadow-sm"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Conciliar
          </Button>
        </div>
      )}

      {/* Dialog de confirmação */}
      <Dialog open={dialogConfirm} onOpenChange={setDialogConfirm}>
        <DialogContent className="dark:bg-muted dark:border-border/40 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmar Conciliação</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-muted/40 dark:bg-muted rounded-xl p-3 space-y-1">
              <p className="text-xs text-muted-foreground">{selecionados.length} lançamento{selecionados.length > 1 ? 's' : ''} selecionado{selecionados.length > 1 ? 's' : ''}</p>
              <p className="text-sm font-medium text-foreground/90">Total esperado: {fmt(totalSelecionado)}</p>
            </div>

            <div>
              <Label className="text-foreground/90 text-sm">Valor real recebido</Label>
              <Input
                type="number"
                step="0.01"
                value={valorConfirmado}
                onChange={e => setValorConfirmado(e.target.value)}
                className="mt-1 dark:bg-muted dark:border-gray-600"
              />
              {parseFloat(valorConfirmado) !== totalSelecionado && (
                <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Divergência de {fmt(Math.abs(parseFloat(valorConfirmado || 0) - totalSelecionado))} — será registrada como ajuste
                </p>
              )}
            </div>

            <div>
              <Label className="text-foreground/90 text-sm">Data do recebimento</Label>
              <Input
                type="date"
                value={dataEfetiva}
                onChange={e => setDataEfetiva(e.target.value)}
                className="mt-1 dark:bg-muted dark:border-gray-600"
              />
            </div>

            <div>
              <Label className="text-foreground/90 text-sm">Lançar na conta bancária</Label>
              <select
                value={contaBancariaDestino}
                onChange={e => setContaBancariaDestino(e.target.value)}
                className="mt-1 w-full h-10 rounded-md border border-border/40 bg-white dark:bg-muted text-sm px-3 text-foreground"
              >
                <option value="">Não lançar (só marcar como conciliado)</option>
                {contas.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogConfirm(false)} disabled={processing} className="dark:bg-muted dark:border-gray-600">
              Cancelar
            </Button>
            <Button onClick={confirmarConciliacao} disabled={processing} className="bg-primary hover:bg-gray-900 dark:bg-gray-300 dark:text-gray-800">
              {processing ? 'Processando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}