import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Search, Plus, Minus, Trash2,
  CheckCircle2, Loader2, Package, ChevronDown, ChevronUp, ClipboardCheck
} from "lucide-react";

export default function ConferenciaEditor({ conferencia: conferenciaInicial, onVoltar }) {
  const conferencia_id = conferenciaInicial.id;

  const [conferencia, setConferencia] = useState(conferenciaInicial);
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [itens, setItens] = useState(conferenciaInicial.itens_conferidos || []);
  const [saving, setSaving] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [itemExpandido, setItemExpandido] = useState(null);
  const buscaRef = useRef(null);

  useEffect(() => {
    carregar();
  }, [conferencia_id]);

  const carregar = async () => {
    setLoading(true);
    const prods = await base44.entities.Produto.list("campo_hierarquico_1", 500);
    setProdutos(prods);
    setLoading(false);
  };

  useEffect(() => {
    if (!busca.trim()) { setProdutosFiltrados([]); return; }
    const q = busca.toLowerCase();
    setProdutosFiltrados(
      produtos.filter(p =>
        (p.nome || "").toLowerCase().includes(q) ||
        (p.campo_hierarquico_1 || "").toLowerCase().includes(q) ||
        (p.codigo_barras || "").toLowerCase().includes(q) ||
        (p.codigo_interno || "").toLowerCase().includes(q)
      ).slice(0, 20)
    );
  }, [busca, produtos]);

  const salvarItens = useCallback(async (novosItens) => {
    setSaving(true);
    await base44.entities.ConferenciaEstoque.update(conferencia_id, { itens_conferidos: novosItens });
    setSaving(false);
  }, [conferencia_id]);

  const adicionarProduto = async (produto) => {
    const nome = produto.nome || [
      produto.campo_hierarquico_1,
      produto.campo_hierarquico_2,
      produto.campo_hierarquico_3,
    ].filter(Boolean).join(" ");

    const novosItens = [...itens, {
      produto_id: produto.id,
      produto_nome: nome,
      quantidade_contada: 1,
    }];
    setItens(novosItens);
    setBusca("");
    setItemExpandido(produto.id);
    await salvarItens(novosItens);
  };

  const atualizarQtd = async (idx, delta) => {
    const novosItens = itens.map((item, i) => {
      if (i !== idx) return item;
      return { ...item, quantidade_contada: Math.max(0, (item.quantidade_contada || 0) + delta) };
    });
    setItens(novosItens);
    await salvarItens(novosItens);
  };

  const definirQtd = async (idx, valor) => {
    const qtd = parseFloat(valor) || 0;
    const novosItens = itens.map((item, i) => i === idx ? { ...item, quantidade_contada: qtd } : item);
    setItens(novosItens);
    await salvarItens(novosItens);
  };

  const removerItem = async (idx) => {
    const novosItens = itens.filter((_, i) => i !== idx);
    setItens(novosItens);
    await salvarItens(novosItens);
  };

  const finalizar = async () => {
    setFinalizando(true);
    await base44.entities.ConferenciaEstoque.update(conferencia_id, {
      status: "Concluída",
      data_fim: new Date().toISOString(),
      itens_conferidos: itens,
    });
    setFinalizando(false);
    onVoltar();
  };

  const itensAgrupados = itens.reduce((acc, item, idx) => {
    const existente = acc.findIndex(a => a.produto_id === item.produto_id);
    if (existente >= 0) {
      acc[existente].total += item.quantidade_contada;
      acc[existente].entradas.push({ idx, qtd: item.quantidade_contada });
    } else {
      acc.push({
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        total: item.quantidade_contada,
        entradas: [{ idx, qtd: item.quantidade_contada }],
      });
    }
    return acc;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: '60vh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onVoltar}
          className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold font-glacial text-gray-900 dark:text-white truncate">
            {conferencia?.nome_conferencia}
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {itens.length} entr{itens.length !== 1 ? "adas" : "ada"} · {itensAgrupados.length} produto{itensAgrupados.length !== 1 ? "s" : ""}
          </p>
        </div>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-gray-300 flex-shrink-0" />}
      </div>

      {/* Lista de itens agrupados */}
      <div className="flex-1 space-y-2 pb-4">
        {itensAgrupados.length === 0 && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Package className="w-7 h-7 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhum produto conferido</p>
            <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">Busque e adicione produtos abaixo</p>
          </div>
        )}

        {itensAgrupados.map((grupo) => (
          <div key={grupo.produto_id} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl overflow-hidden">
            <button
              onClick={() => setItemExpandido(prev => prev === grupo.produto_id ? null : grupo.produto_id)}
              className="w-full flex items-center gap-3 p-3.5 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Package className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{grupo.produto_nome}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{grupo.entradas.length} entrada{grupo.entradas.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-lg font-bold font-glacial text-gray-900 dark:text-white">{grupo.total}</span>
                {itemExpandido === grupo.produto_id
                  ? <ChevronUp className="w-4 h-4 text-gray-300" />
                  : <ChevronDown className="w-4 h-4 text-gray-300" />
                }
              </div>
            </button>

            {itemExpandido === grupo.produto_id && (
              <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {grupo.entradas.map((entrada, eIdx) => (
                  <div key={entrada.idx} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span className="text-xs text-gray-400 dark:text-gray-500 w-16">
                      Entrada {eIdx + 1}
                    </span>
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <button
                        onClick={() => atualizarQtd(entrada.idx, -1)}
                        className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                      </button>
                      <Input
                        type="number"
                        value={entrada.qtd}
                        onChange={e => definirQtd(entrada.idx, e.target.value)}
                        className="w-14 text-center text-sm font-medium border-0 bg-transparent focus-visible:ring-0 p-0 h-7"
                      />
                      <button
                        onClick={() => atualizarQtd(entrada.idx, 1)}
                        className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => removerItem(entrada.idx)}
                        className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center ml-1"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const prod = produtos.find(p => p.id === grupo.produto_id);
                    if (prod) adicionarProduto(prod);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <Plus className="w-3 h-3" /> Adicionar outra entrada
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Barra de busca + finalizar */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
        {produtosFiltrados.length > 0 && (
          <div className="max-h-52 overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700">
            {produtosFiltrados.map(prod => {
              const nome = prod.nome || [prod.campo_hierarquico_1, prod.campo_hierarquico_2, prod.campo_hierarquico_3].filter(Boolean).join(" ");
              const contagens = itens.filter(i => i.produto_id === prod.id);
              const totalContado = contagens.reduce((s, i) => s + (i.quantidade_contada || 0), 0);
              return (
                <button
                  key={prod.id}
                  onClick={() => adicionarProduto(prod)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{nome}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{prod.codigo_interno || prod.codigo_barras || ""}</p>
                  </div>
                  {contagens.length > 0 && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-xs text-green-500 font-medium">{totalContado}</span>
                    </div>
                  )}
                  <Plus className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 dark:text-gray-600" />
            <Input
              ref={buscaRef}
              placeholder="Buscar produto..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-9 rounded-xl border-0 bg-gray-50 dark:bg-gray-800 h-11 focus-visible:ring-1 focus-visible:ring-gray-200 dark:focus-visible:ring-gray-700"
            />
          </div>
          <Button
            onClick={finalizar}
            disabled={finalizando || itens.length === 0}
            className="h-11 px-4 rounded-xl bg-green-500 hover:bg-green-600 text-white shadow-none flex-shrink-0"
          >
            {finalizando
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><ClipboardCheck className="w-4 h-4 mr-1.5" /> Finalizar</>
            }
          </Button>
        </div>
      </div>
    </div>
  );
}