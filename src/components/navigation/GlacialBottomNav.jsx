import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { 
  Home, 
  Search, 
  Bell, 
  User, 
  Menu as MenuIcon 
} from 'lucide-react';

export default function GlacialBottomNav({ onMenuClick, onProfileClick, currentPageName }) {
  const location = useLocation();

  const navItems = [
    { id: 'menu', icon: MenuIcon, label: 'Menu', action: 'menu' },
    { id: 'home', icon: Home, label: 'Início', page: 'Home' },
    { id: 'search', icon: Search, label: 'Busca', action: 'search' },
    { id: 'notifications', icon: Bell, label: 'Avisos', page: 'Notificacoes' },
    { id: 'profile', icon: User, label: 'Perfil', action: 'profile' },
  ];

  const isActive = (item) => {
    if (item.page) return currentPageName === item.page || location.pathname.includes(item.page);
    return false;
  };

  const handleClick = (e, item) => {
    if (item.action === 'menu') {
      e.preventDefault();
      onMenuClick?.();
    } else if (item.action === 'search') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('open-global-search'));
    } else if (item.action === 'profile') {
      e.preventDefault();
      onProfileClick?.();
    }
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/96 dark:bg-[#10182b]/96 backdrop-blur-xl border-t border-slate-200/70 dark:border-white/5"
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -6px 24px -12px rgba(15,23,42,0.28)'
      }}
    >
      <div className="flex items-stretch h-[68px]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          const content = (
            <div className="flex flex-col items-center justify-center gap-1 w-full h-full pt-1">
              <div className={`h-1 w-10 rounded-full transition-all duration-200 ${active ? 'bg-slate-900 dark:bg-white' : 'bg-transparent'}`} />
              <div className="flex items-center justify-center w-12 h-7">
                <Icon 
                  className={`transition-all duration-200 ${
                    active 
                      ? 'w-5 h-5 text-slate-900 dark:text-white stroke-[2]' 
                      : 'w-5 h-5 text-slate-400 dark:text-slate-500 stroke-[1.75]'
                  }`} 
                />
              </div>
              <span 
                className={`text-[10px] font-medium transition-colors duration-200 ${
                  active 
                    ? 'text-slate-900 dark:text-white' 
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </div>
          );

          if (item.action) {
            return (
              <button
                key={item.id}
                onClick={(e) => handleClick(e, item)}
                className="flex-1 relative"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              to={createPageUrl(item.page)}
              className="flex-1 relative"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}