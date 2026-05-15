import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { COLUNAS_SOMENTE_EMBALAGENS } from './colunasConfig';
import { normalizeAlternativeUnits, normalizeUnitCode, getUnidadeExibicaoSigla } from '@/lib/productUnits';
import { dataHoje } from '@/components/utils/dateUtils';

function getAlternativasRaw(produto) {
  const raw = produto?.unidades_alternativas;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {
      // ignora parse inválido, fallback para vazio
    }
  }
  return [];
}

function montarContextoAlternativas(produto, principal, altsAtivas = []) {
  const raw = getAlternativasRaw(produto).map((a) => ({
    unidade: normalizeUnitCode(a?.unidade),
    fator_conversao: Number(a?.fator_conversao) || 0,
    rotulo: typeof a?.rotulo === 'string'
      ? a.rotulo.trim()
      : (typeof a?.rotulo_comercial === 'string' ? a.rotulo_comercial.trim() : ''),
    ajuste_percentual: Number(a?.ajuste_percentual) || 0,
    ativo: a?.ativo !== false,
  })).filter((a) => a.unidade);
  const origem = raw.length > 0 ? raw : altsAtivas;
  if (!origem.length) return '';
  return origem
    .map((a) => {
      const flag = a.ativo === false ? 'inativo' : 'ativo';
      const rot = a.rotulo ? ` (${a.rotulo})` : '';
      const fator = a.fator_conversao ? `${a.fator_conversao}` : '?';
      const ajuste = Number(a.ajuste_percentual) || 0;
      const sinal = ajuste > 0 ? `+${ajuste}` : `${ajuste}`;
      return `${a.unidade}${rot}: 1 = ${fator} ${principal}, ajuste ${sinal}% [${flag}]`;
    })
    .join(' | ');
}

function produtoParaLinhaEmbalagens(p) {
  const row = {
    id: p.id,
    codigo_interno: p.codigo_interno || '',
    nome: p.nome || '',
  };
  const principal = normalizeUnitCode(p.unidade_principal) || 'UN';
  row.emb1_rotulo = '';
  row.emb1_sigla = principal;
  row.emb1_fator = 1;
  row.emb1_ajuste = 0;
  const alts = normalizeAlternativeUnits(p);
  for (let i = 0; i < 4; i++) {
    const a = alts[i];
    const n = i + 2;
    row[`emb${n}_rotulo`] = a?.rotulo ?? '';
    row[`emb${n}_sigla`] = a?.unidade ?? '';
    row[`emb${n}_fator`] = a?.fator_conversao ?? '';
    row[`emb${n}_ajuste`] = a?.ajuste_percentual ?? '';
  }
  row.unidade_vitrine = getUnidadeExibicaoSigla(p, principal);
  row.embalagens_alternativas_contexto = montarContextoAlternativas(p, principal, alts);
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
