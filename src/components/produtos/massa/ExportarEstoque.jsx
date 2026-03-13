import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';

export default function ExportarEstoque() {
  const [loading, setLoading] = useState(false);

  const handleExportar = async () => {
    setLoading(true);
    try {
      const produtos = await base44.entities.Produto.list('-updated_date', 2000);

      const wb = new ExcelJS.Workbook();
      wb.creator = 'VarejoSync';
      const ws = wb.addWorksheet('Estoque', { views: [{ state: 'frozen', ySplit: 1 }] });

      ws.columns = [
        { header: 'ID', key: 'id', width: 30 },
        { header: 'Nome do Produto', key: 'nome', width: 50 },
        { header: 'Estoque Atual', key: 'estoque_atual', width: 15 },
      ];

      const headerRow = ws.getRow(1);
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.protection = { locked: true };
      });
      headerRow.height = 24;

      produtos.forEach((p) => {
        const row = ws.addRow({
          id: p.id,
          nome: p.nome || '',
          estoque_atual: p.estoque_atual || 0,
        });

        row.getCell(1).protection = { locked: true };
        row.getCell(2).protection = { locked: true };
        row.getCell(3).protection = { locked: false };
        row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        row.getCell(3).numFmt = '#,##0';
      });

      ws.dataValidations.add('C2:C' + (produtos.length + 1001), {
        type: 'decimal',
        operator: 'greaterThanOrEqual',
        showErrorMessage: true,
        errorTitle: 'Valor inválido',
        error: 'Estoque deve ser um número.',
        formulae: [0],
      });

      await ws.protect('', {
        formatCells: true,
        selectLockedCells: true,
        selectUnlockedCells: true,
      });

      ws.autoFilter = { from: 'A1', to: 'C1' };

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estoque_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
      {loading ? 'Gerando planilha...' : 'Exportar Estoque (.xlsx)'}
    </Button>
  );
}