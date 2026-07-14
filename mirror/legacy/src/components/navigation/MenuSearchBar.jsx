import React from 'react';
import GlobalSearchBar from '@/components/navigation/GlobalSearchBar';
import { getGlobalSearchShortcutLabel } from '@/lib/globalSearchShortcut';

export default function MenuSearchBar({
  isDark,
  expanded = true,
  onOpen,
  onCollapsedActivate,
  className = '',
  placeholder = 'Buscar funções…',
  searchableItems = [],
  showShortcutHint = false,
}) {
  const shortcutLabel = getGlobalSearchShortcutLabel();

  return (
    <GlobalSearchBar
      isDark={isDark}
      expanded={expanded}
      className={className}
      placeholder={placeholder}
      searchableItems={searchableItems}
      onNavigate={onOpen}
      onCollapsedActivate={onCollapsedActivate}
      showShortcutHint={showShortcutHint}
      shortcutLabel={shortcutLabel}
      collapsedTitle={`${placeholder} (${shortcutLabel})`}
    />
  );
}
