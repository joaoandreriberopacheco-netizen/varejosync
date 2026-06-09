import MobileDateRangePicker from '@/components/vendas/MobileDateRangePicker';

export default function ContagemExpressFiltroPeriodo({
  dataInicio,
  dataFim,
  onChange,
}) {
  return (
    <MobileDateRangePicker
      startDate={dataInicio}
      endDate={dataFim}
      onApply={(inicio, fim) => onChange({ dataInicio: inicio, dataFim: fim })}
      onClear={() => onChange({ dataInicio: '', dataFim: '' })}
    />
  );
}
