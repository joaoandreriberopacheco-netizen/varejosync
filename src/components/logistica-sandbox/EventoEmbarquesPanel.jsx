import React, { useMemo, useState } from 'react';
import { ChevronDown, ShoppingCart, Layers3 } from 'lucide-react';
import { buildPurchaseUnitOptions, resolveBoatLogisticsUnit } from '@/lib/productUnits';

function ordenarItens(itens = []) {
  return [...itens].sort((a, b) => (a.produto_nome || '').localeCompare(b.produto_nome || '', 'pt-BR'));
}

function normalizarTexto(valor) {
  return String(valor || '').trim().toLowerCase();
}

function normalizarSiglaUnidade(valor) {
  return String(valor || 'UN').trim().toUpperCase() || 'UN';
}

function extrairSnapshotProduto(item = {}, itemPedido = {}) {
  const candidatos = [item, itemPedido, item?._produto, itemPedido?._produto].filter(Boolean);
  const snapshot = {};
  for (const origem of candidatos) {
    if (!snapshot.unidade_principal && origem?.unidade_principal) snapshot.unidade_principal = origem.unidade_principal;
    if (!snapshot.unidade_show_comercial && origem?.unidade_show_comercial) snapshot.unidade_show_comercial = origem.unidade_show_comercial;
    if (!snapshot.unidade_show_logistica && origem?.unidade_show_logistica) snapshot.unidade_show_logistica = origem.unidade_show_logistica;
    if (!snapshot.unidade_apresentacao_default && origem?.unidade_apresentacao_default) snapshot.unidade_apresentacao_default = origem.unidade_apresentacao_default;
    if (!snapshot.valor_compra && origem?.valor_compra) snapshot.valor_compra = origem.valor_compra;
    if (!snapshot.unidades_alternativas && Array.isArray(origem?.unidades_alternativas)) snapshot.unidades_alternativas = origem.unidades_alternativas;
  }
  return snapshot;
}

function resolverValorUnitarioPreferencial(item = {}, itemPedido = {}) {
  return Number(
    item.custo_unitario ??
    item.custo_unitario_momento ??
    item.valor_unitario ??
    item.total_unitario ??
    item.custo_final_unitario ??
    item.custo_calculado ??
    itemPedido.custo_unitario ??
    itemPedido.custo_unitario_momento ??
    itemPedido.valor_unitario ??
    itemPedido.total_unitario ??
    itemPedido.custo_final_unitario ??
    itemPedido.custo_calculado ??
    itemPedido.valor_unitario_compra ??
    0
  ) || 0;
}

function resolverTotalPreferencial(item = {}, itemPedido = {}, quantidadeOriginal = 0, custoOriginal = 0) {
  return Number(
    item.total ??
    item.valor_total ??
    item.total_item ??
    item.valor_total_item ??
    item.subtotal ??
    itemPedido.total ??
    itemPedido.valor_total ??
    itemPedido.total_item ??
    itemPedido.valor_total_item ??
    itemPedido.subtotal ??
    quantidadeOriginal * custoOriginal
  ) || 0;
}

function registrarItemNoMapa(mapa, item = {}) {
  const chaveId = item?.produto_id;
  const chaveNome = normalizarTexto(item?.produto_nome);
  const quantidadeBase = Number(item.quantidade_base ?? item.quantidade ?? 1) || 1;
  const custoUnitario = Number(
    item.custo_unitario ??
    item.custo_unitario_momento ??
    item.valor_unitario ??
    item.total_unitario ??
    (Number(item.total) || 0) / quantidadeBase
  ) || 0;

  const registro = {
    produto_id: item?.produto_id || '',
    produto_nome: item?.produto_nome || '',
    quantidade_pedida: Number(item.quantidade ?? item.quantidade_base ?? 0) || 0,
    unidade_medida: item?.unidade_medida || 'UN',
    unidade_principal: item?.unidade_principal,
    unidade_show_comercial: item?.unidade_show_comercial,
    unidade_show_logistica: item?.unidade_show_logistica,
    unidade_apresentacao_default: item?.unidade_apresentacao_default,
    unidades_alternativas: Array.isArray(item?.unidades_alternativas) ? item.unidades_alternativas : undefined,
    fator_conversao: Number(item?.fator_conversao ?? 1) || 1,
    valor_compra: Number(item?.valor_compra ?? item?.custo_unitario ?? 0) || 0,
    custo_unitario: custoUnitario,
    total: Number(item.total ?? item.valor_total ?? item.total_item ?? item.subtotal ?? (Number(item.quantidade ?? item.quantidade_base ?? 0) || 0) * custoUnitario) || 0,
    _produto: item?._produto || null
  };

  if (chaveId) {
    mapa[chaveId] = registro;
  }

  if (chaveNome) {
    mapa[chaveNome] = registro;
  }
}

