export const DEFAULT_DASHBOARD_KPI_CONFIG = {
  kpi_lucro_break_even_diario: 0,
  kpi_lucro_meta_mensal: 0,
  kpi_venda_minima_diaria: 0,
  kpi_venda_meta_mensal: 0,
};

export function normalizeDashboardKpiConfig(raw = {}) {
  return {
    kpi_lucro_break_even_diario: Number(raw.kpi_lucro_break_even_diario || 0),
    kpi_lucro_meta_mensal: Number(raw.kpi_lucro_meta_mensal || 0),
    kpi_venda_minima_diaria: Number(raw.kpi_venda_minima_diaria || 0),
    kpi_venda_meta_mensal: Number(raw.kpi_venda_meta_mensal || 0),
  };
}

export function getDailyMetaFromMonthly(monthlyValue, daysInMonth) {
  const days = Number(daysInMonth) || 30;
  const monthly = Number(monthlyValue) || 0;
  if (monthly <= 0) return 0;
  return monthly / days;
}

export function getElapsedDaysInMonth(referenceDate = new Date()) {
  return referenceDate.getDate();
}

export function buildDonutRingData(actual, target, colors) {
  const safeActual = Number(actual) || 0;
  const safeTarget = Number(target) || 0;

  if (safeTarget <= 0) {
    return {
      percent: 0,
      fillPercent: 0,
      overflowPercent: 0,
      ringData: [
        { name: 'Sem meta', value: 100, color: colors.muted },
      ],
      ringOverflowData: [],
    };
  }

  const ratioPercent = (safeActual / safeTarget) * 100;
  const fillPercent = Math.min(Math.max(ratioPercent, 0), 100);
  const overflowPercent = Math.min(Math.max(ratioPercent - 100, 0), 100);

  return {
    percent: ratioPercent,
    fillPercent,
    overflowPercent,
    ringData: [
      { name: 'Progresso', value: fillPercent, color: colors.primary },
      { name: 'Restante', value: Math.max(100 - fillPercent, 0), color: colors.muted },
    ],
    ringOverflowData: overflowPercent > 0
      ? [
        { name: 'Excedente', value: overflowPercent, color: colors.primaryDark },
        { name: 'Excedente restante', value: Math.max(100 - overflowPercent, 0), color: 'transparent' },
      ]
      : [],
  };
}
