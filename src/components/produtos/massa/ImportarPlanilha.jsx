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
        const colConfig = COLUNAS_CONFIG.find(c => c.label === label);
        if (colConfig) colIndexMap[colConfig.key] = colNumber;
      });

      const alterados = [];
      const erros = [];
      let validacaoFalhou = false;
      let rowCount = 0;

      const totalRows = ws.rowCount;
      for (let rowNumber = 2; rowNumber <= totalRows; rowNumber++) {
       if (validacaoFalhou) break;
       const row = ws.getRow(rowNumber);

       const idColIndex = colIndexMap['id'];
       const id = idColIndex ? String(getCellValue(row.getCell(idColIndex)) || '').trim() : '';
       const h1ColIndex = colIndexMap['campo_hierarquico_1'];
       const h1 = h1ColIndex ? String(getCellValue(row.getCell(h1ColIndex)) || '').trim() : '';

       if (!id && !h1) continue;

        const dadosExtraidos = {};
        COLUNAS_CONFIG.filter(c => c.editavel && !c.calculado).forEach(col => {
          const colIdx = colIndexMap[col.key];
          if (!colIdx) return;

          let novoValor = getCellValue(row.getCell(colIdx));

          if (col.tipo === 'numero') {
            novoValor = novoValor !== '' && novoValor !== null ? parseFloat(novoValor) : null;
            if (isNaN(novoValor)) novoValor = null;
          } else if (col.tipo === 'boolean') {
            novoValor = novoValor === true || novoValor === 'true' || novoValor === 1 || novoValor === 'SIM';
          } else {
            novoValor = novoValor !== null && novoValor !== undefined ? String(novoValor).trim() : '';
          }

          dadosExtraidos[col.key] = novoValor;
        });

       // --- SOLUÇÃO PARA O ERRO 'numero: Field required' ---
       // Removemos qualquer campo que não esteja explicitamente no schema do Produto
       const chavesPermitidas = ['id', 'nome', 'tipo', 'unidade', 'valor_compra', 'preco_venda_padrao', 'campo_hierarquico_1', 'campo_hierarquico_2', 'campo_hierarquico_3', 'campo_hierarquico_4', 'campo_hierarquico_5', 'preco_venda_percentual', 'preco_custo_calculado'];
       Object.keys(dadosExtraidos).forEach(key => {
         if (!chavesPermitidas.includes(key)) {
           delete dadosExtraidos[key];
         }
       });

       const custoCalcColIdx = colIndexMap['custo_total_calculado'];
       let custoCalcPlanilha = null;
       if (custoCalcColIdx) {
         const raw = getCellValue(row.getCell(custoCalcColIdx));
         custoCalcPlanilha = raw !== null ? parseFloat(raw) : null;
       }

       const custoRecalculado = (parseFloat(dadosExtraidos.valor_compra) || 0);
       const custoFinal = custoCalcPlanilha ?? custoRecalculado;
       const precoVenda = parseFloat(dadosExtraidos.preco_venda_padrao) || 0;

       if (precoVenda > 0 && custoFinal > 0 && precoVenda < custoFinal) {
         toast.error(`Linha ${rowNumber}: Preço de Venda menor que o Custo.`, { duration: 8000 });
         validacaoFalhou = true;
         break;
       }

       const nomeGerado = concatHierarquia(
         dadosExtraidos.campo_hierarquico_1,
         dadosExtraidos.campo_hierarquico_2,
         dadosExtraidos.campo_hierarquico_3,
         dadosExtraidos.campo_hierarquico_4,
         dadosExtraidos.campo_hierarquico_5,
       );
       dadosExtraidos.nome = nomeGerado;

       // --- SOLUÇÃO PARA O ERRO 'tipo: Field required' ---
       // Garantimos que 'tipo' sempre tenha um valor
       if (!dadosExtraidos.tipo) {
          dadosExtraidos.tipo = 'Produto'; 
       }

       if (!id) {
         if (h1) {
           alterados.push({ id: null, dados: dadosExtraidos, nome: nomeGerado, isNew: true });
         }
         continue;
       }

       const produtoAtual = mapaAtual[id];
       if (!produtoAtual) {
         erros.push({ linha: rowNumber, mensagem: `ID ${id} não encontrado.` });
         continue;
       }

       const diff = { ...dadosExtraidos };
       alterados.push({ id, dados: diff, nome: produtoAtual.nome || nomeGerado, isNew: false });

       rowCount++;
       if (rowCount % 100 === 0) await new Promise(resolve => setTimeout(resolve, 0));
      }

      if (validacaoFalhou) {
       onParsed({ alterados: [], erros: [{ linha: 0, mensagem: 'Importação cancelada.' }] });
       setParsing(false);
       return;
      }

      onParsed({ alterados, erros });
      } catch (err) {
      onParsed({ alterados: [], erros: [{ linha: 0, mensagem: `Erro: ${err.message}` }] });
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
        <div
          className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Arraste o arquivo ou clique aqui</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl px-4 py-3 shadow-sm">
          <FileSpreadsheet className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{arquivo.name}</p>
          </div>
          {parsing ? <span className="text-xs animate-pulse">Analisando...</span> : (
            <button onClick={handleRemover}><X className="w-4 h-4" /></button>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => e.target.files[0] && handleArquivo(e.target.files[0])} />
    </div>
  );
}
