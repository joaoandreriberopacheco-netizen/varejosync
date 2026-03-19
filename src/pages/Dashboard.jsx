import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { LayoutDashboard, TrendingUp, ShoppingCart, Package, DollarSign } from 'lucide-react';
import { GlacialTabsList, GlacialTabsTrigger } from '@/components/ui/GlacialTabs';
import P38Logo from '@/components/brand/P38Logo';
import GeralTab from '../components/dashboard/tabs/GeralTab';
import VendasTab from '../components/dashboard/tabs/VendasTab';
import ComprasTab from '../components/dashboard/tabs/ComprasTab';
import EstoqueTab from '../components/dashboard/tabs/EstoqueTab';
import FinanceiroTab from '../components/dashboard/tabs/FinanceiroTab';
import DashboardVendedor from './DashboardVendedor';
import DashboardCaixa from './DashboardCaixa';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('geral');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };
    loadUser();
  }, []);

  const perfilLower = currentUser?.perfil?.toLowerCase() || '';

  if (perfilLower === 'vendedor') return <DashboardVendedor />;
  if (perfilLower === 'caixa' || perfilLower === 'operador de caixa') return <DashboardCaixa />;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header com logo alinhada à direita */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 font-glacial">Dashboard</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500">Visão geral do negócio</p>
        </div>
        <div className="hidden md:block">
          <P38Logo variant="vertical" size="sm" />
        </div>
      </div>

      <GlacialTabsList scrollable>
        <GlacialTabsTrigger value="geral"      activeValue={activeTab} onSelect={setActiveTab} icon={LayoutDashboard} label="Geral" />
        <GlacialTabsTrigger value="vendas"     activeValue={activeTab} onSelect={setActiveTab} icon={TrendingUp}      label="Vendas" />
        <GlacialTabsTrigger value="compras"    activeValue={activeTab} onSelect={setActiveTab} icon={ShoppingCart}    label="Compras" />
        <GlacialTabsTrigger value="estoque"    activeValue={activeTab} onSelect={setActiveTab} icon={Package}         label="Estoque" />
        <GlacialTabsTrigger value="financeiro" activeValue={activeTab} onSelect={setActiveTab} icon={DollarSign}      label="Financeiro" />
      </GlacialTabsList>

      <div>
        {activeTab === 'geral'      && <GeralTab />}
        {activeTab === 'vendas'     && <VendasTab />}
        {activeTab === 'compras'    && <ComprasTab />}
        {activeTab === 'estoque'    && <EstoqueTab />}
        {activeTab === 'financeiro' && <FinanceiroTab />}
      </div>
    </div>
  );
}