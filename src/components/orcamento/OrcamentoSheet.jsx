import React, { useState, useMemo, useCallback } from 'react';
import { Search, Package, X, Plus, Minus, Trash2, ShoppingCart, Printer, ChevronRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTreeGrid, flattenTree, buildExpandedForLevel } from '@/components/produtos/treegrid/useTreeGrid';
import OrcamentoCupom from './OrcamentoCupom';
import LostSalesForm from '@/components/vendas/LostSalesForm';

const fmtR = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Card de produto estilo PDV (botão grande) ────────────────────────────────
function ProdutoCard({ produto, preco, onAdd }) {
  const estoque = produto.estoque_atual || 0;
  const minimo = produto.estoque_minimo || 0;
  const dotCls = !produto.ativo ? 'bg-gray-300'
    : estoque <= 0 ? 'bg-red-500'
    : estoque <= minimo ? 'bg-orange-400'
    : 'bg-green-500';

  return (
    <button
      onClick={() => onAdd(produto, preco)}
      className="w-full flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-gray-900 active:bg-gray-50 dark:active:bg-gray-800 transition-colors text-left"
    >
      {/* Thumbnail */}
      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
        {produto.imagem_url
          ? <img src={produto.imagem_url} alt="" className="w-full h-full object-cover" />
          : <Package className="w-5 h-5 text-gray-300 dark:text-gray-600" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-snug line-clamp-2">{produto.nome}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotCls}`} />
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {(produto.estoque_atual || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {produto.unidade_principal || 'UN'}
          </span>
        </div>
      </div>

      {/* Preço + botão add */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
        <span className="text-base font-bold text-gray-900 dark:text-white tabular-nums">R$ {fmtR(preco)}</span>
        <div className="w-7 h-7 rounded-full bg-gray-900 dark:bg-gray-100 flex items-center justify-center">
          <Plus className="w-3.5 h-3.5 text-white dark:text-gray-900" />
        </div>
      </div>
    </button>
  );
}

// ── Cabeçalho de grupo ───────────────────────────────────────────────────────
function GrupoHeader({ row, isExpanded, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 text-left"
    >
      <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex-1">{row.label}</span>
      <span className="text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">{row.count}</span>
    </button>
  );
}

// ── Tela de seleção de produtos (estilo PDV) ─────────────────────────────────
function TelaProdutos({ produtos, calcularPreco, itens, onAdd, onVerCarrinho }) {
  const [search, setSearch] = useState('');
  const [expandedKeys, setExpandedKeys] = useState(new Set());

  const filtrados = useMemo(() => {
    if (!search) return produtos;
    const t = search.toLowerCase();
    return produtos.filter(p =>
      p.nome?.toLowerCase().includes(t) ||
      p.codigo_interno?.toLowerCase().includes(t) ||
      p.codigo_barras?.toLowerCase().includes(t)
    );
  }, [produtos, search]);

  const tree = useTreeGrid(filtrados);

  const rows = useMemo(() => {
    const keys = search
      ? buildExpandedForLevel(tree, 99)
      : (expandedKeys.size ? expandedKeys : buildExpandedForLevel(tree, 1));
    return flattenTree(tree, keys).filter(r => !(r.type === 'group' && r.count === 0));
  }, [tree, search, expandedKeys]);

  const handleToggle = useCallback((key) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const totalItens = itens.reduce((s, i) => s + i.qtd, 0);
  const total = itens.reduce((s, i) => s + i.preco_unit * i.qtd, 0);

  return (
    <div className="flex flex-col h-full relative">
      {/* Busca grande e proeminente */}
      <div className="px-4 pt-4 pb-3 bg-white dark:bg-gray-900 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <Input
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

      {/* Lista de produtos */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Package className="w-10 h-10 mb-3 text-gray-200 dark:text-gray-700" />
            <p className="text-sm">Nenhum produto encontrado</p>
          </div>
        ) : rows.map(row => {
          if (row.type === 'group') {
            return (
              <GrupoHeader
                key={row.key}
                row={row}
                isExpanded={expandedKeys.has(row.key) || !!search}
                onToggle={() => handleToggle(row.key)}
              />
            );
          }
          const p = row.produto;
          const preco = calcularPreco(p);
          const qtdNoCarrinho = itens.find(i => i.id === p.id)?.qtd || 0;
          return (
            <div key={row.key} className="relative">
              <ProdutoCard produto={p} preco={preco} onAdd={onAdd} />
              {qtdNoCarrinho > 0 && (
                <div className="absolute right-14 top-1/2 -translate-y-1/2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white">{qtdNoCarrinho}</span>
                </div>
              )}
            </div>
          );
        })}
        {/* Espaço para o botão flutuante do carrinho */}
        <div className="h-24" />
      </div>

      {/* Botão flutuante do carrinho */}
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
              <span className="text-base font-bold tabular-nums">R$ {fmtR(total)}</span>
              <ChevronRight className="w-4 h-4 opacity-60" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Item do carrinho ─────────────────────────────────────────────────────────
function ItemCarrinho({ item, onQtd, onRemove }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-snug line-clamp-2">{item.nome}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">R$ {fmtR(item.preco_unit)} / {item.unidade}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onQtd(item.id, item.qtd - 1)}
          className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center active:bg-gray-200"
        >
          <Minus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
        </button>
        <span className="w-8 text-center text-sm font-bold text-gray-900 dark:text-white tabular-nums">{item.qtd}</span>
        <button
          onClick={() => onQtd(item.id, item.qtd + 1)}
          className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center active:bg-gray-200"
        >
          <Plus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums w-20 text-right">
          R$ {fmtR(item.preco_unit * item.qtd)}
        </span>
        <button onClick={() => onRemove(item.id)} className="p-1">
          <Trash2 className="w-4 h-4 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors" />
        </button>
      </div>
    </div>
  );
}

// ── Tela do carrinho ─────────────────────────────────────────────────────────
function TelaCarrinho({ itens, onQtd, onRemove, onVoltar, onGerar, formatoCupom, setFormatoCupom, clienteNome, setClienteNome }) {
  const total = useMemo(() => itens.reduce((s, i) => s + i.preco_unit * i.qtd, 0), [itens]);

  return (
    <div className="flex flex-col h-full">
      {/* Topo */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
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
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
            <ShoppingCart className="w-12 h-12 mb-3 text-gray-200 dark:text-gray-700" />
            <p className="text-sm font-medium">Carrinho vazio</p>
            <button onClick={onVoltar} className="mt-3 text-xs text-gray-500 underline underline-offset-2">
              Adicionar produtos
            </button>
          </div>
        ) : (
          <>
            {itens.map(item => (
              <ItemCarrinho key={item.id} item={item} onQtd={onQtd} onRemove={onRemove} />
            ))}
            <div className="h-4" />
          </>
        )}
      </div>

      {/* Rodapé com total e ações */}
      {itens.length > 0 && (
        <div className="flex-shrink-0 px-4 pb-6 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
          {/* Venda Perdida */}
          <button
            onClick={onVendaPerdida}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10 rounded-xl transition-colors"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Registrar Venda Perdida
          </button>
          {/* Total */}
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Total do orçamento</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white font-glacial tabular-nums">R$ {fmtR(total)}</span>
          </div>
          {/* Formato */}
          <div className="flex gap-2">
            {['80mm', 'a4'].map(fmt => (
              <button
                key={fmt}
                onClick={() => setFormatoCupom(fmt)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
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
            className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 h-13 py-4 rounded-2xl text-sm font-bold shadow-lg active:scale-[0.98] transition-all"
          >
            <Printer className="w-5 h-5" />
            Gerar Orçamento
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sheet principal ──────────────────────────────────────────────────────────
export default function OrcamentoSheet({ isOpen, onClose, produtos, tabelaSelecionada, calcularPreco, nomeTabela, empresa }) {
  const [itens, setItens] = useState([]);
  const [tela, setTela] = useState('produtos'); // 'produtos' | 'carrinho'
  const [showCupom, setShowCupom] = useState(false);
  const [formatoCupom, setFormatoCupom] = useState('80mm');
  const [clienteNome, setClienteNome] = useState('');
  const [showLostSales, setShowLostSales] = useState(false);

  const total = useMemo(() => itens.reduce((s, i) => s + i.preco_unit * i.qtd, 0), [itens]);

  const handleAdd = useCallback((produto, preco) => {
    setItens(prev => {
      const existe = prev.find(i => i.id === produto.id);
      if (existe) return prev.map(i => i.id === produto.id ? { ...i, qtd: i.qtd + 1 } : i);
      return [...prev, { id: produto.id, nome: produto.nome, preco_unit: preco, qtd: 1, unidade: produto.unidade_principal || 'UN' }];
    });
  }, []);

  const handleQtd = useCallback((id, qtd) => {
    if (qtd <= 0) setItens(prev => prev.filter(i => i.id !== id));
    else setItens(prev => prev.map(i => i.id === id ? { ...i, qtd } : i));
  }, []);

  const handleRemove = useCallback((id) => setItens(prev => prev.filter(i => i.id !== id)), []);

  const handleClose = () => {
    onClose();
    // Reset ao fechar
    setTimeout(() => {
      setItens([]);
      setTela('produtos');
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
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900">
        <button
          onClick={tela === 'carrinho' ? () => setTela('produtos') : handleClose}
          className="p-2 -ml-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white font-glacial">
            {tela === 'carrinho' ? 'Revisar Orçamento' : 'Novo Orçamento'}
          </h2>
          {nomeTabela && <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{nomeTabela}</p>}
        </div>
        {tela === 'produtos' && itens.length > 0 && (
          <button
            onClick={() => setTela('carrinho')}
            className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ShoppingCart className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-green-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
              {itens.reduce((s, i) => s + i.qtd, 0)}
            </span>
          </button>
        )}
        {tela === 'produtos' && (
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Corpo */}
      <div className="flex-1 overflow-hidden">
        {tela === 'produtos' ? (
          <TelaProdutos
            produtos={produtos}
            calcularPreco={calcularPreco}
            itens={itens}
            onAdd={handleAdd}
            onVerCarrinho={() => setTela('carrinho')}
          />
        ) : (
          <TelaCarrinho
            itens={itens}
            onQtd={handleQtd}
            onRemove={handleRemove}
            onVoltar={() => setTela('produtos')}
            onGerar={() => setShowCupom(true)}
            formatoCupom={formatoCupom}
            setFormatoCupom={setFormatoCupom}
            clienteNome={clienteNome}
            setClienteNome={setClienteNome}
          />
        )}
      </div>
    </div>
  );
}