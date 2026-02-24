import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import {
  LayoutDashboard,
  TrendingUp,
  Monitor,
  Package,
  DollarSign,
  User,
  CreditCard,
  ShoppingCart,
  Tv2,
  ClipboardList,
  Ban,
  Truck,
  BarChart2,
  Box,
  ReceiptText,
  MapPin,
  Warehouse,
  Boxes,
  Clock,
  Wallet,
  ScrollText,
  ChevronLeft,
} from 'lucide-react';

const mainTabs = [
  {
    name: 'Início',
    icon: LayoutDashboard,
    page: 'Dashboard',
    related: ['Dashboard', 'DashboardCaixa'],
    children: null,
  },
  {
    name: 'PDV',
    icon: Monitor,
    page: null,
    related: ['PDV', 'PDVCaixa', 'PDVVendedor', 'AutoAtendimento'],
    children: [
      { name: 'Vendedor', icon: User, page: 'PDV?mode=vendedor' },
      { name: 'Caixa', icon: CreditCard, page: 'PDV?mode=caixa' },
      { name: 'Supermercado', icon: ShoppingCart, page: 'PDV?mode=supermercado' },
      { name: 'Auto-Atend.', icon: Tv2, page: 'AutoAtendimento' },
    ],
  },
  {
    name: 'Vendas',
    icon: TrendingUp,
    page: null,
    related: ['VendasGestao', 'PainelGerente', 'ControleEntregas', 'VendasPerdidas'],
    children: [
      { name: 'Gestão', icon: ClipboardList, page: 'VendasGestao' },
      { name: 'Perdidas', icon: Ban, page: 'VendasPerdidas' },
      { name: 'Entregas', icon: Truck, page: 'ControleEntregas' },
      { name: 'Painel', icon: BarChart2, page: 'PainelGerente' },
    ],
  },
  {
    name: 'Estoque',
    icon: Package,
    page: null,
    related: ['Produtos', 'Compras', 'Logistica', 'Armazenagem', 'InterfaceSeparador'],
    children: [
      { name: 'Produtos', icon: Box, page: 'Produtos' },
      { name: 'Compras', icon: ReceiptText, page: 'Compras' },
      { name: 'Logística', icon: MapPin, page: 'Logistica' },
      { name: 'Armazen.', icon: Warehouse, page: 'Armazenagem' },
      { name: 'Separação', icon: Boxes, page: 'InterfaceSeparador' },
    ],
  },
  {
    name: 'Financeiro',
    icon: DollarSign,
    page: null,
    related: ['FinanceiroModulo', 'CaixasAtivos', 'TurnosFechados', 'Relatorios', 'Configuracoes'],
    children: [
      { name: 'Caixas', icon: Wallet, page: 'CaixasAtivos' },
      { name: 'Turnos', icon: Clock, page: 'TurnosFechados' },
      { name: 'Financeiro', icon: DollarSign, page: 'FinanceiroModulo' },
      { name: 'Pgamentos', icon: CreditCard, page: 'Configuracoes' },
      { name: 'Relatórios', icon: ScrollText, page: 'Relatorios' },
    ],
  },
];

export default function MobileBottomNav({ currentPageName }) {
  const location = useLocation();
  const [activeParent, setActiveParent] = useState(null); // nome do tab principal aberto

  const isTabRelated = (tab) => {
    const pageName = currentPageName || '';
    return tab.related.some(r => pageName === r || location.pathname.includes(r));
  };

  const handleMainTabClick = (e, tab) => {
    if (tab.children) {
      e.preventDefault();
      setActiveParent(prev => prev === tab.name ? null : tab.name);
    } else {
      setActiveParent(null);
      if (isTabRelated(tab)) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleSubClick = () => {
    setActiveParent(null);
  };

  const parentTab = mainTabs.find(t => t.name === activeParent);
  const subItems = parentTab?.children || [];

  const navStyle = {
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: '0 -1px 0 0 rgba(0,0,0,0.06)',
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden mobile-bottom-nav"
      style={navStyle}
    >
      <div className="dark:bg-gray-900/95">
        {/* Sub-menu level */}
        {activeParent && subItems.length > 0 && (
          <div
            className="flex items-stretch border-t border-gray-100 dark:border-gray-800"
            style={{ minHeight: 56 }}
          >
            {/* Sub items - fill left portion */}
            <div className="flex-1 flex items-stretch overflow-x-auto">
              {subItems.map(sub => {
                const Icon = sub.icon;
                const isActive = (currentPageName || '').includes(sub.page.split('?')[0]);
                return (
                  <Link
                    key={sub.page}
                    to={createPageUrl(sub.page)}
                    onClick={handleSubClick}
                    className="flex flex-col items-center justify-center py-2 gap-0.5 relative"
                    style={{ minWidth: 56, minHeight: 56, flex: '1 1 0' }}
                  >
                    {isActive && (
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-b-full bg-gray-800 dark:bg-white" />
                    )}
                    <Icon
                      className={`w-5 h-5 transition-all ${
                        isActive
                          ? 'text-gray-900 dark:text-white stroke-[2]'
                          : 'text-gray-400 dark:text-gray-500 stroke-[1.5]'
                      }`}
                    />
                    <span
                      className={`text-[9px] font-glacial tracking-wide transition-all leading-tight text-center ${
                        isActive
                          ? 'text-gray-900 dark:text-white font-semibold'
                          : 'text-gray-400 dark:text-gray-500 font-normal'
                      }`}
                    >
                      {sub.name}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Back button - canto direito */}
            <button
              onClick={() => setActiveParent(null)}
              className="flex flex-col items-center justify-center px-4 gap-0.5 border-l border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60"
              style={{ minWidth: 52 }}
            >
              <ChevronLeft className="w-5 h-5 text-gray-400 dark:text-gray-400 stroke-[1.5]" />
              <span className="text-[9px] font-glacial text-gray-400 dark:text-gray-400">Voltar</span>
            </button>
          </div>
        )}

        {/* Main menu level */}
        {!activeParent && (
          <div className="flex items-stretch">
            {mainTabs.map(tab => {
              const Icon = tab.icon;
              const active = isTabRelated(tab);
              return tab.children ? (
                <button
                  key={tab.name}
                  onClick={(e) => handleMainTabClick(e, tab)}
                  className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative"
                  style={{ minHeight: 56 }}
                >
                  {active && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-gray-800 dark:bg-white" />
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
                </button>
              ) : (
                <Link
                  key={tab.name}
                  to={createPageUrl(tab.page)}
                  onClick={(e) => handleMainTabClick(e, tab)}
                  className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative"
                  style={{ minHeight: 56 }}
                >
                  {active && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-gray-800 dark:bg-white" />
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
        )}
      </div>
    </nav>
  );
}