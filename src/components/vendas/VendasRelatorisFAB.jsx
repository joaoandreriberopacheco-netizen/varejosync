import React, { useState } from 'react';
import { Brain, FileText, TrendingUp, DollarSign, X } from 'lucide-react';
import { createPageUrl } from '@/components/utils';

const RELATORIOS = [
  { icon: TrendingUp, label: 'Performance', page: 'RelatorioPerformance', color: 'bg-blue-600 text-white' },
  { icon: DollarSign, label: 'Margem', page: 'RelatorioMargem', color: 'bg-green-600 text-white' },
  { icon: FileText, label: 'Vendas', page: 'Relatorios', color: 'bg-indigo-600 text-white' },
];

export default function VendasRelatorisFAB() {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleNavigation = (page) => {
    window.location.href = createPageUrl(page);
    setIsExpanded(false);
  };

  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-[2px] bg-black/20"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* FAB Container */}
      <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 flex flex-col-reverse items-end gap-2">
        {/* FAB Principal */}
        <button
          onClick={() => setIsExpanded(prev => !prev)}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
            isExpanded ? 'bg-gray-600 dark:bg-gray-500 rotate-45' : 'bg-gray-900 dark:bg-gray-700'
          } text-white`}
          title="Relatórios de Vendas"
        >
          {isExpanded ? <X className="w-6 h-6" /> : <Brain className="w-6 h-6" />}
        </button>

        {/* Botões filhos */}
        {isExpanded && RELATORIOS.map((rel, idx) => {
          const Icon = rel.icon;
          return (
            <button
              key={idx}
              onClick={() => handleNavigation(rel.page)}
              title={rel.label}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium whitespace-nowrap active:scale-95 transition-all flex-shrink-0 ${rel.color}`}
              style={{
                animation: `fadeSlideUp 0.18s ease both`,
                animationDelay: `${idx * 30}ms`,
              }}
            >
              <Icon className="w-5 h-5" />
              {rel.label}
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}