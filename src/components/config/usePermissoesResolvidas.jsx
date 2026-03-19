/**
 * Quarter Master Logic — Resolver de Permissões
 * 
 * Combina PerfilDeAcesso (template) + override_permissoes (individual)
 * para retornar o objeto final de permissões de um usuário.
 */

import { MODULOS } from './PerfilFormTela';

/**
 * Resolve as permissões finais de um usuário.
 * @param {object|null} perfilDeAcesso - O objeto PerfilDeAcesso vinculado ao usuário
 * @param {object} overridePermissoes - Os overrides individuais do usuário (formato 'modulo.permissao': bool)
 * @returns {object} permissoes - Objeto final de permissões resolvidas
 */
export function resolverPermissoes(perfilDeAcesso, overridePermissoes = {}) {
  // Base: permissões do perfil mestre (template)
  const base = perfilDeAcesso?.permissoes || {};
  
  // Clonar profundamente
  const resultado = JSON.parse(JSON.stringify(base));

  // Aplicar overrides individuais (formato: 'modulo.permissao' ou 'modulo.permissao.subtipo')
  Object.entries(overridePermissoes || {}).forEach(([chave, valor]) => {
    const partes = chave.split('.');
    if (partes.length === 2) {
      const [modulo, permissao] = partes;
      if (!resultado[modulo]) resultado[modulo] = {};
      resultado[modulo][permissao] = valor;
    } else if (partes.length === 3) {
      const [modulo, permissao, subtipo] = partes;
      if (!resultado[modulo]) resultado[modulo] = {};
      if (!resultado[modulo][permissao]) resultado[modulo][permissao] = {};
      resultado[modulo][permissao][subtipo] = valor;
    }
  });

  return resultado;
}

/**
 * Verifica se um usuário tem uma permissão específica.
 * Admins (role === 'admin') têm tudo liberado automaticamente.
 * @param {object} user - O objeto do usuário logado
 * @param {object|null} perfilDeAcesso - O PerfilDeAcesso vinculado
 * @param {string} modulo - Ex: 'vendas'
 * @param {string} permissao - Ex: 'acesso'
 * @param {string|null} subtipo - Ex: 'ver' ou 'editar' (opcional)
 * @returns {boolean}
 */
export function temPermissao(user, perfilDeAcesso, modulo, permissao, subtipo = null) {
  // Admins têm acesso total
  if (user?.role === 'admin') return true;

  const permissoes = resolverPermissoes(perfilDeAcesso, user?.override_permissoes);
  
  if (subtipo) {
    return permissoes?.[modulo]?.[permissao]?.[subtipo] === true;
  }
  return permissoes?.[modulo]?.[permissao] === true;
}

/**
 * Constrói os itens de menu visíveis para um usuário com base em suas permissões resolvidas.
 * @param {object} user - O objeto do usuário logado
 * @param {object|null} perfilDeAcesso - O PerfilDeAcesso vinculado
 * @returns {Array} - Lista de itens de menu autorizados
 */
export function buildMenuItems(user, perfilDeAcesso) {
  // Admins veem tudo
  if (user?.role === 'admin') return ALL_MENU_ITEMS;

  const permissoes = resolverPermissoes(perfilDeAcesso, user?.override_permissoes);

  return ALL_MENU_ITEMS.filter(item => {
    // Verifica permissão de acesso ao módulo/página
    if (item.permissaoCheck) {
      return item.permissaoCheck(permissoes);
    }
    return true;
  }).map(item => {
    if (!item.submenu) return item;
    const subsFiltrados = item.submenu.filter(sub => {
      if (sub.permissaoCheck) return sub.permissaoCheck(permissoes);
      return true;
    });
    return { ...item, submenu: subsFiltrados };
  }).filter(item => {
    // Remove módulos cujos submenus ficaram vazios
    if (item.submenu) return item.submenu.length > 0;
    return true;
  });
}

// ─── Definição completa da estrutura de menu ─────────────────────────────────
// Cada item tem uma função permissaoCheck que recebe o objeto de permissões resolvidas
import {
  LayoutDashboard, SquareTerminal, TrendingUp, Package,
  DollarSign, BookOpen, Settings, ShoppingCart, Warehouse, Truck
} from 'lucide-react';

