import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';

const COLUNAS_CONFIG = [
  { key: 'id',                      label: 'ID (não editar)',        editavel: false, width: 28, tipo: 'string' },
  { key: 'codigo_interno',          label: 'Cód. Interno',           editavel: false, width: 14, tipo: 'string' },
  { key: 'campo_hierarquico_1',     label: 'Nível 1 (*)',            editavel: true,  width: 28, tipo: 'string' },
  { key: 'campo_hierarquico_2',     label: 'Nível 2',                editavel: true,  width: 20, tipo: 'string' },
  { key: 'campo_hierarquico_3',     label: 'Nível 3',                editavel: true,  width: 18, tipo: 'string' },
  { key: 'campo_hierarquico_4',     label: 'Nível 4',                editavel: true,  width: 18, tipo: 'string' },
  { key: 'campo_hierarquico_5',     label: 'Nível 5',                editavel: true,  width: 18, tipo: 'string' },
  { key: 'codigo_barras',           label: 'Cód. Barras',            editavel: true,  width: 18, tipo: 'string' },
  { key: 'marca',                   label: 'Marca',                  editavel: true,  width: 16, tipo: 'string' },
  { key: 'tipo',                    label: 'Tipo',                   editavel: true,  width: 12, tipo: 'string' },
  { key: 'categoria_nome',          label: 'Categoria',              editavel: true,  width: 20, tipo: 'string' },
  { key: 'area_codigo',             label: 'Área',                   editavel: true,  width: 14, tipo: 'string' },
  { key: 'valor_compra',            label: 'Valor Compra (R$)',      editavel: true,  width: 18, tipo: 'numero' },
  { key: 'custo_frete_padrao',      label: 'Frete Padrão (R$)',      editavel: true,  width: 18, tipo: 'numero' },
  { key: 'custo_imposto1_padrao',   label: 'Imposto 1',              editavel: true,  width: 14, tipo: 'numero' },
  { key: 'custo_imposto2_padrao',   label: 'Imposto 2',              editavel: true,  width: 14, tipo: 'numero' },
  { key: 'desconto_compra_padrao',  label: 'Desconto Compra',        editavel: true,  width: 16, tipo: 'numero' },
  { key: 'preco_venda_padrao',      label: 'Preço Venda (*)',        editavel: true,  width: 18, tipo: 'numero' },
  { key: 'preco_venda_percentual',  label: 'Margem %',               editavel: true,  width: 14, tipo: 'numero' },
  { key: 'unidade_principal',       label: 'Unidade',                editavel: true,  width: 12, tipo: 'string' },
  { key: 'unidades_por_pacote',     label: 'Qtd/Pacote',             editavel: true,  width: 14, tipo: 'numero' },
  { key: 'estoque_minimo',          label: 'Estoque Mínimo',         editavel: true,  width: 16, tipo: 'numero' },
  { key: 'estoque_ideal',           label: 'Estoque Ideal',          editavel: true,  width: 16, tipo: 'numero' },
  { key: 'estoque_maximo',          label: 'Estoque Máximo',         editavel: true,  width: 16, tipo: 'numero' },
  { key: 'tempo_reposicao_dias',    label: 'Tempo Reposição (dias)', editavel: true,  width: 22, tipo: 'numero' },
  { key: 'peso_kg',                 label: 'Peso (kg)',              editavel: true,  width: 12, tipo: 'numero' },
  { key: 'dimensoes_cm',            label: 'Dimensões (cm)',         editavel: true,  width: 18, tipo: 'string' },
  { key: 'ativo',                   label: 'Ativo (SIM/NÃO)',        editavel: true,  width: 14, tipo: 'boolean' },
];

export default function ExportarPlanilha() {
  const [loading, setLoading] = useState(false);

  const handleExportar = async () => {
    setLoading(true);
    try {
      const produtos = await base44.entities.Produto.list('-updated_date', 2000);

      const wb = new ExcelJS.Workbook();
      wb.creator = 'VarejoSync';
      const ws = wb.addWorksheet('Produtos', { views: [{ state: 'frozen', ySplit: 1 }] });

      ws.columns = COLUNAS_CONFIG.map(col => ({
        header: col.label,
        key: col.key,
        width: col.width || 20,
      }));

      const headerRow = ws.getRow(1);
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.protection = { locked: true };
      });
      headerRow.height = 24;

      produtos.forEach(p => {
        const row = ws.addRow(
          COLUNAS_CONFIG.reduce((acc, col) => {
            acc[col.key] = p[col.key] ?? '';
            return acc;
          }, {})
        );

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const colConfig = COLUNAS_CONFIG[colNumber - 1];
          cell.protection = { locked: colConfig ? !colConfig.editavel : true };
          if (colConfig?.editavel) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
          }
        });
      });

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

      ws.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + COLUNAS_CONFIG.length)}1` };

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