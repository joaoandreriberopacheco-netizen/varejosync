import React, { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { FileSpreadsheet, X } from 'lucide-react';
import ExcelJS from 'exceljs';
import { COLUNAS_SOMENTE_EMBALAGENS } from './colunasConfig';
import { extrairUnidadesAlternativasDosSlots } from './embalagensPlanilhaUtils';
import { toast } from 'sonner';

function getCellValue(cell) {
  if (!cell) return null;
  if (cell.value !== null && typeof cell.value === 'object' && 'result' in cell.value) {
    return cell.value.result ?? null;
  }
  return cell.value ?? null;
}

function normalizarTexto(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim().toUpperCase();
}

function normalizarUnidadesAlternativas(unidades = []) {
  if (!Array.isArray(unidades)) return [];
  return unidades.map((u) => ({
    unidade: normalizarTexto(u?.unidade),
    fator_conversao: Number(u?.fator_conversao) || 0,
    rotulo: u?.rotulo != null ? String(u.rotulo).trim() : '',
    ajuste_percentual: Number(u?.ajuste_percentual) || 0,
    preco_venda: Number(u?.preco_venda) || 0,
    ativo: Boolean(u?.ativo),
  }));
}

export default function ImportarEmbalagensPlanilha({ onParsed }) {
  const [arquivo, setArquivo] = useState(null);
  const [parsing, setParsing] = useState(false);
  const inputRef = useRef(null);

  const handleArquivo = useCallback(async (file) => {
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
        if (batch.length === 0) hasMore = false;
        else {
          produtosAtuais = produtosAtuais.concat(batch);
          skip += pageSize;
        }
      }
      const mapaId = {};
      const mapaCodigo = {};
      produtosAtuais.forEach((p) => {
        mapaId[p.id] = p;
        if (p.codigo_interno != null && String(p.codigo_interno).trim() !== '') {
          mapaCodigo[String(p.codigo_interno).trim()] = p;
        }
      });

      const buffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const ws = wb.worksheets[0];

      const headerRow = ws.getRow(1);
      const colIndexMap = {};
      headerRow.eachCell((cell, colNumber) => {
        const label = (getCellValue(cell) || '').toString().trim();
        const colConfig = COLUNAS_SOMENTE_EMBALAGENS.find((c) => c.label === label);
        if (colConfig) colIndexMap[colConfig.key] = colNumber;
      });

      const alterados = [];
      const erros = [];
      let linhasIgnoradasSemMudanca = 0;

      for (let i = 2; i <= ws.rowCount; i++) {
        const row = ws.getRow(i);
        let linhaVazia = true;
        for (const col of COLUNAS_SOMENTE_EMBALAGENS) {
          const cn = colIndexMap[col.key];
          if (!cn) continue;
          const v = getCellValue(row.getCell(cn));
          if (v !== null && v !== undefined && String(v).trim() !== '') {
            linhaVazia = false;
            break;
          }
        }
        if (linhaVazia) continue;

        const dadosExtraidos = {};
        let erroNaLinha = false;

        for (const col of COLUNAS_SOMENTE_EMBALAGENS) {
          const colNum = colIndexMap[col.key];
          if (!colNum) continue;
          if (!col.editavel) {
            const valorBruto = getCellValue(row.getCell(colNum));
            if (valorBruto !== null && valorBruto !== undefined) {
              dadosExtraidos[col.key] = String(valorBruto).trim();
            }
          } else if (col.editavel) {
            const valorBruto = getCellValue(row.getCell(colNum));
            if (col.tipo === 'numero') {
              const num = parseFloat(valorBruto);
              if (!Number.isNaN(num)) dadosExtraidos[col.key] = num;
              else if (valorBruto !== null && valorBruto !== undefined && String(valorBruto).trim() !== '') {
                erros.push({ linha: i, mensagem: `Linha ${i}: "${col.label}" deve ser numérico.` });
                erroNaLinha = true;
              }
            } else if (valorBruto !== null && valorBruto !== undefined) {
              dadosExtraidos[col.key] = String(valorBruto).trim();
            }
          }
        }

        const altFromSlots = extrairUnidadesAlternativasDosSlots(dadosExtraidos);
        const apresentacao = dadosExtraidos.unidade_apresentacao_default;
        const showLogistico = dadosExtraidos.unidade_show_logistica;
        const temApresentacao = apresentacao != null && String(apresentacao).trim() !== '';
        const temShowLogistico = showLogistico != null && String(showLogistico).trim() !== '';
        const temEmb = altFromSlots.length > 0;

        if (!temEmb && !temApresentacao && !temShowLogistico) {
          erros.push({
            linha: i,
            mensagem: `Linha ${i}: informe ao menos um slot de embalagem (sigla + fator), a apresentação PDV ou o show logístico.`,
          });
          erroNaLinha = true;
        }

        if (erroNaLinha) continue;

        const id = String(dadosExtraidos.id || '').trim();
        const cod = String(dadosExtraidos.codigo_interno || '').trim();
        let produto = id && mapaId[id] ? mapaId[id] : null;
        if (!produto && cod) produto = mapaCodigo[cod] || null;

        if (!produto) {
          erros.push({
            linha: i,
            mensagem: `Linha ${i}: produto não encontrado (ID ou Cód. Interno inválido).`,
          });
          continue;
        }

        const dados = {};
        if (altFromSlots.length > 0) dados.unidades_alternativas = altFromSlots;
        if (temApresentacao) dados.unidade_apresentacao_default = String(apresentacao).trim().toUpperCase();
        if (temShowLogistico) dados.unidade_show_logistica = String(showLogistico).trim().toUpperCase();

        const atualApresentacao = normalizarTexto(produto.unidade_apresentacao_default);
        const atualShowLogistico = normalizarTexto(produto.unidade_show_logistica);
        const novoApresentacao = temApresentacao
          ? normalizarTexto(dados.unidade_apresentacao_default)
          : atualApresentacao;
        const novoShowLogistico = temShowLogistico
          ? normalizarTexto(dados.unidade_show_logistica)
          : atualShowLogistico;
        const atualAlt = normalizarUnidadesAlternativas(produto.unidades_alternativas || []);
        const novoAlt = altFromSlots.length > 0 ? normalizarUnidadesAlternativas(altFromSlots) : atualAlt;

        const semMudanca =
          atualApresentacao === novoApresentacao
          && atualShowLogistico === novoShowLogistico
          && JSON.stringify(atualAlt) === JSON.stringify(novoAlt);

        if (semMudanca) {
          linhasIgnoradasSemMudanca += 1;
          continue;
        }

        alterados.push({
          id: produto.id,
          dados,
          nome: produto.nome || '',
          isNew: false,
        });
      }

      if (erros.length > 0) {
        toast.error(`${erros.length} linha(s) com problema. Veja a lista no resumo.`);
      }
      if (alterados.length > 0 || linhasIgnoradasSemMudanca > 0) {
        const partes = [];
        if (alterados.length > 0) partes.push(`${alterados.length} produto(s) pronto(s) para atualizar embalagens`);
        if (linhasIgnoradasSemMudanca > 0) partes.push(`${linhasIgnoradasSemMudanca} linha(s) inalteradas ignoradas`);
        toast.success(partes.join(' · '));
      } else if (erros.length === 0) {
        toast.info('Nenhuma alteração detectada.');
      }

      onParsed({ alterados, erros, linhasIgnoradasSemMudanca });
    } catch (error) {
      console.error(error);
      toast.error(`Erro ao ler planilha: ${error.message}`);
      onParsed({ alterados: [], erros: [{ linha: 0, mensagem: error.message }] });
    } finally {
      setParsing(false);
    }
  }, [onParsed]);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (f) handleArquivo(f);
  };

  return (
    <div className="space-y-4">
      {!arquivo || parsing ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f?.name?.endsWith('.xlsx')) handleArquivo(f);
            else toast.error('Use um arquivo .xlsx');
          }}
          className="relative rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-8"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFile}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={parsing}
          />
          <div className="flex flex-col items-center text-center pointer-events-none">
            {parsing ? (
              <p className="text-sm text-gray-600 dark:text-gray-300">Lendo embalagens…</p>
            ) : (
              <>
                <FileSpreadsheet className="w-10 h-10 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">Arraste ou clique — só embalagens</p>
                <p className="text-xs text-gray-500 mt-1">Cabeçalhos devem coincidir com a planilha exportada nesta aba.</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <span className="text-sm truncate text-gray-700 dark:text-gray-200">{arquivo.name}</span>
          <button
            type="button"
            onClick={() => {
              setArquivo(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
