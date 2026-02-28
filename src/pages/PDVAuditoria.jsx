import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Search, Plus, Minus, Check, Trash2,
  CheckCircle2, Loader2, Package, ChevronDown, ChevronUp, ClipboardCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PDVAuditoria() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const conferencia_id = urlParams.get("id");

  const [conferencia, setConferencia] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [itens, setItens] = useState([]); // { produto_id, produto_nome, quantidade_contada }
  const [saving, setSaving] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mostrarBusca, setMostrarBusca] = useState(false);
  const [itemExpandido, setItemExpandido] = useState(null);
  const buscaRef = useRef(null);

  useEffect(() => {
    if (!conferencia_id) return navigate(createPageUrl("AuditoriaEstoque"));
    carregar();
  }, [conferencia_id]);

  const carregar = async () => {
    setLoading(true);
    const [conf, prods] = await Promise.all([
      base44.entities.ConferenciaEstoque.filter({ id: conferencia_id }),
      base44.entities.Produto.list("campo_hierarquico_1", 500),
    ]);
    if (conf.length === 0) return navigate(createPageUrl("AuditoriaEstoque"));
    setConferencia(conf[0]);
    setItens(conf[0].itens_conferidos || []);
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

  useEffect(() => {
    if (mostrarBusca && buscaRef.current) buscaRef.current.focus();
  }, [mostrarBusca]);

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
    setMostrarBusca(false);
    setItemExpandido(novosItens.length - 1);
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
    if (itemExpandido === idx) setItemExpandido(null);
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
    navigate(createPageUrl("AuditoriaEstoque"));
  };

  // Agrupa itens com o mesmo produto_id
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
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={() => navigate(createPageUrl("AuditoriaEstoque"))}
          className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold font-glacial text-gray-900 dark:text-white truncate">
            {conferencia?.nome_conferencia}
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {itens.length} entr{itens.length !== 1 ? "adas" : "ada"} · {itensAgrupados.length} produto{itensAgrupados.length !== 1 ? "s" : ""}
          </p>
        </div>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-gray-300 flex-shrink-0" />}
        {!saving && <div className="w-4 h-4" />}
      </div>

      {/* Lista de itens agrupados */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 pb-40">
        {itensAgrupados.length === 0 && (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Package className="w-7 h-7 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhum produto conferido</p>
            <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">Busque e adicione produtos abaixo</p>
          </div>
        )}

        {itensAgrupados.map((grupo) => (
          <div key={grupo.produto_id} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl overflow-hidden">
            {/* Linha principal do produto */}
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

            {/* Entradas expandidas */}
            {itemExpandido === grupo.produto_id && (
              <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {grupo.entradas.map((entrada, eIdx) => (
                         <div key={entrada.idx} className="flex items-center gap-2 px-3 py-2.5 min-w-0">
                           <span className="text-xs text-gray-400 dark:text-gray-500 w-14 flex-shrink-0">
                             Entrada {eIdx + 1}
                           </span>
                           <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
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
                {/* Adicionar outra entrada do mesmo produto */}
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

      {/* Barra de busca */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-3 space-y-2 max-w-full overflow-x-hidden">
        {/* Resultados da busca */}
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
              onFocus={() => setMostrarBusca(true)}
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