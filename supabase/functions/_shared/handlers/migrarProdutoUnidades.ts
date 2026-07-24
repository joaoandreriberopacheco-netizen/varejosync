// Port automático de base44/functions/migrarProdutoUnidades/entry.ts
import type { createP38Client } from '../p38Client.ts';

/* ============================================================================
 * migrarProdutoUnidades
 *
 * Backfill idempotente: unifica `unidade_principal` + `unidades_alternativas[]`
 * legados em `Produto.unidades[]` canonico, com IDs estaveis, siglas
 * normalizadas e correcao de typos historicos de fator_conversao usando regex
 * do nome do produto (resolve casos como Polar/Phoenix com fator 4,67 -> 2,16).
 *
 * Idempotencia: se `produto.unidades[]` ja existe e e valido, nao mexe.
 * Aceita `dry_run: true` (default) pra so reportar mudancas sem persistir.
 * ============================================================================ */

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

const newId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const asNumber = (value: any, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const extractFatorFromName = (...nomes: any[]): number | null => {
  for (const raw of nomes) {
    if (!raw) continue;
    const s = String(raw)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace('METRO QUADRADO', 'M2').replace('M²', 'M2')
      .replace(/CAIXAS?/g, 'CX');
    const padroes = [
      /(\d+(?:[.,]\d+)?)\s*M2\s*[\/xX\s]*\s*CX/i,
      /CX\s*(\d+(?:[.,]\d+)?)\s*M2/i,
      /\(\s*(\d+(?:[.,]\d+)?)\s*M2\s*\)/i,
    ];
    for (const re of padroes) {
      const m = re.exec(s);
      if (m) {
        const v = Number(String(m[1]).replace(',', '.'));
        if (Number.isFinite(v) && v > 1 && v < 100) {
          return Math.round(v * 10000) / 10000;
        }
      }
    }
  }
  return null;
};

interface UnidadeCanonical {
  id: string;
  nome: string;
  sigla: string;
  fator_conversao: number;
  fator_preco: number;
  is_principal: boolean;
  is_comercial: boolean;
  ativo: boolean;
}

const makeUnidade = (input: any = {}): UnidadeCanonical => ({
  id: String(input.id || '').trim() || newId(),
  nome: typeof input.nome === 'string' ? input.nome.trim() : '',
  sigla: normalizeSigla(input.sigla || input.unidade),
  fator_conversao: asNumber(input.fator_conversao, 1) || 1,
  fator_preco: asNumber(input.fator_preco, 1) || 1,
  is_principal: input.is_principal === true,
  is_comercial: input.is_comercial === true,
  ativo: input.ativo !== false,
});

const validateUnidades = (unidades: UnidadeCanonical[]): { ok: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (!Array.isArray(unidades) || unidades.length === 0) {
    return { ok: false, errors: ['unidades vazio'] };
  }
  if (unidades.length > 5) errors.push(`max 5 unidades (atual: ${unidades.length})`);
  const ids = new Set<string>();
  const siglas = new Set<string>();
  let countPrincipal = 0;
  let countComercial = 0;
  let principalFator1 = false;
  for (const u of unidades) {
    if (!u.id) errors.push('unidade sem id');
    else if (ids.has(u.id)) errors.push(`id duplicado: ${u.id}`);
    else ids.add(u.id);
    if (!u.sigla) errors.push('unidade sem sigla');
    else if (u.ativo !== false) {
      if (siglas.has(u.sigla)) errors.push(`sigla duplicada: ${u.sigla}`);
      else siglas.add(u.sigla);
    }
    if (!Number.isFinite(u.fator_conversao) || u.fator_conversao <= 0) {
      errors.push(`unidade ${u.sigla}: fator_conversao deve ser > 0`);
    }
    if (u.is_principal && u.ativo !== false) {
      countPrincipal++;
      if (u.fator_conversao === 1) principalFator1 = true;
    }
    if (u.is_comercial && u.ativo !== false) countComercial++;
  }
  if (countPrincipal !== 1) errors.push(`exatamente 1 is_principal (atual: ${countPrincipal})`);
  else if (!principalFator1) errors.push('is_principal deve ter fator_conversao = 1');
  if (countComercial !== 1) errors.push(`exatamente 1 is_comercial (atual: ${countComercial})`);
  return errors.length === 0 ? { ok: true, errors: [] } : { ok: false, errors };
};

const migrateLegacyToUnidades = (produto: any) => {
  const fixes: string[] = [];
  if (Array.isArray(produto?.unidades) && produto.unidades.length > 0) {
    const validation = validateUnidades(produto.unidades as UnidadeCanonical[]);
    return { unidades: produto.unidades, changed: false, fixes: [], valid: validation.ok, errors: validation.errors };
  }

  const principalSigla = normalizeSigla(produto?.unidade_principal || 'UN') || 'UN';
  const fatorNome = extractFatorFromName(
    produto?.nome,
    produto?.descricao,
    produto?.campo_hierarquico_1,
    produto?.campo_hierarquico_2,
    produto?.campo_hierarquico_3,
  );

  const principal = makeUnidade({
    id: 'principal',
    nome: 'Unidade base',
    sigla: principalSigla,
    fator_conversao: 1,
    fator_preco: 1,
    is_principal: true,
    is_comercial: false,
    ativo: true,
  });

  const alternativasInput = Array.isArray(produto?.unidades_alternativas) ? produto.unidades_alternativas : [];
  const alternativas: UnidadeCanonical[] = [];
  for (const a of alternativasInput) {
    if (!a?.unidade) continue;
    const sigla = normalizeSigla(a.unidade);
    let fator = asNumber(a.fator_conversao, 1) || 1;
    if (fatorNome && sigla === 'CX' && Math.abs(fator - fatorNome) > 0.01) {
      fixes.push(`CX: fator ${fator} -> ${fatorNome} (corrigido pelo regex do nome)`);
      fator = fatorNome;
    }
    alternativas.push(makeUnidade({
      id: a.id || newId(),
      nome: a.nome || a.rotulo || sigla,
      sigla,
      fator_conversao: fator,
      fator_preco: asNumber(a.fator_preco, 1) || 1,
      is_principal: false,
      is_comercial: false,
      ativo: a.ativo !== false,
    }));
  }

  const unidades = [principal, ...alternativas];

  // Resolve a unidade comercial pelo legado.
  const comercialIdLegacy = String(produto?.unidade_comercial_id || '').trim();
  const comercialSiglaLegacy = normalizeSigla(
    produto?.unidade_apresentacao_default || produto?.unidade_show_comercial || principalSigla
  );

  let comercialAplicado = false;
  if (comercialIdLegacy === 'primary' || comercialIdLegacy === 'principal') {
    unidades[0].is_comercial = true;
    comercialAplicado = true;
  } else if (comercialIdLegacy) {
    const byId = unidades.find(u => u.id === comercialIdLegacy);
    if (byId) { byId.is_comercial = true; comercialAplicado = true; }
  }
  if (!comercialAplicado && comercialSiglaLegacy) {
    const bySigla = unidades.find(u => normalizeSigla(u.sigla) === comercialSiglaLegacy);
    if (bySigla) { bySigla.is_comercial = true; comercialAplicado = true; }
  }
  if (!comercialAplicado) {
    unidades[0].is_comercial = true;
    fixes.push('is_comercial fallback para principal');
  }

  // Dedupe por sigla.
  const seen = new Set<string>();
  const deduped: UnidadeCanonical[] = [];
  for (const u of unidades) {
    if (!u.sigla) continue;
    if (seen.has(u.sigla)) {
      fixes.push(`sigla duplicada removida: ${u.sigla}`);
      continue;
    }
    seen.add(u.sigla);
    deduped.push(u);
  }

  const validation = validateUnidades(deduped);
  return { unidades: deduped, changed: true, fixes, valid: validation.ok, errors: validation.errors };
};

const buildLegacyMirror = (unidades: UnidadeCanonical[]) => {
  const principal = unidades.find(u => u.is_principal && u.ativo !== false) || unidades[0];
  const comercial = unidades.find(u => u.is_comercial && u.ativo !== false) || principal;
  const alternativasLegacy = unidades
    .filter(u => u && u.id !== principal.id)
    .map(u => ({
      id: u.id,
      nome: u.nome || '',
      unidade: u.sigla,
      fator_conversao: u.fator_conversao,
      fator_preco: u.fator_preco,
      ajuste_percentual: 0,
      preco_venda: 0,
      rotulo: u.nome || '',
      ativo: u.ativo !== false,
    }));
  return {
    unidade_principal: principal.sigla,
    unidades_alternativas: alternativasLegacy,
    unidade_apresentacao_default: comercial.sigla,
    unidade_show_comercial: comercial.sigla,
    unidade_comercial_id: comercial.id !== principal.id ? comercial.id : 'primary',
  };
};

export async function handle(req: Request, base44: Awaited<ReturnType<typeof createP38Client>>): Promise<Response> {
  try {
    // base44 injetado por servePorted
    const me = await base44.auth.me();
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false;
    const limit = Math.min(Number(body?.limit) || 1000, 5000);
    const apenasIds: string[] | null = Array.isArray(body?.ids) && body.ids.length > 0
      ? body.ids.map((x: any) => String(x))
      : null;

    const produtos = await base44.asServiceRole.entities.Produto.list();
    const candidatos = (produtos || [])
      .filter((p: any) => apenasIds ? apenasIds.includes(String(p.id)) : true)
      .slice(0, limit);

    const stats = {
      total_examinados: candidatos.length,
      ja_canonicos: 0,
      migrados: 0,
      invalidos: 0,
      sem_alteracao: 0,
    };
    const updates: Array<{ id: string; nome: string; fixes: string[] }> = [];
    const invalidos: Array<{ id: string; nome: string; errors: string[] }> = [];

    for (const produto of candidatos) {
      const result = migrateLegacyToUnidades(produto);

      if (!result.changed) {
        if (result.valid) {
          stats.ja_canonicos++;
        } else {
          stats.invalidos++;
          invalidos.push({ id: produto.id, nome: produto.nome || '', errors: result.errors });
        }
        continue;
      }

      if (!result.valid) {
        stats.invalidos++;
        invalidos.push({ id: produto.id, nome: produto.nome || '', errors: result.errors });
        continue;
      }

      const legacyMirror = buildLegacyMirror(result.unidades as UnidadeCanonical[]);
      const patch = {
        unidades: result.unidades,
        ...legacyMirror,
        migracao_unidades_canonical_v3: true,
        migracao_unidades_canonical_data: new Date().toISOString(),
      };

      if (!dryRun) {
        await base44.asServiceRole.entities.Produto.update(produto.id, patch);
      }
      stats.migrados++;
      updates.push({ id: produto.id, nome: produto.nome || '', fixes: result.fixes });
    }

    stats.sem_alteracao = stats.ja_canonicos + stats.invalidos;

    return Response.json({
      success: true,
      dry_run: dryRun,
      stats,
      sample_updates: updates.slice(0, 50),
      invalidos: invalidos.slice(0, 50),
    });
  } catch (error) {
    console.error('migrarProdutoUnidades erro:', error);
    return Response.json({ error: (error as Error).message || String(error) }, { status: 500 });
  }
}
