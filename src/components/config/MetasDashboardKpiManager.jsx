import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { CircleGauge, Save, Target, TrendingUp } from 'lucide-react';
import { DEFAULT_DASHBOARD_KPI_CONFIG, normalizeDashboardKpiConfig } from '@/lib/dashboardKpiConfig';

const KPI_FIELDS = [
  {
    key: 'kpi_lucro_break_even_diario',
    label: 'Lucro bruto mínimo por dia',
    desc: 'Linha vermelha no gráfico de lucro diário e referência da rosca de margem.',
    icon: Target,
    section: 'lucro',
  },
  {
    key: 'kpi_lucro_meta_mensal',
    label: 'Meta de lucro bruto mensal',
    desc: 'Convertida em média diária no gráfico (linha verde) e nas roscas de lucro.',
    icon: TrendingUp,
    section: 'lucro',
  },
  {
    key: 'kpi_venda_minima_diaria',
    label: 'Venda líquida mínima por dia',
    desc: 'Referência da rosca de vendas (mínimo diário).',
    icon: Target,
    section: 'venda',
  },
  {
    key: 'kpi_venda_meta_mensal',
    label: 'Meta de venda líquida mensal',
    desc: 'Convertida em média diária nas roscas de vendas.',
    icon: CircleGauge,
    section: 'venda',
  },
];

function MoneyField({ field, value, onChange }) {
  const Icon = field.icon;
  return (
    <div className="px-3 py-3 rounded-xl bg-muted/50/60 space-y-2">
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Label htmlFor={field.key} className="text-xs font-medium text-foreground/90">{field.label}</Label>
          <p className="text-[11px] text-muted-foreground">{field.desc}</p>
          <Input
            id={field.key}
            type="number"
            min="0"
            step="0.01"
            value={value || ''}
            onChange={(event) => onChange(field.key, event.target.value)}
            placeholder="0,00"
            className="bg-card border-0 shadow-sm h-9 text-sm dark:text-foreground max-w-xs"
          />
        </div>
      </div>
    </div>
  );
}

export default function MetasDashboardKpiManager() {
  const [config, setConfig] = useState({ ...DEFAULT_DASHBOARD_KPI_CONFIG });
  const [fullConfig, setFullConfig] = useState(null);
  const [recordId, setRecordId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.ConfiguracoesVenda.list().then((configs) => {
      if (!configs?.length) return;
      setRecordId(configs[0].id);
      setFullConfig(configs[0]);
      setConfig(normalizeDashboardKpiConfig(configs[0]));
    });
  }, []);

  const handleChange = (key, rawValue) => {
    const parsed = rawValue === '' ? 0 : Number(rawValue);
    setConfig((prev) => ({
      ...prev,
      [key]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const kpiPayload = normalizeDashboardKpiConfig(config);
      const payload = { ...(fullConfig || {}), ...kpiPayload };
      if (recordId) {
        await base44.entities.ConfiguracoesVenda.update(recordId, payload);
      } else {
        const created = await base44.entities.ConfiguracoesVenda.create(payload);
        setRecordId(created?.id || null);
        setFullConfig(created || payload);
      }
      toast({ title: 'Metas do dashboard salvas', className: 'bg-card', duration: 3000 });
    } catch (error) {
      console.error('Erro ao salvar metas do dashboard:', error);
      toast({ title: 'Não foi possível salvar', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const lucroFields = KPI_FIELDS.filter((field) => field.section === 'lucro');
  const vendaFields = KPI_FIELDS.filter((field) => field.section === 'venda');

  return (
    <div className="space-y-5 mt-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Metas do Dashboard de Vendas</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Break-even, meta de lucro e metas de venda usadas nos gráficos do painel.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="sm" className="gap-2 h-9 text-sm">
          <Save className="w-4 h-4" />
          Salvar
        </Button>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Lucro</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {lucroFields.map((field) => (
            <MoneyField key={field.key} field={field} value={config[field.key]} onChange={handleChange} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Vendas</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {vendaFields.map((field) => (
            <MoneyField key={field.key} field={field} value={config[field.key]} onChange={handleChange} />
          ))}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground px-1">
        As metas mensais são divididas pelos dias úteis do mês (sem domingos, em média ~26 dias) para as linhas de referência e roscas diárias.
      </p>
    </div>
  );
}
