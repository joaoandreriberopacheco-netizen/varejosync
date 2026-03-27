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
    <div className="fixed inset-0 z-50 md:hidden bg-white dark:bg-[#1f1d22]">
      {/* Header */}
      <div className="bg-gray-100 dark:bg-[#27242b] px-4 pt-5 pb-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <P38Logo variant="horizontal" size="sm" className="flex-none" />
            <div className="min-w-0 text-right flex-1">
              <p className="text-sm text-gray-500 dark:text-white/70">
                Olá{currentUser?.full_name ? `, ${currentUser.full_name.split(' ')[0]}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-3 w-10 h-10 rounded-2xl bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-700 dark:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 h-11 rounded-2xl bg-gray-200 dark:bg-[#3a3640]">
          <Search className="w-4 h-4 text-gray-400 dark:text-white/60 flex-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar função..."
            className="flex-1 bg-transparent text-sm text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/50 outline-none"
          />
        </div>
      </div>

      {!activeGroup ? (
        /* Lista principal */
        <div className="px-4 py-4 overflow-y-auto h-[calc(100vh-124px-env(safe-area-inset-bottom))]">
          <div className="rounded-[24px] bg-gray-50 dark:bg-[#23212a] p-4 shadow-sm">
            <h3 className="text-base font-semibold text-gray-700 dark:text-white font-glacial mb-3">Funções</h3>
            <div className="space-y-0.5">
              {visibleGroups.map((item) => {
                const Icon = item.icon;
                const active = item.submenu?.some(sub => isItemActive(sub.page)) || (item.page && isItemActive(item.page));

                if (item.page && !item.submenu?.length) {
                  return (
                    <Link
                      key={item.name}
                      to={createPageUrl(item.page)}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-3.5 rounded-2xl transition-colors ${
                        active ? 'bg-black/5 dark:bg-white/8' : 'hover:bg-black/4 dark:hover:bg-white/6'
                      }`}
                    >
                      <Icon className="w-5 h-5 text-gray-500 dark:text-slate-300" />
                      <span className="flex-1 text-[1.02rem] font-semibold text-gray-800 dark:text-white tracking-[0.01em]">{item.name}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 dark:text-slate-400" />
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.name}
                    onClick={() => setActiveGroup(item)}
                    className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl transition-colors ${
                      active ? 'bg-black/5 dark:bg-white/8' : 'hover:bg-black/4 dark:hover:bg-white/6'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-gray-500 dark:text-slate-300" />
                    <span className="flex-1 text-left text-[1.02rem] font-semibold text-gray-800 dark:text-white tracking-[0.01em]">{item.name}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 dark:text-slate-400" />
                  </button>
                );
              })}
            </div>
          </div>
          {/* Espaço de respiração no final */}
          <div className="h-8" />
        </div>
      ) : (
        /* Submenu do grupo */
        <div className="px-4 py-4 overflow-y-auto h-[calc(100vh-124px-env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => setActiveGroup(null)}
              className="w-10 h-10 rounded-2xl bg-gray-200 dark:bg-[#1b2236] flex items-center justify-center text-gray-700 dark:text-slate-200"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-[1.6rem] font-semibold text-gray-800 dark:text-white font-glacial">{activeGroup.name}</h3>
          </div>

          <div className="space-y-0">
            {currentList.map((subItem) => {
              const Icon = activeGroup?.icon;
              return (
                <Link
                  key={subItem.page}
                  to={createPageUrl(subItem.page)}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-1 py-4 border-b border-gray-100 dark:border-white/6 transition-colors ${
                    isItemActive(subItem.page)
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-700 dark:text-slate-200'
                  }`}
                >
                  {Icon && <Icon className="w-5 h-5 text-gray-400 dark:text-slate-500 flex-none" />}
                  <span className="flex-1 text-[1.04rem] font-semibold leading-tight tracking-[0.01em]">{subItem.name}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 dark:text-slate-500" />
                </Link>
              );
            })}
          </div>
          {/* Espaço de respiração no final */}
          <div className="h-8" />
        </div>
      )}
    </div>
  );
}