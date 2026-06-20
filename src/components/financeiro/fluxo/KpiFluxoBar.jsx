import FinanceiroResumoBar from './FinanceiroResumoBar';

/** Faixa única — KPIs do Fluxo de Caixa no header. */
export default function KpiFluxoBar({ kpis, periodoLabel }) {
  return (
    <FinanceiroResumoBar
      receitas={kpis.entrou}
      despesas={kpis.saiu}
      variacao={kpis.saldo}
      saldo={kpis.saldoContas}
      periodoLabel={periodoLabel}
      className="pb-0.5 md:pb-0.5"
    />
  );
}
