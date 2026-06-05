import React from 'react';
import { Eye } from 'lucide-react';
import { caixaClasses, caixaPanel, caixaPanelBody, caixaTypo } from '@/lib/caixaP38Theme';
import CaixaValorDisplay from '@/components/vendas/caixa/CaixaValorDisplay';

const ROW_GRID = 'grid grid-cols-[28px_minmax(0,1fr)_minmax(8.5rem,auto)] items-center gap-x-2';

function MovimentoRow({
  label,
  valor,
  tone = 'neutral',
  signed = false,
  onEye,
  eyeTone = 'success',
}) {
  const eye = caixaClasses(eyeTone);
  return (
    <div className={`${ROW_GRID} py-1.5`}>
      <div className="flex justify-center">
        {onEye ? (
          <button
            type="button"
            onClick={onEye}
            className={`p-1 rounded-lg transition-colors ${eye.hover}`}
            style={{ minWidth: '28px', minHeight: '28px' }}
            aria-label={`Ver detalhes: ${label}`}
          >
            <Eye className={`w-4 h-4 ${eye.icon}`} />
          </button>
        ) : (
          <span className="w-7" aria-hidden />
        )}
      </div>
      <span className={`${caixaTypo.label} truncate`}>{label}</span>
      <div className="text-right">
        <CaixaValorDisplay
          valor={valor}
          tone={tone}
          signed={signed}
          size="md"
          reserveSignSpace
        />
      </div>
    </div>
  );
}

/**
 * Card «Movimentações do Turno» — painel P38 oliva + linhas alinhadas em grelha.
 */
export default function CaixaMovimentacoesTurno({
  saldoInicial = 0,
  totalVendas = 0,
  reforcos = 0,
  sangrias = 0,
  despesas = 0,
  liquidez = 0,
  fiado = 0,
  onVendas,
  onReforcos,
  onSangrias,
  onDespesas,
  onLiquidez,
}) {
  return (
    <div className={caixaPanel}>
      <div className="p38-panel__accent-bar" aria-hidden />
      <div className={`${caixaPanelBody} space-y-1`}>
        <h3 className={`${caixaTypo.title} mb-3 text-foreground`}>
          Movimentações do Turno
        </h3>

        <MovimentoRow label="Saldo Inicial" valor={saldoInicial} />
        <MovimentoRow
          label="Total Vendas"
          valor={totalVendas}
          tone="success"
          signed
          onEye={onVendas}
          eyeTone="success"
        />
        <MovimentoRow
          label="Reforços"
          valor={reforcos}
          tone="success"
          signed
          onEye={onReforcos}
          eyeTone="success"
        />
        <MovimentoRow
          label="Recolhimentos"
          valor={sangrias}
          tone="info"
          signed
          onEye={onSangrias}
          eyeTone="info"
        />
        <MovimentoRow
          label="Despesas"
          valor={despesas}
          tone="danger"
          signed
          onEye={onDespesas}
          eyeTone="danger"
        />
        {fiado > 0 && (
          <MovimentoRow
            label="Conta a Receber"
            valor={fiado}
            tone="success"
            signed
            eyeTone="warning"
          />
        )}

        <div className="pt-3 mt-2 border-t border-border/40 dark:border-white/10">
          <div className={`${ROW_GRID} py-1`}>
            <div className="flex justify-center">
              {onLiquidez ? (
                <button
                  type="button"
                  onClick={onLiquidez}
                  className={`p-1 rounded-lg transition-colors ${caixaClasses('success').hover}`}
                  style={{ minWidth: '28px', minHeight: '28px' }}
                  aria-label="Ver liquidez consolidada"
                >
                  <Eye className={`w-4 h-4 ${caixaClasses('success').icon}`} />
                </button>
              ) : (
                <span className="w-7" aria-hidden />
              )}
            </div>
            <span className={caixaTypo.section}>Liquidez do Turno</span>
            <div className="text-right">
              <CaixaValorDisplay
                valor={liquidez}
                tone="neutral"
                signed={false}
                size="lg"
                reserveSignSpace
              />
            </div>
          </div>
          <p className={`${caixaTypo.meta} mt-1 text-right col-span-3`}>
            Inicial + vendas + reforços − recolhimentos
          </p>
        </div>
      </div>
    </div>
  );
}
