import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PedidoCompraForm from '@/components/compras/PedidoCompraForm';

/**
 * Página inteira de detalhe/criação de Pedido de Compra — apenas Desktop.
 * Recebe ?id=<id> ou ?id=novo via query string.
 */
export default function PedidoCompraDetalhe() {
  const navigate = useNavigate();
  const [pedido, setPedido] = useState(undefined); // undefined = carregando
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id || id === 'novo') {
      setPedido(null);
      setLoading(false);
      return;
    }

    base44.entities.PedidoCompra.filter({ id })
      .then((res) => {
        setPedido(res?.[0] || null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (pedidoData) => {
    const sanitizedData = {
      ...pedidoData,
      valor_total: Number(pedidoData.valor_total) || 0,
    };

    let saved;
    if (sanitizedData.id) {
      saved = await base44.entities.PedidoCompra.update(sanitizedData.id, sanitizedData);
    } else {
      const { id, ...newPedido } = sanitizedData;
      if (!newPedido.numero) {
        const resp = await base44.functions.invoke('gerarNumeroSequencial', { tipo: 'PC' });
        newPedido.numero = resp?.data?.numero || `PC-${String(Date.now()).slice(-5)}`;
      }
      saved = await base44.entities.PedidoCompra.create(newPedido);
    }

    // Após salvar, navegar para o pedido salvo para atualizar o formulário
    if (saved?.id && !pedido?.id) {
      navigate(`/PedidoCompraDetalhe?id=${saved.id}`, { replace: true });
      setPedido(saved);
    } else if (pedido?.id) {
      const updated = await base44.entities.PedidoCompra.filter({ id: pedido.id });
      if (updated?.[0]) setPedido(updated[0]);
    }

    return saved;
  };

  const handleClose = () => {
    navigate('/PedidosCompra');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
      <PedidoCompraForm
        pedido={pedido}
        onSave={handleSave}
        onClose={handleClose}
      />
    </div>
  );
}