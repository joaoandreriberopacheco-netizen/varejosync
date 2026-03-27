import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import P38Logo from '@/components/brand/P38Logo';

export default function MobileFunctionSelector({ isOpen, onClose, menuItems = [], currentUser }) {
  const location = useLocation();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden bg-white dark:bg-slate-950">
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 dark:from-slate-900 dark:to-slate-900 px-4 pt-5 pb-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <P38Logo variant="icon-only" size="sm" />
            <div className="min-w-0">
              <p className="text-sm text-white/70">Olá{currentUser?.full_name ? `, ${currentUser.full_name.split(' ')[0]}` : ''}</p>
              <h2 className="text-lg font-semibold text-white font-glacial truncate">P38 ERP</h2>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 h-12 rounded-2xl bg-white/10 backdrop-blur-sm">
          <Search className="w-4 h-4 text-white/60 flex-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar função..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/50 outline-none"
          />
        </div>
      </div>

      {!activeGroup ? (
        <div className="px-4 py-5 space-y-5 overflow-y-auto h-[calc(100vh-132px-env(safe-area-inset-bottom))]">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400 mb-3">Funções</p>
            <div className="grid grid-cols-4 gap-x-2 gap-y-5">
              {visibleGroups.slice(0, 8).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => item.submenu?.length ? setActiveGroup(item) : onClose()}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 shadow-sm flex items-center justify-center">
                      <Icon className="w-6 h-6 text-slate-700 dark:text-slate-200" />
                    </div>
                    <span className="text-[11px] leading-tight text-center text-slate-800 dark:text-slate-100 max-w-[72px]">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[24px] bg-slate-50 dark:bg-slate-900/70 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-glacial">Menu completo</h3>
            </div>
            <div className="space-y-1">
              {visibleGroups.map((item) => {
                const Icon = item.icon;
                const active = item.submenu?.some(sub => isItemActive(sub.page)) || (item.page && isItemActive(item.page));
                if (item.page && !item.submenu?.length) {
                  return (
                    <Link
                      key={item.name}
                      to={createPageUrl(item.page)}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-3 rounded-2xl ${active ? 'bg-white dark:bg-slate-800' : 'hover:bg-white/70 dark:hover:bg-slate-800/80'}`}
                    >
                      <Icon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                      <span className="flex-1 text-sm text-slate-900 dark:text-white">{item.name}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.name}
                    onClick={() => setActiveGroup(item)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl ${active ? 'bg-white dark:bg-slate-800' : 'hover:bg-white/70 dark:hover:bg-slate-800/80'}`}
                  >
                    <Icon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    <span className="flex-1 text-left text-sm text-slate-900 dark:text-white">{item.name}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 py-5 overflow-y-auto h-[calc(100vh-132px-env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setActiveGroup(null)} className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-white font-glacial">{activeGroup.name}</h3>
          </div>
          <div className="space-y-1">
            {currentList.map((subItem) => (
              <Link
                key={subItem.page}
                to={createPageUrl(subItem.page)}
                onClick={onClose}
                className={`flex items-center justify-between px-1 py-4 border-b border-slate-200/70 dark:border-slate-800 ${isItemActive(subItem.page) ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-700 dark:text-slate-200'}`}
              >
                <span className="text-base leading-tight">{subItem.name}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}