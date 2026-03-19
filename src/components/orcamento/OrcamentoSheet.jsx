import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Search, X, ShoppingCart, Printer, ArrowLeft, AlertCircle, Trash2, Plus, Minus, Check, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import OrcamentoCupom from './OrcamentoCupom';
import LostSalesForm from '@/components/vendas/LostSalesForm';

const fmtR = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Bottom-sheet de quantidade ao selecionar produto ──────────────────────────
function QuantidadeSheet({ produto, preco, qtdAtual, onConfirm, onClose }) {
  const [qtd, setQtd] = useState(qtdAtual > 0 ? String(qtdAtual) : '1');
  const inputRef = useRef(null);

  useEffect(() => {
    // Pequeno delay para garantir que o bottom-sheet está visível antes do focus
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 120);
    return () => clearTimeout(t);
  }, []);

  const qtdNum = parseFloat(qtd.replace(',', '.')) || 0;
  const total = qtdNum * preco;

  const handleConfirm = () => {
    if (qtdNum > 0) onConfirm(qtdNum);
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
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-4">
            R$ {fmtR(preco)} / {produto.unidade_principal || 'UN'}
          </p>

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
function ProdutoLinha({ produto, preco, qtdNoCarrinho, onSelect }) {
  const e = produto.estoque_atual || 0;
  const m = produto.estoque_minimo || 0;
  const dotCls = !produto.ativo ? 'bg-gray-300'
    : e <= 0 ? 'bg-red-500'
    : e <= m ? 'bg-orange-400'
    : 'bg-green-500';

  return (
    <div
      onClick={() => onSelect(produto, preco)}
      className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 active:bg-gray-50 dark:active:bg-gray-800/40 cursor-pointer"
    >
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotCls}`} />

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-gray-800 dark:text-gray-100 leading-snug line-clamp-2">{produto.nome}</p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
          R$ {fmtR(preco)} · {e.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {produto.unidade_principal || 'UN'} em estoque
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

  const handleSelect = (produto, preco) => {
    setProdutoSelecionado({ produto, preco });
  };

  const handleConfirmQtd = (qtd) => {
    const { produto, preco } = produtoSelecionado;
    onSetQtd(produto, preco, qtd);
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
            const preco = calcularPreco(p);
            const item = itens.find(i => i.id === p.id);
            return (
              <ProdutoLinha
                key={p.id}
                produto={p}
                preco={preco}
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
          onClose={() => setProdutoSelecionado(null)}
        />
      )}
    </div>
  );
}

// ── Item no carrinho ──────────────────────────────────────────────────────────
function ItemCarrinho({ item, onSelect, onRemove }) {
  return (
    <div
      className="flex items-center gap-3 mx-3 my-1.5 px-4 py-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl active:bg-gray-100 dark:active:bg-gray-700/60 cursor-pointer shadow-sm"
      onClick={() => onSelect(item)}
    >
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
  );
}

// ── Tela do carrinho ──────────────────────────────────────────────────────────
function TelaCarrinho({ itens, calcularPreco, produtos, onSetQtd, onRemove, onGerar, formatoCupom, setFormatoCupom, clienteNome, setClienteNome, onVendaPerdida }) {
  const [editandoItem, setEditandoItem] = useState(null);
  const total = useMemo(() => itens.reduce((s, i) => s + i.preco_unit * i.qtd, 0), [itens]);

  const handleSelectItem = (item) => {
    const produto = produtos.find(p => p.id === item.id);
    if (produto) setEditandoItem({ produto, preco: item.preco_unit });
  };

  const handleConfirmQtd = (qtd) => {
    onSetQtd(editandoItem.produto, editandoItem.preco, qtd);
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

          {/* Total */}
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">{itens.length} {itens.length === 1 ? 'item' : 'itens'}</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white font-glacial tabular-nums">R$ {fmtR(total)}</span>
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

  const total = useMemo(() => itens.reduce((s, i) => s + i.preco_unit * i.qtd, 0), [itens]);

  // Adiciona, atualiza ou remove (qtd=0) um item
  const handleSetQtd = useCallback((produto, preco, qtd) => {
    setItens(prev => {
      if (qtd <= 0) return prev.filter(i => i.id !== produto.id);
      const existe = prev.find(i => i.id === produto.id);
      if (existe) return prev.map(i => i.id === produto.id ? { ...i, qtd } : i);
      return [...prev, { id: produto.id, nome: produto.nome, preco_unit: preco, qtd, unidade: produto.unidade_principal || 'UN' }];
    });
  }, []);

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
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">
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
          <TelaCarrinho
            itens={itens}
            calcularPreco={calcularPreco}
            produtos={produtos}
            onSetQtd={handleSetQtd}
            onRemove={handleRemove}
            onGerar={() => setShowCupom(true)}
            formatoCupom={formatoCupom}
            setFormatoCupom={setFormatoCupom}
            clienteNome={clienteNome}
            setClienteNome={setClienteNome}
            onVendaPerdida={() => setShowLostSales(true)}
          />
        )}
      </div>
    </div>
  );
}