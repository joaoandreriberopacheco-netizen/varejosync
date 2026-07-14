import { createUppercaseInputChangeHandler } from '@/lib/uppercaseInputHandlers';
import SeletorContaMobile from './SeletorContaMobile';
import { SeletorCategoria } from './DialogCategoria';
import TagsInput from './TagsInput';

const fieldClass =
  'w-full h-11 px-3 text-base rounded-xl bg-muted text-foreground border-0 outline-none focus:ring-2 focus:ring-border/40';

/** Passo 1 — valor + descrição no mesmo ecrã. */
export function PassoValorDescricao({
  valor,
  onValorChange,
  descricao,
  onDescricaoChange,
  descricaoOpcional = false,
  tipo,
}) {
  return (
    <div className="space-y-5 w-full">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">R$</p>
        <input
          autoComplete="off"
          type="text"
          inputMode="decimal"
          enterKeyHint="next"
          value={valor}
          onChange={onValorChange}
          placeholder="0,00"
          className="w-full text-center text-4xl font-semibold font-glacial bg-transparent border-0 outline-none"
        />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2 text-center">
          {tipo === 'Transferência' ? 'Observação (opcional)' : 'Do que se trata?'}
        </p>
        <input
          autoComplete="off"
          type="text"
          inputMode="text"
          value={descricao}
          onChange={createUppercaseInputChangeHandler(onDescricaoChange)}
          placeholder={descricaoOpcional ? 'Opcional' : 'Ex: Aluguel'}
          className={`${fieldClass} text-center p38-data-uppercase`}
        />
      </div>
    </div>
  );
}

/** Passo — só data de vencimento. */
export function PassoDataVencimento({ value, onChange }) {
  return (
    <input
      autoComplete="off"
      type="date"
      value={value}
      onChange={onChange}
      className={`${fieldClass} text-center text-xl font-medium h-14`}
    />
  );
}

