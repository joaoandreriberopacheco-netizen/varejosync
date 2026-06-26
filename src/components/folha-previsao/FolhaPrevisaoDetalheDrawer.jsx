import React from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Link2 } from 'lucide-react';
import {
  calcularTotaisCompetencia,
  formatCurrency,
  formatDataBr,
  formatCicloFolhaCompetencia,
  MOVIMENTO_LABELS,
  MOVIMENTO_STATUS_PAGAMENTO,
  MOVIMENTO_STATUS_PAGAMENTO_LABELS,
  RUBRICA_LABELS,
  statusPagamentoMovimento,
  statusCompetenciaEfetivo,
  competenciaEstaFechada,
} from '@/lib/folhaPrevisaoCalculos';
import { format } from 'date-fns';

function Section({ title, children }) {
  return (
    <div className="mt-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function LinhaValor({ label, valor, tone }) {
  const cls =
    tone === 'positive'
      ? 'text-emerald-700 dark:text-emerald-400'
      : tone === 'negative'
        ? 'text-red-700 dark:text-red-400'
        : 'text-foreground';
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium tabular-nums ${cls}`}>{formatCurrency(valor)}</span>
    </div>
  );
}

export default function FolhaPrevisaoDetalheDrawer({
  open,
  onClose,
  competencia,
  modelo,
  onAddMovimento,
  onRemoveMovimento,
  onSyncFinanceiro,
  syncing,
}) {
  if (!competencia) return null;

  const totais = calcularTotaisCompetencia(competencia, modelo);
  const rubricas = [...(competencia.rubricas || [])].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  const movimentos = competencia.movimentos || [];
  const provisoes = totais.provisoes || [];
  const fechada = competenciaEstaFechada(competencia);
  const statusEfetivo = statusCompetenciaEfetivo(competencia);

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="border-b border-border/40 pb-3">
          <DrawerTitle className="flex flex-wrap items-center gap-2">
            <span>{competencia.colaborador_nome}</span>
            <Badge variant="outline">{competencia.competencia}</Badge>
            {statusEfetivo === 'fechado' && <Badge>Fechada</Badge>}
            {statusEfetivo !== 'fechado' && <Badge variant="outline">Em aberto</Badge>}
            {competencia.situacao_mes === 'ultimo_mes' && (
              <Badge variant="destructive">Último mês</Badge>
            )}
            {totais.desligado && !totais.mesDesligamento && (
              <Badge variant="secondary">Desligado</Badge>
            )}
          </DrawerTitle>
          <p className="text-xs text-muted-foreground">
            Modelo: {competencia.modelo_nome || '—'} · {formatCicloFolhaCompetencia(competencia.competencia)}
            {modelo?.data_desligamento && ` · Saiu em ${formatDataBr(modelo.data_desligamento)}`}
          </p>
          {fechada && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              Folha fechada — movimentos não podem mais ser alterados neste mês.
            </p>
          )}
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-6">
          <div className="rounded-xl bg-muted/40 p-3 mt-2">
            <LinhaValor label="Proventos" valor={totais.proventos} tone="positive" />
            {totais.proventosEventos > 0 && (
              <LinhaValor label="↳ 13º, férias, rescisão" valor={totais.proventosEventos} tone="positive" />
            )}
            <LinhaValor label="Descontos" valor={totais.descontos} tone="negative" />
            <div className="my-1 border-t border-border/40" />
            <LinhaValor label="Líquido a pagar" valor={totais.liquido} />
            <LinhaValor label="Encargos empresa (FGTS, INSS…)" valor={totais.encargosEmpresa} tone="muted" />
            <div className="my-1 border-t border-border/40" />
            <LinhaValor label="Custo total empresa" valor={totais.custoTotalEmpresa} />
          </div>

          {totais.totalVales > 0 && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              Já retirou {formatCurrency(totais.totalVales)} em vales este mês.
              {totais.totalValesPendentes > 0 && (
                <span className="block mt-0.5">
                  {formatCurrency(totais.totalValesPendentes)} ainda em aberto no fluxo de caixa.
                </span>
              )}
            </p>
          )}

          {provisoes.length > 0 && (
            <Section title="Provisões do mês (automáticas)">
              <div className="rounded-lg ring-1 ring-border/40 divide-y divide-border/30">
                {provisoes.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{p.nome}</span>
                    <span className="tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(p.valor)}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title="Rubricas fixas">
            <div className="rounded-lg ring-1 ring-border/40 divide-y divide-border/30">
              {rubricas.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <span>{r.nome}</span>
                    <span className="ml-2 text-[10px] text-muted-foreground">{RUBRICA_LABELS[r.tipo]}</span>
                  </div>
                  <span className="tabular-nums font-medium">{formatCurrency(r.valor_base)}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Movimentos do mês">
            <div className="mb-2 flex gap-2">
              <Button size="sm" variant="outline" className="gap-1 h-8" onClick={onAddMovimento} disabled={fechada}>
                <Plus className="h-3.5 w-3.5" /> Registrar
              </Button>
              {onSyncFinanceiro && (
                <Button size="sm" variant="secondary" className="gap-1 h-8" onClick={onSyncFinanceiro} disabled={syncing || fechada}>
                  <Link2 className="h-3.5 w-3.5" />
                  {syncing ? 'Sincronizando…' : 'Enviar ao financeiro'}
                </Button>
              )}
            </div>
            {movimentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum movimento registrado.</p>
            ) : (
              <div className="rounded-lg ring-1 ring-border/40 divide-y divide-border/30">
                {movimentos.map((m) => {
                  const statusPag = statusPagamentoMovimento(m);
                  const ehPendente = statusPag === MOVIMENTO_STATUS_PAGAMENTO.PENDENTE;
                  return (
                  <div key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{m.descricao || MOVIMENTO_LABELS[m.tipo]}</span>
                        {ehPendente && (
                          <Badge variant="outline" className="text-[10px] shrink-0 border-amber-400/60 text-amber-700 dark:text-amber-400">
                            {MOVIMENTO_STATUS_PAGAMENTO_LABELS.pendente}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {MOVIMENTO_LABELS[m.tipo]}
                        {m.data && ` · ${format(new Date(`${m.data.slice(0, 10)}T12:00:00`), 'dd/MM')}`}
                        {m.referencia_tipo === 'LancamentoFinanceiro' && m.referencia_id && ' · Fluxo de caixa'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`tabular-nums font-medium ${ehPendente ? 'text-amber-700 dark:text-amber-400' : ''}`}>
                        {formatCurrency(m.valor)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onRemoveMovimento?.(m.id)}
                        disabled={fechada}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
