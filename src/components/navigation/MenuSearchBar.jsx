import React from 'react';
import GlobalSearchBar from '@/components/navigation/GlobalSearchBar';

export default function MenuSearchBar({
  isDark,
  expanded = true,
  onOpen,
  onCollapsedActivate,
  className = '',
  placeholder = 'Buscar…',
  searchableItems = [],
}) {
  return (
    <GlobalSearchBar
      isDark={isDark}
      expanded={expanded}
      className={className}
      placeholder={placeholder}
      searchableItems={searchableItems}
      onNavigate={onOpen}
      onCollapsedActivate={onCollapsedActivate}
    />
  );
}
