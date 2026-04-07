import {
  Monitor, Banknote, TrendingUp, Package, DollarSign, ShoppingCart,
  Truck, BarChart3, Users, ClipboardList, Receipt, Warehouse,
  FileText, QrCode, LayoutDashboard, Tag, Settings, Upload, MonitorCheck,
  Scan, Tablet, ClipboardPenLine, ReceiptText
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
    icon: Monitor,
    label: 'PDV',
    page: 'PDVVendedor',
    permissaoCheck: (p) => p?.pdv?.acesso_vendedor || p?.pdv?.acesso_supermercado,
  },
  {
    id: 'caixa',
    icon: Banknote,
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
    permissaoCheck: (p) => p?.estoque?.visualizar_produtos,
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
    permissaoCheck: (p) => p?.estoque?.compras?.pedidos || p?.estoque?.compras?.sugestoes || p?.estoque?.compras?.cotacoes,
  },
  {
    id: 'logistica',
    icon: Truck,
    label: 'Logística',
    page: 'Logistica',
    permissaoCheck: (p) => p?.estoque?.logistica || p?.estoque?.compras?.hub_logistico?.logistica,
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
    permissaoCheck: (p) => p?.estoque?.conferencia_estoque || p?.estoque?.auditoria_estoque || p?.estoque?.armazenagem || p?.estoque?.separacao_pedidos,
  },
  {
    id: 'tabelaprecos',
    icon: Tag,
    label: 'Tabela Preços',
    page: 'TabelaPrecosConsulta',
    permissaoCheck: (p) => p?.estoque?.tabela_precos || p?.estoque?.visualizar_produtos,
  },
  {
    id: 'manifestos',
    icon: FileText,
    label: 'Manifestos',
    page: 'GestaoManifestosPage',
    permissaoCheck: (p) => p?.estoque?.compras?.hub_logistico?.manifestos || p?.estoque?.logistica,
  },
  {
    id: 'supermanifestos',
    icon: ClipboardList,
    label: 'Supermanifestos',
    page: 'GestaoSupermanifestosPage',
    permissaoCheck: (p) => p?.estoque?.compras?.hub_logistico?.supermanifestos || p?.estoque?.logistica,
  },
  {
    id: 'conferencia',
    icon: QrCode,
    label: 'Conferência',
    page: 'ConferenciaEntrada',
    permissaoCheck: (p) => p?.estoque?.compras?.hub_logistico?.conferencia || p?.estoque?.logistica,
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
    permissaoCheck: (p) => p?.estoque?.visualizar_produtos,
  },
  {
    id: 'caixas_ativos',
    icon: MonitorCheck,
    label: 'Caixas Ativos',
    page: 'CaixasAtivos',
    permissaoCheck: (p) => p?.pdv?.acesso_caixa || p?.financeiro?.caixas_ativos || p?.financeiro?.acesso,
  },
  {
    id: 'agefin_consulta',
    icon: ReceiptText,
    label: 'Agefin',
    page: 'AgefinConsulta',
    permissaoCheck: (p) => p?.financeiro?.acesso || p?.dashboard?.acesso,
  },
  {
    id: 'consumo_interno',
    icon: ClipboardPenLine,
    label: 'Consumo',
    page: 'ConsumoInterno',
    permissaoCheck: (p) => p?.homepage?.acoes_rapidas || p?.estoque?.visualizar_produtos || p?.financeiro?.caixas_ativos,
  },
  {
    id: 'pdv_supermercado',
    icon: Scan,
    label: 'PDV Mercado',
    page: 'PDVSupermercado',
    permissaoCheck: (p) => p?.pdv?.acesso_supermercado,
  },
  {
    id: 'autoatendimento',
    icon: Tablet,
    label: 'Autoatendimento',
    page: 'AutoAtendimento',
    permissaoCheck: (p) => p?.pdv?.acesso_auto_atendimento,
  },
  {
    id: 'configuracoes',
    icon: Settings,
    label: 'Configurações',
    page: 'Configuracoes',
    permissaoCheck: (p) => p?.configuracoes?.acesso,
  },
];

export const DEFAULT_QUICK_ACTIONS = ['pdv', 'vendas', 'tabelaprecos', 'terceiros', 'financeiro', 'caixas_ativos', 'agefin_consulta'];