function criarMapaItensPedido(embarques = [], pedidosCompra = []) {
  const mapa = {};

  embarques.forEach((embarque) => {
    // Priorizar itens da relação _pedido_compra
    const pedido = embarque?._pedido_compra;
    if (pedido?.itens) {
      pedido.itens.forEach((item) => registrarItemNoMapa(mapa, item));
    } else {
      // Fallback para legado
      const itensPedido = embarque?._pedido_compra_itens || embarque?.pedido_compra_itens || embarque?.pedido_itens || [];
      itensPedido.forEach((item) => registrarItemNoMapa(mapa, item));
    }
  });

  pedidosCompra.forEach((pedido) => {
    const itens = pedido?.itens || [];
    itens.forEach((item) => registrarItemNoMapa(mapa, item));
  });

  return mapa;
}

function obterItemPedido(embarque, item, itensPedidoMap = {}) {
  const pedido = embarque?._pedido_compra;
  const itensPedidoDiretos = pedido?.itens || embarque?._pedido_compra_itens || embarque?.pedido_compra_itens || embarque?.pedido_itens || [];
  const itemDireto = itensPedidoDiretos.find((pedidoItem) => {
    if (item?.produto_id && pedidoItem?.produto_id) {
      return pedidoItem.produto_id === item.produto_id;
    }
    return normalizarTexto(pedidoItem?.produto_nome) === normalizarTexto(item?.produto_nome);
  });

  if (itemDireto) {
    return itemDireto;
  }

  return itensPedidoMap[item?.produto_id] || itensPedidoMap[normalizarTexto(item?.produto_nome)] || {};
}

function enriquecerItensEmbarque(embarque, itensPedidoMap = {}) {
  const itens = embarque.itens || [];
  return itens.map((item) => {
    const itemPedido = obterItemPedido(embarque, item, itensPedidoMap);
    const quantidadeOriginal = Number(item.quantidade_embarcada ?? item.quantidade_pedida ?? item.quantidade ?? 0) || 0;
    const fatorOrigem = Number(item.fator_conversao ?? itemPedido.fator_conversao ?? 1) || 1;
    const quantidadeBase = Number(item.quantidade_base ?? itemPedido.quantidade_base ?? (quantidadeOriginal * fatorOrigem)) || 0;
    const custoOriginal = resolverValorUnitarioPreferencial(item, itemPedido);
    const total = resolverTotalPreferencial(item, itemPedido, quantidadeOriginal, custoOriginal);
    const snapshotProduto = extrairSnapshotProduto(item, itemPedido);
    const unidadeOriginal = normalizarSiglaUnidade(item.unidade_medida || itemPedido.unidade_medida || snapshotProduto.unidade_principal || 'UN');
    const unidadeResolvida = normalizarSiglaUnidade(resolveBoatLogisticsUnit(snapshotProduto, unidadeOriginal));
    const opcoesCompra = buildPurchaseUnitOptions(snapshotProduto);
    const opcaoResolvida = opcoesCompra.find((o) => o.unidade === unidadeResolvida);
    const fatorResolvido = Number(opcaoResolvida?.fator_conversao) || 1;
    const quantidadeResolvida = fatorResolvido > 0
      ? (quantidadeBase > 0 ? quantidadeBase / fatorResolvido : quantidadeOriginal)
      : quantidadeOriginal;
    const custoResolvido = quantidadeResolvida > 0
      ? total / quantidadeResolvida
      : (Number(opcaoResolvida?.valor_unitario) || custoOriginal);
    const totalResolvido = quantidadeResolvida * custoResolvido;

    return {
      ...item,
      produto_nome: item.produto_nome || itemPedido.produto_nome || 'Item sem descrição',
      unidade_medida: unidadeResolvida,
      unidade_origem: unidadeOriginal,
      quantidade_pedida: Number(item.quantidade_pedida ?? itemPedido.quantidade_pedida ?? quantidadeResolvida) || 0,
      quantidade_embarcada: quantidadeResolvida,
      quantidade_base_resolvida: quantidadeBase,
      fator_conversao_resolvido: fatorResolvido,
      custo_unitario: custoResolvido,
      total: totalResolvido
    };
  });
}

function resumoEmbarque(embarque, itensPedidoMap = {}) {
  const itens = enriquecerItensEmbarque(embarque, itensPedidoMap);
  const totalItensResolvidos = itens.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const totalCompra = totalItensResolvidos > 0
    ? totalItensResolvidos
    : (Number(embarque.valor_total_embarcado) || 0);

  return {
    totalCompra,
    quantidadeItens: itens.length,
    quantidadeSomada: itens.reduce((sum, item) => sum + (Number(item.quantidade_embarcada) || 0), 0),
    itens
  };
}

