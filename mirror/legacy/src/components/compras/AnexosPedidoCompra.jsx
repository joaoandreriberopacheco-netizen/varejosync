import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { fetchReferenciasAnexosPedidoCompra } from '@/lib/anexosReferenciasIntegradas';
import AnexosModalIntegrado from '@/components/anexos/AnexosModalIntegrado';

/**
 * Anexos do pedido + lançamentos financeiros vinculados (parcelas / aprovação).
 */
export default function AnexosPedidoCompra({ pedidoId, pedidoNumero, isOpen, onClose }) {
  const [referencias, setReferencias] = useState([]);

  useEffect(() => {
    if (!pedidoId || !isOpen) {
      setReferencias([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const refs = await fetchReferenciasAnexosPedidoCompra(base44, pedidoId);
      if (!cancelled) setReferencias(refs);
    })();
    return () => {
      cancelled = true;
    };
  }, [pedidoId, isOpen]);

  return (
    <AnexosModalIntegrado
      isOpen={isOpen}
      onClose={onClose}
      referencias={referencias}
      referenciaNomero={pedidoNumero}
      uploadTarget={
        pedidoId
          ? { referencia_tipo: 'PedidoCompra', referencia_id: pedidoId }
          : null
      }
    />
  );
}
