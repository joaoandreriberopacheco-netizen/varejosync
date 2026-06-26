import React from 'react';
import { Copy, Pencil, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  P38MobileLine,
  P38StatusLabel,
  p38AccentKeyFromTone,
} from '@/components/ui/p38-mobile-line';
import { formatFinanceiroValor } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import {
  formatDataBr,
  SITUACAO_FOLHA,
  TIPO_VINCULO,
  TIPO_VINCULO_LABELS,
} from '@/lib/folhaPrevisaoCalculos';

const LINE_TITLE_CLASS =
  '[&>div>div:first-child]:text-[15px] [&>div>div:first-child]:font-semibold sm:[&>div>div:first-child]:text-base';

export default function FolhaPrevisaoModeloRow({
  modelo,
  onEdit,
  onDuplicate,
  onDesligar,
  striped,
}) {
  const rubricas = modelo.rubricas || [];
  const desligado = modelo.situacao === SITUACAO_FOLHA.DESLIGADO;
  const ehSocio = modelo.tipo_vinculo === TIPO_VINCULO.SOCIO;
  const accent = desligado ? 'muted' : ehSocio ? 'info' : 'danger';

  const meta = (
    <>
      <span>{TIPO_VINCULO_LABELS[ehSocio ? TIPO_VINCULO.SOCIO : TIPO_VINCULO.FUNCIONARIO]}</span>
      <span>{rubricas.length} rubricas</span>
      {desligado && modelo.data_desligamento && (
        <P38StatusLabel tone="danger">Saiu {formatDataBr(modelo.data_desligamento)}</P38StatusLabel>
      )}
      {!desligado && modelo.ativo === false && <P38StatusLabel tone="muted">Inativo</P38StatusLabel>}
      {ehSocio && modelo.retirada_valor_fixo > 0 && (
        <span>
          Retirada {modelo.retirada_frequencia === 'semanal' ? 'semanal' : 'mensal'}{' '}
          {formatFinanceiroValor(modelo.retirada_valor_fixo)}
        </span>
      )}
      {!ehSocio && modelo.decimo_terceiro_ativo !== false && <span>13º ativo</span>}
      {!ehSocio && (modelo.ferias_programadas?.length || 0) > 0 && (
        <span>{modelo.ferias_programadas.length} férias</span>
      )}
    </>
  );

  const trailing = (
    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onEdit?.(modelo)}
        aria-label="Editar modelo"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onDuplicate?.(modelo)}
        aria-label="Duplicar modelo"
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
      {modelo.colaborador_id && !desligado && onDesligar && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-700 dark:text-red-400"
          onClick={() => onDesligar?.(modelo)}
          aria-label="Desligar colaborador"
        >
          <UserMinus className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );

  return (
    <P38MobileLine
      thinAccent
      striped={striped}
      accent={p38AccentKeyFromTone(accent)}
      className={`${LINE_TITLE_CLASS} max-md:!py-3.5 max-md:min-h-[58px] ${desligado ? 'opacity-75' : ''}`}
      title={modelo.nome}
      subtitle={
        modelo.colaborador_nome
          ? `Vinculado: ${modelo.colaborador_nome} · Dia ${modelo.dia_vencimento}`
          : `Modelo genérico · Dia ${modelo.dia_vencimento}`
      }
      meta={meta}
      trailing={trailing}
    />
  );
}
