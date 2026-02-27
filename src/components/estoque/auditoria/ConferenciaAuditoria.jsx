import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, CheckCircle2, XCircle, Loader2, Package,
  TrendingUp, TrendingDown, Minus as MinusIcon, Printer,
  AlertTriangle, ChevronDown, ChevronUp, FileText
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function fmt(n) { return (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }

export default function ConferenciaAuditoria({ conferencia: conf, onVoltar }) {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aprovando, setAprovando] = useState(false);
  const [rejeitando, setRejeitando] = useState(false);
  const [expandido, setExpandido] = useState(null);
  const printRef = useRef(null);

  const isConcluida = conf.status === "Concluída" || conf.status === "Cancelada";

  useEffect(() => { carregar(); }, [conf.id]);

  const carregar = async () => {
    setLoading(true);
    const prods = await base44.entities.Produto.list("-nome", 2000);
    setProdutos(prods);
    setLoading(false);
  };

  // Monta tabela de comparação: contado vs sistema
  const linhas = (conf.itens_conferidos || []).reduce((acc, item) => {
    const existente = acc.findIndex(a => a.produto_id === item.produto_id);
    if (existente >= 0) {
      acc[existente].contado += item.quantidade_contada;
    } else {
      const prod = produtos.find(p => p.id === item.produto_id);
      acc.push({
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        contado: item.quantidade_contada,
        sistema: prod?.estoque_atual || 0,
        unidade: prod?.unidade_principal || "UN",
      });
    }
    return acc;
  }, []).map(l => ({ ...l, diferenca: l.contado - l.sistema }));

  const totalDivergencias = linhas.filter(l => l.diferenca !== 0).length;
  const totalSobra = linhas.filter(l => l.diferenca > 0).reduce((s, l) => s + l.diferenca, 0);
  const totalFalta = linhas.filter(l => l.diferenca < 0).reduce((s, l) => s + Math.abs(l.diferenca), 0);

  const aprovar = async () => {
    setAprovando(true);
    // Ao aprovar: ajusta estoque de cada produto com diferença
    const updates = linhas.filter(l => l.diferenca !== 0);
    for (const linha of updates) {
      // Cria movimentação de ajuste
      await base44.entities.MovimentacaoEstoque.create({
        produto_id: linha.produto_id,
        produto_nome: linha.produto_nome,
        tipo: linha.diferenca > 0 ? "Entrada" : "Saída",
        motivo: "Ajuste de Inventário",
        quantidade: Math.abs(linha.diferenca),
        referencia_tipo: "ConferenciaEstoque",
        referencia_id: conf.id,
        observacoes: `Ajuste via auditoria: ${conf.nome_conferencia}`,
      });
      // Atualiza estoque do produto
      await base44.entities.Produto.update(linha.produto_id, {
        estoque_atual: linha.contado,
      });
    }
    await base44.entities.ConferenciaEstoque.update(conf.id, {
      status: "Concluída",
      data_fim: new Date().toISOString(),
    });
    setAprovando(false);
    onVoltar();
  };

  const rejeitar = async () => {
    setRejeitando(true);
    await base44.entities.ConferenciaEstoque.update(conf.id, {
      status: "Em Andamento",
    });
    setRejeitando(false);
    onVoltar();
  };

  const imprimir = () => {
    const conteudo = document.getElementById("relatorio-conferencia");
    if (!conteudo) return;
    const janela = window.open("", "_blank");
    janela.document.write(`
      <html>
        <head>
          <title>Relatório de Conferência – ${conf.nome_conferencia}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 20px; }
            h1 { font-size: 16px; margin-bottom: 4px; }
            .sub { color: #666; font-size: 11px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-size: 11px; border-bottom: 1px solid #e5e7eb; }
            td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; font-size: 11px; }
            .pos { color: #16a34a; } .neg { color: #dc2626; } .zero { color: #9ca3af; }
            .resumo { margin-top: 16px; background: #f9fafb; padding: 10px 12px; border-radius: 6px; }
            .resumo div { margin-bottom: 3px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${conteudo.innerHTML}
          <script>window.onload = function(){ window.print(); window.close(); }<\/script>
        </body>
      </html>
    `);
    janela.document.close();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
  );

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onVoltar} className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold font-glacial text-gray-900 dark:text-white truncate">{conf.nome_conferencia}</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">{conf.tipo_conferencia} · {conf.responsavel_nome}</p>
        </div>
        <button
          onClick={imprimir}
          className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 flex-shrink-0"
          title="Imprimir relatório"
        >
          <Printer className="w-4 h-4" />
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-3 text-center">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase mb-1">Produtos</p>
          <p className="text-xl font-bold font-glacial text-gray-900 dark:text-white">{linhas.length}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-3 text-center">
          <p className="text-[10px] text-orange-500 uppercase mb-1">Divergências</p>
          <p className="text-xl font-bold font-glacial text-orange-600 dark:text-orange-400">{totalDivergencias}</p>
        </div>
        <div className={`rounded-2xl p-3 text-center ${totalFalta > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-green-50 dark:bg-green-900/20"}`}>
          <p className={`text-[10px] uppercase mb-1 ${totalFalta > 0 ? "text-red-500" : "text-green-500"}`}>Falta / Sobra</p>
          <p className={`text-xl font-bold font-glacial ${totalFalta > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
            -{fmt(totalFalta)} / +{fmt(totalSobra)}
          </p>
        </div>
      </div>

      {/* Tabela comparativa */}
      <div className="space-y-2 mb-4" id="relatorio-conferencia">
        {/* Cabeçalho imprimível */}
        <div className="hidden" id="print-header">
          <h1>Relatório de Conferência de Estoque</h1>
          <div className="sub">
            {conf.nome_conferencia} · {conf.tipo_conferencia}<br />
            Responsável: {conf.responsavel_nome}<br />
            Data: {conf.data_fim ? format(new Date(conf.data_fim), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}<br />
            Status: {conf.status}
          </div>
          <div className="resumo">
            <div>Total de produtos: {linhas.length}</div>
            <div>Divergências: {totalDivergencias}</div>
            <div>Total falta: -{fmt(totalFalta)} | Total sobra: +{fmt(totalSobra)}</div>
          </div>
          <br />
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Sistema</th>
                <th>Contado</th>
                <th>Diferença</th>
                <th>Un</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={i}>
                  <td>{l.produto_nome}</td>
                  <td>{fmt(l.sistema)}</td>
                  <td>{fmt(l.contado)}</td>
                  <td className={l.diferenca > 0 ? "pos" : l.diferenca < 0 ? "neg" : "zero"}>
                    {l.diferenca > 0 ? "+" : ""}{fmt(l.diferenca)}
                  </td>
                  <td>{l.unidade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards visuais */}
        {linhas.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
            <p className="text-xs text-gray-400 dark:text-gray-500">Nenhum item conferido</p>
          </div>
        )}

        {linhas.map((linha, i) => {
          const isExp = expandido === i;
          const diff = linha.diferenca;
          return (
            <div key={i} className={`rounded-2xl overflow-hidden ${diff === 0 ? "bg-gray-50 dark:bg-gray-800/40" : diff > 0 ? "bg-green-50 dark:bg-green-900/10" : "bg-red-50 dark:bg-red-900/10"}`}>
              <button onClick={() => setExpandido(isExp ? null : i)} className="w-full flex items-center gap-3 p-3.5 text-left">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${diff === 0 ? "bg-gray-200 dark:bg-gray-700" : diff > 0 ? "bg-green-100 dark:bg-green-900/40" : "bg-red-100 dark:bg-red-900/40"}`}>
                  {diff === 0 ? <MinusIcon className="w-3.5 h-3.5 text-gray-400" /> : diff > 0 ? <TrendingUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{linha.produto_nome}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{linha.unidade}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">Sistema → Contado</p>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {fmt(linha.sistema)} → {fmt(linha.contado)}
                    </p>
                  </div>
                  <span className={`text-sm font-bold font-glacial ${diff === 0 ? "text-gray-400" : diff > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {diff > 0 ? "+" : ""}{fmt(diff)}
                  </span>
                  {isExp ? <ChevronUp className="w-3.5 h-3.5 text-gray-300" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-300" />}
                </div>
              </button>

              {isExp && (
                <div className="border-t border-gray-100 dark:border-gray-700 px-3.5 py-2.5 grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 uppercase mb-0.5">Sistema</p>
                    <p className="text-lg font-bold font-glacial text-gray-700 dark:text-gray-300">{fmt(linha.sistema)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 uppercase mb-0.5">Contado</p>
                    <p className="text-lg font-bold font-glacial text-gray-700 dark:text-gray-300">{fmt(linha.contado)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 uppercase mb-0.5">Diferença</p>
                    <p className={`text-lg font-bold font-glacial ${diff === 0 ? "text-gray-400" : diff > 0 ? "text-green-600" : "text-red-600"}`}>
                      {diff > 0 ? "+" : ""}{fmt(diff)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ações do responsável */}
      {!isConcluida && conf.status === "Aguardando Auditoria" && (
        <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2">
          {totalDivergencias > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-xs text-orange-600 dark:text-orange-400 mb-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span><strong>{totalDivergencias}</strong> produto{totalDivergencias !== 1 ? "s" : ""} com divergência. Ao aprovar, o estoque do sistema será <strong>ajustado automaticamente</strong> para os valores contados.</span>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              onClick={rejeitar}
              disabled={rejeitando || aprovando}
              variant="ghost"
              className="flex-1 h-12 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              {rejeitando ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 mr-2" />Rejeitar</>}
            </Button>
            <Button
              onClick={aprovar}
              disabled={aprovando || rejeitando}
              className="flex-2 flex-1 h-12 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-none"
            >
              {aprovando ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-2" />Aprovar e Ajustar Estoque</>}
            </Button>
          </div>
        </div>
      )}

      {isConcluida && (
        <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Conferência concluída. Estoque ajustado conforme auditoria.</span>
          </div>
        </div>
      )}
    </div>
  );
}