import { Switch } from '@/components/ui/switch';

/** Agrupa a Tree Grid (e o PDF de estoque) por categoria de cadastro. */
export default function ProdutosTreeByCategoryToggle({ checked, onChange, className = '' }) {
  return (
    <label
      className={`flex items-center gap-1.5 flex-shrink-0 cursor-pointer select-none rounded-xl bg-muted px-2 h-10 ${className}`}
      title={checked ? 'Agrupado por categoria de cadastro' : 'Agrupado pela hierarquia do nome do produto'}
    >
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="scale-[0.72] data-[state=checked]:bg-muted dark:data-[state=checked]:bg-muted"
      />
      <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
        Por categoria
      </span>
    </label>
  );
}
