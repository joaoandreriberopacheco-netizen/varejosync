/**
 * Quarter Master Logic — Resolver de Permissões
 *
 * Combina PerfilDeAcesso (template) + override_permissoes (individual)
 * para retornar o objeto final de permissões de um usuário.
 *
 * FORMATO REAL (salvo por PerfilFormTela):
 *   permissoes.pdv.acesso_vendedor = true
 *   permissoes.estoque.visualizar_produtos = true
 *   permissoes.estoque.compras.sugestoes = true
 *   permissoes.estoque.compras.hub_logistico.manifestos = true
 *   etc.
 */

import { MODULOS } from './PerfilFormTela';

import {
  LayoutDashboard, Monitor, Banknote, TrendingUp, Package,
  DollarSign, BookOpen, Settings, ShoppingCart, Warehouse, Truck
} from 'lucide-react';

export function resolverPermissoes(perfilDeAcesso, overridePermissoes = {}) {
  const base = perfilDeAcesso?.permissoes || {};
  const resultado = JSON.parse(JSON.stringify(base));

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

export function temPermissao(user, perfilDeAcesso, modulo, permissao, subtipo = null) {
  if (user?.role === 'admin') return true;
  const permissoes = resolverPermissoes(perfilDeAcesso, user?.override_permissoes);
  if (subtipo) {
    return permissoes?.[modulo]?.[permissao]?.[subtipo] === true;
  }
  return permissoes?.[modulo]?.[permissao] === true;
}

export function buildMenuItems(user, perfilDeAcesso) {
  // Admins vêem tudo
  if (user?.role === 'admin') return ALL_MENU_ITEMS;

  const temPerfil = !!user?.perfil_acesso_id;
  const temOverrides = user?.override_permissoes && Object.keys(user.override_permissoes).length > 0;

  // Sem perfil E sem overrides = vê tudo
  if (!temPerfil && !temOverrides) return ALL_MENU_ITEMS;

  // Tem perfil_acesso_id mas objeto ainda não carregou = aguarda
  if (temPerfil && !perfilDeAcesso) return [];

  const permissoes = resolverPermissoes(perfilDeAcesso, user?.override_permissoes);

  // Perfil recém criado sem nenhuma permissão = mostra tudo
  if (Object.keys(permissoes).length === 0) return ALL_MENU_ITEMS;

  return ALL_MENU_ITEMS
    .map(item => {
      if (!item.submenu) return item;
      const subsFiltrados = item.submenu.filter(sub =>
        sub.permissaoCheck ? sub.permissaoCheck(permissoes) : true
      );
      return { ...item, submenu: subsFiltrados };
    })
    .filter(item => {
      const pass = item.permissaoCheck ? item.permissaoCheck(permissoes) : true;
      if (!pass) return false;
      if (item.submenu) return item.submenu.length > 0;
      return true;
    });
}

// ─── Definição do menu alinhada com o formato real salvo pelo PerfilFormTela ──

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
    icon: Monitor,
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
    icon: Banknote,
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
        // salvo como boolean direto: permissoes.vendas.listar_pedidos = true
        permissaoCheck: (p) => p?.vendas?.listar_pedidos === true
      },
      {
        name: 'Vendas Perdidas',
        page: 'VendasPerdidas',
        permissaoCheck: (p) => p?.vendas?.vendas_perdidas === true
      },
      {
        name: 'Controle de Entregas',
        page: 'ControleEntregas',
        permissaoCheck: (p) => p?.vendas?.controle_entregas === true
      },
      {
        name: 'Painel Gerencial',
        page: 'PainelGerente',
        permissaoCheck: (p) => p?.vendas?.painel_gerencial === true
      }
    ]
  },
  {
    name: 'Produtos',
    icon: Package,
    page: 'Produtos',
    permissaoCheck: (p) => p?.estoque?.visualizar_produtos === true
  },
  {
    name: 'Compras',
    icon: ShoppingCart,
    permissaoCheck: (p) =>
      p?.estoque?.compras?.sugestoes ||
      p?.estoque?.compras?.cotacoes ||
      p?.estoque?.compras?.pedidos ||
      p?.estoque?.compras?.hub_logistico?.manifestos ||
      p?.estoque?.compras?.hub_logistico?.supermanifestos ||
      p?.estoque?.compras?.hub_logistico?.conferencia ||
      p?.estoque?.logistica,
    submenu: [
      {
        name: 'Sugestões de Compra',
        page: 'SugestoesCompra',
        permissaoCheck: (p) => p?.estoque?.compras?.sugestoes === true
      },
      {
        name: 'Cotações',
        page: 'Cotacoes',
        permissaoCheck: (p) => p?.estoque?.compras?.cotacoes === true
      },
      {
        name: 'Pedidos de Compra',
        page: 'PedidosCompra',
        permissaoCheck: (p) => p?.estoque?.compras?.pedidos === true
      },
      {
        name: 'Manifestos',
        page: 'GestaoManifestosPage',
        permissaoCheck: (p) => p?.estoque?.compras?.hub_logistico?.manifestos === true || p?.estoque?.logistica === true
      },
      {
        name: 'Supermanifestos',
        page: 'GestaoSupermanifestosPage',
        permissaoCheck: (p) => p?.estoque?.compras?.hub_logistico?.supermanifestos === true || p?.estoque?.logistica === true
      },
      {
        name: 'Conferência de Entrada',
        page: 'ConferenciaEntrada',
        permissaoCheck: (p) => p?.estoque?.compras?.hub_logistico?.conferencia === true || p?.estoque?.logistica === true
      },
      {
        name: 'Logística',
        page: 'Logistica',
        permissaoCheck: (p) => p?.estoque?.logistica === true
      }
    ]
  },
  {
    name: 'Estoque',
    icon: Warehouse,
    permissaoCheck: (p) =>
      p?.estoque?.conferencia_estoque ||
      p?.estoque?.auditoria_estoque ||
      p?.estoque?.armazenagem ||
      p?.estoque?.separacao_pedidos ||
      p?.estoque?.tabela_precos ||
      p?.estoque?.realizar_ajuste_estoque,
    submenu: [
      {
        name: 'Conferência',
        page: 'ConferenciaEstoque',
        permissaoCheck: (p) => p?.estoque?.conferencia_estoque === true
      },
      {
        name: 'Auditoria',
        page: 'AuditoriaEstoque',
        permissaoCheck: (p) => p?.estoque?.auditoria_estoque === true
      },
      {
        name: 'Armazenagem',
        page: 'Armazenagem',
        permissaoCheck: (p) => p?.estoque?.armazenagem === true
      },
      {
        name: 'Separação de Pedidos',
        page: 'InterfaceSeparador',
        permissaoCheck: (p) => p?.estoque?.separacao_pedidos === true
      },
      {
        name: 'Tabela de Preços',
        page: 'TabelaPrecosConsulta',
        permissaoCheck: (p) => p?.estoque?.tabela_precos === true
      },
      {
        name: 'Importação em Massa',
        page: 'ImportacaoProdutos',
        permissaoCheck: (p) => p?.estoque?.visualizar_produtos === true
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
        permissaoCheck: (p) => p?.financeiro?.acesso === true
      },
      {
        name: 'Contas',
        page: 'ContasFinanceiras',
        permissaoCheck: (p) => p?.financeiro?.acesso === true
      },
      {
        name: 'Aprovações',
        page: 'AprovacoesFinanceiras',
        permissaoCheck: (p) => p?.financeiro?.acesso === true
      },
      {
        name: 'Caixas Ativos',
        page: 'CaixasAtivos',
        permissaoCheck: (p) => p?.financeiro?.caixas_ativos === true || p?.financeiro?.acesso === true
      },
      {
        name: 'Turnos Fechados',
        page: 'TurnosFechados',
        permissaoCheck: (p) => p?.financeiro?.acesso === true
      }
    ]
  },
  {
    name: 'Relatórios',
    icon: BookOpen,
    page: 'Relatorios',
    permissaoCheck: (p) => p?.relatorios?.acesso === true
  },
  {
    name: 'Configurações',
    icon: Settings,
    page: 'Configuracoes',
    permissaoCheck: (p) => p?.configuracoes?.acesso === true
  }
];