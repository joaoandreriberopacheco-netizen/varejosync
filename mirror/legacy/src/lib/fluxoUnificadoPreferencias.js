const STORAGE_KEY = 'p38-fluxo-unificado-prefs';

export function lerPreferenciasFluxoUnificado() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { mostrarProgramadas: false };
    const parsed = JSON.parse(raw);
    return {
      mostrarProgramadas: !!parsed.mostrarProgramadas,
    };
  } catch {
    return { mostrarProgramadas: false };
  }
}

export function gravarPreferenciasFluxoUnificado(prefs) {
  try {
    const atual = lerPreferenciasFluxoUnificado();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...atual, ...prefs }));
  } catch {
    /* ignore */
  }
}
