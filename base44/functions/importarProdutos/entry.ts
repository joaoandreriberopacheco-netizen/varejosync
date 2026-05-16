import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const withRetry = async (fn, retries = 3, baseDelay = 1500) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (e.status === 429 && i < retries - 1) {
        await sleep(baseDelay * (i + 1));
      } else {
        throw e;
      }
    }
  }
};

/* ----------------------------------------------------------------------------
 * Validacao de invariantes de unidades (espelho da logica em
 * src/lib/productUnitsCrud.js, inlined porque este runtime e Deno).
 * Linhas com invariantes violados sao rejeitadas e reportadas no log.
 * -------------------------------------------------------------------------- */

const SIGLA_NORMALIZE_MAP: Record<string, string> = {
  CAIXA: 'CX', CAIXAS: 'CX',
  'M²': 'M2', 'METRO QUADRADO': 'M2', 'METROS QUADRADOS': 'M2',
  PEÇA: 'PC', PEÇAS: 'PC', PECA: 'PC', PECAS: 'PC',
  UNIDADE: 'UN', UNIDADES: 'UN',
};

const normalizeSigla = (raw: any): string => {
  const s = String(raw || '').trim().toUpperCase();
  if (!s) return '';
  const noAccents = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (SIGLA_NORMALIZE_MAP[s]) return SIGLA_NORMALIZE_MAP[s];
  if (SIGLA_NORMALIZE_MAP[noAccents]) return SIGLA_NORMALIZE_MAP[noAccents];
  return s.replace('²', '2');
};

const validateUnidadesPayload = (dados: any): { ok: boolean; errors: string[] } => {
  const errors: string[] = [];
  const principalSigla = normalizeSigla(dados?.unidade_principal || 'UN');
  if (!principalSigla) errors.push('unidade_principal obrigatoria');

  const alternativas = Array.isArray(dados?.unidades_alternativas) ? dados.unidades_alternativas : [];
  if (alternativas.length > 5) errors.push(`maximo 5 unidades alternativas (atual: ${alternativas.length})`);

  const siglasVistas = new Set<string>();
  if (principalSigla) siglasVistas.add(principalSigla);

  for (const alt of alternativas) {
    if (!alt || typeof alt !== 'object') {
      errors.push('entrada invalida em unidades_alternativas');
      continue;
    }
    const sigla = normalizeSigla(alt.unidade);
    if (!sigla) errors.push('unidade alternativa sem sigla');
    if (sigla && siglasVistas.has(sigla)) errors.push(`sigla duplicada entre unidades: ${sigla}`);
    if (sigla) siglasVistas.add(sigla);

    const fator = Number(alt.fator_conversao);
    if (!Number.isFinite(fator) || fator <= 0) {
      errors.push(`unidade ${sigla || '(?)'}: fator_conversao deve ser > 0`);
    } else if (fator === 1) {
      errors.push(`unidade ${sigla}: fator_conversao=1 e reservado para a unidade principal`);
    }
  }

  return errors.length === 0 ? { ok: true, errors: [] } : { ok: false, errors };
};

/** Espelha `syncIsComercialOnAlternativas` (embalagensPlanilhaUtils) — runtime Deno sem import do Vite. */
const syncIsComercialOnAlternativas = (
  alternativas: any[] = [],
  vitrineStored: any,
  principalSigla: string,
) => {
  const principal = normalizeSigla(principalSigla || 'UN') || 'UN';
  const storedCanon = normalizeSigla(vitrineStored);
  const vitrineSigla = storedCanon || principal;
  return alternativas.map((u) => {
    const unidade = normalizeSigla(u?.unidade);
    return {
      ...u,
      is_comercial: storedCanon !== '' && Boolean(unidade) && unidade === vitrineSigla,
    };
  });
};