/** Passo — conta + situação (em aberto / pago). */
export function PassoContaSituacao({ contas, contaId, onContaChange, status, onStatusChange }) {
  return (
    <div className="space-y-5 w-full">
      <SeletorContaMobile
        contas={contas}
        value={contaId}
        onChange={onContaChange}
        label="Qual conta?"
        placeholder="Selecionar conta"
      />
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground text-center">Já foi pago?</p>
        <div className="flex gap-2">
          {[
            { value: 'Em Aberto', label: 'Em aberto' },
            { value: 'Pago', label: 'Já pago' },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onStatusChange(value)}
              className={`flex-1 min-h-[52px] rounded-2xl text-sm font-semibold transition-all ${
                status === value
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-card shadow-sm text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Transferência — origem e destino no mesmo ecrã. */
export function PassoContasTransferencia({
  contas,
  contaOrigemId,
  onOrigemChange,
  contaDestinoId,
  onDestinoChange,
}) {
  return (
    <div className="space-y-6 w-full">
      <SeletorContaMobile
        contas={contas}
        value={contaOrigemId}
        onChange={onOrigemChange}
        label="De qual conta?"
        placeholder="Origem"
      />
      <SeletorContaMobile
        contas={contas}
        value={contaDestinoId}
        onChange={onDestinoChange}
        excludeIds={contaOrigemId ? [contaOrigemId] : []}
        label="Para qual conta?"
        placeholder="Destino"
      />
    </div>
  );
}

/** Categoria (passo opcional curto). */
export function PassoCategoria({ tipo, value, categoriaId, onChange, categorias, onCriada }) {
  return (
    <SeletorCategoria
      tipo={tipo}
      value={value}
      onChange={onChange}
      categorias={categorias}
      onCriada={onCriada}
      mobileLarge
    />
  );
}

/** Edição — essencial num ecrã. */
export function PassoEssencialEdicao({
  descricao,
  onDescricaoChange,
  valor,
  onValorChange,
  vencimento,
  onVencimentoChange,
  observacoes,
  onObservacoesChange,
}) {
  return (
    <div className="space-y-3 w-full max-h-[50vh] overflow-y-auto overscroll-contain px-1">
      <div>
        <p className="text-xs text-muted-foreground mb-1">Do que se trata?</p>
        <input
          autoComplete="off"
          value={descricao}
          onChange={createUppercaseInputChangeHandler(onDescricaoChange)}
          className={`${fieldClass} p38-data-uppercase`}
        />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Quanto é?</p>
        <input
          autoComplete="off"
          type="text"
          inputMode="decimal"
          value={valor}
          onChange={onValorChange}
          className={`${fieldClass} text-lg font-semibold`}
        />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Quando vence?</p>
        <input
          autoComplete="off"
          type="date"
          value={vencimento}
          onChange={onVencimentoChange}
          className={fieldClass}
        />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Observação (opcional)</p>
        <textarea
          value={observacoes}
          onChange={createUppercaseInputChangeHandler(onObservacoesChange)}
          rows={2}
          className={`w-full resize-none rounded-xl bg-muted px-3 py-2 text-sm p38-data-uppercase border-0 outline-none`}
        />
      </div>
    </div>
  );
}

/** Edição — categoria, tags e ordem no fluxo. */
export function PassoOrganizacaoEdicao({
  tipo,
  categoria,
  categoriaId,
  onCategoriaChange,
  categorias,
  onCriada,
  tags,
  onTagsChange,
  dataFluxo,
  onDataFluxoChange,
  previewOrdem,
}) {
  return (
    <div className="space-y-3 w-full max-h-[50vh] overflow-y-auto overscroll-contain">
      <SeletorCategoria
        tipo={tipo}
        value={categoria}
        onChange={onCategoriaChange}
        categorias={categorias}
        onCriada={onCriada}
        mobileLarge
      />
      <TagsInput tags={tags} onChange={onTagsChange} defaultExpanded />
      <div className="rounded-2xl bg-muted/40 p-3 space-y-2">
        <p className="text-xs text-muted-foreground">Quando aparece na lista? (opcional)</p>
        <input
          autoComplete="off"
          type="datetime-local"
          value={dataFluxo}
          onChange={onDataFluxoChange}
          className="w-full h-11 px-2 text-sm rounded-xl bg-muted border-0 outline-none"
        />
        {previewOrdem && (
          <p className="text-[11px] text-muted-foreground">Ordem: <span className="font-mono">{previewOrdem}</span></p>
        )}
      </div>
    </div>
  );
}

/** Edição — pagamento num ecrã. */
export function PassoPagamentoEdicao({
  isPago,
  onPagoChange,
  dataPagamento,
  onDataPagamentoChange,
  contas,
  contaId,
  onContaChange,
  mostrarLiquidacao,
  dataLiquidacao,
  onDataLiquidacaoChange,
}) {
  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => onPagoChange(!isPago)}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
            isPago ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`inline-block h-6 w-6 rounded-full bg-card shadow transform transition-transform ${
              isPago ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
        <p className="text-base font-medium">{isPago ? 'Já pago' : 'Em aberto'}</p>
      </div>
      {isPago && (
        <>
          <div>
            <p className="text-xs text-muted-foreground mb-1 text-center">Quando foi pago?</p>
            <input
              autoComplete="off"
              type="date"
              value={dataPagamento}
              onChange={onDataPagamentoChange}
              className={`${fieldClass} text-center`}
            />
          </div>
          <SeletorContaMobile
            contas={contas}
            value={contaId}
            onChange={onContaChange}
            label="Qual conta?"
            placeholder="Selecionar conta"
          />
        </>
      )}
      {mostrarLiquidacao && (
        <div>
          <p className="text-xs text-muted-foreground mb-1 text-center">Data de liquidação</p>
          <input
            autoComplete="off"
            type="date"
            value={dataLiquidacao}
            onChange={onDataLiquidacaoChange}
            className={`${fieldClass} text-center`}
          />
        </div>
      )}
    </div>
  );
}
