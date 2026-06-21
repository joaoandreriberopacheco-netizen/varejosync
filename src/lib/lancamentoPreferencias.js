const STORAGE_KEY = 'p38_lancamento_prefs_v1';

function lerTodas() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Última conta e categoria usadas por tipo (Receita / Despesa). */
export function lerPreferenciasLancamento(tipo) {
  if (!tipo || tipo === 'Transferência') return {};
  return lerTodas()[tipo] || {};
}

export function gravarPreferenciasLancamento(tipo, { contaId, categoria, categoriaId }) {
  if (!tipo || tipo === 'Transferência') return;
  try {
    const all = lerTodas();
    all[tipo] = {
      contaId: contaId || '',
      categoria: categoria || '',
      categoriaId: categoriaId || '',
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignorar quota / modo privado
  }
}

/** Aplica preferências se conta/categoria ainda existirem na lista. */
export function resolverPreferenciasLancamento(tipo, { contas = [], categorias = [] } = {}) {
  const prefs = lerPreferenciasLancamento(tipo);
  const contaId = prefs.contaId && contas.some((c) => c.id === prefs.contaId) ? prefs.contaId : '';
  const catOk = prefs.categoria && categorias.some((c) => c.nome === prefs.categoria || c.id === prefs.categoriaId);
  return {
    contaId,
    categoria: catOk ? prefs.categoria : '',
    categoriaId: catOk ? (prefs.categoriaId || '') : '',
  };
}
