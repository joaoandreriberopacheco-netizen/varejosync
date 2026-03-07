/**
 * GlacialTabs — componente de abas padrão do sistema VarejoSync.
 * Estilo: pill container (fundo cinza), aba ativa = branco com sombra sutil.
 * Mobile-first: só ícones em telas pequenas, texto visível no md+.
 */
import React from 'react';
import { cn } from '@/components/utils';

export function GlacialTabsList({ children, className, scrollable = false }) {
  return (
    <div
      className={cn(
        'flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-0.5',
        scrollable && 'overflow-x-auto no-scrollbar',
        className
      )}
      style={scrollable ? { WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' } : undefined}
    >
      {children}
    </div>
  );
}

export function GlacialTabsTrigger({ value, activeValue, onSelect, icon: Icon, label, className }) {
  const isActive = value === activeValue;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap flex-shrink-0 min-h-[36px]',
        isActive
          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
        className
      )}
    >
      {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
      {label && <span className={Icon ? 'hidden md:inline' : ''}>{label}</span>}
    </button>
  );
}

/**
 * Versão underline — para abas secundárias dentro de uma aba principal.
 */
export function GlacialSubTabsList({ children, className }) {
  return (
    <div
      className={cn(
        'flex items-center border-b border-gray-100 dark:border-gray-800 gap-0 overflow-x-auto no-scrollbar',
        className
      )}
      style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {children}
    </div>
  );
}

export function GlacialSubTabsTrigger({ value, activeValue, onSelect, icon: Icon, label, className }) {
  const isActive = value === activeValue;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        'flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-all duration-150 whitespace-nowrap flex-shrink-0 min-h-[40px]',
        isActive
          ? 'border-gray-700 dark:border-gray-300 text-gray-800 dark:text-gray-100'
          : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300',
        className
      )}
    >
      {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
      {label && <span className={Icon ? 'hidden md:inline' : ''}>{label}</span>}
    </button>
  );
}