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
    { id: 'home', icon: Home, label: 'Início', page: 'Home', action: null },
    { id: 'search', icon: Search, label: 'Busca', action: 'search' },
    { id: 'notifications', icon: Bell, label: 'Avisos', page: 'Notificacoes', action: null },
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
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/96 backdrop-blur-xl border-t border-border/80 font-din-1451 relative overflow-hidden"
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -6px 24px -12px rgba(0,0,0,0.18)'
      }}
    >
      <span className="p38-nav-rail" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, hsl(74 36% 25% / 0.35) 20%, hsl(78 55% 51% / 0.45) 50%, hsl(74 36% 25% / 0.35) 80%, transparent)',
        }}
        aria-hidden
      />
      <div className="flex items-stretch h-[68px]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          const content = (
            <div className="flex flex-col items-center justify-center gap-1 w-full h-full pt-1">
              <div className={`h-1 w-10 rounded-full transition-all duration-200 ${active ? 'bg-[#636b33] dark:bg-[#a4ce33]' : 'bg-transparent'}`} />
              <div className="flex items-center justify-center w-12 h-7">
                <Icon 
                  className={`transition-all duration-200 ${
                    active 
                      ? 'w-5 h-5 text-[#4A5D23] dark:text-[#a4ce33] stroke-[2]' 
                      : 'w-5 h-5 text-muted-foreground stroke-[1.75]'
                  }`} 
                />
              </div>
              <span 
                className={`text-[10px] font-medium transition-colors duration-200 ${
                  active 
                    ? 'text-[#4A5D23] dark:text-[#a4ce33]' 
                    : 'text-muted-foreground'
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
                type="button"
                onMouseDown={(e) => handleClick(e, item)}
                onClick={(e) => handleClick(e, item)}
                className="flex-1 relative touch-manipulation"
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