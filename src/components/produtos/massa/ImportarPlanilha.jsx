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
  if (cell.type === ExcelJS.ValueType.Formula) return cell.result ?? null;
  return cell.value ?? null;
}

function concatHierarquia(h1, h2, h3, h4, h5) {
  return [h1, h2, h3, h4, h5].map(v => (v || '').trim()).filter(Boolean).join(' ').trim();
}

export default function ImportarPlanilha({ onParsed }) {
   const [arquivo, setArquivo] = useState(null);
   const [parsing, setParsing] = useState(false);
   const inputRef = useRef(null);

   const handleArquivo = React.useCallback(async (file) => {
    if (!file) return;
    setArquivo(file);
    setParsing(true);

    try {
      // 1. Busca produtos atuais para comparação
      let produtosAtuais = [];
      let skip = 0;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const batch = await base44.entities.Produto.list('-updated_date', pageSize, skip);
        if (batch.length === 0) { hasMore = false; } 
        else { produtosAtuais = produtosAtuais.concat(batch); skip += pageSize; }
      }
      const mapaAtual = {};
      produtosAtuais.forEach(p => { mapaAtual[p.id] = p; });

      // 2. Lê a planilha
      const buffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const ws = wb.worksheets[0];

      // 3. Mapeia cabeçalhos
      const headerRow = ws.getRow(1);
      const colIndexMap = {};
      headerRow.eachCell((cell, colNumber) => {
        const label = (getCellValue(cell) || '').toString().trim();
        const colConfig = COLUNAS_CONFIG.find(c => c.label === label);
        if (colConfig) colIndexMap[colConfig.key] = colNumber;
      });

      const alterados = [];
      const erros = [];
      const totalRows = ws.rowCount;

      for (let rowNumber = 2; rowNumber <= totalRows; rowNumber++) {
        const row = ws.getRow(rowNumber);
        const idColIndex = colIndexMap['id'];
        const id = idColIndex ? String(getCellValue(row.getCell(idColIndex)) || '').trim() : '';
        const h1ColIndex = colIndexMap['campo_hierarquico_1'];
        const h1 = h1ColIndex ? String(getCellValue(row.getCell(h1ColIndex)) || '').trim() : '';

        if (!id && !h1) continue;

        // --- CONSTRUÇÃO DO OBJETO LIMPO ---
        // Aqui definimos apenas o que o Banco de Dados aceita de verdade
        const dadosFinal = {};
        
        // Mapeamos apenas campos que sabemos que existem e são aceitos
        COLUNAS_CONFIG.forEach(col => {
          if (col.editavel && !col.calculado) {
            const colIdx = colIndexMap[col.key];
            if (colIdx) {
              let valor = getCellValue(row.getCell(colIdx));
              if (col.tipo === 'numero') {
                valor = (valor !== '' && valor !== null) ? parseFloat(valor) : 0;
              } else if (col.tipo === 'boolean') {
                valor = (valor === true || valor === 'SIM' || valor === 1);
              } else {
                valor = valor ? String(valor).trim() : '';
              }
              // GARANTIA: Não permite que o campo 'numero' entre aqui
              if (col.key !== 'numero') {
                dadosFinal[col.key] = valor;
              }
            }
          }
        });

        // RESOLUÇÃO DO ERRO: 'tipo: Field required'
        dadosFinal.tipo = dadosFinal.tipo || 'Produto';

        // Recalcula o Nome
        const nomeGerado = concatHierarquia(
          dadosFinal.campo_hierarquico_1,
          dadosFinal.campo_hierarquico_2,
          dadosFinal.campo_hierarquico_3,
          dadosFinal.campo_hierarquico_4,
          dadosFinal.campo_hierarquico_5
        );
        dadosFinal.nome = nomeGerado;

        // 4. Decide se é novo ou edição
        if (!id) {
          // NOVO PRODUTO
          if (h1) {
            alterados.push({ id: null, dados: dadosFinal, nome: nomeGerado, isNew: true });
          }
        } else {
          // EDIÇÃO DE PRODUTO EXISTENTE
          const produtoExistente = mapaAtual[id];
          if (produtoExistente) {
            // Enviamos o objeto limpo
            alterados.push({ id, dados: dadosFinal, nome: produtoExistente.nome || nomeGerado, isNew: false });
          } else {
            erros.push({ linha: rowNumber, mensagem: `ID ${id} não encontrado no sistema.` });
          }
        }

        if (rowNumber % 100 === 0) await new Promise(r => setTimeout(r, 0));
      }

      onParsed({ alterados, erros });
    } catch (err) {
      onParsed({ alterados: [], erros: [{ linha: 0, mensagem: `Erro crítico: ${err.message}` }] });
    } finally {
      setParsing(false);
    }
   }, [onParsed]);

   const handleRemover = () => {
    setArquivo(null);
    onParsed(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      {!arquivo ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400" onClick={() => inputRef.current?.click()}>
          <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Clique para selecionar a planilha .xlsx</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm">
          <FileSpreadsheet className="w-5 h-5 text-green-600" />
          <div className="flex-1 truncate text-sm font-medium">{arquivo.name}</div>
          {parsing ? <span className="animate-pulse text-xs">Processando...</span> : <button onClick={handleRemover}><X className="w-4 h-4" /></button>}
        </div>
      )}
      <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => e.target.files[0] && handleArquivo(e.target.files[0])} />
    </div>
  );
}
