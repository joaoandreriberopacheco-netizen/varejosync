import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, Printer,
  TrendingUp, TrendingDown, Minus, AlertTriangle, Package
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ConferenciaAuditoria({ conferencia, onVoltar, onAtualizar }) {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aprovando, setAprovando] = useState(false);
  const printRef = useRef(null);

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    setLoading(true);
    const prods = await base44.entities.Produto.list("-nome", 2000);
    setProdutos(prods);
    setLoading(false);
  };

  // Constrói comparativo: contado x sistema
  const comparativo = React.useMemo(() => {
    if (!produtos.length) return [];

    // Agrupa contagens por produto
    const contagens = {};
    (conferencia.itens_conferidos || []).forEach(item => {
      if (!contagens[item.produto_id]) contagens[item.produto_id] = { nome: item.produto_nome, total: 0 };
      contagens[item.produto_id].total += item.quantidade_contada || 0;
    });

    return Object.entries(contagens).map(([produto_id, c]) => {
      const prod = produtos.find(p => p.id === produto_id);
      const estoque_sistema = prod?.estoque_atual ?? null;
      const contado = c.total;
      const diferenca = estoque_sistema !== null ? contado - estoque_sistema : null;
      return {
        produto_id,
        produto_nome: c.nome,
        contado,
        estoque_sistema,
        diferenca,
        unidade: prod?.unidade_principal || "UN",
        hierarquia: [prod?.campo_hierarquico_1, prod?.campo_hierarquico_2].filter(Boolean).join(" › "),
      };
    }).sort((a, b) => {
      const da = Math.abs(a.diferenca ?? 0);
      const db = Math.abs(b.diferenca ?? 0);
      return db - da; // maior diferença primeiro
    });
  }, [produtos, conferencia]);

  const totais = React.useMemo(() => {
    const com_dif = comparativo.filter(i => i.diferenca !== null && i.diferenca !== 0);
    const sobras = com_dif.filter(i => i.diferenca > 0).length;
    const faltas = com_dif.filter(i => i.diferenca < 0).length;
    const ok = comparativo.filter(i => i.diferenca === 0).length;
    return { total: comparativo.length, sobras, faltas, ok, com_dif: com_dif.length };
  }, [comparativo]);

  const aprovar = async () => {
    setAprovando(true);
    // Atualiza estoque de cada produto conforme contagem
    for (const item of comparativo) {
      if (item.diferenca !== null && item.diferenca !== 0) {
        const prod = produtos.find(p => p.id === item.produto_id);
        if (prod) {
          await base44.entities.Produto.update(item.produto_id, { estoque_atual: item.contado });
          // Registra movimentação
          await base44.entities.MovimentacaoEstoque.create({
            produto_id: item.produto_id,
            produto_nome: item.produto_nome,
            tipo: item.diferenca > 0 ? "Entrada" : "Saída",
            motivo: "Ajuste de Inventário",
            quantidade: Math.abs(item.diferenca),
            referencia_tipo: "ConferenciaEstoque",
            referencia_id: conferencia.id,
            referencia_numero: conferencia.nome_conferencia,
            observacoes: `Auditoria: ${conferencia.nome_conferencia}`,
          });
        }
      }
    }
    await base44.entities.ConferenciaEstoque.update(conferencia.id, { status: "Concluída" });
    setAprovando(false);
    onAtualizar();
  };

  const reprovar = async () => {
    await base44.entities.ConferenciaEstoque.update(conferencia.id, { status: "Em Andamento" });
    onAtualizar();
  };

  const imprimir = () => {
    const conteudo = printRef.current?.innerHTML;
    if (!conteudo) return;
    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>Relatório de Auditoria — ${conferencia.nome_conferencia}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 20px; }
            h1 { font-size: 16px; margin-bottom: 4px; }
            .sub { color: #666; font-size: 11px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-size: 11px; }
            td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
            .pos { color: #16a34a; font-weight: 600; }
            .neg { color: #dc2626; font-weight: 600; }
            .ok { color: #6b7280; }
            .resumo { display: flex; gap: 24px; margin-bottom: 16px; }
            .resumo-item { background: #f9fafb; padding: 8px 12px; border-radius: 8px; }
            .resumo-item .num { font-size: 18px; font-weight: bold; }
            .resumo-item .label { font-size: 10px; color: #9ca3af; }
          </style>
        </head>
        <body>${conteudo}</body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
    </div>
  );

  const isConcluida = conferencia.status === "Concluída";

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onVoltar} className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold font-glacial text-gray-900 dark:text-white truncate">
            Auditoria — {conferencia.nome_conferencia}
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {conferencia.responsavel_nome} · {conferencia.data_fim ? format(new Date(conferencia.data_fim), "dd/MM/yyyy HH:mm", { locale: ptBR }) : ""}
          </p>
        </div>
        <button
          onClick={imprimir}
          className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400"
          title="Imprimir relatório"
        >
          <Printer className="w-4 h-4" />
        </button>
      </div>

      {/* Conteúdo imprimível */}
      <div ref={printRef}>
        {/* Resumo print */}
        <div className="resumo" style={{ display: "none" }}>
          <h1>Relatório de Auditoria de Estoque</h1>
          <div className="sub">{conferencia.nome_conferencia} · {conferencia.tipo_conferencia} · {conferencia.responsavel_nome} · {conferencia.data_fim ? format(new Date(conferencia.data_fim), "dd/MM/yyyy HH:mm", { locale: ptBR }) : ""}</div>
        </div>

        {/* Cards resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Produtos", value: totais.total, color: "text-gray-900 dark:text-white" },
            { label: "OK", value: totais.ok, color: "text-green-600 dark:text-green-400" },
            { label: "Sobras", value: totais.sobras, color: "text-blue-600 dark:text-blue-400" },
            { label: "Faltas", value: totais.faltas, color: "text-red-600 dark:text-red-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-3">
              <div className={`text-2xl font-bold font-glacial ${color}`}>{value}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabela comparativa */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-3 py-2.5 text-gray-500 dark:text-gray-400 font-medium rounded-l-xl">Produto</th>
                <th className="text-right px-3 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Contado</th>
                <th className="text-right px-3 py-2.5 text-gray-500 dark:text-gray-400 font-medium">Sistema</th>
                <th className="text-right px-3 py-2.5 text-gray-500 dark:text-gray-400 font-medium rounded-r-xl">Diferença</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {comparativo.map(item => {
                const dif = item.diferenca;
                const difColor = dif === null ? "text-gray-400" : dif > 0 ? "text-blue-600 dark:text-blue-400" : dif < 0 ? "text-red-600 dark:text-red-400" : "text-gray-400";
                const DifIcon = dif === null ? Minus : dif > 0 ? TrendingUp : dif < 0 ? TrendingDown : Minus;
                return (
                  <tr key={item.produto_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-gray-900 dark:text-white truncate max-w-[160px]">{item.produto_nome}</p>
                      {item.hierarquia && <p className="text-[10px] text-gray-400 dark:text-gray-500">{item.hierarquia}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-800 dark:text-gray-200">
                      {item.contado} {item.unidade}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-500 dark:text-gray-400">
                      {item.estoque_sistema !== null ? `${item.estoque_sistema} ${item.unidade}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`inline-flex items-center gap-1 font-semibold ${difColor}`}>
                        <DifIcon className="w-3 h-3" />
                        {dif === null ? "—" : dif > 0 ? `+${dif}` : dif === 0 ? "OK" : `${dif}`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ações aprovação */}
      {!isConcluida && conferencia.status === "Aguardando Auditoria" && (
        <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-4 space-y-2">
          {totais.com_dif > 0 && (
            <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-2xl px-4 py-3 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {totais.com_dif} produto{totais.com_dif !== 1 ? "s" : ""} com divergência. Ao aprovar, o estoque será ajustado automaticamente.
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={reprovar}
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
            >
              <XCircle className="w-4 h-4 mr-1.5" /> Reprovar / Recontar
            </Button>
            <Button
              onClick={aprovar}
              disabled={aprovando}
              className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-none"
            >
              {aprovando ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Aprovar e Ajustar</>}
            </Button>
          </div>
        </div>
      )}

      {isConcluida && (
        <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-4">
          <div className="flex items-center gap-2.5 bg-green-50 dark:bg-green-900/20 rounded-2xl px-4 py-3">
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
            <p className="text-xs text-green-700 dark:text-green-400 font-medium">Auditoria concluída e estoque ajustado.</p>
          </div>
        </div>
      )}
    </div>
  );
}