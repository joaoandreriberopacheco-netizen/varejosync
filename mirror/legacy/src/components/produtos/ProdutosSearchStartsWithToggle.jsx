import React from 'react';
import { Switch } from '@/components/ui/switch';

/** Toggle "Começa com" ao lado da busca do catálogo. */
export default function ProdutosSearchStartsWithToggle({ checked, onChange, className = '' }) {
  return (
    <label
      className={`flex items-center gap-1.5 flex-shrink-0 cursor-pointer select-none rounded-xl bg-muted px-2 h-10 ${className}`}
      title={checked ? 'Busca pelo início do texto' : 'Busca em qualquer parte do texto'}
    >
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="scale-[0.72] data-[state=checked]:bg-muted dark:data-[state=checked]:bg-muted"
      />
      <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
        Começa com
      </span>
    </label>
  );
}
