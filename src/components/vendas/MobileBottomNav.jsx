import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { LayoutDashboard, TrendingUp, Monitor, Package, DollarSign } from 'lucide-react';

const tabs = [
  { name: 'Início', icon: LayoutDashboard, page: 'Dashboard', related: ['Dashboard', 'DashboardCaixa'] },
  { name: 'PDV', icon: Monitor, page: 'PDV?mode=caixa', related: ['PDV', 'PDVCaixa', 'PDVVendedor'] },
  { name: 'Vendas', icon: TrendingUp, page: 'VendasGestao', related: ['VendasGestao', 'PainelGerente', 'ControleEntregas', 'VendasPerdidas'] },
  { name: 'Estoque', icon: Package, page: 'Produtos', related: ['Produtos', 'Compras', 'Logistica', 'Armazenagem', 'InterfaceSeparador'] },
  { name: 'Financeiro', icon: DollarSign, page: 'FinanceiroModulo', related: ['FinanceiroModulo', 'CaixasAtivos', 'TurnosFechados', 'Relatorios'] },
];

export default function MobileBottomNav({ currentPageName }) {
  const location = useLocation();

  const isTabActive = (tab) => {
    const pageName = currentPageName || '';
    return tab.related.some(r => pageName === r || location.pathname.includes(r));
  };

  const handleTabClick = (e, tab) => {
    if (isTabActive(tab)) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden mobile-bottom-nav"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 -1px 0 0 rgba(0,0,0,0.06)',
      }}
    >
      <div className="dark:bg-gray-900/90 flex items-stretch">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = isTabActive(tab);
          return (
            <Link
              key={tab.name}
              to={createPageUrl(tab.page)}
              onClick={(e) => handleTabClick(e, tab)}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative"
              style={{ minHeight: 56 }}
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-gray-800 dark:bg-white"
                />
              )}
              <Icon
                className={`w-[22px] h-[22px] transition-all ${
                  active
                    ? 'text-gray-900 dark:text-white stroke-[2]'
                    : 'text-gray-400 dark:text-gray-500 stroke-[1.5]'
                }`}
              />
              <span
                className={`text-[10px] font-glacial tracking-wide transition-all ${
                  active
                    ? 'text-gray-900 dark:text-white font-semibold'
                    : 'text-gray-400 dark:text-gray-500 font-normal'
                }`}
              >
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}