import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Search, X, ShoppingCart, Printer, ArrowLeft, AlertCircle, Trash2, Plus, Minus, Check, User, CreditCard } from 'lucide-react';
import SimuladorCartaoSheet from '@/components/vendas/SimuladorCartaoSheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import OrcamentoCupom from './OrcamentoCupom';
import LostSalesForm from '@/components/vendas/LostSalesForm';
import { buildSaleUnitOptions, formatEstoqueApresentacao, pickDefaultSaleUnit } from '@/lib/productUnits';

const fmtR = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Bottom-sheet de quantidade ao selecionar produto ──────────────────────────
function QuantidadeSheet({ produto, preco, qtdAtual, unidadeSelecionada, unitOptions = [], onConfirm, onClose }) {
  const [qtd, setQtd] = useState(qtdAtual > 0 ? String(qtdAtual) : '1');
  const [selectedUnitCode, setSelectedUnitCode] = useState(unidadeSelecionada?.unidade || produto?.unidade_principal || 'UN');
  const [precoEditado, setPrecoEditado] = useState(preco);
  const inputRef = useRef(null);
  const precoRef = useRef(null);
  const precoLivre = produto?.preco_livre || false;
  /** `preco` já é o valor da tabela (calcularPreco) — piso de venda, não custo. */
  const selectedUnit =
    unitOptions.find((opt) => opt.unidade === selectedUnitCode)
    || unidadeSelecionada
    || unitOptions[0]
    || { unidade: produto?.unidade_principal || 'UN', fator_conversao: 1, valor_unitario: preco };
  const unitPrice = selectedUnit?.valor_unitario ?? preco;
  const precoMinimoVenda = unitPrice;

  useEffect(() => {
    // Pequeno delay para garantir que o bottom-sheet está visível antes do focus
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 120);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setPrecoEditado(unitPrice);
  }, [unitPrice, selectedUnitCode]);

  const qtdNum = parseFloat(qtd.replace(',', '.')) || 0;
  const precoFinal = precoLivre ? (parseFloat(precoEditado) || unitPrice) : unitPrice;
  const total = qtdNum * precoFinal;

  const handleConfirm = () => {
    if (qtdNum <= 0) return;
    if (precoLivre && precoFinal < precoMinimoVenda) return;
    onConfirm(qtdNum, precoLivre ? precoFinal : undefined, selectedUnit);
  };

  return (
    // Overlay
    <div className="fixed inset-0 z-[60]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Sheet */}
      <div
      className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>

        <div className="px-5 pb-2 pt-1">
          {/* Produto info */}
          <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 line-clamp-2 mb-0.5">{produto.nome}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2">
            R$ {fmtR(unitPrice)} / {selectedUnit?.unidade || produto.unidade_principal || 'UN'}
          </p>
          {unitOptions.length > 1 && (
            <div className="mb-4">
              <Select value={selectedUnitCode} onValueChange={setSelectedUnitCode}>
                <SelectTrigger className="h-10 bg-gray-50 dark:bg-gray-800 border-0 rounded-xl">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((opt) => (
                    <SelectItem key={opt.unidade} value={opt.unidade}>
                      {opt.unidade} · R$ {fmtR(opt.valor_unitario)} · fator {opt.fator_conversao || 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Input de quantidade com teclado nativo numérico */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setQtd(prev => {
                const n = Math.max(0, (parseFloat(prev.replace(',', '.')) || 0) - 1);
                return String(n % 1 === 0 ? n : n.toFixed(2));
              })}
              className="w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center active:bg-gray-200 dark:active:bg-gray-700 flex-shrink-0"
            >
              <Minus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>

            <Input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              value={qtd}
              onChange={e => setQtd(e.target.value)}
              onFocus={e => e.target.select()}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
              className="flex-1 text-center text-2xl font-bold h-12 bg-gray-50 dark:bg-gray-800 border-0 shadow-none focus-visible:ring-0 text-gray-900 dark:text-white rounded-2xl"
              placeholder="0"
            />

            <button
              onClick={() => setQtd(prev => {
                const n = (parseFloat(prev.replace(',', '.')) || 0) + 1;
                return String(n % 1 === 0 ? n : n.toFixed(2));
              })}
              className="w-11 h-11 rounded-full bg-gray-900 dark:bg-gray-100 flex items-center justify-center active:opacity-70 flex-shrink-0"
            >
              <Plus className="w-4 h-4 text-white dark:text-gray-900" />
            </button>
          </div>

          {/* Campo de preço livre */}
          {precoLivre && (
            <div className="mb-4">
              <p className="text-[10px] text-amber-500 font-medium uppercase tracking-wide mb-1.5">Preço livre</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
                <input autoComplete="off"
                  ref={precoRef}
                  type="number" step="0.01" inputMode="decimal"
                  value={precoEditado}
                  onChange={e => setPrecoEditado(e.target.value)}
                  onFocus={e => e.target.select()}
                  className="w-full pl-9 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl text-sm text-right border border-amber-200 dark:border-amber-800 focus:ring-1 focus:ring-amber-300 dark:focus:ring-amber-600 text-amber-900 dark:text-amber-100 font-semibold"
                />
              </div>
              {precoLivre && parseFloat(precoEditado) < precoMinimoVenda && precoMinimoVenda > 0 && (
                <p className="text-[11px] text-red-500 mt-1">Mínimo: R$ {fmtR(precoMinimoVenda)} (preço da tabela)</p>
              )}
            </div>
          )}

          {/* Total */}
          {qtdNum > 0 && (
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-xs text-gray-400 dark:text-gray-500">Total</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">R$ {fmtR(total)}</span>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-2 pb-safe" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            {qtdAtual > 0 && (
              <button
                onClick={() => onConfirm(0)}
                className="w-11 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0 active:bg-red-100"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium active:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={qtdNum <= 0}
              className="flex-1 h-12 rounded-2xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold flex items-center justify-center gap-2 active:opacity-80 disabled:opacity-40"
            >
              <Check className="w-4 h-4" />
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Linha de produto na busca ─────────────────────────────────────────────────
function ProdutoLinha({ produto, preco, unidadeSelecionada, unitOptions, qtdNoCarrinho, onSelect }) {
  const e = produto.estoque_atual || 0;
  const m = produto.estoque_minimo || 0;
  const dotCls = !produto.ativo ? 'bg-gray-300'
    : e <= 0 ? 'bg-red-500'
    : e <= m ? 'bg-orange-400'
    : 'bg-green-500';

  const apresent = formatEstoqueApresentacao(produto);

  return (
    <div
      onClick={() => onSelect(produto, preco)}
      className="flex items-center gap-3 mx-3 my-1.5 px-4 py-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl active:bg-gray-100 dark:active:bg-gray-700/60 cursor-pointer shadow-sm"
    >
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotCls}`} />

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-gray-800 dark:text-gray-100 leading-snug line-clamp-2">{produto.nome}</p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
          R$ {fmtR(preco)} · {e.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {produto.unidade_principal || 'UN'} em estoque
          {apresent ? ` · ~${apresent.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${apresent.sigla}` : ''}
          {unitOptions?.length > 1 ? ` · ${unitOptions.length} unidades` : ''}
        </p>
      </div>

      {qtdNoCarrinho > 0 ? (
        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-white">{qtdNoCarrinho}</span>
        </div>
      ) : (
        <div className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
          <Plus className="w-3 h-3 text-gray-400" />
        </div>
      )}
    </div>
  );
}

// ── Tela de busca de produtos ─────────────────────────────────────────────────
function TelaBusca({ produtos, calcularPreco, itens, onSetQtd, onVerCarrinho }) {
  const [search, setSearch] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const searchRef = useRef(null);

  const filtrados = useMemo(() => {
    if (!search.trim()) return [];
    const t = search.toLowerCase();
    return produtos
      .filter(p =>
        p.nome?.toLowerCase().includes(t) ||
        p.codigo_interno?.toLowerCase().includes(t) ||
        p.codigo_barras?.toLowerCase().includes(t)
      )
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .slice(0, 60);
  }, [produtos, search]);

  const totalItens = itens.reduce((s, i) => s + i.qtd, 0);
  const totalValor = itens.reduce((s, i) => s + i.preco_unit * i.qtd, 0);
  const getUnitContext = useCallback((produto) => {
    const precoBase = calcularPreco(produto);
    const mult = precoBase > 0 && (produto.preco_venda_padrao || 0) > 0
      ? precoBase / (produto.preco_venda_padrao || 1)
      : 1;
    const unitOptions = buildSaleUnitOptions(produto, mult);
    const unidadeDefault = pickDefaultSaleUnit(produto, mult) || unitOptions[0] || null;
    const precoSelecionado = unidadeDefault?.valor_unitario ?? precoBase;
    return { unitOptions, unidadeDefault, precoSelecionado };
  }, [calcularPreco]);

  const handleSelect = (produto) => {
    const { unitOptions, unidadeDefault, precoSelecionado } = getUnitContext(produto);
    setProdutoSelecionado({ produto, preco: precoSelecionado, unidadeSelecionada: unidadeDefault, unitOptions });
  };

  const handleConfirmQtd = (qtd, novoPreco, unidadeEscolhida) => {
    const { produto, preco, unidadeSelecionada } = produtoSelecionado;
    const unidadeFinal = unidadeEscolhida || unidadeSelecionada;
    onSetQtd(produto, novoPreco ?? preco, qtd, unidadeFinal);
    setProdutoSelecionado(null);
    // Manter o search para continuar adicionando itens
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Barra de busca */}
      <div className="px-4 pt-3 pb-3 bg-white dark:bg-gray-900 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <Input
            ref={searchRef}
            placeholder="Buscar produto, código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border-none bg-gray-100 dark:bg-gray-800 h-12 text-base pl-11 rounded-2xl shadow-none focus-visible:ring-0 w-full"
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Resultados */}
      <div className="flex-1 overflow-y-auto">
        {search.trim() === '' ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600 gap-2">
            <Search className="w-10 h-10 opacity-30" />
            <p className="text-sm">Digite para buscar produtos</p>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600 gap-2">
            <p className="text-sm">Nenhum produto encontrado</p>
            <p className="text-xs text-gray-300 dark:text-gray-700">para "{search}"</p>
          </div>
        ) : (
          filtrados.map(p => {
            const { unitOptions, unidadeDefault, precoSelecionado } = getUnitContext(p);
            const item = itens.find(i => i.id === p.id);
            return (
              <ProdutoLinha
                key={p.id}
                produto={p}
                preco={precoSelecionado}
                unidadeSelecionada={unidadeDefault}
                unitOptions={unitOptions}
                qtdNoCarrinho={item?.qtd || 0}
                onSelect={handleSelect}
              />
            );
          })
        )}
        {/* Espaço para FAB carrinho */}
        <div className="h-24" />
      </div>

      {/* FAB carrinho flutuante */}
      {totalItens > 0 && (
        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={onVerCarrinho}
            className="w-full flex items-center justify-between bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-5 py-4 rounded-2xl shadow-xl active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                  {totalItens}
                </span>
              </div>
              <span className="text-sm font-semibold">{totalItens} {totalItens === 1 ? 'item' : 'itens'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tabular-nums">R$ {fmtR(totalValor)}</span>
              <ShoppingCart className="w-4 h-4 opacity-60" />
            </div>
          </button>
        </div>
      )}

      {/* Bottom-sheet de quantidade */}
      {produtoSelecionado && (
        <QuantidadeSheet
          produto={produtoSelecionado.produto}
          preco={produtoSelecionado.preco}
          qtdAtual={itens.find(i => i.id === produtoSelecionado.produto.id)?.qtd || 0}
          onConfirm={handleConfirmQtd}
          unidadeSelecionada={produtoSelecionado.unidadeSelecionada}
          unitOptions={produtoSelecionado.unitOptions}
          onClose={() => setProdutoSelecionado(null)}
        />
      )}
    </div>
  );
}

// ── Item no carrinho ──────────────────────────────────────────────────────────
function ItemCarrinho({ item, onSelect, onRemove, onUpdatePreco }) {
  return (
    <div className="mx-3 my-1.5 px-4 py-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl shadow-sm">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelect(item)}>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-gray-800 dark:text-gray-100 leading-snug line-clamp-2">{item.nome}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
            {item.qtd} {item.unidade} × R$ {fmtR(item.preco_unit)}
          </p>
        </div>
        <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums flex-shrink-0">
          R$ {fmtR(item.preco_unit * item.qtd)}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onRemove(item.id); }}
          className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors" />
        </button>
      </div>
      {item.preco_livre && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] text-amber-500 font-medium uppercase tracking-wide whitespace-nowrap">Preço livre</span>
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-amber-600 dark:text-amber-400">R$</span>
            <input autoComplete="off"
              type="number" step="0.01" inputMode="decimal"
              value={item.preco_unit.toFixed(2)}
              onChange={e => onUpdatePreco(item.id, parseFloat(e.target.value) || 0)}
              onClick={e => e.stopPropagation()}
              className="w-full pl-8 h-9 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-sm text-right border border-amber-200 dark:border-amber-800 focus:ring-1 focus:ring-amber-300 dark:focus:ring-amber-600 text-amber-900 dark:text-amber-100 font-semibold"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tela do carrinho ──────────────────────────────────────────────────────────
function TelaCarrinho({ itens, calcularPreco, produtos, onSetQtd, onRemove, onGerar, onSimularCartao, formatoCupom, setFormatoCupom, clienteNome, setClienteNome, onVendaPerdida, desconto, setDesconto, tipoDesconto, setTipoDesconto, observacoes, setObservacoes, onUpdatePreco }) {
  const [editandoItem, setEditandoItem] = useState(null);
  const subtotal = useMemo(() => itens.reduce((s, i) => s + i.preco_unit * i.qtd, 0), [itens]);
  const valorDesconto = useMemo(() => {
    if (!desconto || desconto <= 0) return 0;
    if (tipoDesconto === 'percentual') return subtotal * (desconto / 100);
    return desconto;
  }, [desconto, tipoDesconto, subtotal]);
  const total = subtotal - valorDesconto;

  const handleSelectItem = (item) => {
    const produto = produtos.find(p => p.id === item.id);
    if (!produto) return;
    const precoBase = calcularPreco(produto);
    const mult = precoBase > 0 && (produto.preco_venda_padrao || 0) > 0
      ? precoBase / (produto.preco_venda_padrao || 1)
      : 1;
    const unitOptions = buildSaleUnitOptions(produto, mult);
    const unidadeSelecionada = unitOptions.find((opt) => opt.unidade === item.unidade) || pickDefaultSaleUnit(produto, mult);
    setEditandoItem({ produto, preco: item.preco_unit, unitOptions, unidadeSelecionada });
  };

  const handleConfirmQtd = (qtd, novoPreco, unidadeEscolhida) => {
    onSetQtd(editandoItem.produto, novoPreco ?? editandoItem.preco, qtd, unidadeEscolhida || editandoItem.unidadeSelecionada);
    setEditandoItem(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Campo cliente */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Nome do cliente (opcional)"
            value={clienteNome}
            onChange={e => setClienteNome(e.target.value)}
            className="border-none bg-gray-100 dark:bg-gray-800 h-11 text-sm pl-10 rounded-2xl shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      {/* Lista de itens */}
      <div className="flex-1 overflow-y-auto">
        {itens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600 gap-2">
            <ShoppingCart className="w-10 h-10 opacity-30" />
            <p className="text-sm">Carrinho vazio</p>
          </div>
        ) : (
          itens.map(item => (
            <ItemCarrinho
              key={item.id}
              item={item}
              onSelect={handleSelectItem}
              onRemove={onRemove}
              onUpdatePreco={onUpdatePreco}
            />
          ))
        )}
      </div>

      {/* Rodapé */}
      {itens.length > 0 && (
        <div className="flex-shrink-0 px-4 pb-6 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
          {/* Venda Perdida */}
          <button
            onClick={onVendaPerdida}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10 rounded-2xl transition-colors"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Registrar Venda Perdida
          </button>

          {/* Desconto */}
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Desconto</span>
            </div>
            <div className="flex gap-1.5 items-center">
              <div className="relative flex-1">
                <Input type="number" min="0" step="0.01"
                  value={desconto} onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
                  className="pr-5 h-8 bg-white dark:bg-gray-900 border-0 shadow-sm rounded-lg text-xs text-right focus:ring-1 focus:ring-gray-200 dark:focus:ring-gray-700"
                  placeholder="0" />
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">{tipoDesconto === 'percentual' ? '%' : 'R$'}</span>
              </div>
              <button onClick={() => setTipoDesconto(tipoDesconto === 'percentual' ? 'fixo' : 'percentual')}
                className="h-8 px-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                {tipoDesconto === 'percentual' ? '%' : 'R$'}
              </button>
            </div>
          </div>

          {/* Observações */}
          <div className="relative">
            <Input
              placeholder="Observações (opcional)"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="border-0 bg-gray-100 dark:bg-gray-800 h-10 text-sm rounded-2xl shadow-none focus-visible:ring-0"
            />
          </div>

          {/* Total */}
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">{itens.length} {itens.length === 1 ? 'item' : 'itens'}</span>
            <div className="flex flex-col items-end gap-1">
              {valorDesconto > 0 && <span className="text-xs text-gray-400 line-through">R$ {fmtR(subtotal)}</span>}
              <span className="text-2xl font-bold text-gray-900 dark:text-white font-glacial tabular-nums">R$ {fmtR(total)}</span>
            </div>
          </div>

          {/* Formato de impressão */}
          <div className="flex gap-2">
            {['80mm', 'a4'].map(fmt => (
              <button
                key={fmt}
                onClick={() => setFormatoCupom(fmt)}
                className={`flex-1 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  formatoCupom === fmt
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                {fmt === '80mm' ? '🧾 Cupom 80mm' : '📄 Folha A4'}
              </button>
            ))}
          </div>

          {/* Botão simulador de taxa */}
          <button
            onClick={onSimularCartao}
            className="w-full flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 py-3 rounded-2xl text-xs font-medium active:scale-[0.98] transition-all"
          >
            <CreditCard className="w-4 h-4" />
            Simular taxa no cartão
          </button>

          {/* Botão gerar */}
          <button
            onClick={onGerar}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 py-4 rounded-2xl text-sm font-bold shadow-lg active:scale-[0.98] transition-all"
          >
            <Printer className="w-5 h-5" />
            Gerar Orçamento
          </button>
        </div>
      )}

      {/* Bottom-sheet de edição de quantidade */}
      {editandoItem && (
        <QuantidadeSheet
          produto={editandoItem.produto}
          preco={editandoItem.preco}
          qtdAtual={itens.find(i => i.id === editandoItem.produto.id)?.qtd || 0}
          onConfirm={handleConfirmQtd}
          unidadeSelecionada={editandoItem.unidadeSelecionada}
          unitOptions={editandoItem.unitOptions}
          onClose={() => setEditandoItem(null)}
        />
      )}
    
    </div>
  );
}

// ── Sheet principal ───────────────────────────────────────────────────────────
export default function OrcamentoSheet({ isOpen, onClose, produtos, tabelaSelecionada, calcularPreco, nomeTabela, empresa }) {
  const [itens, setItens] = useState([]);
  const [tela, setTela] = useState('busca'); // 'busca' | 'carrinho'
  const [showCupom, setShowCupom] = useState(false);
  const [formatoCupom, setFormatoCupom] = useState('80mm');
  const [clienteNome, setClienteNome] = useState('');
  const [showLostSales, setShowLostSales] = useState(false);
  const [showSimuladorCartao, setShowSimuladorCartao] = useState(false);
  const [desconto, setDesconto] = useState(0);
  const [tipoDesconto, setTipoDesconto] = useState('percentual');
  const [observacoes, setObservacoes] = useState('');

  const subtotal = useMemo(() => itens.reduce((s, i) => s + i.preco_unit * i.qtd, 0), [itens]);
  const valorDesconto = useMemo(() => {
    if (!desconto || desconto <= 0) return 0;
    if (tipoDesconto === 'percentual') return subtotal * (desconto / 100);
    return desconto;
  }, [desconto, tipoDesconto, subtotal]);
  const total = subtotal - valorDesconto;

  // Adiciona, atualiza ou remove (qtd=0) um item
  const handleSetQtd = useCallback((produto, preco, qtd, unidadeSelecionada = null) => {
    setItens(prev => {
      if (qtd <= 0) return prev.filter(i => i.id !== produto.id);
      const existe = prev.find(i => i.id === produto.id);
      const unidade = unidadeSelecionada?.unidade || produto.unidade_principal || 'UN';
      const fator = unidadeSelecionada?.fator_conversao ?? 1;
      if (existe) {
        return prev.map(i =>
          i.id === produto.id
            ? { ...i, qtd, preco_unit: preco ?? i.preco_unit, unidade, fator_conversao: fator, quantidade_base: qtd * fator, preco_referencia_tabela: i.preco_referencia_tabela ?? preco }
            : i
        );
      }
      return [...prev, {
        id: produto.id,
        nome: produto.nome,
        preco_unit: preco,
        qtd,
        unidade,
        fator_conversao: fator,
        quantidade_base: qtd * fator,
        preco_livre: produto.preco_livre || false,
        preco_referencia_tabela: preco,
      }];
    });
  }, []);

  const handleUpdatePreco = useCallback((id, novoPreco) => {
    setItens(prev => prev.map(i => {
      if (i.id !== id) return i;
      const piso = i.preco_referencia_tabela ?? calcularPreco(produtos.find((p) => p.id === id) || {});
      const preco = Math.max(Number(novoPreco) || 0, piso || 0);
      return { ...i, preco_unit: preco };
    }));
  }, [calcularPreco, produtos]);

  const handleRemove = useCallback((id) => setItens(prev => prev.filter(i => i.id !== id)), []);


  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setItens([]);
      setTela('busca');
      setShowCupom(false);
      setClienteNome('');
    }, 300);
  };

  if (!isOpen) return null;

  if (showCupom) {
    return (
      <OrcamentoCupom
        itens={itens}
        total={total}
        desconto={valorDesconto}
        subtotal={subtotal}
        observacoes={observacoes}
        formato={formatoCupom}
        nomeTabela={nomeTabela}
        clienteNome={clienteNome}
        empresa={empresa}
        onVoltar={() => setShowCupom(false)}
        onClose={handleClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <button
          onClick={tela === 'carrinho' ? () => setTela('busca') : handleClose}
          className="p-2 -ml-1 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white font-glacial">
            {tela === 'carrinho' ? 'Revisar Orçamento' : 'Novo Orçamento'}
          </h2>
          {nomeTabela && <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{nomeTabela}</p>}
        </div>

        {/* Botão carrinho no header quando na tela de busca */}
        {tela === 'busca' && itens.length > 0 && (
          <button
            onClick={() => setTela('carrinho')}
            className="relative p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ShoppingCart className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-green-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
              {itens.reduce((s, i) => s + i.qtd, 0)}
            </span>
          </button>
        )}

        {tela === 'busca' && (
          <button onClick={handleClose} className="p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* LostSalesForm */}
      <LostSalesForm
        open={showLostSales}
        onClose={() => setShowLostSales(false)}
        currentUser={null}
      />

      {/* Corpo */}
      <div className="flex-1 overflow-hidden">
        {tela === 'busca' ? (
          <TelaBusca
            produtos={produtos}
            calcularPreco={calcularPreco}
            itens={itens}
            onSetQtd={handleSetQtd}
            onVerCarrinho={() => setTela('carrinho')}
          />
        ) : (
           <>
             <TelaCarrinho
               itens={itens}
               calcularPreco={calcularPreco}
               produtos={produtos}
               onSetQtd={handleSetQtd}
               onRemove={handleRemove}
               onUpdatePreco={handleUpdatePreco}
               onGerar={() => setShowCupom(true)}
               onSimularCartao={() => setShowSimuladorCartao(true)}
               formatoCupom={formatoCupom}
               setFormatoCupom={setFormatoCupom}
               clienteNome={clienteNome}
               setClienteNome={setClienteNome}
               onVendaPerdida={() => setShowLostSales(true)}
               desconto={desconto}
               setDesconto={setDesconto}
               tipoDesconto={tipoDesconto}
               setTipoDesconto={setTipoDesconto}
               observacoes={observacoes}
               setObservacoes={setObservacoes}
             />
             <SimuladorCartaoSheet
               open={showSimuladorCartao}
               onClose={() => setShowSimuladorCartao(false)}
               valorTotal={total}
               valorDesconto={valorDesconto}
             />
           </>
         )}
      </div>
    </div>
  );
}