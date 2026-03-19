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
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg"
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -1px 0 0 rgba(0,0,0,0.05), 0 -4px 12px -2px rgba(0,0,0,0.08)'
      }}
    >
      <div className="flex items-stretch h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          const content = (
            <div className="flex flex-col items-center justify-center gap-1 w-full h-full">
              <div 
                className={`flex items-center justify-center transition-all duration-200 ${
                  active 
                    ? 'w-12 h-8 bg-gray-900 dark:bg-white rounded-2xl' 
                    : 'w-12 h-8'
                }`}
              >
                <Icon 
                  className={`transition-all duration-200 ${
                    active 
                      ? 'w-5 h-5 text-white dark:text-gray-900 stroke-[2]' 
                      : 'w-5 h-5 text-gray-400 dark:text-gray-500 stroke-[1.5]'
                  }`} 
                />
              </div>
              <span 
                className={`text-[10px] font-medium transition-colors duration-200 ${
                  active 
                    ? 'text-gray-900 dark:text-white' 
                    : 'text-gray-400 dark:text-gray-500'
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