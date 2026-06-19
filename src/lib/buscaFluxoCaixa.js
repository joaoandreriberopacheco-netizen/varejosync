/**
 * Busca no Fluxo de Caixa.
 * Prefixo \\ (duas barras) filtra por conta: \\PP → "CAIXA PP".
 * Texto após espaço combina com busca normal: \\PP pagamento
 */
export function parseBuscaFluxoCaixa(search = '') {
  const raw = String(search || '').trim();
  if (!raw) {
    return { modo: 'texto', contaQuery: null, texto: '' };
  }
  if (raw.startsWith('\\\\')) {
    const rest = raw.slice(2);
    const spaceIdx = rest.search(/\s/);
    const contaQuery = (spaceIdx === -1 ? rest : rest.slice(0, spaceIdx)).trim();
    const texto = spaceIdx === -1 ? '' : rest.slice(spaceIdx + 1).trim();
    return { modo: 'conta', contaQuery, texto };
  }
  return { modo: 'texto', contaQuery: null, texto: raw };
}

function normalizarBusca(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

export function contaFinanceiraMatchBusca(conta, contaQuery) {
  if (!conta || !contaQuery) return false;
  const q = normalizarBusca(contaQuery);
  const nome = normalizarBusca(conta.nome);
  return nome.includes(q);
}

/** Resolve se o lançamento pertence à conta indicada na busca \\conta. */
export function lancamentoMatchBuscaConta(l, contaQuery, contas = [], contasById = {}) {
  if (!contaQuery) return true;
  const q = normalizarBusca(contaQuery);

  const nomeLanc = normalizarBusca(l.conta_financeira_nome);
  if (nomeLanc && nomeLanc.includes(q)) return true;

  if (l.conta_financeira_id) {
    const conta = contasById[l.conta_financeira_id];
    if (contaFinanceiraMatchBusca(conta, contaQuery)) return true;
  }

  if (!l.conta_financeira_id) {
    return contas.some((c) => c.is_caixa_geral && contaFinanceiraMatchBusca(c, contaQuery));
  }

  return false;
}

export function lancamentoMatchBuscaTexto(l, texto) {
  if (!texto) return true;
  const q = normalizarBusca(texto);
  return (
    normalizarBusca(l.descricao).includes(q) ||
    normalizarBusca(l.categoria).includes(q) ||
    normalizarBusca(l.conta_financeira_nome).includes(q) ||
    normalizarBusca(l.referencia_numero).includes(q) ||
    (Array.isArray(l.tags) && l.tags.some((t) => normalizarBusca(t).includes(q)))
  );
}

export function lancamentoPassaBuscaFluxo(l, search, contas = [], contasById = {}) {
  if (!String(search || '').trim()) return true;

  const { modo, contaQuery, texto } = parseBuscaFluxoCaixa(search);

  if (modo === 'conta') {
    if (!contaQuery) return true;
    if (!lancamentoMatchBuscaConta(l, contaQuery, contas, contasById)) return false;
    return lancamentoMatchBuscaTexto(l, texto);
  }

  return lancamentoMatchBuscaTexto(l, texto);
}
