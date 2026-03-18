import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Search, Package, X, Plus, Minus, Trash2, FileText, Printer, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTreeGrid, flattenTree, buildExpandedForLevel } from '@/components/produtos/treegrid/useTreeGrid';
import OrcamentoCupom from './OrcamentoCupom';

const fmtR = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Seletor de produtos ─────────────────────────────────────────────────────
function SeletorProdutos({ produtos, tabelaSelecionada, calcularPreco, onAdd }) {
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
    const keys = search ? buildExpandedForLevel(tree, 99) : (expandedKeys.size ? expandedKeys : buildExpandedForLevel(tree, 1));
    return flattenTree(tree, keys).filter(r => !(r.type === 'group' && r.count === 0));
  }, [tree, search, expandedKeys]);

  const handleToggle = useCallback((key) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <Input
          placeholder="Buscar produto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border-none bg-gray-100 dark:bg-gray-800 h-10 text-sm pl-9 rounded-xl shadow-none focus-visible:ring-0"
          autoFocus
        />
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
        {rows.map(row => {
          if (row.type === 'group') {
            return (
              <button
                key={row.key}
                onClick={() => handleToggle(row.key)}
                className="w-full flex items-center gap-2 py-2 px-3 text-left bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-700/40"
              >
                <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedKeys.has(row.key) || search ? 'rotate-90' : ''}`} />
                <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide flex-1">{row.label}</span>
                <span className="text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">{row.count}</span>
              </button>
            );
          }
          const p = row.produto;
          const preco = calcularPreco(p);
          return (
            <button
              key={row.key}
              onClick={() => onAdd(p, preco)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 active:bg-gray-100 text-left"
            >
              <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                {p.imagem_url
                  ? <img src={p.imagem_url} alt="" className="w-full h-full object-cover" />
                  : <Package className="w-4 h-4 text-gray-300 dark:text-gray-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-100 leading-snug truncate">{p.nome}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">{p.unidade_principal || 'UN'}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">R$ {fmtR(preco)}</p>
                <Plus className="w-3.5 h-3.5 text-gray-400 ml-auto mt-0.5" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Item do carrinho ────────────────────────────────────────────────────────
function ItemOrcamento({ item, onQtd, onRemove }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-800 dark:text-gray-100 leading-snug">{item.nome}</p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500">R$ {fmtR(item.preco_unit)} / {item.unidade}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button onClick={() => onQtd(item.id, item.qtd - 1)} className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <Minus className="w-3 h-3 text-gray-600 dark:text-gray-300" />
        </button>
        <span className="w-7 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 tabular-nums">{item.qtd}</span>
        <button onClick={() => onQtd(item.id, item.qtd + 1)} className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <Plus className="w-3 h-3 text-gray-600 dark:text-gray-300" />
        </button>
        <span className="w-20 text-right text-xs font-semibold text-gray-800 dark:text-gray-100 tabular-nums">R$ {fmtR(item.preco_unit * item.qtd)}</span>
        <button onClick={() => onRemove(item.id)} className="w-6 h-6 flex items-center justify-center ml-1">
          <Trash2 className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 hover:text-red-400" />
        </button>
      </div>
    </div>
  );
}

// ── Sheet principal ─────────────────────────────────────────────────────────
export default function OrcamentoSheet({ isOpen, onClose, produtos, tabelaSelecionada, calcularPreco, nomeTabela, empresa }) {
  const [itens, setItens] = useState([]);
  const [aba, setAba] = useState('produtos'); // 'produtos' | 'carrinho'
  const [showCupom, setShowCupom] = useState(false);
  const [formatoCupom, setFormatoCupom] = useState('80mm'); // '80mm' | 'a4'
  const [clienteNome, setClienteNome] = useState('');

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
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white font-glacial">Novo Orçamento</h2>
          {nomeTabela && <p className="text-[11px] text-gray-400 dark:text-gray-500">{nomeTabela}</p>}
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <button
          onClick={() => setAba('produtos')}
          className={`flex-1 py-2.5 text-xs font-medium transition-colors ${aba === 'produtos' ? 'text-gray-900 dark:text-white border-b-2 border-gray-800 dark:border-gray-200' : 'text-gray-400 dark:text-gray-500'}`}
        >
          Produtos
        </button>
        <button
          onClick={() => setAba('carrinho')}
          className={`flex-1 py-2.5 text-xs font-medium transition-colors relative ${aba === 'carrinho' ? 'text-gray-900 dark:text-white border-b-2 border-gray-800 dark:border-gray-200' : 'text-gray-400 dark:text-gray-500'}`}
        >
          Orçamento
          {itens.length > 0 && (
            <span className="absolute top-1.5 right-4 w-4 h-4 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-[9px] rounded-full flex items-center justify-center font-bold">
              {itens.length}
            </span>
          )}
        </button>
      </div>

      {/* Corpo */}
      <div className="flex-1 overflow-hidden px-3 pt-3 flex flex-col">
        {aba === 'produtos' ? (
          <SeletorProdutos
            produtos={produtos}
            tabelaSelecionada={tabelaSelecionada}
            calcularPreco={calcularPreco}
            onAdd={(p, preco) => { handleAdd(p, preco); }}
          />
        ) : (
          <div className="flex flex-col h-full">
            {/* Campo cliente */}
            <Input
              placeholder="Nome do cliente (opcional)"
              value={clienteNome}
              onChange={e => setClienteNome(e.target.value)}
              className="border-none bg-gray-100 dark:bg-gray-800 h-9 text-sm rounded-xl shadow-none focus-visible:ring-0 mb-3"
            />
            {itens.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <FileText className="w-10 h-10 mb-2 text-gray-200 dark:text-gray-700" />
                <p className="text-sm">Nenhum item adicionado</p>
                <button onClick={() => setAba('produtos')} className="mt-3 text-xs text-gray-500 underline underline-offset-2">Adicionar produtos</button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto">
                  {itens.map(item => (
                    <ItemOrcamento key={item.id} item={item} onQtd={handleQtd} onRemove={handleRemove} />
                  ))}
                </div>
                {/* Total */}
                <div className="py-4 border-t border-gray-100 dark:border-gray-800 mt-2">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white font-glacial tabular-nums">R$ {fmtR(total)}</span>
                  </div>
                  {/* Formato */}
                  <div className="flex gap-2 mb-3">
                    {['80mm', 'a4'].map(fmt => (
                      <button
                        key={fmt}
                        onClick={() => setFormatoCupom(fmt)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors ${formatoCupom === fmt ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
                      >
                        {fmt === '80mm' ? 'Cupom 80mm' : 'Folha A4'}
                      </button>
                    ))}
                  </div>
                  <Button
                    onClick={() => setShowCupom(true)}
                    className="w-full bg-gray-800 hover:bg-gray-900 dark:bg-gray-200 dark:hover:bg-gray-300 dark:text-gray-900 text-white h-11 rounded-xl text-sm font-medium gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Gerar Cupom
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}