import React from 'react';
import CupomVendaLayout, { CUPOM_LARGURA_UTIL_MM } from '@/components/vendas/cupom/CupomVendaLayout';

/** A4: mesma versão do cupom, centralizada com respiro (não layout de pedido largo). */
export default function CupomVendaA4Shell(props) {
  const escala = 1.45;
  const larguraMm = Math.round(CUPOM_LARGURA_UTIL_MM * escala);

  return (
    <div
      id="cupom-print"
      style={{
        width: '210mm',
        minHeight: '297mm',
        background: '#fff',
        color: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '14mm 10mm 18mm',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: `${larguraMm}mm`,
          maxWidth: '100%',
        }}
      >
        <CupomVendaLayout {...props} variant="a4" id={undefined} />
      </div>
    </div>
  );
}
