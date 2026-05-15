import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { COLUNAS_SOMENTE_EMBALAGENS } from './colunasConfig';
import { MAX_ALTERNATIVAS_PLANILHA, vitrineArmazenadaDoProduto } from './embalagensPlanilhaUtils';
import { normalizeUnitCode } from '@/lib/productUnits';
import { dataHoje } from '@/components/utils/dateUtils';

/**
 * Lista até N alternativas para a planilha, **incluindo inativas**.
 * `normalizeAlternativeUnits` filtra `ativo === false`, o que gerava export sem a sigla
 * ainda referenciada em `unidade_vitrine` — o import rejeitava na validação.
 */
function alternativasParaPlanilhaEmbalagens(produto) {
  const raw = Array.isArray(produto?.unidades_alternativas) ? produto.unidades_alternativas : [];
  const out = [];
  for (const item of raw) {
    const u = normalizeUnitCode(item?.unidade);
    if (!u) continue;
    out.push(item);
    if (out.length >= MAX_ALTERNATIVAS_PLANILHA) break;
  }
  return out;
}

function produtoParaLinhaEmbalagens(p) {
  const principal = normalizeUnitCode(p.unidade_principal) || 'UN';
  const row = {
    id: p.id,
    codigo_interno: p.codigo_interno || '',
    nome: p.nome || '',
    emb1_sigla: principal,
    emb1_fator: 1,
    emb1_ajuste: 1,
  };
  const alts = alternativasParaPlanilhaEmbalagens(p);
  for (let i = 0; i < MAX_ALTERNATIVAS_PLANILHA; i++) {
    const a = alts[i];
    const n = i + 2;
    row[`emb${n}_sigla`] = a?.unidade ?? '';
    row[`emb${n}_fator`] = a?.fator_conversao ?? '';
    if (!a) {
      row[`emb${n}_ajuste`] = '';
    } else {
      const fpRaw = Number(a.fator_preco);
      const adj = Number(a.ajuste_percentual) || 0;
      const fp = fpRaw > 0 ? fpRaw : 1 + adj / 100;
      row[`emb${n}_ajuste`] = fp;
    }
  }
  row.unidade_vitrine = vitrineArmazenadaDoProduto(p, principal);
  return row;
}

export default function ExportarEmbalagensPlanilha() {
  const [loading, setLoading] = useState(false);

  const handleExportar = async () => {
    setLoading(true);
    try {
      let produtos = [];
      let skip = 0;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const batch = await base44.entities.Produto.list('-updated_date', pageSize, skip);
        if (batch.length === 0) {
          hasMore = false;
        } else {
          produtos = produtos.concat(batch);
          skip += pageSize;
        }
      }

      const wb = new ExcelJS.Workbook();
      wb.creator = 'VarejoSync';
      const ws = wb.addWorksheet('Embalagens', { views: [{ state: 'frozen', ySplit: 1 }] });

      ws.columns = COLUNAS_SOMENTE_EMBALAGENS.map((col) => ({
        header: col.label,
        key: col.key,
        width: col.width || 18,
      }));

      const headerRow = ws.getRow(1);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      headerRow.height = 22;

      produtos.forEach((p) => {
        ws.addRow(produtoParaLinhaEmbalagens(p));
      });

      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const colConfig = COLUNAS_SOMENTE_EMBALAGENS[colNumber - 1];
          const locked = colConfig && !colConfig.editavel;
          cell.protection = { locked: !!locked };
          if (colConfig?.tipo === 'numero' && cell.value !== '' && cell.value != null) {
            cell.numFmt = '#,##0.00';
          }
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `embalagens-unidades_${dataHoje()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" variant="outline" onClick={handleExportar} disabled={loading} className="border-0 shadow-sm rounded-xl">
      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
      Baixar planilha (embalagens)
    </Button>
  );
}
