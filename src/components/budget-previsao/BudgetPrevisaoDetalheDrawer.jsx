import React, { useEffect, useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { P38StatusLabel } from '@/components/ui/p38-mobile-line';
import { formatFinanceiroValor } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import {
  MODO_ESTIMATIVA_LABELS,
  STATUS_CONSUMO_LABELS,
  formatCompetenciaLabel,
  formatCurrency,
  formatDataBr,
  formatEstimativaResumo,
} from '@/lib/budgetCalculos';

function LinhaValor({ label, valor, destaque }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={destaque ? 'font-semibold tabular-nums text-foreground' : 'font-medium tabular-nums'}>
        {typeof valor === 'string' ? valor : formatCurrency(valor)}
      </span>
    </div>
  );
}

export default function BudgetPrevisaoDetalheDrawer({
  open,
  onClose,
  visao,
  onSalvarAjuste,
  salvandoAjuste,
}) {
  const [valorAjuste, setValorAjuste] = useState('');
  const [motivoAjuste, setMotivoAjuste] = useState('');

  useEffect(() => {
    if (!visao) return;
    const ajuste = visao.competenciaRegistro?.valor_ajustado;
    setValorAjuste(ajuste != null ? String(ajuste) : '');
    setMotivoAjuste(visao.competenciaRegistro?.motivo_ajuste || '');
  }, [visao]);

  if (!visao) return null;

  const { modelo, competencia, orcadoCalculado, orcado, realizado, saldo, consumo, status, dias, metaDiaria, realizadoHoje, lancamentos, temAjuste } = visao;

  const handleSalvarAjuste = () => {
    onSalvarAjuste?.({
      valorAjustado: valorAjuste === '' ? null : parseFloat(valorAjuste),
      motivoAjuste: motivoAjuste,
    });
  };

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="text-left border-b border-border/40 pb-3">
          <DrawerTitle className="flex flex-wrap items-center gap-2">
            <span>{modelo?.nome}</span>
            <P38StatusLabel tone={status === 'acima' ? 'danger' : status === 'atencao' ? 'warning' : 'success'}>
              {STATUS_CONSUMO_LABELS[status]}
            </P38StatusLabel>
          </DrawerTitle>
          <p className="text-sm text-muted-foreground">
            {formatCompetenciaLabel(competencia)} · {modelo?.categoria_nome}
          </p>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-8 space-y-4">
          <section className="rounded-xl border border-border/50 p-3 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estimativa</p>
            <LinhaValor label="Modo" valor={MODO_ESTIMATIVA_LABELS[modelo?.modo_estimativa] || '—'} />
            <LinhaValor label="Entrada" valor={formatEstimativaResumo(modelo, competencia)} />
            <LinhaValor label={`Dias no mês${modelo?.usa_dias_uteis ? ' (úteis)' : ''}`} valor={String(dias)} />
            <LinhaValor label="Orçado calculado" valor={orcadoCalculado} />
            {temAjuste && <LinhaValor label="Orçado efetivo (ajustado)" valor={orcado} destaque />}
            {!temAjuste && <LinhaValor label="Orçado do mês" valor={orcado} destaque />}
            <LinhaValor label="Realizado" valor={realizado} />
            <LinhaValor label="Saldo" valor={saldo} destaque />
            <LinhaValor label="Consumo" valor={`${Math.round(consumo)}%`} />
            {metaDiaria > 0 && (
              <LinhaValor
                label="Hoje"
                valor={`${formatFinanceiroValor(realizadoHoje)} / ${formatFinanceiroValor(metaDiaria)}`}
              />
            )}
          </section>

          <section className="rounded-xl border border-border/50 p-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ajustar só este mês</p>
            <div>
              <Label className="text-xs">Orçado efetivo (opcional)</Label>
              <Input
                type="number"
                step="0.01"
                value={valorAjuste}
                onChange={(e) => setValorAjuste(e.target.value)}
                placeholder={String(orcadoCalculado)}
              />
            </div>
            <div>
              <Label className="text-xs">Motivo</Label>
              <Textarea
                value={motivoAjuste}
                onChange={(e) => setMotivoAjuste(e.target.value)}
                rows={2}
                placeholder="Ex: loja fechou 5 dias"
              />
            </div>
            <Button size="sm" onClick={handleSalvarAjuste} disabled={salvandoAjuste}>
              {salvandoAjuste ? 'Salvando…' : 'Salvar ajuste do mês'}
            </Button>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Lançamentos ({lancamentos?.length || 0})
            </p>
            {lancamentos?.length ? (
              <ul className="divide-y divide-border/40 rounded-xl border border-border/50 overflow-hidden">
                {lancamentos.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{l.descricao || 'Despesa'}</p>
                      <p className="text-[11px] text-muted-foreground">{formatDataBr(l.data_pagamento || l.data_vencimento)}</p>
                    </div>
                    <span className="tabular-nums font-medium shrink-0">
                      {formatFinanceiroValor(Number(l.valor_liquido ?? l.valor) || 0)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma despesa paga neste mês para esta categoria.
              </p>
            )}
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
