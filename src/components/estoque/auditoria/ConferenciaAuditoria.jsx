import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, Printer,
  TrendingUp, TrendingDown, Minus, AlertTriangle, Package
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { openPrintWindowOrShareHtml } from "@/lib/mobilePrintAndShare";

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
        if (prod && prod.campo_hierarquico_1) {
          // Patch mínimo — apenas o campo de estoque
          await base44.entities.Produto.update(item.produto_id, {
            campo_hierarquico_1: prod.campo_hierarquico_1,
            estoque_atual: item.contado,
          });
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

  const imprimir = async () => {
    const dataFim = conferencia.data_fim ? format(new Date(conferencia.data_fim), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "";
    const linhas = comparativo.map(item => {
      const dif = item.diferenca;
      const difStr = dif === null ? "—" : dif === 0 ? "OK" : dif > 0 ? `+${dif}` : `${dif}`;
      const difClass = dif > 0 ? "pos" : dif < 0 ? "neg" : "ok";
      return `
        <tr>
          <td>${item.produto_nome}</td>
          <td style="text-align:center">${item.contado} ${item.unidade}</td>
          <td style="text-align:center">${item.estoque_sistema ?? "—"} ${item.unidade}</td>
          <td style="text-align:center" class="${difClass}">${difStr}</td>
        </tr>`;
    }).join("");

    const html = `
      <html>
        <head>
          <title>Relatório de Auditoria — ${conferencia.nome_conferencia}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 18px; margin: 0 0 4px; color: #111; }
            .sub { color: #6b7280; font-size: 11px; margin-bottom: 20px; }
            .resumo { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
            .resumo-item { background: #f9fafb; border-radius: 8px; padding: 10px 16px; min-width: 80px; text-align: center; }
            .resumo-item .num { font-size: 22px; font-weight: 700; }
            .resumo-item .label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
            .num-total { color: #111; }
            .num-ok { color: #16a34a; }
            .num-sobras { color: #374151; }
            .num-faltas { color: #dc2626; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            thead th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
            thead th:not(:first-child) { text-align: center; }
            tbody td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; font-size: 12px; vertical-align: middle; }
            tbody td:not(:first-child) { text-align: center; }
            tbody tr:hover { background: #fafafa; }
            .pos { color: #374151; font-weight: 600; }
            .neg { color: #dc2626; font-weight: 600; }
            .ok { color: #16a34a; font-weight: 600; }
            .footer { margin-top: 24px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
          </style>
        </head>
        <body>
          <h1>Relatório de Auditoria de Estoque</h1>
          <div class="sub">${conferencia.nome_conferencia} · ${conferencia.tipo_conferencia || ""} · ${conferencia.responsavel_nome || ""} · ${dataFim}</div>
          <div class="resumo">
            <div class="resumo-item"><div class="num num-total">${totais.total}</div><div class="label">Total</div></div>
            <div class="resumo-item"><div class="num num-ok">${totais.ok}</div><div class="label">OK</div></div>
            <div class="resumo-item"><div class="num num-sobras">${totais.sobras}</div><div class="label">Sobras</div></div>
            <div class="resumo-item"><div class="num num-faltas">${totais.faltas}</div><div class="label">Faltas</div></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Contado</th>
                <th>Sistema</th>
                <th>Diferença</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
          <div class="footer">Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })} · Status: ${conferencia.status}</div>
        </body>
      </html>
    `;
    try {
      await openPrintWindowOrShareHtml(
        html,
        `auditoria-${String(conferencia.nome_conferencia || "relatorio").replace(/\s+/g, "-")}.html`,
        `Auditoria ${conferencia.nome_conferencia || ""}`
      );
    } catch {
      /* popup bloqueado */
    }
  };

  if (loading) return (
    <div className="fixed inset-0 bg-white dark:bg-gray-950 flex items-center justify-center z-50">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-gray-500" />
    </div>
  );

  const isConcluida = conferencia.status === "Concluída";
  const dataFimFmt = conferencia.data_fim ? format(new Date(conferencia.data_fim), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "";

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-950 z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4 flex-shrink-0">
        <button
          onClick={onVoltar}
          className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold font-glacial text-gray-900 dark:text-white truncate">{conferencia.nome_conferencia}</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">{conferencia.responsavel_nome} · {dataFimFmt}</p>
        </div>
        <button
          onClick={imprimir}
          className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400"
        >
          <Printer className="w-4 h-4" />
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-2 px-4 pb-4 flex-shrink-0">
        {[
          { label: "Total", value: totais.total, color: "text-gray-900 dark:text-white" },
          { label: "OK", value: totais.ok, color: "text-green-600 dark:text-green-400" },
          { label: "Sobras", value: totais.sobras, color: "text-gray-700 dark:text-gray-300" },
          { label: "Faltas", value: totais.faltas, color: "text-red-600 dark:text-red-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-3 text-center">
            <div className={`text-2xl font-bold font-glacial leading-none ${color}`}>{value}</div>
            <div className="text-[9px] text-gray-400 dark:text-gray-600 mt-1.5 uppercase tracking-wider">{label}</div>
          </div>
        ))}
      </div>

      {/* Lista scrollável */}
      <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
        {comparativo.map(item => {
          const dif = item.diferenca;
          const difColor = dif === null ? "text-gray-400" : dif > 0 ? "text-gray-700 dark:text-gray-300" : dif < 0 ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400";
          const DifIcon = dif === null ? Minus : dif > 0 ? TrendingUp : dif < 0 ? TrendingDown : Minus;
          const hasDif = dif !== null && dif !== 0;
          return (
            <div
              key={item.produto_id}
              className={`rounded-2xl px-4 py-3 ${hasDif ? "bg-gray-50 dark:bg-gray-900" : "bg-gray-50/60 dark:bg-gray-900/60"}`}
            >
              <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug break-words mb-2">{item.produto_nome}</p>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-semibold text-gray-700 dark:text-gray-200">{item.contado}</span>
                  <span className="text-gray-300 dark:text-gray-700">·</span>
                  <span className="text-gray-400 dark:text-gray-500">{item.estoque_sistema ?? "—"} {item.unidade}</span>
                </div>
                <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${difColor}`}>
                  <DifIcon className="w-3 h-3" />
                  {dif === null ? "—" : dif === 0 ? "OK" : dif > 0 ? `+${dif}` : `${dif}`}
                </span>
              </div>
            </div>
          );
        })}
        {comparativo.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-300 dark:text-gray-700">
            <Package className="w-10 h-10 mb-3" />
            <p className="text-sm">Nenhum item conferido</p>
          </div>
        )}
      </div>

      {/* Footer ações */}
      <div className="flex-shrink-0 px-4 pb-20 pt-3 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-900">
        {!isConcluida && conferencia.status === "Aguardando Auditoria" && (
          <>
            {totais.com_dif > 0 && (
              <div className="flex items-start gap-2.5 bg-gray-50 dark:bg-gray-900 rounded-2xl px-4 py-3 mb-3">
                <AlertTriangle className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {totais.com_dif} produto{totais.com_dif !== 1 ? "s" : ""} com divergência. Ao aprovar, o estoque será ajustado automaticamente.
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={reprovar}
                className="flex-1 h-12 rounded-2xl bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 border-0"
              >
                <XCircle className="w-4 h-4 mr-2" /> Recontar
              </Button>
              <Button
                onClick={aprovar}
                disabled={aprovando}
                className="flex-1 h-12 rounded-2xl bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 shadow-none font-semibold"
              >
                {aprovando ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Aprovar</>}
              </Button>
            </div>
          </>
        )}
        {isConcluida && (
          <div className="flex items-center gap-2.5 bg-green-50 dark:bg-green-950/60 rounded-2xl px-4 py-3">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-500 flex-shrink-0" />
            <p className="text-xs text-green-700 dark:text-green-400 font-medium">Auditoria concluída e estoque ajustado.</p>
          </div>
        )}
      </div>
    </div>
  );
}