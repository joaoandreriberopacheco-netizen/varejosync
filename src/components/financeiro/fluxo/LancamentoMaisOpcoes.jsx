import { useState } from 'react';
import { ChevronDown, ShoppingCart } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import TagsInput from './TagsInput';
import RecorrenciaConfig from './RecorrenciaConfig';

/**
 * Secção colapsável — tags, recorrência e CMV ficam fora do caminho principal.
 */
export default function LancamentoMaisOpcoes({
  tipo,
  tags,
  onTagsChange,
  isCustoMercadoria,
  onCustoMercadoriaChange,
  pedidoCompraId,
  onPedidoCompraIdChange,
  pedidosCompra = [],
  isRecorrente,
  onRecorrenteToggle,
  frequencia,
  onFrequencia,
  parcelas,
  onParcelas,
  dataFim,
  onDataFim,
  dataLancamento,
  onDataLancamentoChange,
  previewOrdemLancamento,
  defaultExpanded = false,
  hideTags = false,
}) {
  const [expandido, setExpandido] = useState(defaultExpanded);

  const temAlgo =
    tags.length > 0 ||
    isCustoMercadoria ||
    isRecorrente ||
    !!pedidoCompraId ||
    !!dataLancamento;

  return (
    <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="w-full px-4 py-4 flex items-center justify-between gap-2 text-left min-h-[52px]"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Mais opções</p>
          <p className="text-xs text-muted-foreground truncate">
            {temAlgo ? 'Algumas opções preenchidas' : 'Tags, recorrência, CMV — se precisar'}
          </p>
        </div>
        <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${expandido ? 'rotate-180' : ''}`} />
      </button>

      {expandido && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
          <div className="rounded-2xl bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-medium text-foreground">Quando aparece na lista?</p>
            <p className="text-[11px] text-muted-foreground">Opcional — só muda a ordem no fluxo</p>
            <input
              autoComplete="off"
              type="datetime-local"
              value={dataLancamento || ''}
              onChange={onDataLancamentoChange}
              className="w-full h-11 px-2 text-sm rounded-xl bg-muted border-0 outline-none"
            />
            {previewOrdemLancamento && (
              <p className="text-[11px] text-muted-foreground">
                Ordem: <span className="font-mono text-foreground/80">{previewOrdemLancamento}</span>
              </p>
            )}
          </div>

          {!hideTags && <TagsInput tags={tags} onChange={onTagsChange} defaultExpanded />}

          {tipo === 'Despesa' && (
            <>
              <div className="bg-muted/30 rounded-2xl p-4">
                <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                  <Checkbox checked={isCustoMercadoria} onCheckedChange={onCustoMercadoriaChange} />
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-blue-500" />
                    <span className="text-sm text-foreground/90">É custo de mercadoria (CMV)</span>
                  </div>
                </label>
              </div>

              {isCustoMercadoria && (
                <div className="bg-muted/30 rounded-2xl overflow-hidden">
                  <Select
                    value={pedidoCompraId || '__none__'}
                    onValueChange={(value) => onPedidoCompraIdChange(value === '__none__' ? '' : value)}
                  >
                    <SelectTrigger className="border-0 shadow-none bg-transparent h-12 text-sm px-4">
                      <SelectValue placeholder="Ligar a pedido de compra (opcional)" />
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {pedidosCompra.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.numero} — {p.fornecedor_nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <RecorrenciaConfig
            isRecorrente={isRecorrente}
            onToggle={onRecorrenteToggle}
            frequencia={frequencia}
            onFrequencia={onFrequencia}
            parcelas={parcelas}
            onParcelas={onParcelas}
            dataFim={dataFim}
            onDataFim={onDataFim}
          />
        </div>
      )}
    </div>
  );
}
