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

  const isDark = document.documentElement.classList.contains('dark');
  const navStyle = {
    background: isDark ? 'rgba(17,24,39,0.97)' : 'rgba(255,255,255,0.97)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: isDark ? '0 -1px 0 0 rgba(255,255,255,0.06)' : '0 -1px 0 0 rgba(0,0,0,0.06)',
    fontFamily: "'DM Sans', sans-serif",
  };

  const NavItem = ({ icon: Icon, name, active, onClick, to, isButton }) => {
    const dark = document.documentElement.classList.contains('dark');
    const pillBg = active ? (dark ? '#fff' : '#111') : 'transparent';
    const iconCls = active ? (dark ? 'text-gray-900 stroke-[2]' : 'text-white stroke-[2]') : 'text-gray-400 stroke-[1.5]';
    const labelColor = active ? (dark ? '#fff' : '#111') : '#9ca3af';

    const content = (
      <>
        <div
          className="flex items-center justify-center rounded-2xl transition-all duration-200"
          style={{ width: 44, height: 30, background: pillBg }}
        >
          <Icon style={{ width: 20, height: 20 }} className={`transition-all duration-200 ${iconCls}`} />
        </div>
        <span
          style={{
            fontSize: 10,
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: active ? 600 : 400,
            color: labelColor,
            letterSpacing: 0,
            lineHeight: 1.2,
          }}
        >
          {name}
        </span>
      </>
    );

    const cls = "flex-1 flex flex-col items-center justify-center py-2 gap-0.5";
    const sty = { minHeight: 60 };

    if (isButton) {
      return (
        <button onClick={onClick} className={cls} style={sty}>
          {content}
        </button>
      );
    }
    return (
      <Link to={to} onClick={onClick} className={cls} style={sty}>
        {content}
      </Link>
    );
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden mobile-bottom-nav"
      style={navStyle}
    >
      <div>
        {/* Sub-menu level */}
        {activeParent && subItems.length > 0 && (
          <div className="flex items-stretch" style={{ minHeight: 60 }}>
            <div className="flex-1 flex items-stretch overflow-x-auto">
              {subItems.map(sub => {
                const isActive = (currentPageName || '').includes(sub.page.split('?')[0]);
                return (
                  <NavItem
                    key={sub.page}
                    icon={sub.icon}
                    name={sub.name}
                    active={isActive}
                    to={createPageUrl(sub.page)}
                    onClick={handleSubClick}
                  />
                );
              })}
            </div>

            {/* Back button */}
            <button
              onClick={() => setActiveParent(null)}
              className="flex flex-col items-center justify-center px-3 gap-0.5"
              style={{ minWidth: 52, borderLeft: '1px solid rgba(0,0,0,0.06)' }}
            >
              <div
                className="flex items-center justify-center rounded-2xl"
                style={{ width: 44, height: 30, background: 'transparent' }}
              >
                <ChevronLeft style={{ width: 20, height: 20 }} className="text-gray-400 stroke-[1.5]" />
              </div>
              <span style={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", color: '#9ca3af' }}>
                Voltar
              </span>
            </button>
          </div>
        )}

        {/* Main menu level */}
        {!activeParent && (
          <div className="flex items-stretch">
            {mainTabs.map(tab => {
              const active = isTabRelated(tab);
              return tab.children ? (
                <NavItem
                  key={tab.name}
                  icon={tab.icon}
                  name={tab.name}
                  active={active}
                  isButton
                  onClick={(e) => handleMainTabClick(e, tab)}
                />
              ) : (
                <NavItem
                  key={tab.name}
                  icon={tab.icon}
                  name={tab.name}
                  active={active}
                  to={createPageUrl(tab.page)}
                  onClick={(e) => handleMainTabClick(e, tab)}
                />
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}