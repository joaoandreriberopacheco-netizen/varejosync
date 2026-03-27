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
    <div className="fixed inset-0 z-50 md:hidden bg-[#0b1020]">
      <div className="bg-gradient-to-b from-[#162238] to-[#121a2b] px-4 pt-5 pb-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <P38Logo variant="horizontal" size="sm" className="h-12 w-auto flex-none" />
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
          <div className="rounded-[24px] bg-[#141a2b] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-white font-glacial">Funções</h3>
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
                      className={`flex items-center gap-3 px-3 py-3.5 rounded-2xl ${active ? 'bg-white/8' : 'hover:bg-white/6'}`}
                    >
                      <Icon className="w-5 h-5 text-slate-300" />
                      <span className="flex-1 text-[1.02rem] font-semibold text-white tracking-[0.01em]">{item.name}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.name}
                    onClick={() => setActiveGroup(item)}
                    className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl ${active ? 'bg-white/8' : 'hover:bg-white/6'}`}
                  >
                    <Icon className="w-5 h-5 text-slate-300" />
                    <span className="flex-1 text-left text-[1.02rem] font-semibold text-white tracking-[0.01em]">{item.name}</span>
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
            <button onClick={() => setActiveGroup(null)} className="w-10 h-10 rounded-2xl bg-[#1b2236] flex items-center justify-center text-slate-200">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-[1.7rem] font-semibold text-white font-glacial">{activeGroup.name}</h3>
          </div>
          <div className="space-y-1">
            {currentList.map((subItem) => (
              <Link
                key={subItem.page}
                to={createPageUrl(subItem.page)}
                onClick={onClose}
                className={`flex items-center justify-between px-1 py-4 border-b border-white/6 ${isItemActive(subItem.page) ? 'text-white' : 'text-slate-200'}`}
              >
                <span className="text-[1.06rem] font-semibold leading-tight tracking-[0.01em]">{subItem.name}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}