const applyVitrineToPayload = (
  dadosAtualizacao: Record<string, unknown>,
  dadosLinha: Record<string, unknown>,
  anterior: Record<string, unknown> | undefined,
) => {
  if (!Object.prototype.hasOwnProperty.call(dadosAtualizacao, 'unidade_vitrine')) return;
  const principal =
    normalizeSigla(dadosAtualizacao.unidade_principal || dadosLinha?.unidade_principal || anterior?.unidade_principal) ||
    'UN';
  const vitrineNorm =
    normalizeSigla(dadosAtualizacao.unidade_vitrine) || principal;

  const altsAnt = Array.isArray(anterior?.unidades_alternativas) ? anterior.unidades_alternativas : [];
  if (anterior && altsAnt.length > 0) {
    dadosAtualizacao.unidades_alternativas = syncIsComercialOnAlternativas(
      altsAnt,
      dadosAtualizacao.unidade_vitrine,
      principal,
    );
  }

  const unidadesAtuais = Array.isArray(anterior?.unidades) ? anterior.unidades : [];
  if (anterior && unidadesAtuais.length > 0) {
    dadosAtualizacao.unidades = unidadesAtuais.map((u: any) => ({
      ...u,
      is_comercial: (normalizeSigla(u?.sigla) || normalizeSigla(u?.unidade)) === vitrineNorm,
    }));
  }
};

