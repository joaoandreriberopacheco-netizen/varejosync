import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { LayoutDashboard, TrendingUp, Monitor, Package } from 'lucide-react';

const tabs = [
  { name: 'Início', icon: LayoutDashboard, page: 'Dashboard' },
  { name: 'Vendas', icon: TrendingUp, page: 'VendasGestao' },
  { name: 'PDV', icon: Monitor, page: 'PDV?mode=caixa' },
  { name: 'Estoque', icon: Package, page: 'Produtos' },
];

export default function MobileBottomNav({ currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleTabClick = (e, tab) => {
    const pageName = tab.page.split('?')[0];
    const isActive = currentPageName === pageName || location.pathname.includes(pageName);
    if (isActive) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex mobile-bottom-nav md:hidden">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const pageName = tab.page.split('?')[0];
        const isActive = currentPageName === pageName || location.pathname.includes(pageName);
        return (
          <Link
            key={tab.name}
            to={createPageUrl(tab.page)}
            onClick={(e) => handleTabClick(e, tab)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
              isActive
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
            <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-normal'}`}>{tab.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}