function EmbarqueCard({ embarque, defaultOpen = false, itensPedidoMap = {} }) {
  const [open, setOpen] = useState(defaultOpen);
  const resumo = useMemo(() => resumoEmbarque(embarque, itensPedidoMap), [embarque, itensPedidoMap]);
  const itensOrdenados = useMemo(() => ordenarItens(resumo.itens), [resumo.itens]);

  return (
    <div className="rounded-2xl bg-[#334155]/82 dark:bg-[#334155]/82 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-3 py-3 text-left">
        
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#253042] flex items-center justify-center shadow-sm flex-shrink-0">
              <ShoppingCart className="w-4 h-4 text-slate-200" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-slate-700 text-sm font-semibold truncate">{embarque.fornecedor_nome || 'Fornecedor'}</p>
              <p className="text-slate-400 text-xs truncate">{embarque.pedido_compra_numero || embarque.numero || embarque.codigo || 'Compra vinculada'}</p>
            </div>
            <div className="text-right flex-shrink-0 pr-1">
              <p className="text-sm font-semibold text-white whitespace-nowrap">{resumo.totalCompra.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open &&
      <div className="px-3 pb-3">
          <div className="rounded-2xl bg-[#253042] px-2 py-2 shadow-inner">
            <div className="grid grid-cols-[32px_34px_1fr_60px_70px] items-center gap-2 px-1 pb-2 text-[9px] uppercase tracking-[0.08em] text-slate-300">
              <span>Qtd</span>
              <span>Un</span>
              <span className="text-left">Descrição</span>
              <span className="text-right">V. Unt</span>
              <span className="text-right">Vlr Tot</span>
            </div>
            <div className="space-y-1">
              {itensOrdenados.map((item, index) => {
              const quantidade = Number(item.quantidade_embarcada ?? item.quantidade_pedida ?? item.quantidade ?? 0) || 0;
              const custo = Number(item.custo_unitario ?? item.custo_unitario_momento ?? item.valor_unitario ?? item.total_unitario ?? 0) || 0;
              const total = Number(item.total ?? item.valor_total ?? item.total_item ?? quantidade * custo) || 0;
              return (
                <div key={`${item.produto_id || item.produto_nome}-${index}`} className="grid grid-cols-[32px_34px_1fr_60px_70px] items-start gap-2 rounded-xl px-1 py-2 text-[9px] text-white odd:bg-white/[0.03]">
                    <span className="pt-0.5 text-white font-medium">{quantidade}</span>
                    <span className="pt-0.5 text-slate-300 font-medium">{normalizarSiglaUnidade(item.unidade_medida)}</span>
                    <p className="min-w-0 text-[9px] leading-snug break-words font-normal text-white/90 text-left line-clamp-2">{item.produto_nome || 'Item sem descrição'}</p>
                    <span className="pt-0.5 text-[9px] text-right whitespace-nowrap text-slate-300">{custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    <span className="pt-0.5 text-[9px] text-right font-medium whitespace-nowrap text-white">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>);

            })}
            </div>
          </div>
        </div>
      }
    </div>);

}

export default function EventoEmbarquesPanel({ embarques = [] }) {
  const pedidosCompraRelacionados = useMemo(() => {
    const mapaPedidos = {};
    embarques.forEach((embarque) => {
      const pedido = embarque?._pedido_compra;
      if (pedido?.id) {
        mapaPedidos[pedido.id] = pedido;
      }
    });
    return Object.values(mapaPedidos);
  }, [embarques]);

  const itensPedidoMap = useMemo(() => criarMapaItensPedido(embarques, pedidosCompraRelacionados), [embarques, pedidosCompraRelacionados]);
  const resumoGeral = useMemo(() => {
    return embarques.reduce((acc, embarque) => {
      const resumo = resumoEmbarque(embarque, itensPedidoMap);
      acc.total += resumo.totalCompra;
      acc.quantidade += 1;
      return acc;
    }, { total: 0, quantidade: 0 });
  }, [embarques, itensPedidoMap]);

  if (!embarques.length) {
    return (
      <div className="rounded-2xl bg-muted/40 dark:bg-muted p-3 shadow-sm text-xs text-muted-foreground">
        Nenhuma compra vinculada a este evento.
      </div>);

  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-[#334155]/82 dark:bg-[#334155]/82 px-3 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-3 text-sm text-white">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-2xl bg-[#253042] flex items-center justify-center shadow-sm flex-shrink-0">
              <Layers3 className="w-4 h-4 text-slate-200" />
            </div>
            <span className="text-slate-900">Compras vinculadas</span>
          </div>
          <span className="text-slate-700 font-semibold whitespace-nowrap">{resumoGeral.quantidade} Compra{resumoGeral.quantidade > 1 ? 's' : ''}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 pl-10 text-sm text-white">
          <span className="text-slate-300">Valor total</span>
          <span className="font-semibold whitespace-nowrap">{resumoGeral.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
      </div>
      <div className="space-y-2">
        {embarques.map((embarque, index) =>
        <EmbarqueCard key={embarque.id || index} embarque={embarque} defaultOpen={index === 0} itensPedidoMap={itensPedidoMap} />
        )}
      </div>
    </div>);

}