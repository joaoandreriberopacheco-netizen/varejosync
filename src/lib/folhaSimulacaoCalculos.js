import {
  aplicarSalarioBaseNasRubricas,
  calcularRelatorioFolhaPorCentroCusto,
  extrairSalarioBase,
  isSocio,
  TIPO_VINCULO,
} from '@/lib/folhaPrevisaoCalculos';

/** @typedef {{ removido?: boolean, reducaoPercentual?: number }} AjusteSimulacaoFolha */

function clonarModelo(modelo) {
  return JSON.parse(JSON.stringify(modelo));
}

function normalizarReducaoPercentual(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(100, Math.max(0, n));
}

/**
 * Aplica corte ou redução percentual em cópia do modelo (não altera o original).
 * @returns {object|null} modelo ajustado ou null se removido
 */
export function aplicarAjusteSimulacaoPessoa(modelo, ajuste = {}) {
  if (!modelo) return null;
  if (ajuste?.removido) return null;

  const reducao = normalizarReducaoPercentual(ajuste?.reducaoPercentual);
  if (reducao === 0) return clonarModelo(modelo);

  const clone = clonarModelo(modelo);
  const fator = 1 - reducao / 100;

  if (isSocio(clone)) {
    clone.retirada_valor_fixo = (Number(clone.retirada_valor_fixo) || 0) * fator;
    const proLabore = extrairSalarioBase(clone);
    if (proLabore > 0) {
      clone.rubricas = aplicarSalarioBaseNasRubricas(
        clone.rubricas,
        proLabore * fator,
        TIPO_VINCULO.SOCIO,
      );
    }
    return clone;
  }

  clone.rubricas = (clone.rubricas || []).map((r) => ({
    ...r,
    valor_base: (Number(r.valor_base) || 0) * fator,
  }));
  return clone;
}

/** Monta lista de modelos após simulação (exclui cortados, aplica reduções). */
export function montarModelosSimulacao(modelos = [], ajustesPorId = {}) {
  return (modelos || [])
    .filter((m) => m?.colaborador_id && m.ativo !== false)
    .map((m) => aplicarAjusteSimulacaoPessoa(m, ajustesPorId[m.id] || {}))
    .filter(Boolean);
}

export function calcularComparativoSimulacaoFolha({
  modelos = [],
  centrosRegistrados = [],
  colaboradoresMap = {},
  ajustesPorId = {},
  competenciaInicio = null,
  meses = 12,
} = {}) {
  const base = calcularRelatorioFolhaPorCentroCusto({
    modelos,
    centrosRegistrados,
    colaboradoresMap,
    competenciaInicio,
    meses,
  });

  const simulados = montarModelosSimulacao(modelos, ajustesPorId);
  const depois = calcularRelatorioFolhaPorCentroCusto({
    modelos: simulados,
    centrosRegistrados,
    colaboradoresMap,
    competenciaInicio,
    meses,
  });

  const totalAntes = base.resumo.totalMediaMensal;
  const totalDepois = depois.resumo.totalMediaMensal;
  const pessoasAntes = base.resumo.totalPessoas;
  const pessoasDepois = depois.resumo.totalPessoas;

  return {
    antes: base,
    depois,
    economiaMensal: Math.max(0, totalAntes - totalDepois),
    pessoasCortadas: Math.max(0, pessoasAntes - pessoasDepois),
    temAlteracao: pessoasDepois < pessoasAntes || totalDepois < totalAntes - 0.009,
  };
}

export function criarEstadoAjustesVazio() {
  return {};
}

export function atualizarAjusteSimulacao(estado, modeloId, patch) {
  const atual = estado[modeloId] || { removido: false, reducaoPercentual: 0 };
  const proximo = { ...atual, ...patch };
  if (!proximo.removido && !normalizarReducaoPercentual(proximo.reducaoPercentual)) {
    const { [modeloId]: _, ...resto } = estado;
    return resto;
  }
  return { ...estado, [modeloId]: proximo };
}
