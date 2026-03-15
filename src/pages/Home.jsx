import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { 
  Monitor, 
  TrendingUp, 
  Package, 
  DollarSign,
  ShoppingCart,
  Receipt,
  Wallet,
  Clock,
  ChevronRight
} from 'lucide-react';

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [quickActions, setQuickActions] = useState([]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        // Quick actions baseadas no perfil (placeholder - será expandido com mochila do soldado)
        const actions = getQuickActionsForUser(user);
        setQuickActions(actions);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };
    loadUser();
  }, []);

  const getQuickActionsForUser = (user) => {
    // Placeholder - será substituído pela lógica da mochila do soldado
    const allActions = [
      { id: 'pdv', icon: Monitor, label: 'PDV', page: 'PDV?mode=vendedor', color: 'from-blue-500 to-blue-600' },
      { id: 'vendas', icon: TrendingUp, label: 'Vendas', page: 'VendasGestao', color: 'from-emerald-500 to-emerald-600' },
      { id: 'produtos', icon: Package, label: 'Produtos', page: 'Produtos', color: 'from-purple-500 to-purple-600' },
      { id: 'caixa', icon: Wallet, label: 'Caixa', page: 'BalancoCaixa', color: 'from-amber-500 to-amber-600' },
      { id: 'compras', icon: ShoppingCart, label: 'Compras', page: 'Compras', color: 'from-indigo-500 to-indigo-600' },
      { id: 'financeiro', icon: DollarSign, label: 'Financeiro', page: 'FluxoCaixa', color: 'from-pink-500 to-pink-600' },
    ];

    // Por enquanto retorna as primeiras 6 - será customizável
    return allActions.slice(0, 6);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-6">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white font-glacial">
            Olá, {currentUser?.full_name?.split(' ')[0] || 'Usuário'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            O que você precisa fazer hoje?
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.id}
                to={createPageUrl(action.page)}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md transition-shadow"
                style={{ minHeight: '120px' }}
              >
                <div 
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg`}
                >
                  <Icon className="w-7 h-7 text-white" strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white text-center">
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white font-glacial">
              Atividade Recente
            </h2>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 py-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">3 vendas hoje</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">R$ 1.250,00</p>
              </div>
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>

            <div className="flex items-center gap-3 py-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">5 produtos em estoque baixo</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Verificar reposição</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}