import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PedidoCompraForm from '@/components/compras/PedidoCompraForm';
import { filterEmbarquesVisiveisParaPedido } from '@/components/compras/embarqueFilters';

/**
 * Página inteira de detalhe/criação de Pedido de Compra — apenas Desktop.
 * Recebe ?id=<id> ou ?id=novo via query string.
 */
export default function PedidoCompraDetalhe() {
  const navigate = useNavigate();
  const [pedido, setPedido] = useState(undefined); // undefined = carregando
  const [loading, setLoading] = useState(true);
  const [autoOpenImporter, setAutoOpenImporter] = useState(false);

  const loadPedidoComVerdade = useCallback(async (id, keepLoading = false) => {
    if (!id || id === 'novo') {
      setPedido(null);
      setLoading(false);
      return null;
    }

    if (keepLoading) setLoading(true);

    const [pedidoRes, embarquesRes] = await Promise.all([
      base44.entities.PedidoCompra.filter({ id }),
      base44.entities.Embarque.filter({ pedido_compra_id: id })
    ]);

    const pedidoBase = pedidoRes?.[0] || null;
    if (!pedidoBase) {
      setPedido(null);
      setLoading(false);
      return null;
    }

    const embarques = filterEmbarquesVisiveisParaPedido(embarquesRes || []);
    const ultimoEmbarque = [...embarques]
      .filter((emb) => emb.status !== 'Concluído')
      .sort((a, b) => new Date(a.eta || a.created_date) - new Date(b.eta || b.created_date))[0]
      || [...embarques].sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date))[0]
      || null;

    const pedidoComVerdade = {
      ...pedidoBase,
      _embarques: embarques,
      _embarque_principal: ultimoEmbarque,
      data_prevista_entrega: ultimoEmbarque?.eta ? String(ultimoEmbarque.eta).slice(0, 10) : pedidoBase.data_prevista_entrega,
    };

    setPedido(pedidoComVerdade);
    setLoading(false);
    return pedidoComVerdade;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    setAutoOpenImporter(params.get('autoImportador') === '1');
    loadPedidoComVerdade(id, false);
  }, [loadPedidoComVerdade]);

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

    // Após salvar, recarregar sempre usando a verdade do Embarque
    if (saved?.id && !pedido?.id) {
      navigate(`/PedidoCompraDetalhe?id=${saved.id}`, { replace: true });
      saved = await loadPedidoComVerdade(saved.id, false);
    } else if (saved?.id) {
      saved = await loadPedidoComVerdade(saved.id, false);
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
        autoOpenImporter={autoOpenImporter}
      />
    </div>
  );
}