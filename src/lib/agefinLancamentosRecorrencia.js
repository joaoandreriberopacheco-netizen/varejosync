/**
 * AGEFIN — regras de exibição e geração de LancamentoFinanceiro (contas a pagar / recorrentes).
 */

import { lancamentoEhContaPagar, lancamentoEhCmv, lancamentoCancelado } from '@/lib/agefinConsultaFilters';

/**
 * Séries recorrentes (conta a pagar) para o atualizador de boletos / Agefin Recorrentes.
 * Alinhado ao que entra na Agefin Consulta (tag conta_pagar), sem exigir a tag `recorrente`
 * em lançamentos antigos — CMV fica de fora deste fluxo.
 */
export function lancamentoRecorrenteContaPagarParaListaBoleto(l) {
  if (!l || l.tipo !== 'Despesa' || l.status === 'Cancelado' || lancamentoCancelado(l)) return false;
  if (lancamentoEhCmv(l)) return false;
  if (!l.grupo_lancamento_id) return false;
  const tags = Array.isArray(l.tags) ? l.tags : [];
  if (tags.includes('parcelado')) return false;

  const recorrente =
    Boolean(l.is_recorrente) ||
    Boolean(l.frequencia_recorrencia && l.frequencia_recorrencia !== 'Único') ||
    tags.includes('recorrente');
  if (!recorrente) return false;

  // Conta a pagar clássica (tag) ou recorrente explícita do planejamento/financeiro
  return (
    lancamentoEhContaPagar(l) ||
    (Boolean(l.is_recorrente) &&
      Boolean(l.frequencia_recorrencia && l.frequencia_recorrencia !== 'Único'))
  );
}

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

function firstDayOfCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-01`;
}

function maxDateYmd(a, b) {
  if (!a) return b || null;
  if (!b) return a || null;
  return a >= b ? a : b;
}

/** YYYY-MM a partir de data_vencimento ISO */
export function mesReferenciaLancamento(l) {
  const d = l?.data_vencimento;
  if (!d || typeof d !== 'string' || d.length < 7) return null;
  return d.slice(0, 7);
}

/** Soma meses a YYYY-MM-DD (dia ajustado ao fim do mês de destino). */
export function addMonthsYmd(ymdStr, deltaMonths) {
  const s = (ymdStr || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const totalM = y * 12 + (m - 1) + deltaMonths;
  const ny = Math.floor(totalM / 12);
  const nm = (totalM % 12) + 1;
  const dim = new Date(ny, nm, 0).getDate();
  const dd = Math.min(d, dim);
  return `${ny}-${pad2(nm)}-${pad2(dd)}`;
}

/** Recorrência mensal (conta a pagar) sujeita à janela automática / atualizador de boletos. */
export function isLancamentoParcelasMensaisRecorrente(l) {
  if (!l || l.status === 'Cancelado' || l.tipo !== 'Despesa') return false;
  const tags = Array.isArray(l.tags) ? l.tags : [];
  if (!tags.includes('conta_pagar') || !l.is_recorrente || !l.grupo_lancamento_id) return false;
  if (tags.includes('parcelado')) return false;
  const f = l.frequencia_recorrencia;
  // Só replica automaticamente séries explicitamente mensais (evita tratar Anual como Mensal)
  return f === 'Mensal';
}

export async function maxDataVencimentoMensaisOutrosGrupos(base44, excludeGrupoId) {
  const lista = await base44.entities.LancamentoFinanceiro.list('-data_vencimento', 5000);
  let maxD = null;
  for (const row of lista || []) {
    if (!isLancamentoParcelasMensaisRecorrente(row)) continue;
    if (excludeGrupoId && row.grupo_lancamento_id === excludeGrupoId) continue;
    const d = (row.data_vencimento || '').slice(0, 10);
    if (d && (!maxD || d > maxD)) maxD = d;
  }
  return maxD;
}

export async function maxDataVencimentoMensaisTodosGrupos(base44) {
  return maxDataVencimentoMensaisOutrosGrupos(base44, null);
}

function lancamentoPayloadClonadoMensal(modelo, dataVencimento, mesKey) {
  const baseTags = Array.from(new Set([...(modelo.tags || []), 'conta_pagar', 'recorrente', TAG_LF_GERADO_AUTO])).filter(
    (t) => t !== TAG_LF_BOLETO_PDF
  );
  return {
    tipo: 'Despesa',
    descricao: modelo.descricao,
    terceiro_id: modelo.terceiro_id,
    terceiro_nome: modelo.terceiro_nome,
    valor: modelo.valor,
    valor_liquido: modelo.valor_liquido ?? modelo.valor,
    data_vencimento: dataVencimento,
    status: 'Em Aberto',
    status_conciliacao: modelo.status_conciliacao || 'N/A',
    categoria: modelo.categoria,
    categoria_id: modelo.categoria_id,
    conta_financeira_id: modelo.conta_financeira_id,
    conta_financeira_nome: modelo.conta_financeira_nome,
    referencia_tipo: modelo.referencia_tipo || 'RecorrenciaAutomatica',
    referencia_id: modelo.referencia_id || modelo.grupo_lancamento_id,
    observacoes: `Competência ${mesKey} — gerado automaticamente (janela recorrente).`,
    tags: baseTags,
    is_recorrente: true,
    frequencia_recorrencia: 'Mensal',
    grupo_lancamento_id: modelo.grupo_lancamento_id,
    forma_pagamento: modelo.forma_pagamento,
    forma_pagamento_tipo: modelo.forma_pagamento_tipo,
  };
}

/**
 * Após o primeiro lançamento mensal do grupo: cria até 3 parcelas seguintes,
 * totalizando 4 vencimentos, sem ultrapassar o maior vencimento já existente noutros grupos (alinhamento da frota).
 */
export async function criarParcelasIniciaisRecorrenteAposPrimeiro(base44, modelo) {
  if (!modelo?.grupo_lancamento_id || !isLancamentoParcelasMensaisRecorrente(modelo)) return { criados: 0 };
  const grupoId = modelo.grupo_lancamento_id;
  const cap = await maxDataVencimentoMensaisOutrosGrupos(base44, grupoId);
  const primeiroOriginal = (modelo.data_vencimento || '').slice(0, 10);
  if (!primeiroOriginal) return { criados: 0 };
  // Evita preencher meses passados quando o primeiro lançamento foi criado retroativamente.
  const primeiro = maxDateYmd(primeiroOriginal, firstDayOfCurrentMonth());

  let criados = 0;
  for (let i = 1; i <= 3; i += 1) {
    const dt = addMonthsYmd(primeiro, i);
    if (!dt) break;
    if (cap && dt > cap) break;
    const mesKey = dt.slice(0, 7);
    const existentes = await base44.entities.LancamentoFinanceiro.filter({ grupo_lancamento_id: grupoId });
    const jaTem = (existentes || []).some((x) => mesReferenciaLancamento(x) === mesKey);
    if (jaTem) continue;
    await base44.entities.LancamentoFinanceiro.create(lancamentoPayloadClonadoMensal(modelo, dt, mesKey));
    criados += 1;
  }
  return { criados };
}

async function agruparMensaisRecorrentes(base44) {
  const lista = await base44.entities.LancamentoFinanceiro.list('-data_vencimento', 5000);
  const todos = lista || [];
  const candidatos = todos.filter(isLancamentoParcelasMensaisRecorrente);
  const porGrupo = new Map();
  for (const l of candidatos) {
    const g = l.grupo_lancamento_id;
    if (!porGrupo.has(g)) porGrupo.set(g, []);
    porGrupo.get(g).push(l);
  }
  for (const arr of porGrupo.values()) {
    arr.sort((a, b) => (a.data_vencimento || '').localeCompare(b.data_vencimento || ''));
  }
  return { lista: todos, porGrupo, candidatos };
}

/** Grupos com vencimento máximo abaixo do máximo global recebem parcelas até alinhar (ex.: nova recorrente). */
export async function alinharGruposRecorrentesAoHorizonteGlobal(base44) {
  const { porGrupo } = await agruparMensaisRecorrentes(base44);
  const globalMax = await maxDataVencimentoMensaisTodosGrupos(base44);
  if (!globalMax) return { criados: 0 };

  let criados = 0;
  for (const [, grupoLista] of porGrupo) {
    const modelo = grupoLista[0];
    let gMax = (grupoLista[grupoLista.length - 1].data_vencimento || '').slice(0, 10);
    if (!gMax) continue;
    const mesesNoGrupo = () => new Set(grupoLista.map((x) => mesReferenciaLancamento(x)).filter(Boolean));

    while (gMax < globalMax) {
      const next = addMonthsYmd(gMax, 1);
      if (!next || next > globalMax) break;
      const mk = next.slice(0, 7);
      const setMes = mesesNoGrupo();
      if (setMes.has(mk)) {
        gMax = next;
        continue;
      }
      await base44.entities.LancamentoFinanceiro.create(lancamentoPayloadClonadoMensal(modelo, next, mk));
      grupoLista.push({ data_vencimento: next, grupo_lancamento_id: modelo.grupo_lancamento_id });
      grupoLista.sort((a, b) => (a.data_vencimento || '').localeCompare(b.data_vencimento || ''));
      gMax = (grupoLista[grupoLista.length - 1].data_vencimento || '').slice(0, 10);
      criados += 1;
    }
  }
  return { criados };
}

const EXT_STORAGE_PREFIX = 'varejosync_lf_rec_ext_';

/** Uma vez por mês civil: estende o maior vencimento global em +1 mês e replica para todos os grupos mensais. */
export async function garantirExtensaoMensalRecorrentes(base44) {
  const now = new Date();
  const ym = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  if (typeof localStorage !== 'undefined' && localStorage.getItem(EXT_STORAGE_PREFIX + ym)) {
    return { criados: 0, skipped: true };
  }

  const globalMax = await maxDataVencimentoMensaisTodosGrupos(base44);
  if (!globalMax) {
    return { criados: 0, skipped: false };
  }

  const newTarget = addMonthsYmd(globalMax, 1);
  if (!newTarget) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(EXT_STORAGE_PREFIX + ym, '1');
    return { criados: 0 };
  }

  const { porGrupo } = await agruparMensaisRecorrentes(base44);
  let criados = 0;

  for (const [, grupoLista] of porGrupo) {
    const modelo = grupoLista[0];
    let gMax = (grupoLista[grupoLista.length - 1].data_vencimento || '').slice(0, 10);
    if (!gMax) continue;

    while (gMax < newTarget) {
      const next = addMonthsYmd(gMax, 1);
      if (!next || next > newTarget) break;
      const mk = next.slice(0, 7);
      const jaTem = grupoLista.some((x) => mesReferenciaLancamento(x) === mk);
      if (jaTem) {
        gMax = next;
        continue;
      }
      await base44.entities.LancamentoFinanceiro.create(lancamentoPayloadClonadoMensal(modelo, next, mk));
      grupoLista.push({ data_vencimento: next });
      grupoLista.sort((a, b) => (a.data_vencimento || '').localeCompare(b.data_vencimento || ''));
      gMax = (grupoLista[grupoLista.length - 1].data_vencimento || '').slice(0, 10);
      criados += 1;
    }
  }

  if (typeof localStorage !== 'undefined') localStorage.setItem(EXT_STORAGE_PREFIX + ym, '1');
  return { criados, skipped: false };
}

/**
 * Sincroniza recorrências mensais: alinha novos grupos ao horizonte existente e,
 * no primeiro acesso de cada mês civil, estende um mês para todos.
 * Substitui a geração em massa até dezembro.
 */
export async function gerarLancamentosMensaisAteFimDoAno(base44, _opts = {}) {
  const a = await alinharGruposRecorrentesAoHorizonteGlobal(base44);
  const b = await garantirExtensaoMensalRecorrentes(base44);
  return { criados: (a.criados || 0) + (b.criados || 0), ano: new Date().getFullYear() };
}

/**
 * Normaliza tags e aplica a janela inicial de parcelas + alinhamento/extensão em séries
 * que já existiam antes das regras atuais (ex.: sem tag `recorrente`).
 * Idempotente: só atualiza quando falta tag; parcelas só criam meses em falta.
 */
export async function aplicarRegrasRecorrenciaEmLegado(base44) {
  const lista = await base44.entities.LancamentoFinanceiro.list('-data_vencimento', 5000);
  let tagsAtualizados = 0;

  for (const l of lista || []) {
    if (!l?.id || l.tipo !== 'Despesa' || l.status === 'Cancelado' || lancamentoCancelado(l)) continue;
    if (!l.grupo_lancamento_id || !l.is_recorrente) continue;
    if (!lancamentoEhContaPagar(l)) continue;
    const tags = Array.isArray(l.tags) ? [...l.tags] : [];
    if (tags.includes('parcelado')) continue;

    let changed = false;
    if (!tags.includes('conta_pagar')) {
      tags.push('conta_pagar');
      changed = true;
    }
    if (!tags.includes('recorrente')) {
      tags.push('recorrente');
      changed = true;
    }
    if (changed) {
      await base44.entities.LancamentoFinanceiro.update(l.id, { tags });
      tagsAtualizados += 1;
    }
  }

  const { porGrupo } = await agruparMensaisRecorrentes(base44);
  let parcelasIniciais = 0;
  for (const [, grupoLista] of porGrupo) {
    const sorted = [...grupoLista].sort((a, b) =>
      (a.data_vencimento || '').localeCompare(b.data_vencimento || '')
    );
    const modelo = sorted.find((x) => isLancamentoParcelasMensaisRecorrente(x));
    if (!modelo) continue;
    const r = await criarParcelasIniciaisRecorrenteAposPrimeiro(base44, modelo);
    parcelasIniciais += r.criados || 0;
  }

  const sync = await gerarLancamentosMensaisAteFimDoAno(base44);
  return {
    tagsAtualizados,
    parcelasIniciais,
    geracaoSync: sync.criados || 0,
  };
}

/**
 * Após importar/atualizar boleto em PDF: marca o(s) LancamentoFinanceiro correspondente(s)
 * como atualizados por PDF (remove marca de gerado automático).
 */
export async function marcarLancamentosComoImportadosPorBoletoPdf(
  base44,
  {
    contaPrevistaId,
    lancamentoFinanceiroId,
    grupoLancamentoId,
    dataVencimento,
    valor,
    /** Quando false (padrão), só marca tag de boleto — não altera valor nem vencimento. */
    atualizarValores = false,
    permitirFallbackGrupo = false,
    contextoMatch = null,
    boletoFingerprint = null,
  }
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
      ...(atualizarValores && valor != null ? { valor, valor_liquido: valor } : {}),
      ...(atualizarValores && dataVencimento ? { data_vencimento: dataVencimento } : {}),
      ...((contextoMatch || boletoFingerprint)
        ? {
            observacoes: [
              l.observacoes || '',
              contextoMatch ? `[agefin_pdf_match:${contextoMatch}]` : null,
              boletoFingerprint ? `[boleto_fp:${boletoFingerprint}]` : null,
            ]
              .filter(Boolean)
              .join('\n'),
          }
        : {}),
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

  if (permitirFallbackGrupo && grupoLancamentoId && mes) {
    const grupo = await base44.entities.LancamentoFinanceiro.filter({ grupo_lancamento_id: grupoLancamentoId });
    const match = (grupo || []).filter((l) => mesReferenciaLancamento(l) === mes);
    for (const l of match) await atualizarUm(l);
  }
}

/** Extrai fingerprint gravado em observações pelo importador (`[boleto_fp:...]`). */
export function extrairBoletoFingerprintDeObservacoes(text) {
  const m = String(text || '').match(/\[boleto_fp:([^\]]+)\]/);
  return m ? m[1].trim() : null;
}

function normalizarDescricaoRamo(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Para escopos em lote (todas/futuras): só agrupa o que é o mesmo “ramo” da recorrência.
 * — Séries automáticas: referencia_id === grupo_lancamento_id.
 * — Mesma ContaPrevista / mesma referência explícita.
 * — Várias competências (referências distintas): exige conta + tipo alinhados; separa séries paralelas
 *   por fingerprint de boleto; evita o antigo `return true` que “siamesava” dois fluxos (ex. dois INSS)
 *   só por compartilharem grupo_lancamento_id.
 */
export function lancamentoMesmoRamoRecorrencia(base, outro) {
  if (!base || !outro) return false;
  if ((base.id || '') === (outro.id || '')) return true;
  const gBase = base.grupo_lancamento_id || '';
  const gOut = outro.grupo_lancamento_id || '';
  if (!gBase || gBase !== gOut) return false;
  const refBase = base.referencia_id || '';
  const grupoId = gBase;

  if (refBase && refBase === grupoId) return true;

  const fpB = extrairBoletoFingerprintDeObservacoes(base.observacoes || '');
  const fpO = extrairBoletoFingerprintDeObservacoes(outro.observacoes || '');
  if (fpB && fpO && fpB !== fpO) return false;

  if (refBase && refBase !== grupoId) {
    if (
      (outro.referencia_id || '') === refBase &&
      (outro.referencia_tipo || '') === (base.referencia_tipo || '')
    ) {
      return true;
    }
    const c0 = base.conta_financeira_id || '';
    const c1 = outro.conta_financeira_id || '';
    if (!c0 || !c1 || c0 !== c1) return false;
    if ((base.referencia_tipo || '') !== (outro.referencia_tipo || '')) return false;

    const d0 = normalizarDescricaoRamo(base.descricao);
    const d1 = normalizarDescricaoRamo(outro.descricao);
    if (d0.length > 0 && d0 === d1) return true;
    if (fpB && fpO && fpB === fpO) return true;

    const tagsB = Array.isArray(base.tags) ? base.tags : [];
    const tagsO = Array.isArray(outro.tags) ? outro.tags : [];
    const autoB = tagsB.includes(TAG_LF_GERADO_AUTO);
    const autoO = tagsO.includes(TAG_LF_GERADO_AUTO);
    return autoB && autoO;
  }

  const c0 = base.conta_financeira_id || '';
  const c1 = outro.conta_financeira_id || '';
  if (!c0 || !c1 || c0 !== c1) return false;

  if (fpB && fpO) return fpB === fpO;

  const d0 = normalizarDescricaoRamo(base.descricao);
  const d1 = normalizarDescricaoRamo(outro.descricao);
  return d0.length > 0 && d0 === d1;
}
