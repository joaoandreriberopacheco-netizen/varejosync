import React from 'react';
import { getContextoPedido } from '@/lib/contextoVendaIntegrado';
import { TIPO_EVENTO } from '@/lib/eventosVenda';
import { CUPOM_LINE_HEIGHT_TERMICO } from '@/lib/cupomTermico80';

/**
 * Bloco de contexto integrado — preto sólido para térmica (sem vermelho/cinza claro).
 */
export default function ComprovanteContextoBloco({
  pedido,
  indiceContexto,
  fontSize = 11,
  variant = 'termico',
}) {
  const ctx = getContextoPedido(indiceContexto, pedido?.id);
  const destaques = ctx.destaques || [];
  const cancelado = ctx.cancelado || (pedido?.status || '').toLowerCase() === 'cancelado';

  if (!destaques.length && !cancelado) return null;

  const sepLen = variant === 'a4' ? 36 : 30;
  const Sep = () => (
    <div
      style={{
        margin: '6px 0',
        fontSize: fontSize,
        fontWeight: 600,
        color: '#000',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      {'='.repeat(sepLen)}
    </div>
  );

  const bold = { fontWeight: 700, color: '#000' };

  return (
    <>
      <Sep />
      <div
        style={{
          fontSize: fontSize,
          lineHeight: variant === 'termico' ? CUPOM_LINE_HEIGHT_TERMICO : 1.4,
          color: '#000',
          fontWeight: 400,
        }}
      >
        {cancelado && (
          <div
            style={{
              textAlign: 'center',
              ...bold,
              fontSize: fontSize + 2,
              marginBottom: '6px',
              border: '3px solid #000',
              padding: '6px 4px',
            }}
          >
            *** VENDA CANCELADA ***
          </div>
        )}
        {destaques.map((d, i) => {
          if (d.tipo === TIPO_EVENTO.SUBSTITUICAO && d.origem) {
            return (
              <div key={i} style={{ marginBottom: '4px', ...bold }}>
                Substitui pedido {d.origem.numero}
                {d.diferenca != null && d.diferenca !== 0 && (
                  <span>
                    {' '}
                    (dif. R$ {Math.abs(d.diferenca).toFixed(2).replace('.', ',')})
                  </span>
                )}
              </div>
            );
          }
          if (d.tipo === TIPO_EVENTO.PAGAMENTO_ALTERADO) {
            return (
              <div key={i} style={{ marginBottom: '4px', ...bold }}>
                Pagamento atualizado (ver abaixo)
              </div>
            );
          }
          if (d.tipo === TIPO_EVENTO.CANCELAMENTO) {
            return (
              <div key={i} style={{ marginBottom: '4px', ...bold }}>
                Cancelada{d.motivo ? `: ${d.motivo}` : ''}
              </div>
            );
          }
          return (
            <div key={i} style={{ marginBottom: '4px', fontWeight: 600 }}>
              * {d.rotulo}
            </div>
          );
        })}
        <div style={{ fontSize: fontSize - 1, fontWeight: 500, marginTop: '4px' }}>
          Estado atual do pedido
        </div>
      </div>
      <Sep />
    </>
  );
}
