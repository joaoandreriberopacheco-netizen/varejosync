import {
  ShoppingBag, TrendingUp, Package, DollarSign, ShoppingCart,
  Truck, BarChart3, Users, ClipboardList, Receipt, Warehouse,
  FileText, QrCode, LayoutDashboard, Tag, Settings, Upload
} from 'lucide-react';

/**
 * permissaoCheck(permissoes) → boolean
 * Controla se este atalho aparece na lista de opções do "Personalizar"
 * para o usuário em questão.
 * Admins sempre veem tudo (tratado em Home.jsx antes de filtrar).
 */
export const ALL_QUICK_ACTIONS = [
  {
    id: 'pdv',
    icon: ShoppingBag,
    label: 'PDV',
    page: 'PDVVendedor',
    permissaoCheck: (p) => p?.pdv?.acesso_vendedor || p?.pdv?.acesso_supermercado,
  },
  {
    id: 'caixa',
    icon: ShoppingBag,
    label: 'Caixa',
    page: 'PDVCaixa',
    permissaoCheck: (p) => p?.pdv?.acesso_caixa || p?.financeiro?.acesso,
  },
  {
    id: 'vendas',
    icon: TrendingUp,
    label: 'Vendas',
    page: 'VendasGestao',
    permissaoCheck: (p) => p?.vendas?.acesso,
  },
  {
    id: 'produtos',
    icon: Package,
    label: 'Produtos',
    page: 'Produtos',
    permissaoCheck: (p) => p?.estoque?.visualizar_produtos || p?.estoque?.produtos?.ver || p?.estoque?.produtos?.editar,
  },
  {
    id: 'financeiro',
    icon: DollarSign,
    label: 'Financeiro',
    page: 'FluxoCaixa',
    permissaoCheck: (p) => p?.financeiro?.acesso,
  },
  {
    id: 'compras',
    icon: ShoppingCart,
    label: 'Ped. Compra',
    page: 'PedidosCompra',
    permissaoCheck: (p) => p?.estoque?.compras?.ver || p?.estoque?.compras?.editar,
  },
  {
    id: 'logistica',
    icon: Truck,
    label: 'Logística',
    page: 'Logistica',
    permissaoCheck: (p) => p?.estoque?.logistica?.ver || p?.estoque?.logistica?.editar,
  },
  {
    id: 'dashboard',
    icon: BarChart3,
    label: 'Dashboard',
    page: 'Dashboard',
    permissaoCheck: (p) => p?.dashboard?.acesso,
  },
  {
    id: 'estoque',
    icon: Warehouse,
    label: 'Estoque',
    page: 'Estoque',
    permissaoCheck: (p) => p?.estoque?.acesso,
  },
  {
    id: 'tabelaprecos',
    icon: Tag,
    label: 'Tabela Preços',
    page: 'TabelaPrecosConsulta',
    permissaoCheck: (p) => p?.estoque?.visualizar_produtos,
  },
  {
    id: 'manifestos',
    icon: FileText,
    label: 'Manifestos',
    page: 'GestaoManifestosPage',
    permissaoCheck: (p) => p?.estoque?.logistica?.ver || p?.estoque?.logistica?.editar || p?.estoque?.compras?.ver,
  },
  {
    id: 'supermanifestos',
    icon: ClipboardList,
    label: 'Supermanifestos',
    page: 'GestaoSupermanifestosPage',
    permissaoCheck: (p) => p?.estoque?.logistica?.ver || p?.estoque?.logistica?.editar || p?.estoque?.compras?.ver,
  },
  {
    id: 'conferencia',
    icon: QrCode,
    label: 'Conferência',
    page: 'ConferenciaEntrada',
    permissaoCheck: (p) => p?.estoque?.logistica?.ver || p?.estoque?.logistica?.editar || p?.estoque?.compras?.ver,
  },
  {
    id: 'relatorios',
    icon: BarChart3,
    label: 'Relatórios',
    page: 'Relatorios',
    permissaoCheck: (p) => p?.relatorios?.acesso,
  },
  {
    id: 'terceiros',
    icon: Users,
    label: 'Clientes',
    page: 'Terceiros',
    permissaoCheck: (p) => p?.vendas?.acesso,
  },
  {
    id: 'importacao',
    icon: Upload,
    label: 'Importação',
    page: 'ImportacaoProdutos',
    permissaoCheck: (p) => p?.estoque?.produtos?.editar,
  },
  {
    id: 'configuracoes',
    icon: Settings,
    label: 'Configurações',
    page: 'Configuracoes',
    permissaoCheck: (p) => p?.configuracoes?.acesso,
  },
];

export const DEFAULT_QUICK_ACTIONS = ['pdv', 'caixa', 'vendas', 'produtos', 'financeiro', 'compras'];