import {
  aplicarSalarioBaseNasRubricas,
  calcularRelatorioFolhaPorCentroCusto,
  extrairSalarioBase,
  isSocio,
  TIPO_VINCULO,
} from '@/lib/folhaPrevisaoCalculos';

/** @typedef {{ removido?: boolean, salarioBase?: number, retiradaValor?: number }} AjusteSimulacaoFolha */

function clonarModelo(modelo) {
  return JSON.parse(JSON.stringify(modelo));
}

function valoresIguais(a, b) {
  return Math.abs((Number(a) || 0) - (Number(b) || 0)) < 0.005;
}

export function obterSalarioBaseOriginal(modelo) {
  return extrairSalarioBase(modelo);
}

export function obterRetiradaOriginal(modelo) {
  return Number(modelo?.retirada_valor_fixo) || 0;
}

export function obterSalarioBaseSimulado(modelo, ajuste = {}) {
  if (ajuste?.salarioBase != null && Number.isFinite(Number(ajuste.salarioBase))) {
    return Math.max(0, Number(ajuste.salarioBase));
  }
  return obterSalarioBaseOriginal(modelo);
}

export function obterRetiradaSimulada(modelo, ajuste = {}) {
  if (ajuste?.retiradaValor != null && Number.isFinite(Number(ajuste.retiradaValor))) {
    return Math.max(0, Number(ajuste.retiradaValor));
  }
  return obterRetiradaOriginal(modelo);
}

function ajusteTemAlteracaoValor(ajuste = {}, modelo) {
  if (!ajuste || ajuste.removido) return Boolean(ajuste?.removido);
  if (isSocio(modelo)) {
    return (
      (ajuste.retiradaValor != null && !valoresIguais(ajuste.retiradaValor, obterRetiradaOriginal(modelo))) ||
      (ajuste.salarioBase != null && !valoresIguais(ajuste.salarioBase, obterSalarioBaseOriginal(modelo)))
    );
  }
  return ajuste.salarioBase != null && !valoresIguais(ajuste.salarioBase, obterSalarioBaseOriginal(modelo));
}

/**
 * Aplica corte ou valores simulados em cópia do modelo (não altera o original).
 * @returns {object|null} modelo ajustado ou null se removido
 */
export function aplicarAjusteSimulacaoPessoa(modelo, ajuste = {}) {
  if (!modelo) return null;
  if (ajuste?.removido) return null;
  if (!ajusteTemAlteracaoValor(ajuste, modelo)) return clonarModelo(modelo);

  const clone = clonarModelo(modelo);

  if (isSocio(clone)) {
    if (ajuste.retiradaValor != null && Number.isFinite(Number(ajuste.retiradaValor))) {
      clone.retirada_valor_fixo = Math.max(0, Number(ajuste.retiradaValor));
    }
    if (ajuste.salarioBase != null && Number.isFinite(Number(ajuste.salarioBase))) {
      clone.rubricas = aplicarSalarioBaseNasRubricas(
        clone.rubricas,
        Math.max(0, Number(ajuste.salarioBase)),
        TIPO_VINCULO.SOCIO,
      );
    }
    return clone;
  }

  if (ajuste.salarioBase != null && Number.isFinite(Number(ajuste.salarioBase))) {
    clone.rubricas = aplicarSalarioBaseNasRubricas(
      clone.rubricas,
      Math.max(0, Number(ajuste.salarioBase)),
      TIPO_VINCULO.FUNCIONARIO,
    );
  }

  return clone;
}

/** Monta lista de modelos após simulação (exclui cortados, aplica valores simulados). */
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

  const temAlteracaoValor = (modelos || []).some((m) => ajusteTemAlteracaoValor(ajustesPorId[m.id], m));

  return {
    antes: base,
    depois,
    economiaMensal: Math.max(0, totalAntes - totalDepois),
    pessoasCortadas: Math.max(0, pessoasAntes - pessoasDepois),
    temAlteracao:
      pessoasDepois < pessoasAntes || totalDepois < totalAntes - 0.009 || temAlteracaoValor,
  };
}

export function criarEstadoAjustesVazio() {
  return {};
}

export function atualizarAjusteSimulacao(estado, modeloId, patch, modelo = null) {
  const atual = estado[modeloId] || { removido: false };
  const proximo = { ...atual, ...patch };

  if (proximo.removido) {
    return { ...estado, [modeloId]: { removido: true } };
  }

  const limpo = { removido: false };
  if (proximo.salarioBase != null && Number.isFinite(Number(proximo.salarioBase))) {
    limpo.salarioBase = Math.max(0, Number(proximo.salarioBase));
  }
  if (proximo.retiradaValor != null && Number.isFinite(Number(proximo.retiradaValor))) {
    limpo.retiradaValor = Math.max(0, Number(proximo.retiradaValor));
  }

  if (modelo) {
    if (
      limpo.salarioBase != null &&
      valoresIguais(limpo.salarioBase, obterSalarioBaseOriginal(modelo))
    ) {
      delete limpo.salarioBase;
    }
    if (
      limpo.retiradaValor != null &&
      valoresIguais(limpo.retiradaValor, obterRetiradaOriginal(modelo))
    ) {
      delete limpo.retiradaValor;
    }
  }

  if (!ajusteTemAlteracaoValor(limpo, modelo)) {
    const { [modeloId]: _, ...resto } = estado;
    return resto;
  }

  return { ...estado, [modeloId]: limpo };
}
