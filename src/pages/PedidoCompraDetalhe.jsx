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

    Promise.all([
      base44.entities.PedidoCompra.filter({ id }),
      base44.entities.Embarque.filter({ pedido_compra_id: id })
    ])
      .then(([pedidoRes, embarquesRes]) => {
        const pedidoBase = pedidoRes?.[0] || null;
        if (!pedidoBase) {
          setPedido(null);
          return;
        }

        const embarques = embarquesRes || [];
        const ultimoEmbarque = [...embarques].sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date))[0] || null;
        const totalPedido = Number(pedidoBase.valor_total) || 0;
        const valorEmbarcado = embarques.reduce((acc, embarque) => {
          const valorEmbarque = (embarque.itens || []).reduce((itemAcc, item) => {
            const custoUnitario = Number((pedidoBase.itens || []).find((pedidoItem) => pedidoItem.produto_id === item.produto_id)?.custo_unitario) || 0;
            return itemAcc + ((Number(item.quantidade_embarcada) || 0) * custoUnitario);
          }, 0);
          return acc + valorEmbarque;
        }, 0);
        const percentualReal = totalPedido > 0 ? Math.min(100, (valorEmbarcado / totalPedido) * 100) : 0;

        let statusRecebimentoReal = 'Nenhum';
        if (embarques.length > 0) {
          const recebimentos = embarques.map((embarque) => embarque.status_recebimento).filter(Boolean);
          if (recebimentos.some((status) => status === 'Com Divergência')) statusRecebimentoReal = 'Concluído com Divergência';
          else if (recebimentos.length > 0 && recebimentos.every((status) => status === 'Recebido OK')) statusRecebimentoReal = 'Concluído OK';
          else if (recebimentos.some((status) => status === 'Recebido Parcial')) statusRecebimentoReal = 'Recebido Parcial';
          else statusRecebimentoReal = 'Pendente';
        }

        const pedidoComVerdade = {
          ...pedidoBase,
          _embarques: embarques,
          _embarque_principal: ultimoEmbarque,
          percentual_valor_embarcado: percentualReal,
          status_embarque: embarques.length === 0 ? 'Nenhum' : percentualReal >= 100 ? 'Total' : 'Parcial',
          status_recebimento_geral: statusRecebimentoReal,
          data_prevista_entrega: ultimoEmbarque?.eta ? String(ultimoEmbarque.eta).slice(0, 10) : pedidoBase.data_prevista_entrega,
        };

        setPedido(pedidoComVerdade);
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
      const atual = await base44.entities.PedidoCompra.filter({ id: sanitizedData.id });
      const pedidoAtual = atual?.[0] || {};
      saved = await base44.entities.PedidoCompra.update(sanitizedData.id, {
        ...pedidoAtual,
        ...sanitizedData,
        embarques_registrados: sanitizedData.embarques_registrados ?? pedidoAtual.embarques_registrados,
        status_embarque: sanitizedData.status_embarque ?? pedidoAtual.status_embarque,
        status_recebimento_geral: sanitizedData.status_recebimento_geral ?? pedidoAtual.status_recebimento_geral,
        data_despacho: sanitizedData.data_despacho ?? pedidoAtual.data_despacho,
        data_chegada: sanitizedData.data_chegada ?? pedidoAtual.data_chegada,
        conferencia_id: sanitizedData.conferencia_id ?? pedidoAtual.conferencia_id,
        manifesto_entrada_id: sanitizedData.manifesto_entrada_id ?? pedidoAtual.manifesto_entrada_id,
        tem_divergencias: sanitizedData.tem_divergencias ?? pedidoAtual.tem_divergencias,
      });
    } else {
      const { id, ...newPedido } = sanitizedData;
      if (!newPedido.numero) {
        const resp = await base44.functions.invoke('gerarNumeroSequencial', { tipo: 'PC' });
        newPedido.numero = resp?.data?.numero;
      }
      saved = await base44.entities.PedidoCompra.create(newPedido);
    }

    // Após salvar, navegar para o pedido salvo para atualizar o formulário
    if (saved?.id && !pedido?.id) {
      navigate(`/PedidoCompraDetalhe?id=${saved.id}`, { replace: true });
      setPedido(saved);
    } else if (pedido?.id) {
      const updated = await base44.entities.PedidoCompra.filter({ id: pedido.id });
      if (updated?.[0]) {
        setPedido(updated[0]);
        saved = updated[0];
      }
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
    <div className="fixed inset-0 flex flex-col bg-white dark:bg-gray-900 overflow-hidden z-50">
      <PedidoCompraForm
        pedido={pedido}
        onSave={handleSave}
        onClose={handleClose}
      />
    </div>
  );
}