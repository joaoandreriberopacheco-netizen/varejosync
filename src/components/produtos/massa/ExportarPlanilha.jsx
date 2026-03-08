import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { COLUNAS_CONFIG } from './colunasConfig.jsx';

export default function ExportarPlanilha() {
  const [loading, setLoading] = useState(false);

  const handleExportar = async () => {
    setLoading(true);
    try {
      const produtos = await base44.entities.Produto.list('-updated_date', 2000);

      const wb = new ExcelJS.Workbook();
      wb.creator = 'VarejoSync';
      const ws = wb.addWorksheet('Produtos', { views: [{ state: 'frozen', ySplit: 1 }] });

      // Definir colunas
      ws.columns = COLUNAS_CONFIG.map(col => ({
        header: col.label,
        key: col.key,
        width: col.width || 20,
      }));

      // Estilo do cabeçalho
      const headerRow = ws.getRow(1);
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.protection = { locked: true };
      });
      headerRow.height = 24;

      // Adicionar linhas
      produtos.forEach(p => {
        const row = ws.addRow(
          COLUNAS_CONFIG.reduce((acc, col) => {
            acc[col.key] = p[col.key] ?? '';
            return acc;
          }, {})
        );

        // Bloquear células não-editáveis, desbloquear editáveis
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const colConfig = COLUNAS_CONFIG[colNumber - 1];
          cell.protection = { locked: colConfig ? !colConfig.editavel : true };

          // Colorir células editáveis levemente
          if (colConfig?.editavel) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
          }
        });
      });

      // Proteção suave: sem senha, permite formatação e inserção de colunas
      await ws.protect('', {
        selectLockedCells: true,
        selectUnlockedCells: true,
        formatCells: true,
        formatColumns: true,
        formatRows: true,
        insertColumns: true,
        insertRows: false,
        deleteColumns: false,
        deleteRows: false,
        sort: true,
        autoFilter: true,
      });

      // Auto-filtro
      ws.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + COLUNAS_CONFIG.length)}1` };

      // Download
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