const copyValidField = (
  target: Record<string, unknown>,
  dados: Record<string, unknown>,
  field: string,
) => {
  if (field === 'unidade_vitrine') {
    if (!Object.prototype.hasOwnProperty.call(dados, field)) return;
    const v = dados[field];
    target[field] = v == null ? '' : String(v).trim();
    return;
  }
  if ((field === 'unidades_alternativas' || field === 'unidades') && Array.isArray(dados[field])) {
    target[field] = dados[field];
    return;
  }
  const valor = dados[field];
  if (valor === null || valor === undefined) return;
  if (String(valor).trim() !== '') {
    target[field] = valor;
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      alterados,
      is_ultimo_lote = true,
      lote_numero = 1,
      total_lotes = 1,
      grupo_importacao_id,
      tipo_importacao,
    } = await req.json();

    if (!alterados || !Array.isArray(alterados) || alterados.length === 0) {
      return Response.json({ error: 'Nenhum produto para importar' }, { status: 400 });
    }

    const novos = alterados.filter(a => a.isNew);
    const atualizados = alterados.filter(a => !a.isNew);

    // Tirar snapshot dos produtos que serão atualizados (busca individual com delay)
    const produtosAtualizadosSnapshot = [];
    const produtoAntigoPorId = new Map<string, Record<string, unknown>>();
    for (const item of atualizados) {
      if (!item.id) continue;
      try {
        const prods = await withRetry(() => base44.asServiceRole.entities.Produto.filter({ id: item.id }, null, 1));
        if (prods && prods.length > 0) {
          produtosAtualizadosSnapshot.push({ id: prods[0].id, dados_anteriores: prods[0] });
          produtoAntigoPorId.set(String(prods[0].id), prods[0]);
        }
        await sleep(150);
      } catch (e) {
        console.warn(`Snapshot falhou para id ${item.id}:`, e.message);
      }
    }

    // Log de importação (opcional): se a entidade ImportacaoLog não existir no app, seguimos só com Produto.
    let importacaoLogAviso: string | null = null;
    try {
      const logsExistentes = await base44.asServiceRole.entities.ImportacaoLog.list('-created_date', 1);
      let ultimoNumero = 1;
      if (logsExistentes.length > 0) {
        const bruto = logsExistentes[0]?.numero;
        const semPrefixo = String(bruto ?? 'IMP-00000').replace(/^IMP-/i, '').trim();
        const parsed = parseInt(semPrefixo, 10);
        ultimoNumero = Number.isFinite(parsed) && parsed >= 0 ? parsed + 1 : 1;
      }
      const numeroLog = `IMP-${String(ultimoNumero).padStart(5, '0')}`;

      const rotuloTipo =
        typeof tipo_importacao === 'string' && tipo_importacao.trim() ? tipo_importacao.trim() : 'Produtos';

      await base44.asServiceRole.entities.ImportacaoLog.create({
        numero: numeroLog,
        tipo: rotuloTipo,
        status: 'Concluída',
        grupo_importacao_id: grupo_importacao_id || `GRP-${Date.now()}`,
        lote_numero,
        total_lotes,
        is_ultimo_lote,
        total_novos: novos.length,
        total_atualizados: atualizados.length,
        produtos_atualizados: produtosAtualizadosSnapshot,
      });

      await sleep(100);
    } catch (logErr: unknown) {
      const msg = logErr instanceof Error ? logErr.message : String(logErr);
      console.warn('ImportacaoLog indisponível (importação continua sem audit trail / desfazer por lote):', msg);
      importacaoLogAviso = msg.includes('not found') || msg.includes('ImportacaoLog')
        ? 'Registo de importação (ImportacaoLog) não configurado no app — produtos foram atualizados, mas o separador Desfazer pode ficar vazio para esta operação.'
        : `Log de importação omitido: ${msg}`;
    }

    const validFields = [
      'tipo', 'preco_venda_padrao', 'campo_hierarquico_1', 'campo_hierarquico_2',
      'campo_hierarquico_3', 'campo_hierarquico_4', 'campo_hierarquico_5',
      'codigo_barras', 'marca', 'categoria_nome', 'area_codigo',
      'valor_compra', 'desconto_perc', 'custo_frete_padrao', 'custo_imposto1_padrao',
      'custo_imposto2_padrao', 'custo_outros_padrao', 'preco_venda_percentual',
      'preco_custo_calculado', 'unidade_principal', 'unidade_vitrine', 'unidades', 'unidades_alternativas', 'unidades_por_pacote',
      'casas_decimais', 'estoque_minimo', 'estoque_ideal', 'estoque_maximo', 'tempo_reposicao_dias',
      'peso_kg', 'dimensoes_cm', 'abcd', 'preco_livre', 'controla_serial', 'controla_lote', 'controla_validade', 'ativo', 'nome',
    ];

    // Processar cada produto com pequeno delay para evitar rate limit.
    // Antes de gravar, valida invariantes de unidades — linhas invalidas sao
    // rejeitadas e reportadas (porta dos fundos historicamente aberta para typos).
    let processados = 0;
    const linhasRejeitadas: Array<{ id: any; isNew: boolean; nome?: string; erros: string[] }> = [];
    for (const { id, dados, isNew } of alterados) {
      try {
        const tocaUnidades =
          Object.prototype.hasOwnProperty.call(dados || {}, 'unidade_principal') ||
          Object.prototype.hasOwnProperty.call(dados || {}, 'unidades_alternativas');
        if (tocaUnidades) {
          const validation = validateUnidadesPayload(dados);
          if (!validation.ok) {
            linhasRejeitadas.push({ id, isNew, nome: dados?.nome, erros: validation.errors });
            console.warn(`✗ Produto ${id || '(novo)'} rejeitado pela validacao de unidades: ${validation.errors.join('; ')}`);
            continue;
          }
        }

        if (isNew) {
          const novoProduto = {
            tipo: dados.tipo && String(dados.tipo).trim() ? dados.tipo : 'Produto',
            preco_venda_padrao: Number(dados.preco_venda_padrao) || 0,
            campo_hierarquico_1: dados.campo_hierarquico_1 && String(dados.campo_hierarquico_1).trim()
              ? dados.campo_hierarquico_1
              : 'Sem categoria',
          };
          validFields.forEach((field) => copyValidField(novoProduto, dados || {}, field));
          await withRetry(() => base44.asServiceRole.entities.Produto.create(novoProduto));
        } else {
           const dadosAtualizacao: Record<string, unknown> = {};
           validFields.forEach((field) => copyValidField(dadosAtualizacao, dados || {}, field));
           const anterior = produtoAntigoPorId.get(String(id));
           applyVitrineToPayload(dadosAtualizacao, dados || {}, anterior);
           if (Object.keys(dadosAtualizacao).length > 0) {
             await withRetry(() => base44.asServiceRole.entities.Produto.update(id, dadosAtualizacao));
             console.log(`✓ Produto ${id} atualizado:`, Object.keys(dadosAtualizacao).join(', '));
           } else {
             console.warn(`⚠ Nenhum campo para atualizar no produto ${id}`);
           }
         }
        processados++;
        await sleep(200);
      } catch (e) {
        console.warn(`Erro ao processar produto ${id}:`, e.message);
      }
    }

    return Response.json({
      success: true,
      message: `Lote ${lote_numero}/${total_lotes} concluído. ${processados}/${alterados.length} produto(s) processado(s).${linhasRejeitadas.length > 0 ? ` ${linhasRejeitadas.length} rejeitado(s) por validacao de unidades.` : ''}`,
      count: processados,
      rejeitados: linhasRejeitadas,
      ...(importacaoLogAviso ? { warning: importacaoLogAviso } : {}),
    });
  } catch (error) {
    console.error('Erro na importação:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});