/**
 * AGEFIN — regras de exibição e geração de LancamentoFinanceiro (contas a pagar / recorrentes).
 */

/** Inclusão no atualizador de boletos: conta a pagar OU marcado como recorrente */
export function lancamentoEntraNoAtualizadorBoletos(l) {
  if (!l || l.status === 'Cancelado') return false;
  const tags = Array.isArray(l.tags) ? l.tags : [];
  const temContaPagar = tags.includes('conta_pagar');
  const temRecorrencia =
    Boolean(l.is_recorrente) ||
    Boolean(l.frequencia_recorrencia) ||
    tags.includes('recorrente');
  return temContaPagar || temRecorrencia;
}

export const TAG_LF_GERADO_AUTO = 'lf_gerado_auto';
export const TAG_LF_BOLETO_PDF = 'lf_boleto_pdf';

export function tagsOrigemBoleto(tags) {
  const t = Array.isArray(tags) ? tags : [];
  if (t.includes(TAG_LF_BOLETO_PDF)) return 'pdf';
  if (t.includes(TAG_LF_GERADO_AUTO)) return 'auto';
  return null;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** YYYY-MM a partir de data_vencimento ISO */
export function mesReferenciaLancamento(l) {
  const d = l?.data_vencimento;
  if (!d || typeof d !== 'string' || d.length < 7) return null;
  return d.slice(0, 7);
}

/**
 * Para recorrência mensal com grupo_lancamento_id: gera lançamentos faltantes do ano corrente até 31/dez.
 * Usa o primeiro lançamento do grupo como modelo (valor, descrição, dia de vencimento).
 */
export async function gerarLancamentosMensaisAteFimDoAno(base44, { ano } = {}) {
  const year = ano ?? new Date().getFullYear();
  const fimAno = `${year}-12-31`;

  const lista = await base44.entities.LancamentoFinanceiro.list('-data_vencimento', 800);
  const todos = lista || [];

  const candidatos = todos.filter(
    (l) =>
      l.status !== 'Cancelado' &&
      l.tipo === 'Despesa' &&
      l.is_recorrente &&
      l.grupo_lancamento_id &&
      (l.frequencia_recorrencia === 'Mensal' || (l.is_recorrente && !l.frequencia_recorrencia)) &&
      Array.isArray(l.tags) &&
      l.tags.includes('conta_pagar')
  );

  const porGrupo = new Map();
  for (const l of candidatos) {
    const g = l.grupo_lancamento_id;
    if (!porGrupo.has(g)) porGrupo.set(g, []);
    porGrupo.get(g).push(l);
  }

  let criados = 0;

  for (const [, grupoLista] of porGrupo) {
    grupoLista.sort((a, b) => (a.data_vencimento || '').localeCompare(b.data_vencimento || ''));
    const modelo = grupoLista[0];
    const dia = Math.min(
      28,
      Math.max(1, Number(String(modelo.data_vencimento || '').slice(8, 10)) || 15)
    );

    const existentesPorMes = new Set(grupoLista.map((x) => mesReferenciaLancamento(x)).filter(Boolean));

    for (let m = 1; m <= 12; m++) {
      const mesKey = `${year}-${pad2(m)}`;
      if (existentesPorMes.has(mesKey)) continue;

      const dataVenc = `${mesKey}-${pad2(dia)}`;
      if (dataVenc > fimAno) break;

      const baseTags = Array.from(new Set([...(modelo.tags || []), 'conta_pagar', 'recorrente', TAG_LF_GERADO_AUTO])).filter(
        (t) => t !== TAG_LF_BOLETO_PDF
      );

      await base44.entities.LancamentoFinanceiro.create({
        tipo: 'Despesa',
        descricao: modelo.descricao,
        terceiro_id: modelo.terceiro_id,
        terceiro_nome: modelo.terceiro_nome,
        valor: modelo.valor,
        valor_liquido: modelo.valor_liquido ?? modelo.valor,
        data_vencimento: dataVenc,
        status: 'Em Aberto',
        status_conciliacao: modelo.status_conciliacao || 'N/A',
        categoria: modelo.categoria,
        categoria_id: modelo.categoria_id,
        conta_financeira_id: modelo.conta_financeira_id,
        conta_financeira_nome: modelo.conta_financeira_nome,
        referencia_tipo: modelo.referencia_tipo || 'RecorrenciaAutomatica',
        referencia_id: modelo.grupo_lancamento_id,
        observacoes: `Competência ${mesKey} — gerado automaticamente até ${fimAno}.`,
        tags: baseTags,
        is_recorrente: true,
        frequencia_recorrencia: 'Mensal',
        grupo_lancamento_id: modelo.grupo_lancamento_id,
        forma_pagamento: modelo.forma_pagamento,
        forma_pagamento_tipo: modelo.forma_pagamento_tipo,
      });
      existentesPorMes.add(mesKey);
      criados++;
    }
  }

  return { criados, ano: year };
}

/**
 * Após importar/atualizar boleto em PDF: marca o(s) LancamentoFinanceiro correspondente(s)
 * como atualizados por PDF (remove marca de gerado automático).
 */
export async function marcarLancamentosComoImportadosPorBoletoPdf(
  base44,
  { contaPrevistaId, lancamentoFinanceiroId, grupoLancamentoId, dataVencimento, valor }
) {
  const mes = dataVencimento && dataVencimento.length >= 7 ? dataVencimento.slice(0, 7) : null;
  const atualizarUm = async (l) => {
    if (!l?.id) return;
    const tags = new Set([...(l.tags || [])]);
    tags.delete(TAG_LF_GERADO_AUTO);
    tags.add(TAG_LF_BOLETO_PDF);
    if (!tags.has('conta_pagar')) tags.add('conta_pagar');
    await base44.entities.LancamentoFinanceiro.update(l.id, {
      tags: [...tags],
      ...(valor != null ? { valor, valor_liquido: valor } : {}),
      ...(dataVencimento ? { data_vencimento: dataVencimento } : {}),
      forma_pagamento_tipo: 'Boleto',
      forma_pagamento: 'Boleto',
    });
  };

  if (lancamentoFinanceiroId) {
    try {
      const direto = await base44.entities.LancamentoFinanceiro.get(lancamentoFinanceiroId);
      if (direto?.id) {
        await atualizarUm(direto);
        return;
      }
    } catch (_) {
      /* continua com referência / grupo */
    }
  }

  if (contaPrevistaId) {
    const porRef = await base44.entities.LancamentoFinanceiro.filter({ referencia_id: contaPrevistaId });
    for (const l of porRef || []) await atualizarUm(l);
    if (porRef?.length) return;
  }

  if (grupoLancamentoId && mes) {
    const grupo = await base44.entities.LancamentoFinanceiro.filter({ grupo_lancamento_id: grupoLancamentoId });
    const match = (grupo || []).filter((l) => mesReferenciaLancamento(l) === mes);
    for (const l of match) await atualizarUm(l);
  }
}
