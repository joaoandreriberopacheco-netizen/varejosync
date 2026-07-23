import { Switch } from '@/components/ui/switch';

/** Inclui pedidos de compra aprovados (não concluídos) no cálculo de estoque projetado. */
export default function SugestaoCompraIncluirPedidosToggle({ checked, onChange, className = '' }) {
  return (
    <label
      className={`flex items-center gap-1.5 flex-shrink-0 cursor-pointer select-none rounded-xl bg-muted px-2 h-9 ${className}`}
      title={
        checked
          ? 'Estoque projetado inclui pedidos aprovados ainda não recebidos'
          : 'Estoque projetado usa só o saldo atual do catálogo'
      }
    >
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="scale-[0.72] data-[state=checked]:bg-muted dark:data-[state=checked]:bg-muted"
      />
      <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
        Incluir pedidos
      </span>
    </label>
  );
}
