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

function normNum(value) {
  if (value === null || value === undefined || value === '') return '0';
  const normalized = String(value).trim().replace(',', '.');
  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? '0' : Math.round(parsed * 100).toString();
}

function normStr(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function computeChecksum(produto) {
  // Checksum simples — só quer saber se algo mudou
  const concat = [
    normStr(produto.campo_hierarquico_1),
    normStr(produto.campo_hierarquico_2),
    normStr(produto.campo_hierarquico_3),
    normStr(produto.campo_hierarquico_4),
    normStr(produto.campo_hierarquico_5),
    normStr(produto.codigo_barras),
    normStr(produto.marca),
    normStr(produto.tipo),
    normStr(produto.abcd),
    normStr(produto.categoria_nome),
    normStr(produto.area_codigo),
    normNum(produto.valor_compra),
    normNum(produto.casas_decimais),
    normNum(produto.desconto_perc ?? 0),
    normNum(produto.custo_frete_padrao),
    normNum(produto.custo_imposto1_padrao),
    normNum(produto.custo_imposto2_padrao),
    normNum(produto.desconto_compra_padrao ?? 0),
    normNum(produto.preco_venda_padrao),
    normStr(produto.unidade_principal),
    normNum(produto.unidades_por_pacote),
    normNum(produto.estoque_minimo),
    normNum(produto.estoque_ideal),
    normNum(produto.estoque_maximo),
    normNum(produto.tempo_reposicao_dias),
    normNum(produto.peso_kg),
    normStr(produto.dimensoes_cm),
    produto.ativo !== false ? 'sim' : 'não',
  ].join('|');
  // CRC16 simples
  let crc = 0;
  for (let i = 0; i < concat.length; i++) {
    crc = ((crc << 8) ^ (concat.charCodeAt(i))) & 0xffff;
  }
  return crc.toString(16).padStart(4, '0').toUpperCase();
}

function normalizeBooleanCell(value) {
  if (value === true) return 'true';
  if (value === false) return 'false';
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['sim', 'true', 'verdadeiro', '1'].includes(normalized)) return 'true';
  if (['não', 'nao', 'false', 'falso', '0'].includes(normalized)) return 'false';
  return 'false';
}

function hashFormula(rowNumber) {
   // Fórmula quebrada em partes em colunas auxiliares (hidden)
   return `AI${rowNumber}`; // Referência à coluna auxiliar que já faz o cálculo
}

