import MobileDateRangePicker from '@/components/vendas/MobileDateRangePicker';

export default function ContagemExpressFiltroPeriodo({
  dataInicio,
  dataFim,
  onChange,
}) {
  return (
    <div className="[&_button]:h-10 [&_button]:text-sm">
      <MobileDateRangePicker
        startDate={dataInicio}
        endDate={dataFim}
        onApply={(inicio, fim) => onChange({ dataInicio: inicio, dataFim: fim })}
        onClear={() => onChange({ dataInicio: '', dataFim: '' })}
      />
    </div>
  );
}
