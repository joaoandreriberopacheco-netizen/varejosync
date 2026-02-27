import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Search, Plus, Minus, Trash2,
  CheckCircle2, Loader2, Package, ChevronDown, ChevronUp,
  ClipboardCheck, Camera, X, Sparkles
} from "lucide-react";

export default function ConferenciaEditor({ conferencia: conferenciaInicial, onVoltar }) {
  const conferencia_id = conferenciaInicial.id;

  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [itens, setItens] = useState(conferenciaInicial.itens_conferidos || []);
  const [saving, setSaving] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [itemExpandido, setItemExpandido] = useState(null);

  // Modal de quantidade
  const [modalQtd, setModalQtd] = useState(null); // { produto, qtdStr }
  const qtdInputRef = useRef(null);

  // Modal IA / câmera
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState("barcode"); // "barcode" | "ia"
  const [iaLoading, setIaLoading] = useState(false);
  const [iaSugestoes, setIaSugestoes] = useState([]);
  const [iaImagem, setIaImagem] = useState(null);
  const fileInputRef = useRef(null);
  const buscaRef = useRef(null);

  useEffect(() => { carregar(); }, [conferencia_id]);

  const carregar = async () => {
    setLoading(true);
    const prods = await base44.entities.Produto.list("-created_date", 500);
    setProdutos(prods);
    setLoading(false);
  };

  // Busca incremental em ordem alfabética
  useEffect(() => {
    if (!busca.trim()) { setProdutosFiltrados([]); return; }
    const q = busca.toLowerCase();
    const filtrados = produtos
      .filter(p =>
        (p.nome || "").toLowerCase().includes(q) ||
        (p.campo_hierarquico_1 || "").toLowerCase().includes(q) ||
        (p.campo_hierarquico_2 || "").toLowerCase().includes(q) ||
        (p.codigo_barras || "").toLowerCase().includes(q) ||
        (p.codigo_interno || "").toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const nomeA = (a.nome || a.campo_hierarquico_1 || "").toLowerCase();
        const nomeB = (b.nome || b.campo_hierarquico_1 || "").toLowerCase();
        return nomeA.localeCompare(nomeB, "pt-BR");
      })
      .slice(0, 30);
    setProdutosFiltrados(filtrados);
  }, [busca, produtos]);

  const salvarItens = async (novosItens) => {
    setSaving(true);
    await base44.entities.ConferenciaEstoque.update(conferencia_id, { itens_conferidos: novosItens });
    setSaving(false);
  };

  // Abre modal de quantidade ao selecionar produto
  const selecionarProduto = (produto) => {
    setBusca("");
    setIaSugestoes([]);
    const nome = produto.nome || [
      produto.campo_hierarquico_1,
      produto.campo_hierarquico_2,
      produto.campo_hierarquico_3,
    ].filter(Boolean).join(" ");
    setModalQtd({ produto: { ...produto, nome }, qtdStr: "1" });
    setTimeout(() => {
      if (qtdInputRef.current) {
        qtdInputRef.current.focus();
        qtdInputRef.current.select();
      }
    }, 100);
  };

  const confirmarQtd = async () => {
    if (!modalQtd) return;
    const qtd = parseFloat(modalQtd.qtdStr) || 0;
    const novosItens = [...itens, {
      produto_id: modalQtd.produto.id,
      produto_nome: modalQtd.produto.nome,
      quantidade_contada: qtd,
    }];
    setItens(novosItens);
    setModalQtd(null);
    setItemExpandido(modalQtd.produto.id);
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

  // ---- CÂMERA / IA ----
  const abrirCamera = (mode) => {
    setCameraMode(mode);
    setIaSugestoes([]);
    setIaImagem(null);
    setShowCamera(true);
    // Simular abertura de câmera via input file
    setTimeout(() => {
      if (fileInputRef.current) fileInputRef.current.click();
    }, 100);
  };

  const handleFotoCapturada = async (e) => {
    const file = e.target.files?.[0];
    if (!file) { setShowCamera(false); return; }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      setIaImagem(base64);

      if (cameraMode === "barcode") {
        // Busca por código de barras: usa a IA para extrair o código e busca no catálogo
        setIaLoading(true);
        try {
          const res = await base44.integrations.Core.InvokeLLM({
            prompt: `Esta imagem contém um código de barras de produto de varejo/material de construção. 
Extraia o código de barras (EAN/UPC) visível na imagem. Retorne apenas o número, sem formatação.
Se não houver código de barras visível, retorne null.`,
            file_urls: [base64],
            response_json_schema: {
              type: "object",
              properties: {
                codigo_barras: { type: "string" },
              }
            }
          });
          const codigo = res?.codigo_barras;
          if (codigo) {
            const encontrado = produtos.find(p =>
              p.codigo_barras === codigo ||
              p.codigo_barras?.replace(/\D/g, "") === codigo.replace(/\D/g, "")
            );
            if (encontrado) {
              setShowCamera(false);
              selecionarProduto(encontrado);
            } else {
              // Tenta busca parcial
              setBusca(codigo);
              setShowCamera(false);
            }
          } else {
            setBusca("");
            setShowCamera(false);
          }
        } finally {
          setIaLoading(false);
        }
      } else {
        // Modo IA: identifica o produto pela imagem
        setIaLoading(true);
        try {
          // Upload da imagem
          const blob = await (await fetch(base64)).blob();
          const { file_url } = await base44.integrations.Core.UploadFile({ file: blob });

          const res = await base44.integrations.Core.InvokeLLM({
            prompt: `Esta é uma foto de um produto de varejo ou material de construção.
Identifique o produto e sugira de 3 a 5 possíveis nomes/descrições para este produto que poderiam estar em um catálogo de loja de materiais de construção ou varejo.
Seja específico: inclua tipo, material, tamanho/dimensão se visível, cor se relevante.
Retorne as sugestões em português, em ordem da mais provável para a menos provável.`,
            file_urls: [file_url],
            response_json_schema: {
              type: "object",
              properties: {
                sugestoes: { type: "array", items: { type: "string" } },
                descricao: { type: "string" }
              }
            }
          });

          if (res?.sugestoes?.length) {
            // Busca produtos que correspondem às sugestões
            const sugestoesIA = res.sugestoes;
            const produtosEncontrados = [];
            sugestoesIA.forEach(sug => {
              const q = sug.toLowerCase();
              const found = produtos.filter(p =>
                (p.nome || "").toLowerCase().includes(q.split(" ")[0]) ||
                (p.campo_hierarquico_1 || "").toLowerCase().includes(q.split(" ")[0])
              ).slice(0, 3);
              found.forEach(f => {
                if (!produtosEncontrados.find(x => x.id === f.id)) {
                  produtosEncontrados.push(f);
                }
              });
            });
            setIaSugestoes(produtosEncontrados.slice(0, 8));
            setShowCamera(false);
          } else {
            setShowCamera(false);
          }
        } finally {
          setIaLoading(false);
        }
      }
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = "";
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
    <div className="flex flex-col">
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
            {conferenciaInicial?.nome_conferencia}
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {itens.length} entr{itens.length !== 1 ? "adas" : "ada"} · {itensAgrupados.length} produto{itensAgrupados.length !== 1 ? "s" : ""}
          </p>
        </div>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-gray-300 flex-shrink-0" />}
      </div>

      {/* ---- BUSCA NO TOPO ---- */}
      <div className="mb-4 space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 dark:text-gray-600 pointer-events-none" />
            <Input
              ref={buscaRef}
              placeholder="Buscar produto por nome ou código..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-9 pr-4 rounded-xl border-0 bg-gray-50 dark:bg-gray-800 h-11 focus-visible:ring-1 focus-visible:ring-gray-200 dark:focus-visible:ring-gray-700"
              autoComplete="off"
            />
            {busca && (
              <button
                onClick={() => setBusca("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* Botão câmera IA */}
          <button
            onClick={() => abrirCamera("ia")}
            className="w-11 h-11 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Identificar produto por foto (IA)"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          {/* Botão código de barras */}
          <button
            onClick={() => abrirCamera("barcode")}
            className="w-11 h-11 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Ler código de barras"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        {/* Input oculto para câmera */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFotoCapturada}
        />

        {/* Loading IA */}
        {iaLoading && (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            <span className="text-xs text-gray-400">
              {cameraMode === "ia" ? "Identificando produto com IA..." : "Lendo código de barras..."}
            </span>
          </div>
        )}

        {/* Sugestões IA */}
        {iaSugestoes.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-50 dark:border-gray-700">
              <Sparkles className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-400">Sugestões por IA</span>
              <button onClick={() => setIaSugestoes([])} className="ml-auto text-gray-300">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {iaSugestoes.map(prod => {
                const nome = prod.nome || [prod.campo_hierarquico_1, prod.campo_hierarquico_2, prod.campo_hierarquico_3].filter(Boolean).join(" ");
                return (
                  <button
                    key={prod.id}
                    onClick={() => { setIaSugestoes([]); selecionarProduto(prod); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{nome}</p>
                      <p className="text-xs text-gray-400">{prod.codigo_interno || prod.codigo_barras || ""}</p>
                    </div>
                    <Plus className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Resultados da busca incremental */}
        {produtosFiltrados.length > 0 && !iaLoading && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden max-h-64 overflow-y-auto">
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {produtosFiltrados.map(prod => {
                const nome = prod.nome || [prod.campo_hierarquico_1, prod.campo_hierarquico_2, prod.campo_hierarquico_3].filter(Boolean).join(" ");
                const contagens = itens.filter(i => i.produto_id === prod.id);
                const totalContado = contagens.reduce((s, i) => s + (i.quantidade_contada || 0), 0);
                return (
                  <button
                    key={prod.id}
                    onClick={() => selecionarProduto(prod)}
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
          </div>
        )}
      </div>

      {/* Lista de itens agrupados */}
      <div className="space-y-2 pb-4">
        {itensAgrupados.length === 0 && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Package className="w-7 h-7 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhum produto conferido</p>
            <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">Busque, fotografe ou escaneie produtos acima</p>
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
                        inputMode="numeric"
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
                    if (prod) selecionarProduto(prod);
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

      {/* Botão finalizar */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <Button
          onClick={finalizar}
          disabled={finalizando || itens.length === 0}
          className="w-full h-11 rounded-xl bg-green-500 hover:bg-green-600 text-white shadow-none"
        >
          {finalizando
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <><ClipboardCheck className="w-4 h-4 mr-1.5" /> Finalizar Conferência</>
          }
        </Button>
      </div>

      {/* Modal de quantidade ao selecionar produto */}
      {modalQtd && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setModalQtd(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Produto selecionado</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-5 line-clamp-2">{modalQtd.produto.nome}</p>

            <label className="text-xs text-gray-400 dark:text-gray-500 mb-2 block">Quantidade contada</label>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setModalQtd(m => ({ ...m, qtdStr: String(Math.max(0, (parseFloat(m.qtdStr) || 0) - 1)) }))}
                className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
              >
                <Minus className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
              <Input
                ref={qtdInputRef}
                type="number"
                inputMode="numeric"
                value={modalQtd.qtdStr}
                onChange={e => setModalQtd(m => ({ ...m, qtdStr: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && confirmarQtd()}
                className="flex-1 text-center text-2xl font-bold font-glacial border-0 bg-gray-50 dark:bg-gray-800 rounded-xl h-12 focus-visible:ring-1 focus-visible:ring-gray-200 dark:focus-visible:ring-gray-700"
              />
              <button
                onClick={() => setModalQtd(m => ({ ...m, qtdStr: String((parseFloat(m.qtdStr) || 0) + 1) }))}
                className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
              >
                <Plus className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setModalQtd(null)}
                className="flex-1 rounded-xl text-gray-500 dark:text-gray-400"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmarQtd}
                className="flex-1 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-none"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}