import { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { FileSpreadsheet, X } from 'lucide-react';
import ExcelJS from 'exceljs';
import { COLUNAS_SOMENTE_EMBALAGENS } from './colunasConfig';
import {
  parseEmbalagensPlanilhaImport,
  mapLegacyVitrineColumn,
  findColunaByHeader,
  parseVitrineFromRow,
  vitrineArmazenadaDoProduto,
  syncIsComercialOnAlternativas,
} from './embalagensPlanilhaUtils';
import { toast } from 'sonner';

function mensagemErroLeitura(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Erro desconhecido';
}

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
  return unidades.map((u) => {
    const ajustePercentual = Number(u?.ajuste_percentual) || 0;
    const fatorPrecoRaw = Number(u?.fator_preco) || 0;
    const fatorPreco = fatorPrecoRaw > 0 ? fatorPrecoRaw : 1 + ajustePercentual / 100;
    return {
      unidade: normalizarTexto(u?.unidade),
      fator_conversao: Number(u?.fator_conversao) || 0,
      rotulo: u?.rotulo != null ? String(u.rotulo).trim() : '',
      ajuste_percentual: ajustePercentual,
      fator_preco: fatorPreco,
      preco_venda: Number(u?.preco_venda) || 0,
      ativo: Boolean(u?.ativo),
      is_comercial: u?.is_comercial === true,
    };
  });
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
      if (!ws) {
        const mensagem = 'O arquivo não tem planilha na primeira aba ou está vazio.';
        toast.error('Planilha inválida ou vazia', { description: mensagem });
        onParsed({ alterados: [], erros: [{ linha: 0, mensagem }] });
        return;
      }

      const headerRow = ws.getRow(1);
      const colIndexMap = {};
      headerRow.eachCell((cell, colNumber) => {
        const label = (getCellValue(cell) || '').toString().trim();
        const colConfig = findColunaByHeader(label, COLUNAS_SOMENTE_EMBALAGENS);
        if (colConfig) {
          colIndexMap[colConfig.key] = colNumber;
          return;
        }
        const embLegacy = label.match(/^Emb\.([45])\s+(Sigla|Fator)/i);
        if (embLegacy) {
          const field = embLegacy[2].toLowerCase() === 'sigla' ? 'sigla' : 'fator';
          colIndexMap[`emb${embLegacy[1]}_${field}`] = colNumber;
        }
      });

      const alterados = [];
      const erros = [];
      let linhasIgnoradasSemMudanca = 0;
      const colVitrinePresente = Boolean(colIndexMap.unidade_vitrine);

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
          const valorBruto = getCellValue(row.getCell(colNum));
          if (!col.editavel) {
            if (valorBruto !== null && valorBruto !== undefined) {
              dadosExtraidos[col.key] = String(valorBruto).trim();
            }
          } else if (col.tipo === 'numero') {
            const num = parseFloat(valorBruto);
            if (!Number.isNaN(num)) dadosExtraidos[col.key] = num;
            else if (valorBruto !== null && valorBruto !== undefined && String(valorBruto).trim() !== '') {
              erros.push({ linha: i, mensagem: `Linha ${i}: "${col.label}" deve ser numérico.` });
              erroNaLinha = true;
            }
          } else if (col.key === 'unidade_vitrine' && colVitrinePresente) {
            dadosExtraidos[col.key] =
              valorBruto !== null && valorBruto !== undefined ? String(valorBruto).trim() : '';
          } else if (valorBruto !== null && valorBruto !== undefined) {
            dadosExtraidos[col.key] = String(valorBruto).trim();
          }
        }

        mapLegacyVitrineColumn(dadosExtraidos);

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

        const atualPrincipal = normalizarTexto(produto.unidade_principal || 'UN');
        const parsed = parseEmbalagensPlanilhaImport(dadosExtraidos, { fallbackPrincipal: atualPrincipal });
        if (parsed.error) {
          erros.push({
            linha: i,
            mensagem: `Linha ${i}: ${parsed.error}`,
          });
          continue;
        }

        const temEmb = parsed.hadSlotPayload;

        const principalResolvida = parsed.hadSlotPayload ? parsed.principalSigla : atualPrincipal;
        const vitrineParsed = parseVitrineFromRow(dadosExtraidos, {
          colPresent: colVitrinePresente,
          principalSigla: principalResolvida,
        });

        if (!temEmb && !colVitrinePresente) {
          linhasIgnoradasSemMudanca += 1;
          continue;
        }

        const dados = {};
        if (parsed.hadSlotPayload) {
          dados.unidades_alternativas = parsed.alternativas;
          if (parsed.emb1Explicit) {
            dados.unidade_principal = parsed.principalSigla;
          }
        }

        const atualAlt = normalizarUnidadesAlternativas(produto.unidades_alternativas || []);
        const novoAlt = parsed.hadSlotPayload ? normalizarUnidadesAlternativas(parsed.alternativas) : atualAlt;

        /** Inclui siglas já presentes no cadastro (incl. linhas alternativas inativas): evita falsos positivos quando a planilha antiga omitia-as e `unidade_vitrine` ainda as referenciava. */
        const siglasExtrasCadastro = (produto.unidades_alternativas || []).map((u) => normalizarTexto(u?.unidade)).filter(Boolean);

        const unidadesValidas = new Set([
          principalResolvida,
          ...novoAlt.map((u) => normalizarTexto(u.unidade)),
          ...siglasExtrasCadastro,
        ].filter(Boolean));

        const atualVitrineArmazenada = vitrineArmazenadaDoProduto(produto, atualPrincipal);
        let novoVitrineArmazenada = atualVitrineArmazenada;

        if (colVitrinePresente) {
          const vitrineExib = vitrineParsed.rawExibicao
            ? normalizarTexto(vitrineParsed.rawExibicao)
            : principalResolvida;
          if (!unidadesValidas.has(vitrineExib)) {
            erros.push({
              linha: i,
              mensagem: `Linha ${i}: Unidade vitrine "${vitrineExib}" não existe nesta linha (base ou Alt.1/Alt.2).`,
            });
            continue;
          }
          novoVitrineArmazenada = vitrineParsed.stored ?? '';
          dados.unidade_vitrine = novoVitrineArmazenada;
        }

        const novoPrincipal = normalizarTexto(dados.unidade_principal || atualPrincipal);
        const vitrineMudou = colVitrinePresente && atualVitrineArmazenada !== novoVitrineArmazenada;

        const altsParaSync = dados.unidades_alternativas ?? novoAlt;
        if (colVitrinePresente && (vitrineMudou || dados.unidades_alternativas)) {
          dados.unidades_alternativas = syncIsComercialOnAlternativas(
            altsParaSync,
            novoVitrineArmazenada,
            principalResolvida,
          );
        }

        const novoAltFinal = dados.unidades_alternativas ?? novoAlt;
        const semMudanca =
          atualPrincipal === novoPrincipal
          && atualVitrineArmazenada === novoVitrineArmazenada
          && JSON.stringify(atualAlt) === JSON.stringify(novoAltFinal);

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
        const preview = erros
          .slice(0, 2)
          .map((e) => e.mensagem)
          .join(' · ');
        const extra = erros.length > 2 ? ` (+${erros.length - 2} mais)` : '';
        toast.error(`${erros.length} linha(s) com problema`, {
          description: `${preview}${extra}. Confira o resumo abaixo antes de gravar.`,
        });
      }
      if (alterados.length > 0 || linhasIgnoradasSemMudanca > 0) {
        const partes = [];
        if (alterados.length > 0) partes.push(`${alterados.length} produto(s) com alterações prontas — clique em Confirmar embalagens para gravar no Base44`);
        if (linhasIgnoradasSemMudanca > 0) partes.push(`${linhasIgnoradasSemMudanca} linha(s) inalteradas ignoradas`);
        toast.success(partes.join(' · '));
      } else if (erros.length === 0) {
        toast.info('Nenhuma diferença em relação ao cadastro atual.');
      }

      onParsed({ alterados, erros, linhasIgnoradasSemMudanca });
    } catch (error) {
      const msg = mensagemErroLeitura(error);
      toast.error(`Erro ao ler a planilha: ${msg}`, {
        description:
          'Use um .xlsx exportado na aba Embalagens (primeira planilha com cabeçalhos atuais). Cabeçalhos antigos ainda podem ser reconhecidos quando o formato for compatível.',
      });
      onParsed({ alterados: [], erros: [{ linha: 0, mensagem: msg }] });
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
            else toast.error('Selecione um arquivo .xlsx');
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
              <p className="text-sm text-gray-600 dark:text-gray-300">Lendo planilha de embalagens…</p>
            ) : (
              <>
                <FileSpreadsheet className="w-10 h-10 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Arraste o .xlsx aqui ou clique para selecionar
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Modele pela exportação desta aba: base + Alt.1–2 (sigla, fator de conversão, ajuste preço × sobre o preço da embalagem; em branco = 1) e coluna Unidade vitrine. Isto só prepara o resumo — a gravação é no botão Confirmar embalagens.
                </p>
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
