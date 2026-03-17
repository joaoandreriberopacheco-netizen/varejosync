import React, { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import ExcelJS from 'exceljs';
import { COLUNAS_CONFIG } from './colunasConfig';
import { toast } from 'sonner';

function getCellValue(cell) {
  if (!cell) return null;
  if (cell.value !== null && typeof cell.value === 'object' && 'result' in cell.value) {
    return cell.value.result ?? null;
  }
  return cell.value ?? null;
}

function concatHierarquia(h1, h2, h3, h4, h5) {
  return [h1, h2, h3, h4, h5].map(v => (v || '').trim()).filter(Boolean).join(' ').trim();
}

export default function ImportarPlanilha({ onParsed }) {
  const [arquivo, setArquivo] = useState(null);
  const [parsing, setParsing] = useState(false);
  const inputRef = useRef(null);

  const handleArquivo = useCallback(async (file) => {
    if (!file) return;
    setArquivo(file);
    setParsing(true);

    try {
      // 1. Carregar produtos para comparação
      let produtosAtuais = [];
      let skip = 0;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const batch = await base44.entities.Produto.list('-updated_date', pageSize, skip);
        if (batch.length === 0) hasMore = false;
        else { produtosAtuais = produtosAtuais.concat(batch); skip += pageSize; }
      }
      const mapaAtual = {};
      produtosAtuais.forEach(p => { mapaAtual[p.id] = p; });

      // 2. Processar Excel
      const buffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const ws = wb.worksheets[0];

      const headerRow = ws.getRow(1);
      const colIndexMap = {};
      headerRow.eachCell((cell, colNumber) => {
        const label = (getCellValue(cell) || '').toString().trim();
        const colConfig = COLUNAS_CONFIG.find(c => c.label === label);
        if (colConfig) colIndexMap[colConfig.key] = colNumber;
      });

      const alterados = [];
      const erros = [];

      for (let i = 2; i <= ws.rowCount; i++) {
        const row = ws.getRow(i);
        const id = String(getCellValue(row.getCell(colIndexMap['id'])) || '').trim();
        const h1 = String(getCellValue(row.getCell(colIndexMap['campo_hierarquico_1'])) || '').trim();

        if (!id && !h1) continue;

        const dadosExtraidos = {};
        
        // --- CORREÇÃO DE TIPOS (NUMBER vs STRING) ---
        COLUNAS_CONFIG.forEach(col => {
          if (col.editavel && !col.calculado) {
            const cellValue = getCellValue(row.getCell(colIndexMap[col.key]));
            
            if (col.tipo === 'numero') {
              // Converte para número real. Se falhar, usa 0 (evita o erro de validação)
              const num = parseFloat(cellValue);
              dadosExtraidos[col.key] = isNaN(num) ? 0 : num;
            } else {
              // Converte para texto
              dadosExtraidos[col.key] = cellValue ? String(cellValue).trim() : '';
            }
          }
        });

        // Força o campo 'tipo' a ser 'Produto' se estiver vazio
        if (!dadosExtraidos.tipo || dadosExtraidos.tipo === '') {
          dadosExtraidos.tipo = 'Produto';
        }

        // Remove campos fantasmas que causam erro no schema
        delete dadosExtraidos.numero; 

        const nome = concatHierarquia(
          dadosExtraidos.campo_hierarquico_1,
          dadosExtraidos.campo_hierarquico_2,
          dadosExtraidos.campo_hierarquico_3,
          dadosExtraidos.campo_hierarquico_4,
          dadosExtraidos.campo_hierarquico_5
        );
        dadosExtraidos.nome = nome;

        if (id && mapaAtual[id]) {
          alterados.push({ id, dados: dadosExtraidos, nome, isNew: false });
        } else if (!id && h1) {
          alterados.push({ id: null, dados: dadosExtraidos, nome, isNew: true });
        }
      }

      onParsed({ alterados, erros });
    } catch (err) {
      toast.error("Erro ao processar: " + err.message);
    } finally {
      setParsing(false);
    }
  }, [onParsed]);

  return (
    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer" onClick={() => inputRef.current.click()}>
      <Upload className="mx-auto h-12 w-12 text-gray-400" />
      <p className="mt-2 text-sm text-gray-600">Selecione o arquivo .xlsx atualizado</p>
      <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={e => handleArquivo(e.target.files[0])} />
      {arquivo && <p className="mt-2 text-xs font-bold text-green-600">{arquivo.name}</p>}
    </div>
  );
}
