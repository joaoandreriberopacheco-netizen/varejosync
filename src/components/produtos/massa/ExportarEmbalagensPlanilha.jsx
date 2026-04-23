import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { COLUNAS_SOMENTE_EMBALAGENS } from './colunasConfig';
import { normalizeAlternativeUnits } from '@/lib/productUnits';
import { dataHoje } from '@/components/utils/dateUtils';

function produtoParaLinhaEmbalagens(p) {
  const row = {
    id: p.id,
    codigo_interno: p.codigo_interno || '',
    nome: p.nome || '',
  };
  const alts = normalizeAlternativeUnits(p);
  for (let i = 0; i < 5; i++) {
    const a = alts[i];
    const n = i + 1;
    row[`emb${n}_rotulo`] = a?.rotulo ?? '';
    row[`emb${n}_sigla`] = a?.unidade ?? '';
    row[`emb${n}_fator`] = a?.fator_conversao ?? '';
    row[`emb${n}_ajuste`] = a?.ajuste_percentual ?? '';
  }
  row.unidade_apresentacao_default = p.unidade_apresentacao_default || '';
  row.unidade_show_comercial = p.unidade_show_comercial || '';
  row.unidade_show_logistica = p.unidade_show_logistica || '';
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
        if (batch.length === 0) hasMore = false;
        else {
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
      Baixar planilha de embalagens
    </Button>
  );
}
