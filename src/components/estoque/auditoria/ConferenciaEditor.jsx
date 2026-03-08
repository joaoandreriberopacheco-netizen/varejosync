import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Search, Plus, Minus, Trash2,
  CheckCircle2, Loader2, Package, ChevronDown, ChevronUp,
  ClipboardCheck, X, Camera, Lock
} from "lucide-react";

// Tela de CONTAGEM CEGA — operário NÃO vê estoque do sistema
export default function ConferenciaEditor({ conferencia: conferenciaInicial, onVoltar }) {
  const conferencia_id = conferenciaInicial.id;
  const bloqueada = ["Concluída", "Cancelada", "Aguardando Auditoria", "Aprovada"].includes(conferenciaInicial.status);

  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [itens, setItens] = useState(conferenciaInicial.itens_conferidos || []);
  const [saving, setSaving] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [itemExpandido, setItemExpandido] = useState(null);
  const [modalQtd, setModalQtd] = useState(null);
  const qtdInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const buscaRef = useRef(null);

  useEffect(() => { carregar(); }, [conferencia_id]);

  const carregar = async () => {
    setLoading(true);
    // Carrega apenas nome, código, hierarquia — SEM estoque (contagem cega)
    const prods = await base44.entities.Produto.list("-nome", 2000);
    setProdutos(prods);
    setLoading(false);
  };

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
        const nA = (a.nome || a.campo_hierarquico_1 || "").toLowerCase();
        const nB = (b.nome || b.campo_hierarquico_1 || "").toLowerCase();
        return nA.localeCompare(nB, "pt-BR");
      })
      .slice(0, 30);
    setProdutosFiltrados(filtrados);
  }, [busca, produtos]);

  const salvarItens = async (novosItens) => {
    setSaving(true);
    await base44.entities.ConferenciaEstoque.update(conferencia_id, { itens_conferidos: novosItens });
    setSaving(false);
  };

  const selecionarProduto = (produto) => {
    setBusca("");
    const nome = produto.nome || [produto.campo_hierarquico_1, produto.campo_hierarquico_2, produto.campo_hierarquico_3].filter(Boolean).join(" ");
    setModalQtd({ produto: { ...produto, nome }, qtdStr: "1" });
    setTimeout(() => {
      if (qtdInputRef.current) { qtdInputRef.current.focus(); qtdInputRef.current.select(); }
    }, 100);
  };

  const confirmarQtd = async () => {
    if (!modalQtd) return;
    const qtd = parseFloat(modalQtd.qtdStr) || 0;
    const novosItens = [...itens, { produto_id: modalQtd.produto.id, produto_nome: modalQtd.produto.nome, quantidade_contada: qtd }];
    setItens(novosItens);
    setModalQtd(null);
    setItemExpandido(modalQtd.produto.id);
    await salvarItens(novosItens);
  };

  const atualizarQtd = async (idx, delta) => {
    const novosItens = itens.map((item, i) =>
      i !== idx ? item : { ...item, quantidade_contada: Math.max(0, (item.quantidade_contada || 0) + delta) }
    );
    setItens(novosItens);
    await salvarItens(novosItens);
  };

  const definirQtd = async (idx, valor) => {
    const novosItens = itens.map((item, i) => i === idx ? { ...item, quantidade_contada: parseFloat(valor) || 0 } : item);
    setItens(novosItens);
    await salvarItens(novosItens);
  };

  const removerItem = async (idx) => {
    const novosItens = itens.filter((_, i) => i !== idx);
    setItens(novosItens);
    await salvarItens(novosItens);
  };

  // Ao finalizar, vai para "Aguardando Auditoria" — responsável vai auditar
  const finalizar = async () => {
    setFinalizando(true);
    await base44.entities.ConferenciaEstoque.update(conferencia_id, {
      status: "Aguardando Auditoria",
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
      acc.push({ produto_id: item.produto_id, produto_nome: item.produto_nome, total: item.quantidade_contada, entradas: [{ idx, qtd: item.quantidade_contada }] });
    }
    return acc;
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-gray-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 flex-shrink-0 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900">
        <button onClick={onVoltar} className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold font-glacial text-gray-900 dark:text-white truncate">{conferenciaInicial?.nome_conferencia}</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {itensAgrupados.length} produto{itensAgrupados.length !== 1 ? "s" : ""} contados
            {saving && <span className="ml-2 text-gray-400 dark:text-gray-600">· salvando...</span>}
          </p>
        </div>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-gray-400 dark:text-gray-600 flex-shrink-0" />}
      </div>

      {/* Banner bloqueio */}
      {bloqueada && (
        <div className="mx-4 mb-3 flex items-center gap-2.5 bg-gray-100 dark:bg-gray-900 rounded-2xl px-4 py-3">
          <Lock className="w-4 h-4 text-gray-500 dark:text-gray-600 flex-shrink-0" />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Conferência <strong className="text-gray-700 dark:text-gray-300">{conferenciaInicial.status}</strong> — somente visualização.
          </p>
        </div>
      )}

      {/* Busca — só se não bloqueada */}
      {!bloqueada && (
        <div className="px-4 pb-3 relative flex-shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
              <Input
                ref={buscaRef}
                placeholder="Buscar produto por nome ou código..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="pl-9 pr-9 rounded-xl border-0 bg-gray-900 text-white placeholder:text-gray-600 h-11 focus-visible:ring-1 focus-visible:ring-gray-700"
                autoComplete="off"
              />
              {busca && (
                <button onClick={() => setBusca("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-11 h-11 rounded-xl bg-gray-900 flex items-center justify-center text-gray-500 flex-shrink-0"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]; if (!file) return; e.target.value = "";
                const reader = new FileReader();
                reader.onload = async (ev) => {
                  const blob = await (await fetch(ev.target.result)).blob();
                  const { file_url } = await base44.integrations.Core.UploadFile({ file: blob });
                  const res = await base44.integrations.Core.InvokeLLM({
                    prompt: "Extraia o código de barras (EAN/UPC) visível na imagem. Retorne apenas o número, sem espaços. Se não houver, retorne null.",
                    file_urls: [file_url],
                    response_json_schema: { type: "object", properties: { codigo_barras: { type: "string" } } }
                  });
                  const codigo = res?.codigo_barras;
                  if (codigo) {
                    const encontrado = produtos.find(p => p.codigo_barras === codigo || p.codigo_barras?.replace(/\D/g, "") === codigo.replace(/\D/g, ""));
                    if (encontrado) selecionarProduto(encontrado); else setBusca(codigo);
                  }
                };
                reader.readAsDataURL(file);
              }}
            />
          </div>
          {produtosFiltrados.length > 0 && (
            <div className="absolute top-full left-4 right-4 z-30 mt-1 bg-gray-900 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
              <div className="divide-y divide-gray-800">
                {produtosFiltrados.map(prod => {
                  const nome = prod.nome || [prod.campo_hierarquico_1, prod.campo_hierarquico_2, prod.campo_hierarquico_3].filter(Boolean).join(" ");
                  const contagens = itens.filter(i => i.produto_id === prod.id);
                  const totalContado = contagens.reduce((s, i) => s + (i.quantidade_contada || 0), 0);
                  return (
                    <button key={prod.id} onClick={() => selecionarProduto(prod)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{nome}</p>
                        {(prod.codigo_interno || prod.codigo_barras) && (
                          <p className="text-xs text-gray-600">{prod.codigo_interno || prod.codigo_barras}</p>
                        )}
                      </div>
                      {contagens.length > 0 && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-xs text-green-400 font-medium">{totalContado}</span>
                        </div>
                      )}
                      <Plus className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lista itens scrollável */}
      <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
        {itensAgrupados.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-700">
            <Package className="w-10 h-10 mb-3" />
            <p className="text-sm">Nenhum produto conferido</p>
            {!bloqueada && <p className="text-xs mt-1 text-gray-800">Busque ou escaneie produtos acima</p>}
          </div>
        )}

        {itensAgrupados.map((grupo) => (
          <div key={grupo.produto_id} className="bg-gray-900 rounded-2xl overflow-hidden">
            <button
              onClick={() => setItemExpandido(prev => prev === grupo.produto_id ? null : grupo.produto_id)}
              className="w-full flex items-start gap-3 p-3.5 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Package className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white leading-snug break-words">{grupo.produto_nome}</p>
                <p className="text-xs text-gray-600 mt-0.5">{grupo.entradas.length} entrada{grupo.entradas.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                <span className="text-xl font-bold font-glacial text-white">{grupo.total}</span>
                {itemExpandido === grupo.produto_id ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
              </div>
            </button>

            {itemExpandido === grupo.produto_id && (
              <div className="border-t border-gray-800 divide-y divide-gray-800">
                {grupo.entradas.map((entrada, eIdx) => (
                  <div key={entrada.idx} className="flex items-center gap-2 px-3 py-2.5 min-w-0">
                    <span className="text-xs text-gray-600 w-14 flex-shrink-0">Entrada {eIdx + 1}</span>
                    <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                      {!bloqueada && (
                        <button onClick={() => atualizarQtd(entrada.idx, -1)} className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center">
                          <Minus className="w-3 h-3 text-gray-400" />
                        </button>
                      )}
                      <Input
                        type="number" inputMode="numeric"
                        value={entrada.qtd}
                        readOnly={bloqueada}
                        onChange={e => !bloqueada && definirQtd(entrada.idx, e.target.value)}
                        className="w-14 text-center text-sm font-medium border-0 bg-transparent text-white focus-visible:ring-0 p-0 h-7"
                      />
                      {!bloqueada && (
                        <>
                          <button onClick={() => atualizarQtd(entrada.idx, 1)} className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center">
                            <Plus className="w-3 h-3 text-gray-400" />
                          </button>
                          <button onClick={() => removerItem(entrada.idx)} className="w-7 h-7 rounded-lg bg-red-950/60 flex items-center justify-center ml-1">
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {!bloqueada && (
                  <button
                    onClick={() => { const prod = produtos.find(p => p.id === grupo.produto_id); if (prod) selecionarProduto(prod); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-gray-600 hover:text-gray-400"
                  >
                    <Plus className="w-3 h-3" /> Adicionar outra entrada
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer — botão finalizar */}
      {!bloqueada && (
        <div className="flex-shrink-0 px-4 pb-20 pt-3 bg-gray-950 border-t border-gray-900">
          <Button
            onClick={finalizar}
            disabled={finalizando || itens.length === 0}
            className="w-full h-12 rounded-2xl bg-white hover:bg-gray-100 text-gray-900 shadow-none font-semibold disabled:opacity-30"
          >
            {finalizando
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><ClipboardCheck className="w-4 h-4 mr-2" /> Enviar para Auditoria</>
            }
          </Button>
        </div>
      )}

      {/* Modal qtd */}
      {modalQtd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalQtd(null)} />
          <div className="relative bg-gray-900 rounded-t-3xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-xs text-gray-600 mb-1">Produto selecionado</p>
            <p className="text-sm font-semibold text-white mb-5 leading-snug">{modalQtd.produto.nome}</p>
            <label className="text-xs text-gray-600 mb-2 block">Quantidade contada</label>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setModalQtd(m => ({ ...m, qtdStr: String(Math.max(0, (parseFloat(m.qtdStr) || 0) - 1)) }))} className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center">
                <Minus className="w-5 h-5 text-gray-300" />
              </button>
              <Input
                ref={qtdInputRef} type="number" inputMode="numeric"
                value={modalQtd.qtdStr}
                onChange={e => setModalQtd(m => ({ ...m, qtdStr: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && confirmarQtd()}
                className="flex-1 text-center text-3xl font-bold font-glacial border-0 bg-gray-800 text-white rounded-2xl h-14 focus-visible:ring-1 focus-visible:ring-gray-700"
              />
              <button onClick={() => setModalQtd(m => ({ ...m, qtdStr: String((parseFloat(m.qtdStr) || 0) + 1) }))} className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center">
                <Plus className="w-5 h-5 text-gray-300" />
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setModalQtd(null)} className="flex-1 h-12 rounded-2xl bg-gray-800 text-gray-400 hover:bg-gray-700">Cancelar</Button>
              <Button onClick={confirmarQtd} className="flex-1 h-12 rounded-2xl bg-white hover:bg-gray-100 text-gray-900 shadow-none font-semibold">
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}