import {
  Monitor, TrendingUp, Package, DollarSign, ShoppingCart, Wallet,
  Truck, BarChart3, Users, ClipboardList, Receipt, Warehouse,
  FileText, QrCode, LayoutDashboard, Tag
} from 'lucide-react';

export const ALL_QUICK_ACTIONS = [
  { id: 'pdv', icon: Monitor, label: 'PDV', page: 'PDV?mode=vendedor' },
  { id: 'caixa', icon: Wallet, label: 'Caixa', page: 'PDVCaixa' },
  { id: 'vendas', icon: TrendingUp, label: 'Vendas', page: 'VendasGestao' },
  { id: 'produtos', icon: Package, label: 'Produtos', page: 'Produtos' },
  { id: 'financeiro', icon: DollarSign, label: 'Financeiro', page: 'FluxoCaixa' },
  { id: 'compras', icon: ShoppingCart, label: 'Ped. Compra', page: 'PedidosCompra' },
  { id: 'logistica', icon: Truck, label: 'Logística', page: 'Logistica' },
  { id: 'dashboard', icon: BarChart3, label: 'Dashboard', page: 'Dashboard' },
  { id: 'estoque', icon: Warehouse, label: 'Estoque', page: 'Estoque' },
  { id: 'tabelaprecos', icon: Tag, label: 'Tabela Preços', page: 'TabelaPrecosConsulta' },
  { id: 'manifestos', icon: FileText, label: 'Manifestos', page: 'GestaoManifestosPage' },
  { id: 'supermanifestos', icon: ClipboardList, label: 'Supermanifestos', page: 'GestaoSupermanifestosPage' },
  { id: 'conferencia', icon: QrCode, label: 'Conferência', page: 'ConferenciaEntrada' },
  { id: 'relatorios', icon: BarChart3, label: 'Relatórios', page: 'Relatorios' },
  { id: 'terceiros', icon: Users, label: 'Clientes', page: 'Terceiros' },
];

export const DEFAULT_QUICK_ACTIONS = ['pdv', 'caixa', 'vendas', 'produtos', 'financeiro', 'compras'];