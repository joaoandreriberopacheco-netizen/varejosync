import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import P38Logo from '@/components/brand/P38Logo';

function useDarkMode() {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const update = () => setIsDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

export default function MobileFunctionSelector({ isOpen, onClose, menuItems = [], currentUser }) {
  const location = useLocation();
  const isDark = useDarkMode();
  const [activeGroup, setActiveGroup] = useState(null);
  const [query, setQuery] = useState('');

  const groupedItems = useMemo(() => menuItems.filter(item => item.submenu?.length || item.page), [menuItems]);

  const visibleGroups = useMemo(() => {
    if (!query.trim()) return groupedItems;
    const q = query.toLowerCase();
    return groupedItems
      .map(item => ({
        ...item,
        submenu: item.submenu?.filter(sub => sub.name.toLowerCase().includes(q)) || item.submenu,
      }))
      .filter(item => item.name.toLowerCase().includes(q) || item.page || (item.submenu && item.submenu.length > 0));
  }, [groupedItems, query]);

  const currentList = activeGroup?.submenu || [];
  const isItemActive = (page) => location.pathname.includes(page);

  // Color tokens based on actual dark mode state
  const c = isDark ? {
    bg: '#111827',
    headerBg: '#1f2937',
    searchBg: '#374151',
    cardBg: '#1f2937',
    text: '#ffffff',
    textMuted: 'rgba(156,163,175,0.92)',
    textSub: '#d1d5db',
    iconColor: '#9ca3af',
    chevron: '#6b7280',
    divider: 'rgba(255,255,255,0.06)',
    btnBg: 'rgba(255,255,255,0.06)',
    backBg: '#1f2937',
    closeBg: 'rgba(255,255,255,0.08)',
    closeColor: '#fff',
  } : {
    bg: '#f8fafc',
    headerBg: '#ffffff',
    searchBg: '#f1f5f9',
    cardBg: '#ffffff',
    text: '#1e293b',
    textMuted: '#64748b',
    textSub: '#374151',
    iconColor: '#6b7280',
    chevron: '#9ca3af',
    divider: '#e5e7eb',
    btnBg: 'rgba(0,0,0,0.04)',
    backBg: '#f1f5f9',
    closeBg: '#e5e7eb',
    closeColor: '#374151',
  };

  if (!isOpen) return null;

  // Deve aparecer em todos os viewports em que o bottom nav existe (< lg = 1024px). `md:hidden` ocultava tablets (768px+).
  return (
    <div className="fixed inset-0 z-[60] lg:hidden" style={{ background: c.bg }}>
      {/* Header */}
      <div style={{ background: c.headerBg, boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }} className="px-4 pt-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <P38Logo surface="mobile.functionSelector" className="flex-none" />
            <div className="min-w-0 text-right flex-1">
              <p className="text-sm" style={{ color: c.textMuted }}>
                Olá{currentUser?.full_name ? `, ${currentUser.full_name.split(' ')[0]}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-3 w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: c.closeBg, color: c.closeColor }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 h-11 rounded-2xl" style={{ background: c.searchBg }}>
          <Search className="w-4 h-4 flex-none" style={{ color: c.iconColor }} />
          <input autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar função..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: c.text }}
          />
        </div>
      </div>

      {!activeGroup ? (
        /* Lista principal */
        <div className="px-4 py-4 overflow-y-auto" style={{ height: 'calc(100vh - 124px - env(safe-area-inset-bottom))' }}>
          <div className="rounded-[24px] p-4" style={{ background: c.cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h3 className="text-base font-semibold font-glacial mb-3" style={{ color: c.textMuted }}>Funções</h3>
            <div className="space-y-0.5">
              {visibleGroups.map((item) => {
                const Icon = item.icon;
                const active = item.submenu?.some(sub => isItemActive(sub.page)) || (item.page && isItemActive(item.page));

                const itemStyle = { background: active ? c.btnBg : 'transparent' };

                if (item.page && !item.submenu?.length) {
                  return (
                    <Link
                      key={item.name}
                      to={createPageUrl(item.page)}
                      onClick={onClose}
                      className="flex items-center gap-3 px-3 py-3.5 rounded-2xl transition-colors"
                      style={itemStyle}
                    >
                      <Icon className="w-5 h-5" style={{ color: c.iconColor }} />
                      <span className="flex-1 text-[1.02rem] font-semibold tracking-[0.01em]" style={{ color: c.text }}>{item.name}</span>
                      <ChevronRight className="w-4 h-4" style={{ color: c.chevron }} />
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.name}
                    onClick={() => setActiveGroup(item)}
                    className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl transition-colors"
                    style={itemStyle}
                  >
                    <Icon className="w-5 h-5" style={{ color: c.iconColor }} />
                    <span className="flex-1 text-left text-[1.02rem] font-semibold tracking-[0.01em]" style={{ color: c.text }}>{item.name}</span>
                    <ChevronRight className="w-4 h-4" style={{ color: c.chevron }} />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="h-8" />
        </div>
      ) : (
        /* Submenu do grupo */
        <div className="px-4 py-4 overflow-y-auto" style={{ height: 'calc(100vh - 124px - env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => setActiveGroup(null)}
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: c.backBg, color: c.textSub }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-[1.6rem] font-semibold font-glacial" style={{ color: c.text }}>{activeGroup.name}</h3>
          </div>

          <div>
            {currentList.map((subItem) => {
              const Icon = subItem.icon || activeGroup?.icon;
              return (
                <Link
                  key={subItem.page}
                  to={createPageUrl(subItem.page)}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-3.5 rounded-2xl transition-colors"
                  style={{
                    background: isItemActive(subItem.page) ? c.btnBg : 'transparent',
                    color: isItemActive(subItem.page) ? c.text : c.textSub,
                  }}
                >
                  {Icon && <Icon className="w-5 h-5 flex-none" style={{ color: c.iconColor }} />}
                  <span className="flex-1 text-[1.04rem] font-semibold leading-tight tracking-[0.01em]">{subItem.name}</span>
                  <ChevronRight className="w-4 h-4" style={{ color: c.chevron }} />
                </Link>
              );
            })}
          </div>
          <div className="h-8" />
        </div>
      )}
    </div>
  );
}