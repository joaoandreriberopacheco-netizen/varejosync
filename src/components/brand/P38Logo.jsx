import React from 'react';
import { Zap } from 'lucide-react';

/**
 * Logo P38 | ERP em código puro
 * variant: 'horizontal' (desktop/inline) | 'vertical' (mobile splash)
 * size: 'sm' | 'md' | 'lg'
 */
export default function P38Logo({ variant = 'horizontal', size = 'md', className = '' }) {
  const sizes = {
    sm: { icon: 16, p38: 'text-base', erp: 'text-base', sep: 'text-base', gap: 'gap-1.5' },
    md: { icon: 22, p38: 'text-xl', erp: 'text-xl', sep: 'text-xl', gap: 'gap-2' },
    lg: { icon: 32, p38: 'text-3xl', erp: 'text-3xl', sep: 'text-3xl', gap: 'gap-3' },
  };
  const s = sizes[size] || sizes.md;

  if (variant === 'vertical') {
    return (
      <div className={`flex flex-col items-center gap-2 select-none ${className}`}>
        <Zap
          size={s.icon * 1.8}
          className="text-gray-900 dark:text-white"
          strokeWidth={2.5}
          fill="currentColor"
        />
        <div className="flex flex-col items-center leading-tight">
          <span className={`font-bold text-gray-900 dark:text-white ${s.p38} font-glacial tracking-tight`}>
            P38
          </span>
          <span className={`text-gray-300 dark:text-gray-500 font-light text-xs`}>|</span>
          <span className={`font-light text-gray-900 dark:text-white ${s.erp} font-glacial tracking-widest`}>
            ERP
          </span>
        </div>
      </div>
    );
  }

  // horizontal
  return (
    <div className={`flex items-center ${s.gap} select-none ${className}`}>
      <Zap
        size={s.icon}
        className="text-gray-900 dark:text-white flex-shrink-0"
        strokeWidth={2.5}
        fill="currentColor"
      />
      <span className={`font-bold text-gray-900 dark:text-white ${s.p38} font-glacial tracking-tight leading-none`}>
        P38
      </span>
      <span className="text-gray-300 dark:text-gray-600 font-light text-sm leading-none">|</span>
      <span className={`font-light text-gray-900 dark:text-white ${s.erp} font-glacial tracking-wide leading-none`}>
        ERP
      </span>
    </div>
  );
}