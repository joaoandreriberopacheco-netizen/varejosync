import React from 'react';
import { CalendarDays, Building2, Tag, Wallet, ArrowDownUp } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const OPTIONS = [
  { value: 'vencimento', label: 'Data de vencimento', icon: CalendarDays },
  { value: 'favorecido', label: 'Favorecido', icon: Building2 },
  { value: 'status', label: 'Status', icon: Wallet },
  { value: 'categoria', label: 'Categoria', icon: Tag },
];

export default function AgefinConsultaOrganizer({ groupBy, sortOrder, onGroupByChange, onSortOrderToggle }) {
  const current = OPTIONS.find((option) => option.value === groupBy) || OPTIONS[0];
  const CurrentIcon = current.icon;

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 shadow-sm transition hover:shadow-md dark:bg-gray-800 text-gray-700 dark:text-gray-200"
            title="Agrupar contas"
          >
            <CurrentIcon className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-xl border-0 shadow-lg dark:bg-gray-800">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onGroupByChange(option.value)}
                className="cursor-pointer gap-2 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <Icon className="h-4 w-4" />
                <span>{option.label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onClick={onSortOrderToggle}
        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 shadow-sm transition hover:shadow-md dark:bg-gray-800 text-gray-700 dark:text-gray-200"
        title={sortOrder === 'desc' ? 'Ordem: mais recente / Z–A' : 'Ordem: mais antigo / A–Z'}
      >
        <ArrowDownUp className={`h-4 w-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
}
