import React from 'react';
import { Search } from 'lucide-react';
import { getP38ShellColors } from '@/lib/p38ShellColors';
import { openGlobalSearch } from '@/lib/openGlobalSearch';

export default function MenuSearchBar({
  isDark,
  expanded = true,
  onOpen,
  className = '',
  placeholder = 'O que você procura?',
}) {
  const c = getP38ShellColors(isDark);

  const handleOpen = () => {
    onOpen?.();
    openGlobalSearch();
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center justify-center rounded-xl transition-colors ${className}`}
        style={{ padding: '10px' }}
        title={placeholder}
      >
        <Search size={18} style={{ color: c.iconColor }} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleOpen}
      className={`flex items-center gap-2 px-3 h-11 rounded-2xl w-full text-left cursor-text ${className}`}
      style={{ background: c.searchBg }}
    >
      <Search className="w-4 h-4 flex-none" style={{ color: c.iconColor }} />
      <span className="flex-1 text-sm truncate" style={{ color: c.textMuted }}>
        {placeholder}
      </span>
    </button>
  );
}
