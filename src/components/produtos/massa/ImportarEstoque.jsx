import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import ExcelJS from 'exceljs';
import { toast } from 'sonner';

function getCellValue(cell) {
  if (!cell) return null;
  if (cell.value !== null && typeof cell.value === 'object' && 'result' in cell.value) {
    return cell.value.result ?? null;
  }
  if (cell.type === ExcelJS.ValueType.Formula) return cell.result ?? null;
  return cell.value ?? null;
}

export default function ImportarEstoque({ onParsed }) {
  const [arquivo, setArquivo] = useState(null);
  const [parsing, setParsing] = useState(false);
  const inputRef = useRef(null);

  const handleArquivo = async (file) => {
    if (!file) return;
    setArquivo(file);
    setParsing(true);

    try {
      // ── Carregar todos os produtos com paginação ──────────────────────────────
      let produtosAtuais = [];
      let skip = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const batch = await base44.entities.Produto.list('-updated_date', pageSize, skip);
        if (batch.length === 0) {
          hasMore = false;
        } else {
          produtosAtuais = produtosAtuais.concat(batch);
          skip += pageSize;
        }
      }

      const mapaAtual = {};
      produtosAtuais.forEach(p => { mapaAtual[p.id] = p; });

      const buffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const ws = wb.worksheets[0];

      const headerRow = ws.getRow(1);
      const colIndexMap = {};
      headerRow.eachCell((cell, colNumber) => {
        const label = (getCellValue(cell) || '').toString().trim();
        if (label === 'ID') colIndexMap.id = colNumber;
        if (label === 'Nome do Produto') colIndexMap.nome = colNumber;
        if (label === 'Estoque Atual') colIndexMap.estoque_atual = colNumber;
      });

      const alterados = [];
      const erros = [];
      let rowCount = 0;

      // ── Usar iteração manual para evitar timeout do eachRow ──────────────────
      const totalRows = ws.rowCount;
      for (let rowNumber = 2; rowNumber <= totalRows; rowNumber++) {
        const row = ws.getRow(rowNumber);

        const id = colIndexMap.id ? String(getCellValue(row.getCell(colIndexMap.id)) || '').trim() : '';
        if (!id) continue;

        const estoqueNovo = colIndexMap.estoque_atual ? parseFloat(getCellValue(row.getCell(colIndexMap.estoque_atual))) : null;
        if (estoqueNovo === null || isNaN(estoqueNovo)) {
          erros.push({ linha: rowNumber, mensagem: `Linha ${rowNumber}: Estoque inválido.` });
          continue;
        }

        const produtoAtual = mapaAtual[id];
        if (!produtoAtual) {
          erros.push({ linha: rowNumber, mensagem: `Linha ${rowNumber}: Produto não encontrado (ID: ${id}).` });
          continue;
        }

        const estoqueAtual = produtoAtual.estoque_atual || 0;
        const hashOrig = `${id}|${estoqueAtual}`;
        const hashNovo = `${id}|${estoqueNovo}`;
        if (hashNovo !== hashOrig) {
          alterados.push({
            id,
            produto_nome: produtoAtual.nome,
            estoque_anterior: estoqueAtual,
            estoque_novo: estoqueNovo,
            _hash_orig: hashOrig,
            _hash_novo: hashNovo,
          });
        }

        rowCount++;
        // Liberar memória a cada 100 linhas processadas
        if (rowCount % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      onParsed({ alterados, erros });
    } catch (err) {
      toast.error(`Erro ao processar arquivo: ${err.message}`);
      onParsed({ alterados: [], erros: [{ linha: 0, mensagem: `Erro ao ler arquivo: ${err.message}` }] });
    } finally {
      setParsing(false);
    }
  };

  const handleRemover = () => {
    setArquivo(null);
    onParsed(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      {!arquivo ? (
        <div
          className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
          onClick={() => inputRef.current?.click()}
          onDrop={e => { e.preventDefault(); handleArquivo(e.dataTransfer.files[0]); }}
          onDragOver={e => e.preventDefault()}
        >
          <Upload className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Arraste o arquivo aqui ou <span className="text-gray-800 dark:text-white font-medium underline">clique para selecionar</span>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Somente .xlsx</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl px-4 py-3 shadow-sm">
          <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{arquivo.name}</p>
            <p className="text-xs text-gray-400">{(arquivo.size / 1024).toFixed(0)} KB</p>
          </div>
          {parsing ? (
            <span className="text-xs text-gray-400 animate-pulse">Analisando...</span>
          ) : (
            <button onClick={handleRemover} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={e => handleArquivo(e.target.files[0])}
      />
    </div>
  );
}