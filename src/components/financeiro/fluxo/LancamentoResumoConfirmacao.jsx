import { formatarSoData } from '@/components/utils/dateUtils';

function Linha({ rotulo, valor }) {
  if (!valor) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{rotulo}</span>
      <span className="text-sm font-medium text-foreground text-right">{valor}</span>
    </div>
  );
}

/**
 * Cartão de revisão antes de confirmar um lançamento.
 */
export default function LancamentoResumoConfirmacao({
  tipo,
  descricao,
  valorFormatado,
  dataVencimento,
  status,
  contaNome,
  categoria,
  tags = [],
  isRecorrente,
  frequencia,
  parcelas,
  isCustoMercadoria,
  contaDestinoNome,
}) {
  const prefixoValor = tipo === 'Receita' ? '+' : tipo === 'Despesa' ? '−' : '';

  let extraRecorrencia = null;
  if (isRecorrente && frequencia) {
    extraRecorrencia = frequencia === 'Parcelado' ? `${parcelas} parcelas` : frequencia;
  }

  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm space-y-4">
      <p className="text-center text-sm text-muted-foreground">Revise antes de guardar</p>

      <div className="text-center py-2">
        <p className="text-3xl font-bold font-glacial text-foreground tracking-tight">
          {prefixoValor} R$ {valorFormatado}
        </p>
        <p className="text-base font-medium text-foreground mt-2">{descricao || '—'}</p>
        <p className="text-xs text-muted-foreground mt-1">{tipo}</p>
      </div>

      <div className="rounded-xl bg-muted/40 px-3">
        <Linha rotulo="Vencimento" valor={dataVencimento ? formatarSoData(dataVencimento) : null} />
        <Linha rotulo="Conta" valor={contaNome} />
        {contaDestinoNome && <Linha rotulo="Para" valor={contaDestinoNome} />}
        <Linha rotulo="Situação" valor={status === 'Pago' ? 'Já pago' : 'Em aberto'} />
        <Linha rotulo="Categoria" valor={categoria} />
        {tags.length > 0 && <Linha rotulo="Tags" valor={tags.join(', ')} />}
        {extraRecorrencia && <Linha rotulo="Recorrência" valor={extraRecorrencia} />}
        {isCustoMercadoria && <Linha rotulo="CMV" valor="Sim" />}
      </div>
    </div>
  );
}
