import { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { FileSpreadsheet, X } from 'lucide-react';
import ExcelJS from 'exceljs';
import { COLUNAS_SOMENTE_EMBALAGENS } from './colunasConfig';
import {
  parseEmbalagensPlanilhaImport,
  mapLegacyVitrineColumn,
  findColunaByHeader,
  vitrineArmazenadaDoProduto,
  syncIsComercialOnAlternativas,
  isLegacyUnidadeVitrinePlanilhaHeader,
  EMB_VITRINE_FLAG_KEYS,
  summarizeVitrineSlotFlagsFromRow,
  vitrineStoredFromSlotFlags,
  ensureEmbVitrineFlagKeysFromMappedColumns,
} from './embalagensPlanilhaUtils';
import { toast } from 'sonner';
import { normalizeSigla } from '@/lib/productUnitsCrud';

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

/** Vitrine 0/1: `cell.value` pode vir como rich text / objeto; usa `cell.text` quando necessário. */
function valorCelulaVitrineFlag(cell) {
  if (!cell) return null;
  const raw = getCellValue(cell);
  if (raw !== null && typeof raw === 'object') {
    const txt = cell.text != null ? String(cell.text).trim() : '';
    return txt === '' ? null : txt;
  }
  return raw;
}

function normalizarUnidadesAlternativas(unidades = []) {
  if (!Array.isArray(unidades)) return [];
  return unidades.map((u) => {
    const ajustePercentual = Number(u?.ajuste_percentual) || 0;
    const fatorPrecoRaw = Number(u?.fator_preco) || 0;
    const fatorPreco = fatorPrecoRaw > 0 ? fatorPrecoRaw : 1 + ajustePercentual / 100;
    return {
      unidade: normalizeSigla(u?.unidade),
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

      let legacyVitrineColuna = false;
      headerRow.eachCell((cell) => {
        const lab = (getCellValue(cell) || '').toString().trim();
        if (isLegacyUnidadeVitrinePlanilhaHeader(lab)) legacyVitrineColuna = true;
      });
      if (legacyVitrineColuna) {
        const mensagem =
          'Foi detectada a coluna antiga «Unidade vitrine». Exporte novamente o modelo nesta aba: use as três colunas «Base vitrine (0/1)», «Alt.1 vitrine (0/1)» e «Alt.2 vitrine (0/1)».';
        toast.error('Modelo de planilha desatualizado', { description: mensagem });
        onParsed({ alterados: [], erros: [{ linha: 0, mensagem }] });
        return;
      }

      const vitrineFlagMappedCount = EMB_VITRINE_FLAG_KEYS.filter((k) => colIndexMap[k]).length;
      if (vitrineFlagMappedCount > 0 && vitrineFlagMappedCount < EMB_VITRINE_FLAG_KEYS.length) {
        const mensagem =
          'Faltam colunas de vitrine no modelo atual: inclua as três colunas «Base vitrine (0/1)», «Alt.1 vitrine (0/1)» e «Alt.2 vitrine (0/1)» (baixe o arquivo modelo novamente nesta aba).';
        toast.error('Planilha incompleta', { description: mensagem });
        onParsed({ alterados: [], erros: [{ linha: 0, mensagem }] });
        return;
      }
      const colVitrineFlagsPresente = vitrineFlagMappedCount === EMB_VITRINE_FLAG_KEYS.length;

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
          if (EMB_VITRINE_FLAG_KEYS.includes(col.key)) {
            dadosExtraidos[col.key] = valorCelulaVitrineFlag(row.getCell(colNum)) ?? null;
            continue;
          }
          const valorBruto = getCellValue(row.getCell(colNum));
          if (!col.editavel) {
            if (valorBruto !== null && valorBruto !== undefined) {
              dadosExtraidos[col.key] = String(valorBruto).trim();
            }
          } else if (col.tipo === 'numero') {
            if (valorBruto === true) dadosExtraidos[col.key] = 1;
            else if (valorBruto === false) dadosExtraidos[col.key] = 0;
            else {
              const num = parseFloat(valorBruto);
              if (!Number.isNaN(num)) dadosExtraidos[col.key] = num;
              else if (valorBruto !== null && valorBruto !== undefined && String(valorBruto).trim() !== '') {
                erros.push({ linha: i, mensagem: `Linha ${i}: "${col.label}" deve ser numérico.` });
                erroNaLinha = true;
              }
            }
          } else if (valorBruto !== null && valorBruto !== undefined) {
            dadosExtraidos[col.key] = String(valorBruto).trim();
          }
        }

        if (colVitrineFlagsPresente) {
          ensureEmbVitrineFlagKeysFromMappedColumns(dadosExtraidos, colIndexMap);
        }
        const vitrineFlagSummary = summarizeVitrineSlotFlagsFromRow(dadosExtraidos);
        if (vitrineFlagSummary.error) {
          erros.push({ linha: i, mensagem: `Linha ${i}: ${vitrineFlagSummary.error}` });
          erroNaLinha = true;
        }
        delete dadosExtraidos.emb1_vitrine;
        delete dadosExtraidos.emb2_vitrine;
        delete dadosExtraidos.emb3_vitrine;

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

        const atualPrincipal = normalizeSigla(produto.unidade_principal || 'UN') || 'UN';
        /** Antes do parse: `emb{2,3}_sigla` são removidos de `dadosExtraidos`; vitrine 0/1 refere-se às colunas Alt.1/Alt.2, não ao array «comprimido» de alternativas (ex.: Alt.1 vazia + Alt.2 preenchida). */
        const emb2SiglaPlanilha = normalizeSigla(dadosExtraidos.emb2_sigla || '');
        const emb3SiglaPlanilha = normalizeSigla(dadosExtraidos.emb3_sigla || '');
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

        if (!temEmb && !colVitrineFlagsPresente) {
          linhasIgnoradasSemMudanca += 1;
          continue;
        }

        const dados = {};
        if (parsed.hadSlotPayload && parsed.emb1Explicit) {
          dados.unidade_principal = parsed.principalSigla;
        }

        const atualAlt = normalizarUnidadesAlternativas(produto.unidades_alternativas || []);
        const novoAlt = parsed.hadSlotPayload ? normalizarUnidadesAlternativas(parsed.alternativas) : atualAlt;

        /** Inclui siglas já presentes no cadastro (incl. linhas alternativas inativas): evita falsos positivos quando a planilha antiga omitia-as e `unidade_vitrine` ainda as referenciava. */
        const siglasExtrasCadastro = (produto.unidades_alternativas || []).map((u) => normalizeSigla(u?.unidade)).filter(Boolean);

        const unidadesValidas = new Set([
          principalResolvida,
          ...novoAlt.map((u) => normalizeSigla(u.unidade)),
          ...siglasExtrasCadastro,
        ].filter(Boolean));

        const atualVitrineArmazenada = vitrineArmazenadaDoProduto(produto, atualPrincipal);
        let novoVitrineArmazenada = atualVitrineArmazenada;

        if (colVitrineFlagsPresente) {
          const alt1Sig = parsed.hadSlotPayload ? emb2SiglaPlanilha : novoAlt[0]?.unidade ?? '';
          const alt2Sig = parsed.hadSlotPayload ? emb3SiglaPlanilha : novoAlt[1]?.unidade ?? '';
          const vsf = vitrineStoredFromSlotFlags(vitrineFlagSummary.v, principalResolvida, alt1Sig, alt2Sig);
          if (vsf.error) {
            erros.push({
              linha: i,
              mensagem: `Linha ${i}: ${vsf.error}`,
            });
            continue;
          }
          novoVitrineArmazenada = vsf.stored;
          const vitrineExib =
            novoVitrineArmazenada === '' ? principalResolvida : normalizeSigla(novoVitrineArmazenada) || principalResolvida;
          if (!unidadesValidas.has(vitrineExib)) {
            erros.push({
              linha: i,
              mensagem: `Linha ${i}: vitrine «${vitrineExib}» não existe nesta linha (base ou Alt.1/Alt.2).`,
            });
            continue;
          }
          dados.unidade_vitrine = novoVitrineArmazenada;
        }

        const novoPrincipal = normalizeSigla(dados.unidade_principal || atualPrincipal) || atualPrincipal;

        /** Espelho sempre a partir das alternativas normalizadas (evita gravar payload cru da planilha). */
        const syncedAlts = syncIsComercialOnAlternativas(novoAlt, novoVitrineArmazenada, principalResolvida);
        const embStructuralChange = parsed.hadSlotPayload;
        const mirrorDiffersFromCadastro = JSON.stringify(syncedAlts) !== JSON.stringify(atualAlt);
        const vitrineArmazenadaMudou =
          colVitrineFlagsPresente && atualVitrineArmazenada !== novoVitrineArmazenada;
        /** Valor canónico a gravar (já em forma «armazenada»); evita ignorar linha quando o cadastro tem texto cru redundante (ex.: «UN» na vitrine com base UN) ou sigla não normalizada. */
        const novoVitrineParaPersistir = colVitrineFlagsPresente ? String(novoVitrineArmazenada ?? '').trim() : '';
        const rawVitrineCadastro =
          produto.unidade_vitrine == null ? '' : String(produto.unidade_vitrine).trim();
        const vitrineRawNecessitaAlinhar =
          colVitrineFlagsPresente && rawVitrineCadastro !== novoVitrineParaPersistir;
        if (embStructuralChange || mirrorDiffersFromCadastro || vitrineArmazenadaMudou || vitrineRawNecessitaAlinhar) {
          dados.unidades_alternativas = syncedAlts;
        }

        const novoAltFinal = dados.unidades_alternativas ?? novoAlt;
        const semMudanca =
          atualPrincipal === novoPrincipal
          && atualVitrineArmazenada === novoVitrineArmazenada
          && JSON.stringify(atualAlt) === JSON.stringify(novoAltFinal)
          && !vitrineRawNecessitaAlinhar;

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
        if (linhasIgnoradasSemMudanca > 0) {
          partes.push(
            `${linhasIgnoradasSemMudanca} linha(s) ignoradas (cadastro já igual à planilha: unidades, vitrine 0/1 e espelho is_comercial)`,
          );
        }
        toast.success(partes.join(' · '));
      } else if (erros.length === 0) {
        toast.info('Nenhuma diferença em relação ao cadastro atual.');
      }

      onParsed({ alterados, erros, linhasIgnoradasSemMudanca });
    } catch (error) {
      const msg = mensagemErroLeitura(error);
      toast.error(`Erro ao ler a planilha: ${msg}`, {
        description:
          'Use um .xlsx exportado nesta aba Embalagens (primeira planilha com cabeçalhos atuais: inclui as três colunas de vitrine 0/1 por slot).',
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
          className="relative rounded-xl border-2 border-dashed border-border/40 dark:border-border/40 bg-muted/50/50 p-8"
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
              <p className="text-sm text-muted-foreground">Lendo planilha de embalagens…</p>
            ) : (
              <>
                <FileSpreadsheet className="w-10 h-10 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">
                  Arraste o .xlsx aqui ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Modele pela exportação desta aba: base + Alt.1–2 (sigla, fator de conversão, ajuste preço × sobre o preço da embalagem; em branco = 1) e três colunas de vitrine 0/1 (Base, Alt.1, Alt.2) — exatamente uma com «1» por linha. Isto só prepara o resumo — a gravação é no botão Confirmar embalagens.
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-border/40 p-4">
          <span className="text-sm truncate text-foreground/90">{arquivo.name}</span>
          <button
            type="button"
            onClick={() => {
              setArquivo(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="p-2 text-muted-foreground hover:text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
