import React from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link2, FileText } from 'lucide-react';
import { P38HelpPopover } from '@/components/ui/p38-help-popover';
import {
  formatCurrency,
  formatCicloAgefinCompetencia,
  statusCompetenciaEfetivo,
  competenciaEstaFechada,
  isCompetenciaPlanejamento,
  valorEfetivoCompetencia,
} from '@/lib/agefinPrevisaoCalculos';

function LinhaValor({ label, valor }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-foreground">{formatCurrency(valor)}</span>
    </div>
  );
}

export default function AgefinPrevisaoDetalheDrawer({
  open,
  onClose,
  competencia,
  modelo,
  onSyncFinanceiro,
  syncing,
  onAbrirMes,
  abrindoMes,
  onImportarBoleto,
}) {
  if (!competencia) return null;

  const planejamento = isCompetenciaPlanejamento(competencia);
  const fechada = !planejamento && competenciaEstaFechada(competencia);
  const statusEfetivo = statusCompetenciaEfetivo(competencia);
  const valor = valorEfetivoCompetencia(competencia, modelo);
  const dia = modelo?.dia_vencimento || competencia.dia_vencimento || 10;

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="border-b border-border/40 pb-3">
          <DrawerTitle className="flex flex-wrap items-center gap-2">
            <span>{competencia.serie_nome}</span>
            <Badge variant="outline">{competencia.competencia}</Badge>
            {statusEfetivo === 'planejamento' && (
              <span className="inline-flex items-center gap-0.5">
                <Badge variant="secondary">Planejamento</Badge>
                <P38HelpPopover label="Ajuda: modo planejamento" side="bottom" align="start" size="sm">
                  <p className="font-medium text-foreground">Modo planejamento</p>
                  <p className="text-muted-foreground">
                    Valor estimado do cadastro. Abra o mês para gerar a conta e importar o boleto.
                  </p>
                </P38HelpPopover>
              </span>
            )}
            {statusEfetivo === 'fechado' && <Badge>Fechada</Badge>}
            {statusEfetivo === 'rascunho' && <Badge variant="outline">Em aberto</Badge>}
          </DrawerTitle>
          <p className="text-xs text-muted-foreground">
            {formatCicloAgefinCompetencia(competencia.competencia, dia)}
            {competencia.terceiro_nome && ` · ${competencia.terceiro_nome}`}
          </p>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-6">
          <div className="rounded-xl bg-muted/40 p-3 mt-2">
            <LinhaValor label="Valor previsto (cadastro)" valor={modelo?.valor_previsto || 0} />
            {competencia.valor_real != null && competencia.valor_real !== modelo?.valor_previsto && (
              <LinhaValor label="Valor do boleto / lançamento" valor={competencia.valor_real} />
            )}
            <div className="my-1 border-t border-border/40" />
            <LinhaValor label="Total do mês" valor={valor} />
          </div>

          {modelo?.centro_custo && (
            <p className="mt-3 text-sm text-muted-foreground">
              Centro de custo: <span className="text-foreground font-medium">{modelo.centro_custo}</span>
            </p>
          )}
          {modelo?.categoria_nome && (
            <p className="mt-1 text-sm text-muted-foreground">
              Categoria: <span className="text-foreground">{modelo.categoria_nome}</span>
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2">
            {planejamento && (
              <Button className="w-full gap-2" onClick={onAbrirMes} disabled={abrindoMes}>
                Abrir esta conta no mês
              </Button>
            )}
            {!planejamento && !fechada && onImportarBoleto && (
              <Button variant="outline" className="w-full gap-2" onClick={onImportarBoleto}>
                <FileText className="h-4 w-4" />
                Importar / atualizar boleto
              </Button>
            )}
            {!planejamento && !fechada && onSyncFinanceiro && (
              <Button variant="secondary" className="w-full gap-2" onClick={onSyncFinanceiro} disabled={syncing}>
                <Link2 className="h-4 w-4" />
                Enviar ao financeiro
              </Button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
