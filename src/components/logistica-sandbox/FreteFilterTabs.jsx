import React from 'react';

const filterSections = [
  {
    title: 'Vinculação',
    options: [
      { id: 'todos', label: 'Todos' },
      { id: 'com_conta', label: 'Com conta' },
      { id: 'sem_conta', label: 'Sem conta' }
    ]
  },
  {
    title: 'Pagamento',
    options: [
      { id: 'pago', label: 'Pago' },
      { id: 'em_aberto', label: 'Em aberto' },
      { id: 'vencido', label: 'Vencido' }
    ]
  },
  {
    title: 'Lapso temporal',
    options: [
      { id: 'vence_hoje', label: 'Vence hoje' },
      { id: 'vence_7_dias', label: 'Próx. 7 dias' },
      { id: 'atrasado', label: 'Atrasado' }
    ]
  }
];

export default function FreteFilterTabs({ 
  selectedFilter = 'todos',
  onFilterChange 
}) {
  return (
    <div className="space-y-5 pt-2">
      {filterSections.map((section) => (
        <div key={section.title} className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
            {section.title}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {section.options.map((filter) => (
              <button
                key={filter.id}
                onClick={() => onFilterChange(filter.id)}
                className={`rounded-2xl px-3 py-2.5 text-xs font-medium transition-colors ${
                  selectedFilter === filter.id
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'bg-gray-100/80 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}