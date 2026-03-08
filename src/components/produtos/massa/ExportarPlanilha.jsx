import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { COLUNAS_CONFIG } from './colunasConfig';

// Índice (1-based) de colunas especiais
function getColIndex(key) {
  return COLUNAS_CONFIG.findIndex(c => c.key === key) + 1;
}

function colLetter(index) {
  let result = '';
  while (index > 0) {
    index--;
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26);
  }
  return result;
}

export default function ExportarPlanilha() {
  const [loading, setLoading] = useState(false);

  const handleExportar = async () => {
    setLoading(true);
    try {
      const produtos = await base44.entities.Produto.list('-updated_date', 2000);

      const wb = new ExcelJS.Workbook();
      wb.creator = 'VarejoSync';
      const ws = wb.addWorksheet('Produtos', { views: [{ state: 'frozen', ySplit: 1 }] });

      // Montar colunas (sem preco_venda_percentual — Margem removida)
      ws.columns = COLUNAS_CONFIG.map(col => ({
        header: col.label,
        key: col.key,
        width: col.width || 20,
      }));

      // ── Linha 1: cabeçalhos sempre locked ─────────────────────────────────
      const headerRow = ws.getRow(1);
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.protection = { locked: true };
      });
      headerRow.height = 24;

      // Índices relevantes para fórmulas e formatação condicional
      const idxValorCompra       = getColIndex('valor_compra');
      const idxFrete             = getColIndex('custo_frete_padrao');
      const idxImposto1          = getColIndex('custo_imposto1_padrao');
      const idxImposto2          = getColIndex('custo_imposto2_padrao');
      const idxDesconto          = getColIndex('desconto_compra_padrao');
      const idxCustoCalc         = getColIndex('custo_total_calculado');
      const idxPrecoVenda        = getColIndex('preco_venda_padrao');
      const idxId                = getColIndex('id');

      const letCustoCalc  = colLetter(idxCustoCalc);
      const letPrecoVenda = colLetter(idxPrecoVenda);
      const letId         = colLetter(idxId);
      const letValorCompra = colLetter(idxValorCompra);
      const letFrete       = colLetter(idxFrete);
      const letImposto1    = colLetter(idxImposto1);
      const letImposto2    = colLetter(idxImposto2);
      const letDesconto    = colLetter(idxDesconto);
      const lastCol        = colLetter(COLUNAS_CONFIG.length);

      // ── Data validation por coluna (schema-driven) ─────────────────────────
      const EXTRA_BLANK_ROWS = 200; // linhas em branco disponíveis para novos produtos
      const maxRows = 1 + produtos.length + EXTRA_BLANK_ROWS;

      COLUNAS_CONFIG.forEach((col, idx) => {
        const letter = colLetter(idx + 1);
        const range = `${letter}2:${letter}${maxRows}`;

        if (col.tipo === 'numero') {
          ws.dataValidations.add(range, {
            type: 'decimal',
            operator: 'greaterThanOrEqual',
            showErrorMessage: true,
            errorTitle: 'Valor inválido',
            error: `"${col.label}" deve ser um número.`,
            formulae: [0],
          });
        } else if (col.tipo === 'boolean') {
          ws.dataValidations.add(range, {
            type: 'list',
            allowBlank: true,
            showDropDown: false,
            formulae: ['"true,false"'],
          });
        }
      });

      // ── Linhas de dados ────────────────────────────────────────────────────
      produtos.forEach((p, dataRowIdx) => {
        const rowNumber = dataRowIdx + 2; // linha 2 em diante

        const custoCalc =
          (p.valor_compra || 0)
          + (p.custo_frete_padrao || 0)
          + (p.custo_imposto1_padrao || 0)
          + (p.custo_imposto2_padrao || 0)
          - (p.desconto_compra_padrao || 0);

        const rowData = {};
        COLUNAS_CONFIG.forEach(col => {
          if (col.key === 'custo_total_calculado') {
            // Fórmula dinâmica no Excel
            rowData[col.key] = {
              formula: `=${letValorCompra}${rowNumber}+${letFrete}${rowNumber}+${letImposto1}${rowNumber}+${letImposto2}${rowNumber}-${letDesconto}${rowNumber}`,
              result: custoCalc,
            };
          } else {
            rowData[col.key] = p[col.key] ?? '';
          }
        });

        const row = ws.addRow(rowData);

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const colConfig = COLUNAS_CONFIG[colNumber - 1];
          const isLocked = !colConfig || !colConfig.editavel;
          cell.protection = { locked: isLocked };

          if (colConfig?.editavel) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
          } else if (colConfig?.calculado) {
            // colunas calculadas: fundo azul claro
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
            cell.font = { italic: true, color: { argb: 'FF0369A1' } };
          }

          if (colConfig?.tipo === 'numero') {
            cell.numFmt = '#,##0.00';
          }
        });
      });

      // ── Desbloquear células editáveis nas linhas em branco ────────────────
      // O Excel bloqueia todas as células não tocadas por padrão ao ativar proteção.
      // É necessário iterar as linhas vazias e definir explicitamente locked: false
      // nas colunas editáveis para que o usuário possa cadastrar novos produtos.
      const firstBlankRow = produtos.length + 2;
      const lastBlankRow  = maxRows;

      for (let r = firstBlankRow; r <= lastBlankRow; r++) {
        const row = ws.getRow(r);
        COLUNAS_CONFIG.forEach((col, idx) => {
          const cell = row.getCell(idx + 1);
          if (col.editavel) {
            cell.protection = { locked: false };
          } else {
            // ID e calculado: mantém locked nas linhas vazias também
            cell.protection = { locked: true };
          }
        });
        row.commit();
      }

      // ── Formatação Condicional ─────────────────────────────────────────────
      const dataRange = `A2:${lastCol}${maxRows}`;
      const precoRange = `${letPrecoVenda}2:${letPrecoVenda}${maxRows}`;

      // 1. Preço de Venda com fundo vermelho se < Custo Calculado
      ws.addConditionalFormatting({
        ref: precoRange,
        rules: [
          {
            type: 'expression',
            priority: 1,
            formulae: [`${letPrecoVenda}2<${letCustoCalc}2`],
            style: {
              fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFCA5A5' } },
              font: { color: { argb: 'FF991B1B' }, bold: true },
            },
          },
        ],
      });

      // 2. Linha inteira em verde se ID estiver vazio (novo produto)
      ws.addConditionalFormatting({
        ref: dataRange,
        rules: [
          {
            type: 'expression',
            priority: 2,
            formulae: [`$${letId}2=""`],
            style: {
              font: { color: { argb: 'FF166534' } },
              fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFF0FDF4' } },
            },
          },
        ],
      });

      // ── Proteção da planilha (sem senha) ──────────────────────────────────
      await ws.protect('', {
        insertColumns: true,
        formatCells: true,
        selectLockedCells: true,
        selectUnlockedCells: true,
      });

      ws.autoFilter = { from: 'A1', to: `${lastCol}1` };

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `produtos_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleExportar}
      disabled={loading}
      variant="outline"
      className="gap-2 border-gray-200 dark:border-gray-700"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {loading ? 'Gerando planilha...' : 'Exportar Produtos (.xlsx)'}
    </Button>
  );
}