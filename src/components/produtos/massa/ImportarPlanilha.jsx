import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import ExcelJS from 'exceljs';

const COLUNAS_CONFIG = [
  { key: 'id',                      label: 'ID (não editar)',        editavel: false, tipo: 'string' },
  { key: 'codigo_interno',          label: 'Cód. Interno',           editavel: false, tipo: 'string' },
  { key: 'campo_hierarquico_1',     label: 'Nível 1 (*)',            editavel: true,  tipo: 'string' },
  { key: 'campo_hierarquico_2',     label: 'Nível 2',                editavel: true,  tipo: 'string' },
  { key: 'campo_hierarquico_3',     label: 'Nível 3',                editavel: true,  tipo: 'string' },
  { key: 'campo_hierarquico_4',     label: 'Nível 4',                editavel: true,  tipo: 'string' },
  { key: 'campo_hierarquico_5',     label: 'Nível 5',                editavel: true,  tipo: 'string' },
  { key: 'codigo_barras',           label: 'Cód. Barras',            editavel: true,  tipo: 'string' },
  { key: 'marca',                   label: 'Marca',                  editavel: true,  tipo: 'string' },
  { key: 'tipo',                    label: 'Tipo',                   editavel: true,  tipo: 'string' },
  { key: 'categoria_nome',          label: 'Categoria',              editavel: true,  tipo: 'string' },
  { key: 'area_codigo',             label: 'Área',                   editavel: true,  tipo: 'string' },
  { key: 'valor_compra',            label: 'Valor Compra (R$)',      editavel: true,  tipo: 'numero' },
  { key: 'custo_frete_padrao',      label: 'Frete Padrão (R$)',      editavel: true,  tipo: 'numero' },
  { key: 'custo_imposto1_padrao',   label: 'Imposto 1',              editavel: true,  tipo: 'numero' },
  { key: 'custo_imposto2_padrao',   label: 'Imposto 2',              editavel: true,  tipo: 'numero' },
  { key: 'desconto_compra_padrao',  label: 'Desconto Compra',        editavel: true,  tipo: 'numero' },
  { key: 'preco_venda_padrao',      label: 'Preço Venda (*)',        editavel: true,  tipo: 'numero' },
  { key: 'preco_venda_percentual',  label: 'Margem %',               editavel: true,  tipo: 'numero' },
  { key: 'unidade_principal',       label: 'Unidade',                editavel: true,  tipo: 'string' },
  { key: 'unidades_por_pacote',     label: 'Qtd/Pacote',             editavel: true,  tipo: 'numero' },
  { key: 'estoque_minimo',          label: 'Estoque Mínimo',         editavel: true,  tipo: 'numero' },
  { key: 'estoque_ideal',           label: 'Estoque Ideal',          editavel: true,  tipo: 'numero' },
  { key: 'estoque_maximo',          label: 'Estoque Máximo',         editavel: true,  tipo: 'numero' },
  { key: 'tempo_reposicao_dias',    label: 'Tempo Reposição (dias)', editavel: true,  tipo: 'numero' },
  { key: 'peso_kg',                 label: 'Peso (kg)',              editavel: true,  tipo: 'numero' },
  { key: 'dimensoes_cm',            label: 'Dimensões (cm)',         editavel: true,  tipo: 'string' },
  { key: 'ativo',                   label: 'Ativo (SIM/NÃO)',        editavel: true,  tipo: 'boolean' },
];

function getCellValue(cell) {
  if (!cell) return null;
  if (cell.type === ExcelJS.ValueType.Formula) return cell.result ?? null;
  return cell.value ?? null;
}

export default function ImportarPlanilha({ onParsed }) {
  const [arquivo, setArquivo] = useState(null);
  const [parsing, setParsing] = useState(false);
  const inputRef = useRef(null);

  const handleArquivo = async (file) => {
    if (!file) return;
    setArquivo(file);
    setParsing(true);

    try {
      const produtosAtuais = await base44.entities.Produto.list('-updated_date', 2000);
      const mapaAtual = {};
      produtosAtuais.forEach(p => { mapaAtual[p.id] = p; });

      const buffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const ws = wb.worksheets[0];

      const headerRow = ws.getRow(1);
      const colIndexMap = {};
      headerRow.eachCell((cell, colNumber) => {
        const label = (cell.value || '').toString().trim();
        const colConfig = COLUNAS_CONFIG.find(c => c.label === label);
        if (colConfig) colIndexMap[colConfig.key] = colNumber;
      });

      const alterados = [];
      const erros = [];

      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const idColIndex = colIndexMap['id'];
        if (!idColIndex) return;
        const id = getCellValue(row.getCell(idColIndex));
        if (!id) return;

        const produtoAtual = mapaAtual[id];
        if (!produtoAtual) return;

        const diff = {};
        let temAlteracao = false;

        COLUNAS_CONFIG.filter(c => c.editavel).forEach(col => {
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

          const mudou = String(novoValor ?? '') !== String(produtoAtual[col.key] ?? '');
          if (mudou) {
            diff[col.key] = novoValor;
            temAlteracao = true;
          }
        });

        if (temAlteracao) {
          const nomeAtual = diff.campo_hierarquico_1 ?? produtoAtual.campo_hierarquico_1;
          const precoAtual = diff.preco_venda_padrao ?? produtoAtual.preco_venda_padrao;
          if (!nomeAtual) {
            erros.push({ linha: rowNumber, mensagem: `Linha ${rowNumber}: Nível 1 (nome) é obrigatório.` });
            return;
          }
          if (!precoAtual) {
            erros.push({ linha: rowNumber, mensagem: `Linha ${rowNumber}: Preço de venda é obrigatório.` });
            return;
          }
          alterados.push({ id, dados: diff, nome: produtoAtual.nome || nomeAtual });
        }
      });

      onParsed({ alterados, erros });
    } catch (err) {
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