export default function ExportarPlanilha() {
  const [loading, setLoading] = useState(false);

  const handleExportar = async () => {
    setLoading(true);
    try {
      // Carregar todos os produtos sem limite
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
      const idxDescontoPerc      = getColIndex('desconto_perc');
      const idxFrete             = getColIndex('custo_frete_padrao');
      const idxImposto1          = getColIndex('custo_imposto1_padrao');
      const idxImposto2          = getColIndex('custo_imposto2_padrao');
      const idxH1                = getColIndex('campo_hierarquico_1');
      const idxCustoCalc         = getColIndex('custo_total_calculado');
      const idxPrecoVenda        = getColIndex('preco_venda_padrao');
      const idxId                = getColIndex('id');
      const idxHashOrig          = getColIndex('_hash_orig');
      const idxAlterado          = getColIndex('alterado');


      const letCustoCalc   = colLetter(idxCustoCalc);
      const letPrecoVenda  = colLetter(idxPrecoVenda);
      const letId          = colLetter(idxId);
      const letValorCompra = colLetter(idxValorCompra);
      const letDescontoPerc = colLetter(idxDescontoPerc);
      const letFrete       = colLetter(idxFrete);
      const letImposto1    = colLetter(idxImposto1);
      const letImposto2    = colLetter(idxImposto2);
      const letH1          = colLetter(idxH1);
      const letHashOrig    = colLetter(idxHashOrig);
      const letAlterado    = colLetter(idxAlterado);
      const lastCol        = colLetter(COLUNAS_CONFIG.length);

      // ── Data validation por coluna (schema-driven) ─────────────────────────
      const EXTRA_BLANK_ROWS = 1500; // linhas em branco disponíveis para novos produtos
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
        } else if (col.enum) {
          ws.dataValidations.add(range, {
            type: 'list',
            allowBlank: true,
            showDropDown: false,
            showErrorMessage: true,
            errorTitle: 'Valor inválido',
            error: `Valores permitidos: ${col.enum.join(', ')}`,
            formulae: [`"${col.enum.join(',')}"`],
          });
        }
      });

      // ── Linhas de dados ────────────────────────────────────────────────────
      produtos.forEach((p, dataRowIdx) => {
        const rowNumber = dataRowIdx + 2; // linha 2 em diante

        // Calcula custoCalc para usar nas fórmulas
        const descontoPerc = p.desconto_perc ?? 0;
        const valorCompraLiquido = (p.valor_compra || 0) * (1 - (descontoPerc / 100));
        const custoCalc =
          valorCompraLiquido
          + (p.custo_frete_padrao || 0)
          + (p.custo_imposto1_padrao || 0)
          + (p.custo_imposto2_padrao || 0);
        const checksumOrig = computeChecksum(p);

        const rowData = {};
        COLUNAS_CONFIG.forEach(col => {
          if (col.key === 'custo_total_calculado') {
            rowData[col.key] = {
              formula: `=${letValorCompra}${rowNumber}*(1-IF(${letDescontoPerc}${rowNumber}="",0,${letDescontoPerc}${rowNumber})/100)+${letFrete}${rowNumber}+${letImposto1}${rowNumber}+${letImposto2}${rowNumber}`,
              result: custoCalc,
            };
          } else if (col.key === '_hash_orig') {
            rowData[col.key] = computeChecksum(p);
          } else if (col.key === 'alterado') {
            rowData[col.key] = '';
          } else if (col.tipo === 'boolean') {
            rowData[col.key] = normalizeBooleanCell(p[col.key]);
          } else {
            rowData[col.key] = p[col.key] ?? '';
          }
        });

        // Remove redundante: custoCalc, valorCompraLiquido e descontoPerc já calculados acima

        const row = ws.addRow(rowData);

        // Fórmula de hash — usa índices REAIS das colunas em COLUNAS_CONFIG
        // Helpers para normalizar valores (sem usar ARRUMAR/TRIM que pode variar por locale)
        const idxH1 = 2, idxH2 = 3, idxH3 = 4, idxH4 = 5, idxH5 = 6;  // Nível 1-5
        const idxCB = 7, idxMA = 8, idxTP = 9;                          // Cód.Barras, Marca, Tipo
        const idxCA = 10, idxAR = 11;                                    // Categoria, Área
        const idxVC = 12, idxDP = 13, idxFR = 14, idxI1 = 15, idxI2 = 16; // Preços e custos
        const idxPV = 19;                                                // Preço Venda
        const idxUN = 20, idxCD = 21, idxUP = 22, idxEM = 23, idxEI = 24, idxEX = 25, idxRP = 26;
        const idxPS = 27, idxDM = 28, idxABCD = 29;                     // Físico e classificação
        const idxPL = 30, idxCS = 31, idxCL = 32, idxCV = 33;           // PDV e rastreabilidade
        const idxAT = 34;                                                // Ativo

        const letH1 = colLetter(idxH1), letH2 = colLetter(idxH2), letH3 = colLetter(idxH3), letH4 = colLetter(idxH4), letH5 = colLetter(idxH5);
        const letCB = colLetter(idxCB), letMA = colLetter(idxMA), letTP = colLetter(idxTP);
        const letCA = colLetter(idxCA), letAR = colLetter(idxAR);
        const letVC = colLetter(idxVC), letDP = colLetter(idxDP), letFR = colLetter(idxFR), letI1 = colLetter(idxI1), letI2 = colLetter(idxI2);
        const letPV = colLetter(idxPV);
        const letUN = colLetter(idxUN), letCD = colLetter(idxCD), letUP = colLetter(idxUP);
        const letEM = colLetter(idxEM), letEI = colLetter(idxEI), letEX = colLetter(idxEX), letRP = colLetter(idxRP);
        const letPS = colLetter(idxPS), letDM = colLetter(idxDM), letABCD = colLetter(idxABCD);
        const letPL = colLetter(idxPL), letCS = colLetter(idxCS), letCL = colLetter(idxCL), letCV = colLetter(idxCV);
        const letAT = colLetter(idxAT);

        // Helper para normalizar números (x100 sem ponto) — EM PORTUGUÊS
         const T = (col) => `SE(${col}${rowNumber}="";"0";TEXTO(ARRED(${col}${rowNumber}*100;0);"0"))`;
         // Helper para normalizar booleanos — EM PORTUGUÊS
         const B = (col) => `SE(OU(MINÚSCULA(ARRUMAR(${col}${rowNumber}))="sim";MINÚSCULA(ARRUMAR(${col}${rowNumber}))="true";MINÚSCULA(ARRUMAR(${col}${rowNumber}))="verdadeiro";ARRUMAR(${col}${rowNumber})="1");"true";"false")`;

        // Checksum: comparar concatenação dos dados (simples)
        // Sem fórmula complexa — só marca como SIM se hash_orig vazio (novo produto)
        row.getCell(idxAlterado).value = {
          formula: `SE(${letHashOrig}${rowNumber}="","SIM","NÃO")`,
          result: 'NÃO',
        };

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

      // ── Formatação Condicional ─────────────────────────────────────────────
      const dataRange = `A2:${lastCol}${maxRows}`;
      const precoRange = `${letPrecoVenda}2:${letPrecoVenda}${maxRows}`;
      const alteradoRange = `${letAlterado}2:${letAlterado}${maxRows}`;

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

      ws.addConditionalFormatting({
        ref: alteradoRange,
        rules: [
          {
            type: 'expression',
            priority: 3,
            formulae: [`${letAlterado}2="SIM"`],
            style: {
              fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFEF9C3' } },
              font: { color: { argb: 'FF92400E' }, bold: true },
            },
          },
        ],
      });

      // ── Sem proteção — total liberdade para usar Excel ──────────────────────
      // Nenhuma proteção de planilha, permitindo remover linhas, filtrar, ordenar, etc.

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