import React, { useRef } from 'react';
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
  const inputRef = useRef(null);

  const activateSearch = (query = '') => {
    onOpen?.();
    openGlobalSearch(query);
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => activateSearch('')}
        className={`w-full flex items-center justify-center rounded-xl transition-colors ${className}`}
        style={{ padding: '10px' }}
        title={placeholder}
      >
        <Search size={18} style={{ color: c.iconColor }} />
      </button>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 h-11 rounded-2xl w-full ${className}`}
      style={{ background: c.searchBg }}
    >
      <Search className="w-4 h-4 flex-none" style={{ color: c.iconColor }} />
      <input
        ref={inputRef}
        type="search"
        autoComplete="off"
        enterKeyHint="search"
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm outline-none min-w-0"
        style={{ color: c.text }}
        onFocus={() => activateSearch(inputRef.current?.value ?? '')}
        onChange={(e) => activateSearch(e.target.value)}
      />
    </div>
  );
}
