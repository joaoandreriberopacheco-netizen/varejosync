import React from 'react';
import { HandCoins } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TIPO_VINCULO_LABELS } from '@/lib/folhaPrevisaoCalculos';

/**
 * Bloco opcional no formulário de despesa — vale para pessoa da folha.
 * Só aparece em despesa nova; não altera o fluxo quando desligado.
 */
export default function LancamentoValeFolha({
  ativo,
  onAtivoChange,
  pessoaId,
  onPessoaChange,
  pessoas = [],
  carregando = false,
  desabilitado = false,
}) {
  if (desabilitado) return null;

  return (
    <div className="rounded-2xl bg-card shadow-sm overflow-hidden ring-1 ring-border/30">
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 min-h-[56px]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
            <HandCoins className="w-5 h-5 text-amber-700 dark:text-amber-400" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Vale (folha)</p>
            <p className="text-[11px] text-muted-foreground truncate">
              Adiantamento para funcionário ou sócio — atualiza a folha
            </p>
          </div>
        </div>
        <Switch checked={ativo} onCheckedChange={onAtivoChange} aria-label="Vale para colaborador" />
      </div>

      {ativo && (
        <div className="px-4 pb-4 pt-0 space-y-2 border-t border-border/30">
          <Label className="text-xs text-muted-foreground">Quem vai receber o vale?</Label>
          {carregando ? (
            <p className="text-sm text-muted-foreground py-2">Carregando pessoas da folha…</p>
          ) : pessoas.length === 0 ? (
            <p className="text-sm text-amber-700 dark:text-amber-400 py-2">
              Nenhum modelo ativo na Folha. Cadastre em Financeiro → Folha → Modelos.
            </p>
          ) : (
            <Select value={pessoaId || '__none__'} onValueChange={(v) => onPessoaChange(v === '__none__' ? '' : v)}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Selecione a pessoa" />
              </SelectTrigger>
              <SelectContent className="z-[80]">
                <SelectItem value="__none__">Selecione…</SelectItem>
                {pessoas.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                    {' · '}
                    {TIPO_VINCULO_LABELS[p.tipo_vinculo] || 'Funcionário'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-[10px] text-muted-foreground">
            O valor e a data do lançamento acima serão usados automaticamente. O vale entra na previsão do mês na Folha.
          </p>
        </div>
      )}
    </div>
  );
}
