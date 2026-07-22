import React from 'react';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

export function formatDashboardCurrency(value) {
  if (!Number.isFinite(value) || value === 0) return 'R$ 0';
  if (Math.abs(value) >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}K`;
  return BRL.format(value);
}

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(3,7,18,0.95)',
  border: '1px solid rgba(148,163,184,0.35)',
  borderRadius: 10,
  color: '#edf2f7',
  boxShadow: '0 12px 26px rgba(0,0,0,0.45)',
};

const SERIES_LABELS = {
  lucro: 'Lucro acumulado',
  breakEven: 'Break-even acumulado',
  meta: 'Meta acumulada',
};

export function LucroAcumuladoChart({ data, innerSurfaceClassName }) {
  const hasBreakEven = data.some((point) => Number(point.breakEven) > 0);
  const hasMeta = data.some((point) => Number(point.meta) > 0);

  return (
    <div className={innerSurfaceClassName}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" vertical={false} />
          <XAxis
            dataKey="diaLabel"
            tick={{ fontSize: 11, fill: '#d7deea', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(value) => formatDashboardCurrency(value)}
            tick={{ fontSize: 11, fill: '#d7deea', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value, name) => [BRL.format(Number(value || 0)), SERIES_LABELS[name] || name]}
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: '#e2e8f0', fontWeight: 700 }}
            itemStyle={{ color: '#cbd5e1' }}
          />
          {hasBreakEven ? (
            <Line
              type="monotone"
              dataKey="breakEven"
              name="breakEven"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={false}
            />
          ) : null}
          {hasMeta ? (
            <Line
              type="monotone"
              dataKey="meta"
              name="meta"
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={false}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="lucro"
            name="lucro"
            stroke="#abc85a"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function DonutGauge({ ring, label, actualLabel, targetLabel, actualValue, targetValue }) {
  return (
    <div className="rounded-md px-2 py-2 bg-[#1f2734]/55 border border-slate-500/15">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <div className="grid grid-cols-[96px,1fr] gap-2 items-center">
        <div className="h-[96px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={ring.ringData}
                innerRadius={28}
                outerRadius={42}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                strokeWidth={0}
                cornerRadius={2}
              >
                {ring.ringData.map((entry) => (
                  <Cell key={`${label}-${entry.name}`} fill={entry.color} />
                ))}
              </Pie>
              {ring.ringOverflowData.length > 0 ? (
                <Pie
                  data={ring.ringOverflowData}
                  innerRadius={22}
                  outerRadius={26}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={0}
                  cornerRadius={2}
                >
                  {ring.ringOverflowData.map((entry) => (
                    <Cell key={`${label}-overflow-${entry.name}`} fill={entry.color} />
                  ))}
                </Pie>
              ) : null}
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-muted-foreground uppercase">%</span>
            <span className="text-sm font-bold text-slate-100">{ring.percent.toFixed(0)}%</span>
          </div>
        </div>
        <div className="space-y-1 text-[10px]">
          <div>
            <p className="text-muted-foreground uppercase">{actualLabel}</p>
            <p className="text-slate-100 font-semibold">{formatDashboardCurrency(actualValue)}</p>
          </div>
          <div>
            <p className="text-muted-foreground uppercase">{targetLabel}</p>
            <p className="text-slate-100 font-semibold">{formatDashboardCurrency(targetValue)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DualDonutKpiModule({ title, icon: Icon, ringA, ringB, labels }) {
  return (
    <div className="rounded-xl p-2.5 bg-[#313a4a]/65 border border-slate-400/10 space-y-2.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        {Icon ? <Icon className="w-3.5 h-3.5 text-lime-400" /> : null}
        {title}
      </p>
      <div className="grid grid-cols-1 gap-2">
        <DonutGauge
          ring={ringA.ring}
          label={labels.aTitle}
          actualLabel={labels.aActual}
          targetLabel={labels.aTarget}
          actualValue={ringA.actual}
          targetValue={ringA.target}
        />
        <DonutGauge
          ring={ringB.ring}
          label={labels.bTitle}
          actualLabel={labels.bActual}
          targetLabel={labels.bTarget}
          actualValue={ringB.actual}
          targetValue={ringB.target}
        />
      </div>
    </div>
  );
}