export const ALL_MENU_ITEMS = [
  {
    name: 'Início',
    icon: LayoutDashboard,
    page: 'Home',
    permissaoCheck: () => true
  },
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    permissaoCheck: (p) => p?.dashboard?.acesso,
    submenu: [
      {
        name: 'Dashboard Completo',
        page: 'Dashboard',
        permissaoCheck: (p) => p?.dashboard?.acesso
      },
      {
        name: 'Painel Gerencial',
        page: 'PainelGerente',
        permissaoCheck: (p) => p?.vendas?.painel_gerencial
      }
    ]
  },
  {
    name: 'PDV',
    icon: SquareTerminal,
    permissaoCheck: (p) => p?.pdv?.acesso_vendedor || p?.pdv?.acesso_supermercado || p?.pdv?.acesso_auto_atendimento,
    submenu: [
      {
        name: 'Vendedor',
        page: 'PDVVendedor',
        permissaoCheck: (p) => p?.pdv?.acesso_vendedor
      },
      {
        name: 'Supermercado',
        page: 'PDV?mode=supermercado',
        permissaoCheck: (p) => p?.pdv?.acesso_supermercado
      },
      {
        name: 'Auto-Atendimento',
        page: 'AutoAtendimento',
        permissaoCheck: (p) => p?.pdv?.acesso_auto_atendimento
      }
    ]
  },
  {
    name: 'Caixa',
    icon: SquareTerminal,
    page: 'PDVCaixa',
    permissaoCheck: (p) => p?.pdv?.acesso_caixa || p?.financeiro?.acesso
  },
  {
    name: 'Vendas',
    icon: TrendingUp,
    permissaoCheck: (p) => p?.vendas?.acesso,
    submenu: [
      {
        name: 'Gestão de Vendas',
        page: 'VendasGestao',
        permissaoCheck: (p) => p?.vendas?.listar_pedidos?.ver || p?.vendas?.listar_pedidos?.editar
      },
      {
        name: 'Vendas Perdidas',
        page: 'VendasPerdidas',
        permissaoCheck: (p) => p?.vendas?.vendas_perdidas
      },
      {
        name: 'Controle de Entregas',
        page: 'ControleEntregas',
        permissaoCheck: (p) => p?.vendas?.controle_entregas?.ver || p?.vendas?.controle_entregas?.editar
      },
      {
        name: 'Painel Gerencial',
        page: 'PainelGerente',
        permissaoCheck: (p) => p?.vendas?.painel_gerencial
      }
    ]
  },
  {
    name: 'Produtos',
    icon: Package,
    page: 'Produtos',
    permissaoCheck: (p) => p?.estoque?.produtos?.ver || p?.estoque?.produtos?.editar || p?.estoque?.visualizar_produtos
  },
  {
    name: 'Compras',
    icon: ShoppingCart,
    permissaoCheck: (p) => p?.estoque?.compras?.ver || p?.estoque?.compras?.editar,
    submenu: [
      {
        name: 'Sugestões de Compra',
        page: 'SugestoesCompra',
        permissaoCheck: (p) => p?.estoque?.compras?.ver || p?.estoque?.compras?.editar
      },
      {
        name: 'Cotações',
        page: 'Cotacoes',
        permissaoCheck: (p) => p?.estoque?.compras?.ver || p?.estoque?.compras?.editar
      },
      {
        name: 'Pedidos de Compra',
        page: 'PedidosCompra',
        permissaoCheck: (p) => p?.estoque?.compras?.ver || p?.estoque?.compras?.editar
      },
      {
        name: 'Manifestos',
        page: 'GestaoManifestosPage',
        permissaoCheck: (p) => p?.estoque?.logistica?.ver || p?.estoque?.logistica?.editar || p?.estoque?.compras?.ver
      },
      {
        name: 'Supermanifestos',
        page: 'GestaoSupermanifestosPage',
        permissaoCheck: (p) => p?.estoque?.logistica?.ver || p?.estoque?.logistica?.editar || p?.estoque?.compras?.ver
      },
      {
        name: 'Conferência de Entrada',
        page: 'ConferenciaEntrada',
        permissaoCheck: (p) => p?.estoque?.logistica?.ver || p?.estoque?.logistica?.editar || p?.estoque?.compras?.ver
      },
      {
        name: 'Logística',
        page: 'Logistica',
        permissaoCheck: (p) => p?.estoque?.logistica?.ver || p?.estoque?.logistica?.editar
      }
    ]
  },
  {
    name: 'Estoque',
    icon: Warehouse,
    permissaoCheck: (p) => p?.estoque?.acesso,
    submenu: [
      {
        name: 'Conferência',
        page: 'ConferenciaEstoque',
        permissaoCheck: (p) => p?.estoque?.conferencia_estoque
      },
      {
        name: 'Auditoria',
        page: 'AuditoriaEstoque',
        permissaoCheck: (p) => p?.estoque?.auditoria_estoque
      },
      {
        name: 'Armazenagem',
        page: 'Armazenagem',
        permissaoCheck: (p) => p?.estoque?.armazenagem
      },
      {
        name: 'Separação de Pedidos',
        page: 'InterfaceSeparador',
        permissaoCheck: (p) => p?.estoque?.separacao_pedidos
      },
      {
        name: 'Tabela de Preços',
        page: 'TabelaPrecosConsulta',
        permissaoCheck: (p) => p?.estoque?.visualizar_produtos
      },
      {
        name: 'Importação em Massa',
        page: 'ImportacaoProdutos',
        permissaoCheck: (p) => p?.estoque?.produtos?.editar
      }
    ]
  },
  {
    name: 'Financeiro',
    icon: DollarSign,
    permissaoCheck: (p) => p?.financeiro?.acesso || p?.financeiro?.caixas_ativos,
    submenu: [
      {
        name: 'Fluxo de Caixa',
        page: 'FluxoCaixa',
        permissaoCheck: (p) => p?.financeiro?.acesso
      },
      {
        name: 'Contas',
        page: 'ContasFinanceiras',
        permissaoCheck: (p) => p?.financeiro?.acesso
      },
      {
        name: 'Aprovações',
        page: 'AprovacoesFinanceiras',
        permissaoCheck: (p) => p?.financeiro?.acesso
      },
      {
        name: 'Caixas Ativos',
        page: 'CaixasAtivos',
        permissaoCheck: (p) => p?.financeiro?.caixas_ativos || p?.financeiro?.acesso
      },
      {
        name: 'Turnos Fechados',
        page: 'TurnosFechados',
        permissaoCheck: (p) => p?.financeiro?.acesso
      }
    ]
  },
  {
    name: 'Relatórios',
    icon: BookOpen,
    page: 'Relatorios',
    permissaoCheck: (p) => p?.relatorios?.acesso
  },
  {
    name: 'Configurações',
    icon: Settings,
    page: 'Configuracoes',
    permissaoCheck: (p) => p?.configuracoes?.acesso
  }
];