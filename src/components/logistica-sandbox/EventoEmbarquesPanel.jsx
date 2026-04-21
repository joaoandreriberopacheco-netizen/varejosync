import React, { useMemo, useState } from 'react';
import { ChevronDown, ShoppingCart, Layers3 } from 'lucide-react';
import { resolveBoatLogisticsUnit } from '@/lib/productUnits';

function ordenarItens(itens = []) {
  return [...itens].sort((a, b) => (a.produto_nome || '').localeCompare(b.produto_nome || '', 'pt-BR'));
}

function normalizarTexto(valor) {
  return String(valor || '').trim().toLowerCase();
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
    ((Number(item.total) || 0) / quantidadeBase)
  ) || 0;

  const registro = {
    produto_id: item?.produto_id || '',
    produto_nome: item?.produto_nome || '',
    quantidade_pedida: Number(item.quantidade ?? item.quantidade_base ?? 0) || 0,
    unidade_medida: item?.unidade_medida || 'UN',
    custo_unitario: custoUnitario,
    total: Number(item.total ?? ((Number(item.quantidade ?? item.quantidade_base ?? 0) || 0) * custoUnitario)) || 0,
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
    const productSource = item?._produto || item?.produto || itemPedido?._produto || itemPedido?.produto || itemPedido;
    const quantidade = Number(item.quantidade_embarcada ?? item.quantidade_pedida ?? item.quantidade ?? 0) || 0;
    const custo = Number(
      item.custo_unitario ??
      item.custo_unitario_momento ??
      item.valor_unitario ??
      item.total_unitario ??
      itemPedido.custo_unitario ??
      itemPedido.valor_unitario ??
      itemPedido.total_unitario
    ) || 0;
    const total = Number(
      item.total ??
      item.valor_total ??
      item.total_item ??
      itemPedido.total ??
      itemPedido.valor_total ??
      (quantidade * custo)
    ) || 0;

    return {
      ...item,
      produto_nome: item.produto_nome || itemPedido.produto_nome || 'Item sem descrição',
      unidade_medida: resolveBoatLogisticsUnit(productSource, item.unidade_medida || itemPedido.unidade_medida || 'UN'),
      quantidade_pedida: Number(item.quantidade_pedida ?? itemPedido.quantidade_pedida ?? quantidade) || 0,
      quantidade_embarcada: quantidade,
      custo_unitario: custo,
      total,
    };
  });
}

function resumoEmbarque(embarque, itensPedidoMap = {}) {
  const itens = enriquecerItensEmbarque(embarque, itensPedidoMap);
  const totalCompra = Number(embarque.valor_total_embarcado) || itens.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

  return {
    totalCompra,
    quantidadeItens: itens.length,
    quantidadeSomada: itens.reduce((sum, item) => sum + (Number(item.quantidade_embarcada) || 0), 0),
    itens,
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
        className="w-full px-3 py-3 text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#253042] flex items-center justify-center shadow-sm flex-shrink-0">
              <ShoppingCart className="w-4 h-4 text-slate-200" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{embarque.fornecedor_nome || 'Fornecedor'}</p>
              <p className="text-[11px] text-slate-300 truncate">{embarque.pedido_compra_numero || embarque.numero || embarque.codigo || 'Compra vinculada'}</p>
            </div>
            <div className="text-right flex-shrink-0 pr-1">
              <p className="text-sm font-semibold text-white whitespace-nowrap">{resumo.totalCompra.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3">
          <div className="rounded-2xl bg-[#253042] px-2 py-2 shadow-inner">
            <div className="grid grid-cols-[56px_1fr_60px_70px] items-center gap-2 px-1 pb-2 text-[9px] uppercase tracking-[0.08em] text-slate-300">
              <span>Qtd</span>
              <span className="text-left">Descrição</span>
              <span className="text-right">V. Unt</span>
              <span className="text-right">Vlr Tot</span>
            </div>
            <div className="space-y-1">
              {itensOrdenados.map((item, index) => {
                const quantidade = Number(item.quantidade_embarcada ?? item.quantidade_pedida ?? item.quantidade ?? 0) || 0;
                const custo = Number(item.custo_unitario ?? item.custo_unitario_momento ?? item.valor_unitario ?? item.total_unitario ?? 0) || 0;
                const total = Number(item.total ?? item.valor_total ?? item.total_item ?? (quantidade * custo)) || 0;
                return (
                  <div key={`${item.produto_id || item.produto_nome}-${index}`} className="grid grid-cols-[56px_1fr_60px_70px] items-start gap-2 rounded-xl px-1 py-2 text-[9px] text-white odd:bg-white/[0.03]">
                    <span className="pt-0.5 text-white font-medium whitespace-nowrap">{`${quantidade} ${item.unidade_medida || 'UN'}`}</span>
                    <p className="min-w-0 text-[9px] leading-snug break-words font-normal text-white/90 text-left line-clamp-2">{item.produto_nome || 'Item sem descrição'}</p>
                    <span className="pt-0.5 text-[9px] text-right whitespace-nowrap text-slate-300">{custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    <span className="pt-0.5 text-[9px] text-right font-medium whitespace-nowrap text-white">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
      <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 p-3 shadow-sm text-xs text-gray-500 dark:text-gray-400">
        Nenhuma compra vinculada a este evento.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-[#334155]/82 dark:bg-[#334155]/82 px-3 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-3 text-sm text-white">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-2xl bg-[#253042] flex items-center justify-center shadow-sm flex-shrink-0">
              <Layers3 className="w-4 h-4 text-slate-200" />
            </div>
            <span>Compras vinculadas</span>
          </div>
          <span className="font-semibold whitespace-nowrap">{resumoGeral.quantidade} Compra{resumoGeral.quantidade > 1 ? 's' : ''}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 pl-10 text-sm text-white">
          <span className="text-slate-300">Valor total</span>
          <span className="font-semibold whitespace-nowrap">{resumoGeral.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
      </div>
      <div className="space-y-2">
        {embarques.map((embarque, index) => (
          <EmbarqueCard key={embarque.id || index} embarque={embarque} defaultOpen={index === 0} itensPedidoMap={itensPedidoMap} />
        ))}
      </div>
    </div>
  );
}