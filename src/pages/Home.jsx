import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import {
  Eye, EyeOff, BarChart3, AlertCircle, ChevronRight,
  Package, Receipt, ShoppingCart, Wallet, Settings2
} from 'lucide-react';
import P38Logo from '@/components/brand/P38Logo';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ALL_QUICK_ACTIONS, DEFAULT_QUICK_ACTIONS } from '@/components/home/quickActions';
import PersonalizarHomeDialog from '@/components/home/PersonalizarHomeDialog';
import { resolverPermissoes } from '@/components/config/usePermissoesResolvidas';

const STORAGE_KEY = 'home_quick_actions';

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [perfilDeAcesso, setPerfilDeAcesso] = useState(null);
  const [quickActionIds, setQuickActionIds] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_QUICK_ACTIONS;
    } catch { return DEFAULT_QUICK_ACTIONS; }
  });
  const [showBalance, setShowBalance] = useState(true);
  const [showPersonalizar, setShowPersonalizar] = useState(false);
  const [kpis, setKpis] = useState({
    vendasHoje: 0,
    valorVendasHoje: 0,
    estoqueAlerta: 0,
    pedidosPendentes: 0
  });

  // Resolve permissões do usuário atual
  const permissoes = useMemo(() => {
    if (!currentUser) return null;
    if (currentUser.role === 'admin') return null; // admin tem tudo
    return resolverPermissoes(perfilDeAcesso, currentUser?.override_permissoes);
  }, [currentUser, perfilDeAcesso]);

  // IDs dos atalhos que o usuário tem permissão de ver
  const allowedActionIds = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return ALL_QUICK_ACTIONS.map(a => a.id);
    if (!permissoes) return ALL_QUICK_ACTIONS.map(a => a.id);
    return ALL_QUICK_ACTIONS
      .filter(a => !a.permissaoCheck || a.permissaoCheck(permissoes))
      .map(a => a.id);
  }, [currentUser, permissoes]);

  // Pode ver resumo de vendas: admin, ou quem tem dashboard.acesso, resumo_vendas_home, ou vendas.acesso
  const podeVerResumoVendas = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (!permissoes) return true;
    return !!(
      permissoes?.dashboard?.acesso ||
      permissoes?.dashboard?.resumo_vendas_home ||
      permissoes?.vendas?.acesso
    );
  }, [currentUser, permissoes]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        // Carregar perfil de acesso vinculado
        if (user?.perfil_acesso_id) {
          try {
            const perfis = await base44.entities.PerfilDeAcesso.list();
            const encontrado = perfis.find(p => p.id === user.perfil_acesso_id);
            if (encontrado) setPerfilDeAcesso(encontrado);
          } catch (e) {
            console.warn("Perfil de acesso não encontrado:", e);
          }
        }
        await loadKPIs();
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };
    loadUser();
  }, []);

  const loadKPIs = async () => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const [vendas, produtos, pedidos] = await Promise.all([
        base44.entities.PedidoVenda.list(),
        base44.entities.Produto.list(),
        base44.entities.PedidoVenda.filter({ status: 'Aguardando Caixa' })
      ]);
      const vendasHoje = vendas.filter(v => new Date(v.created_date) >= hoje);
      const produtosAlerta = produtos.filter(p => (p.estoque_atual || 0) <= (p.estoque_minimo || 0));
      setKpis({
        vendasHoje: vendasHoje.length,
        valorVendasHoje: vendasHoje.reduce((sum, v) => sum + (v.valor_total || 0), 0),
        estoqueAlerta: produtosAlerta.length,
        pedidosPendentes: pedidos.length
      });
    } catch (error) {
      console.error('Erro ao carregar KPIs:', error);
    }
  };

  const handleSaveActions = (ids) => {
    const limited = ids.slice(0, 6);
    setQuickActionIds(limited);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
  };

  // Atalhos selecionados pelo usuário, filtrados pelas permissões dele
  const quickActions = quickActionIds
    .filter(id => allowedActionIds.includes(id))
    .map(id => ALL_QUICK_ACTIONS.find(a => a.id === id))
    .filter(Boolean);

  const formatValor = (valor) => (valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-6">
      {/* Header com ícone no canto superior (mobile) */}
      <div className="md:hidden fixed top-4 right-4 z-40">
        <P38Logo variant="icon-only" size="md" />
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header com logo inline (desktop) + boas-vindas */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {format(new Date(), 'EEEE, d \'de\' MMMM', { locale: ptBR })}
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-white font-glacial mt-2">
              Olá, {currentUser?.full_name?.split(' ')[0] || 'Usuário'}
            </h1>
          </div>
          <div className="hidden md:block">
            <P38Logo variant="horizontal" size="xxl" className="flex-shrink-0" />
          </div>
        </div>

        {/* Saldo Card — visível apenas com permissão de dashboard ou vendas */}
        {podeVerResumoVendas && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Resumo de Vendas</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Hoje</p>
              </div>
              <button onClick={() => setShowBalance(!showBalance)} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">
                {showBalance ? <Eye className="w-5 h-5 text-gray-400" /> : <EyeOff className="w-5 h-5 text-gray-400" />}
              </button>
            </div>
            {showBalance ? (
              <>
                <div className="text-3xl font-bold text-gray-900 dark:text-white font-glacial mb-1">
                  R$ {formatValor(kpis.valorVendasHoje)}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {kpis.vendasHoje} {kpis.vendasHoje === 1 ? 'venda realizada' : 'vendas realizadas'}
                </p>
              </>
            ) : (
              <div className="text-3xl font-bold text-gray-400 dark:text-gray-600 font-glacial mb-1">••••••</div>
            )}
            <Link
              to={createPageUrl('Dashboard')}
              className="mt-4 flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ver Dashboard Completo</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Acesso Rápido
            </h2>
            <button
              onClick={() => setShowPersonalizar(true)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Personalizar</span>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.id}
                  to={createPageUrl(action.page)}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-95"
                  style={{ minHeight: '110px' }}
                >
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shadow-sm">
                    <Icon className="w-6 h-6 text-gray-700 dark:text-gray-300" strokeWidth={2} />
                  </div>
                  <span className="text-xs font-medium text-gray-900 dark:text-white text-center leading-tight">
                    {action.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Alertas */}
        {(kpis.estoqueAlerta > 0 || kpis.pedidosPendentes > 0) && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 px-1">Avisos</h2>
            {kpis.pedidosPendentes > 0 && (
              <Link to={createPageUrl('PDVCaixa')} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {kpis.pedidosPendentes} {kpis.pedidosPendentes === 1 ? 'venda aguardando' : 'vendas aguardando'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Processar pagamento no caixa</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </Link>
            )}
            {kpis.estoqueAlerta > 0 && (
              <Link to={createPageUrl('Produtos')} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {kpis.estoqueAlerta} {kpis.estoqueAlerta === 1 ? 'produto' : 'produtos'} em estoque baixo
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Verificar reposição</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </Link>
            )}
          </div>
        )}

        {/* Atalhos rápidos de lista */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white font-glacial mb-3">Outros Atalhos</h3>
          <div className="space-y-2">
            <Link to={createPageUrl('VendasGestao')} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Consultar Vendas</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
            <Link to={createPageUrl('PedidosCompra')} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Pedidos de Compra</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
            <Link to={createPageUrl('FluxoCaixa')} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Fluxo de Caixa</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          </div>
        </div>
      </div>

      <PersonalizarHomeDialog
        isOpen={showPersonalizar}
        onClose={() => setShowPersonalizar(false)}
        selected={quickActionIds}
        onSave={handleSaveActions}
        allowedActions={allowedActionIds}
      />
    </div>
  );
}