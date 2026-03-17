import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import ExcelJS from 'exceljs';
import { COLUNAS_CONFIG } from './colunasConfig';
import { toast } from 'sonner';

function getCellValue(cell) {
  if (!cell) return null;
  // Sempre pega o resultado final de fórmulas
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
    console.log('📁 Importando arquivo:', file.name, 'Tamanho:', file.size);
    setArquivo(file);
    setParsing(true);

    try {
      // Carregar todos os produtos sem limite
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

      // Mapear cabeçalhos → índice de coluna
      const headerRow = ws.getRow(1);
      const colIndexMap = {};
      headerRow.eachCell((cell, colNumber) => {
        const label = (getCellValue(cell) || '').toString().trim();
        const colConfig = COLUNAS_CONFIG.find(c => c.label === label);
        if (colConfig) colIndexMap[colConfig.key] = colNumber;
      });

      const alterados = [];  // { id, dados, nome, isNew }
      const erros = [];
      let validacaoFalhou = false;
      let rowCount = 0;

      // ── Usar iteração manual para evitar timeout ──────────────────────────────
      const totalRows = ws.rowCount;
      for (let rowNumber = 2; rowNumber <= totalRows; rowNumber++) {
       if (validacaoFalhou) break;
       const row = ws.getRow(rowNumber);

       const idColIndex = colIndexMap['id'];
       const id = idColIndex ? String(getCellValue(row.getCell(idColIndex)) || '').trim() : '';

       const h1ColIndex = colIndexMap['campo_hierarquico_1'];
       const h1 = h1ColIndex ? String(getCellValue(row.getCell(h1ColIndex)) || '').trim() : '';

       // Linha vazia (sem ID e sem h1) — ignorar
       if (!id && !h1) return;

       // ── Extrair todos os campos editáveis ────────────────────────────────
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

       // ── Custo calculado (lido da coluna calculada ou recalculado) ────────
       const custoCalcColIdx = colIndexMap['custo_total_calculado'];
       let custoCalcPlanilha = null;
       if (custoCalcColIdx) {
         const raw = getCellValue(row.getCell(custoCalcColIdx));
         custoCalcPlanilha = raw !== null ? parseFloat(raw) : null;
       }

       const custoRecalculado =
         (parseFloat(dadosExtraidos.valor_compra) || 0)
         + (parseFloat(dadosExtraidos.custo_frete_padrao) || 0)
         + (parseFloat(dadosExtraidos.custo_imposto1_padrao) || 0)
         + (parseFloat(dadosExtraidos.custo_imposto2_padrao) || 0)
         - (parseFloat(dadosExtraidos.desconto_compra_padrao) || 0);

       const custoFinal = custoCalcPlanilha ?? custoRecalculado;
       const precoVenda = parseFloat(dadosExtraidos.preco_venda_padrao) || 0;

       // ── VALIDAÇÃO FAIL-FAST: preço < custo ───────────────────────────────
       if (precoVenda > 0 && custoFinal > 0 && precoVenda < custoFinal) {
         toast.error(
           `Linha ${rowNumber}: Preço de Venda (R$ ${precoVenda.toFixed(2)}) é menor que o Custo Total (R$ ${custoFinal.toFixed(2)}). Importação cancelada.`,
           { duration: 8000 }
         );
         validacaoFalhou = true;
         return;
       }

       // ── Recalcular nome e preco_venda_percentual ─────────────────────────
       const nomeGerado = concatHierarquia(
         dadosExtraidos.campo_hierarquico_1,
         dadosExtraidos.campo_hierarquico_2,
         dadosExtraidos.campo_hierarquico_3,
         dadosExtraidos.campo_hierarquico_4,
         dadosExtraidos.campo_hierarquico_5,
       );
       dadosExtraidos.nome = nomeGerado;

       if (custoFinal > 0 && precoVenda > 0) {
         dadosExtraidos.preco_venda_percentual = parseFloat(
           (((precoVenda - custoFinal) / custoFinal) * 100).toFixed(2)
         );
       }
       dadosExtraidos.preco_custo_calculado = custoFinal;

       // ── Novo produto (ID vazio, h1 preenchido) ───────────────────────────
       if (!id) {
         if (!h1) return;
         alterados.push({ id: null, dados: dadosExtraidos, nome: nomeGerado, isNew: true });
         return;
       }

       // ── Produto existente: calcular diff ─────────────────────────────────
       const produtoAtual = mapaAtual[id];
       if (!produtoAtual) return;

       const diff = {};
       let temAlteracao = false;

       COLUNAS_CONFIG.filter(c => c.editavel && !c.calculado).forEach(col => {
         const novoValor = dadosExtraidos[col.key];
         const mudou = String(novoValor ?? '') !== String(produtoAtual[col.key] ?? '');
         if (mudou) {
           diff[col.key] = novoValor;
           temAlteracao = true;
         }
       });

       // Sempre injeta nome e margem recalculados se houve alteração
       if (temAlteracao) {
         diff.nome = nomeGerado;
         if (dadosExtraidos.preco_venda_percentual !== undefined) {
           diff.preco_venda_percentual = dadosExtraidos.preco_venda_percentual;
         }
         diff.preco_custo_calculado = custoFinal;

         const nomeAtual = diff.campo_hierarquico_1 ?? produtoAtual.campo_hierarquico_1;
         if (!nomeAtual) {
           erros.push({ linha: rowNumber, mensagem: `Linha ${rowNumber}: Nível 1 é obrigatório.` });
           return;
         }

         alterados.push({ id, dados: diff, nome: produtoAtual.nome || nomeAtual, isNew: false });
         }

         rowCount++;
         // Liberar memória a cada 100 linhas processadas
         if (rowCount % 100 === 0) {
         await new Promise(resolve => setTimeout(resolve, 0));
         }
         }

      if (validacaoFalhou) {
       onParsed(null);
       setParsing(false);
       setArquivo(null);
       if (inputRef.current) inputRef.current.value = '';
       return;
      }

      console.log('✅ Parse completo:', alterados.length, 'alterados,', erros.length, 'erros');
      onParsed({ alterados, erros });
      } catch (err) {
      console.error('❌ Erro ao processar arquivo:', err);
      onParsed({ alterados: [], erros: [{ linha: 0, mensagem: `Erro ao ler arquivo: ${err.message}` }] });
      } finally {
      setParsing(false);
      }
      }, []);

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