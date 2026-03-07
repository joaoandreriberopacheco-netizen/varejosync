import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Shield, Eye, Pencil, ChevronDown, ChevronRight } from 'lucide-react';

// ─── Ícones por módulo ───────────────────────────────────────────
import {
  Monitor, LayoutDashboard, TrendingUp, Package,
  DollarSign, BookOpen, Settings
} from 'lucide-react';

const MODULO_ICONS = {
  pdv: Monitor, dashboard: LayoutDashboard, vendas: TrendingUp,
  estoque: Package, financeiro: DollarSign, relatorios: BookOpen,
  configuracoes: Settings,
};

export const MODULOS = [
  {
    key: 'pdv', label: 'PDV',
    permissoes: [
      { key: 'acesso_vendedor', label: 'Interface de Vendedor' },
      { key: 'acesso_caixa', label: 'Interface de Caixa' },
      { key: 'acesso_supermercado', label: 'Modo Supermercado' },
      { key: 'aplicar_desconto', label: 'Aplicar Desconto' },
      { key: 'cancelar_item_venda', label: 'Cancelar Item' },
      { key: 'cancelar_venda', label: 'Cancelar Venda' },
      { key: 'ver_historico_vendas', label: 'Ver Histórico' },
    ]
  },
  {
    key: 'dashboard', label: 'Dashboard',
    permissoes: [
      { key: 'acesso', label: 'Acesso ao Dashboard' },
      { key: 'ver_kpis_vendas', label: 'KPIs de Vendas' },
      { key: 'ver_kpis_financeiro', label: 'KPIs Financeiros' },
      { key: 'ver_kpis_estoque', label: 'KPIs de Estoque' },
    ]
  },
  {
    key: 'vendas', label: 'Vendas',
    permissoes: [
      { key: 'acesso', label: 'Módulo de Vendas' },
      { key: 'listar_pedidos', label: 'Listar Pedidos', tipo: 'ver_editar' },
      { key: 'cancelar_pedido', label: 'Cancelar Pedido' },
      { key: 'controle_entregas', label: 'Controle de Entregas', tipo: 'ver_editar' },
      { key: 'painel_gerencial', label: 'Painel Gerencial' },
      { key: 'vendas_perdidas', label: 'Vendas Perdidas' },
    ]
  },
  {
    key: 'estoque', label: 'Estoque',
    permissoes: [
      { key: 'acesso', label: 'Módulo de Estoque' },
      { key: 'visualizar_produtos', label: 'Produtos', tipo: 'ver_editar' },
      { key: 'ver_custo_compra', label: 'Ver Custo de Compra' },
      { key: 'realizar_ajuste_estoque', label: 'Ajuste de Estoque' },
      { key: 'separacao_pedidos', label: 'Separação de Pedidos' },
      { key: 'conferencia_estoque', label: 'Conferência' },
      { key: 'auditoria_estoque', label: 'Auditoria' },
    ],
    submodulos: [
      {
        key: 'compras',
        label: 'Compras',
        permissoes: [
          { key: 'acesso', label: 'Módulo de Compras' },
          { key: 'sugestoes', label: 'Sugestões de Compra' },
          { key: 'cotacoes', label: 'Cotações' },
          { key: 'pedidos', label: 'Pedidos de Compra' },
        ],
        submodulos: [
          {
            key: 'hub_logistico',
            label: 'Hub Logístico',
            permissoes: [
              { key: 'acesso', label: 'Hub Logístico' },
              { key: 'manifestos', label: 'Manifestos' },
              { key: 'supermanifestos', label: 'Supermanifestos' },
              { key: 'conferencia', label: 'Conferência' },
            ]
          }
        ]
      },
      {
        key: 'logistica',
        label: 'Logística',
        permissoes: [
          { key: 'acesso', label: 'Módulo de Logística' },
        ]
      },
      {
        key: 'armazenagem',
        label: 'Armazenagem',
        permissoes: [
          { key: 'acesso', label: 'Armazenagem' },
        ]
      }
    ]
  },
  {
    key: 'financeiro', label: 'Financeiro',
    permissoes: [
      { key: 'acesso', label: 'Módulo Financeiro' },
      { key: 'contas', label: 'Contas e Saldos', tipo: 'ver_editar' },
      { key: 'criar_lancamento', label: 'Criar Lançamento' },
      { key: 'aprovar_pagamentos', label: 'Aprovar Pagamentos' },
      { key: 'conciliar_movimentos', label: 'Conciliação Bancária' },
      { key: 'ver_extrato', label: 'Ver Extrato' },
      { key: 'caixas_ativos', label: 'Caixas Ativos' },
    ]
  },
  {
    key: 'relatorios', label: 'Relatórios',
    permissoes: [
      { key: 'acesso', label: 'Acesso a Relatórios' },
      { key: 'relatorio_vendas', label: 'Relatório de Vendas' },
      { key: 'relatorio_estoque', label: 'Relatório de Estoque' },
      { key: 'relatorio_financeiro', label: 'Relatório Financeiro' },
      { key: 'relatorio_margem', label: 'Relatório de Margem' },
    ]
  },
  {
    key: 'configuracoes', label: 'Configurações',
    permissoes: [
      { key: 'acesso', label: 'Acesso às Configurações' },
      { key: 'gerenciar_usuarios', label: 'Gerenciar Usuários' },
      { key: 'gerenciar_perfis', label: 'Gerenciar Perfis de Acesso' },
      { key: 'gerenciar_formas_pagamento', label: 'Formas de Pagamento' },
      { key: 'dados_empresa', label: 'Dados da Empresa' },
      { key: 'parametros_gerais', label: 'Parâmetros Gerais' },
    ]
  },
];

// ─── Helpers de permissão ────────────────────────────────────────
export function getPermissao(permissoes, modulo, chave, subtipo = null) {
  if (subtipo) return permissoes?.[modulo]?.[chave]?.[subtipo] === true;
  return permissoes?.[modulo]?.[chave] === true;
}

export function setPermissao(permissoes, modulo, chave, valor, subtipo = null) {
  const novo = { ...permissoes };
  if (!novo[modulo]) novo[modulo] = {};
  if (subtipo) {
    novo[modulo] = { ...novo[modulo], [chave]: { ...(novo[modulo][chave] || {}), [subtipo]: valor } };
  } else {
    novo[modulo] = { ...novo[modulo], [chave]: valor };
  }
  return novo;
}

export function contarPermissoes(permissoes, moduloKey) {
  const mod = MODULOS.find(m => m.key === moduloKey);
  if (!mod) return { ativas: 0, total: 0 };
  let ativas = 0, total = 0;
  mod.permissoes.forEach(p => {
    if (p.tipo === 'ver_editar') {
      total += 2;
      if (permissoes?.[moduloKey]?.[p.key]?.ver === true) ativas++;
      if (permissoes?.[moduloKey]?.[p.key]?.editar === true) ativas++;
    } else {
      total += 1;
      if (permissoes?.[moduloKey]?.[p.key] === true) ativas++;
    }
  });
  return { ativas, total };
}

function contarPermissoesSubmodulo(permissoes, moduloKey, submodulo) {
  let ativas = 0, total = 0;
  submodulo.permissoes.forEach(p => {
    if (p.tipo === 'ver_editar') {
      total += 2;
      if (permissoes?.[moduloKey]?.[submodulo.key]?.[p.key]?.ver === true) ativas++;
      if (permissoes?.[moduloKey]?.[submodulo.key]?.[p.key]?.editar === true) ativas++;
    } else {
      total += 1;
      if (permissoes?.[moduloKey]?.[submodulo.key]?.[p.key] === true) ativas++;
    }
  });
  if (submodulo.submodulos) {
    submodulo.submodulos.forEach(sub => {
      const { ativas: subAtivas, total: subTotal } = contarPermissoesSubmodulo(permissoes, moduloKey, sub);
      ativas += subAtivas;
      total += subTotal;
    });
  }
  return { ativas, total };
}

// ─── Linha de permissão ──────────────────────────────────────────
// ver_editar: linha com label à esquerda e dois checkboxes nomeados à direita
// toggle: linha com switch e label

function Checkbox({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-5 h-5 rounded flex items-center justify-center transition-colors flex-shrink-0 ${
        checked
          ? 'bg-gray-800 dark:bg-gray-200'
          : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600'
      }`}
    >
      {checked && (
        <svg className="w-3 h-3 text-white dark:text-gray-900" fill="none" viewBox="0 0 12 12">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

function LinhaPermissao({ perm, modulo, permissoes, onChange }) {
  if (perm.tipo === 'ver_editar') {
    const ver = getPermissao(permissoes, modulo, perm.key, 'ver');
    const editar = getPermissao(permissoes, modulo, perm.key, 'editar');
    return (
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
        <span className="text-xs text-gray-600 dark:text-gray-400">{perm.label}</span>
        <Checkbox checked={ver} onChange={v => onChange(setPermissao(permissoes, modulo, perm.key, v, 'ver'))} />
        <Checkbox checked={editar} onChange={v => onChange(setPermissao(permissoes, modulo, perm.key, v, 'editar'))} />
      </div>
    );
  }

  // toggle simples — ocupa as 3 colunas mas o switch fica na col1 (col 2+3 ficam vazias)
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
      <label className="flex items-center gap-2 cursor-pointer">
        <Switch
          checked={getPermissao(permissoes, modulo, perm.key)}
          onCheckedChange={v => onChange(setPermissao(permissoes, modulo, perm.key, v))}
          className="scale-90 data-[state=checked]:bg-gray-800 dark:data-[state=checked]:bg-gray-200"
        />
        <span className="text-xs text-gray-600 dark:text-gray-400">{perm.label}</span>
      </label>
      <div className="w-5" /><div className="w-5" />
    </div>
  );
}

function LinhaPermissaoSubmodulo({ perm, moduloKey, submoduloKey, permissoes, onChange }) {
  if (perm.tipo === 'ver_editar') {
    const ver = permissoes?.[moduloKey]?.[submoduloKey]?.[perm.key]?.ver === true;
    const editar = permissoes?.[moduloKey]?.[submoduloKey]?.[perm.key]?.editar === true;
    return (
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
        <span className="text-xs text-gray-600 dark:text-gray-400">{perm.label}</span>
        <Checkbox 
          checked={ver} 
          onChange={v => {
            let novo = { ...permissoes };
            if (!novo[moduloKey]) novo[moduloKey] = {};
            if (!novo[moduloKey][submoduloKey]) novo[moduloKey][submoduloKey] = {};
            novo[moduloKey][submoduloKey] = { ...novo[moduloKey][submoduloKey], [perm.key]: { ...(novo[moduloKey][submoduloKey][perm.key] || {}), ver: v } };
            onChange(novo);
          }}
        />
        <Checkbox 
          checked={editar} 
          onChange={v => {
            let novo = { ...permissoes };
            if (!novo[moduloKey]) novo[moduloKey] = {};
            if (!novo[moduloKey][submoduloKey]) novo[moduloKey][submoduloKey] = {};
            novo[moduloKey][submoduloKey] = { ...novo[moduloKey][submoduloKey], [perm.key]: { ...(novo[moduloKey][submoduloKey][perm.key] || {}), editar: v } };
            onChange(novo);
          }}
        />
      </div>
    );
  }

  const valor = permissoes?.[moduloKey]?.[submoduloKey]?.[perm.key] === true;
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
      <label className="flex items-center gap-2 cursor-pointer">
        <Switch
          checked={valor}
          onCheckedChange={v => {
            let novo = { ...permissoes };
            if (!novo[moduloKey]) novo[moduloKey] = {};
            if (!novo[moduloKey][submoduloKey]) novo[moduloKey][submoduloKey] = {};
            novo[moduloKey][submoduloKey] = { ...novo[moduloKey][submoduloKey], [perm.key]: v };
            onChange(novo);
          }}
          className="scale-90 data-[state=checked]:bg-gray-800 dark:data-[state=checked]:bg-gray-200"
        />
        <span className="text-xs text-gray-600 dark:text-gray-400">{perm.label}</span>
      </label>
      <div className="w-4" /><div className="w-4" />
    </div>
  );
}

function SubmoduloCard({ submodulo, moduloKey, permissoes, onChange, nivel = 1 }) {
  const temSubmodulos = submodulo.submodulos && submodulo.submodulos.length > 0;
  
  const { ativas, total } = contarPermissoesSubmodulo(permissoes, moduloKey, submodulo);
  const temVerEditar = submodulo.permissoes.some(p => p.tipo === 'ver_editar');

  const paddingStyle = { paddingLeft: `${nivel * 1.5}rem` };

  return (
    <div style={paddingStyle} className="space-y-0">
      {/* Cabeçalho ver/editar para sub-níveis */}
      {temVerEditar && submodulo.permissoes.some(p => p.tipo === 'ver_editar') && (
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-1 text-[9px] text-gray-400 dark:text-gray-500 font-medium hidden" style={{ paddingLeft: `${(nivel - 0.5) * 1.5}rem` }} />
      )}

      {/* Permissões do submodulo — sempre expandido */}
      {submodulo.permissoes.map(p => (
        <LinhaPermissaoSubmodulo
          key={p.key}
          perm={p}
          moduloKey={moduloKey}
          submoduloKey={submodulo.key}
          permissoes={permissoes}
          onChange={onChange}
        />
      ))}

      {/* Sub-submodulos recursivos — sempre visíveis */}
      {temSubmodulos && submodulo.submodulos.map(sub => (
        <SubmoduloCard
          key={sub.key}
          submodulo={sub}
          moduloKey={moduloKey}
          permissoes={permissoes}
          onChange={onChange}
          nivel={nivel + 1}
        />
      ))}
    </div>
  );
}

function ModuloCard({ modulo, permissoes, onChange }) {
  const [expandido, setExpandido] = useState(false);
  const { ativas, total } = contarPermissoes(permissoes, modulo.key);
  const Icon = MODULO_ICONS[modulo.key] || Shield;
  const temVerEditar = modulo.permissoes.some(p => p.tipo === 'ver_editar');
  const temSubmodulos = modulo.submodulos && modulo.submodulos.length > 0;

  const toggleTodos = (e) => {
    e.stopPropagation();
    const tudo = ativas === total && total > 0;
    let novo = { ...permissoes };
    modulo.permissoes.forEach(p => {
      if (p.tipo === 'ver_editar') {
        novo = setPermissao(novo, modulo.key, p.key, !tudo, 'ver');
        novo = setPermissao(novo, modulo.key, p.key, !tudo, 'editar');
      } else {
        novo = setPermissao(novo, modulo.key, p.key, !tudo);
      }
    });
    onChange(novo);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          </div>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{modulo.label}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
            ativas > 0 ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
          }`}>{ativas}/{total}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTodos}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
          >
            {ativas === total && total > 0 ? 'Limpar' : 'Todos'}
          </button>
          {expandido ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
        </div>
      </button>

      {expandido && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-700 space-y-0">
          {/* Permissões do módulo principal */}
          {modulo.permissoes.map(p => (
            <LinhaPermissao
              key={p.key}
              perm={p}
              modulo={modulo.key}
              permissoes={permissoes}
              onChange={onChange}
            />
          ))}
          
          {/* Submodulos — sempre expandidos */}
          {temSubmodulos && modulo.submodulos.map(sub => (
            <SubmoduloCard
              key={sub.key}
              submodulo={sub}
              moduloKey={modulo.key}
              permissoes={permissoes}
              onChange={onChange}
              nivel={1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sanitiza permissões — garante que campos booleanos simples não sejam objetos ──
function sanitizarPermissoes(permissoes) {
  if (!permissoes) return {};
  const resultado = {};
  
  const sanitizarModulo = (modulo, modPerm) => {
    const res = {};
    modulo.permissoes.forEach(p => {
      const val = modPerm?.[p.key];
      if (p.tipo === 'ver_editar') {
        res[p.key] = typeof val === 'object' && val !== null
          ? { ver: val.ver === true, editar: val.editar === true }
          : { ver: false, editar: false };
      } else {
        if (typeof val === 'object' && val !== null) {
          res[p.key] = Object.values(val).some(v => v === true);
        } else {
          res[p.key] = val === true;
        }
      }
    });
    return res;
  };

  MODULOS.forEach(modulo => {
    const modPerm = permissoes[modulo.key];
    if (!modPerm) return;
    resultado[modulo.key] = sanitizarModulo(modulo, modPerm);
    
    // Submodulos
    if (modulo.submodulos) {
      modulo.submodulos.forEach(sub => {
        const subPerm = modPerm[sub.key];
        if (subPerm) {
          resultado[modulo.key][sub.key] = sanitizarModulo(sub, subPerm);
          
          // Sub-submodulos
          if (sub.submodulos) {
            sub.submodulos.forEach(subsub => {
              const subsubPerm = subPerm[subsub.key];
              if (subsubPerm) {
                resultado[modulo.key][sub.key][subsub.key] = sanitizarModulo(subsub, subsubPerm);
              }
            });
          }
        }
      });
    }
  });
  return resultado;
}

// ─── Tela completa de edição de perfil ──────────────────────────
export default function PerfilFormTela({ perfil, onSalvar, onCancelar }) {
  const VAZIO = { nome: '', descricao: '', menu_compacto: false, ativo: true, permissoes: {} };
  const base = perfil ? { ...VAZIO, ...perfil } : VAZIO;
  const [form, setForm] = useState({ ...base, permissoes: sanitizarPermissoes(base.permissoes) });

  const handleSalvar = () => {
    if (!form.nome.trim()) return;
    onSalvar(form);
  };

  const totalAtivas = MODULOS.reduce((acc, m) => acc + contarPermissoes(form.permissoes, m.key).ativas, 0);
  const totalGeral = MODULOS.reduce((acc, m) => acc + contarPermissoes(form.permissoes, m.key).total, 0);

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col">
      {/* Topbar */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancelar}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {perfil ? `Editar: ${perfil.nome}` : 'Novo Perfil de Acesso'}
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {totalAtivas}/{totalGeral} permissões ativas
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancelar} className="h-8 text-xs text-gray-500">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSalvar}
            disabled={!form.nome.trim()}
            className="h-8 text-xs bg-gray-800 hover:bg-gray-900 text-white dark:bg-gray-200 dark:text-gray-900"
          >
            {perfil ? 'Salvar Alterações' : 'Criar Perfil'}
          </Button>
        </div>
      </div>

      {/* Corpo — 2 colunas em desktop */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
        {/* Coluna esquerda: dados básicos */}
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Nome do Perfil *</Label>
            <Input
              placeholder="Ex: Operador de Caixa..."
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm dark:text-white text-sm h-9"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Descrição</Label>
            <Input
              placeholder="Responsabilidades..."
              value={form.descricao}
              onChange={e => setForm({ ...form, descricao: e.target.value })}
              className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm dark:text-white text-sm h-9"
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm">
            <div>
              <p className="text-sm text-gray-800 dark:text-gray-200">Menu Compacto</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Interface simplificada</p>
            </div>
            <Switch
              checked={form.menu_compacto}
              onCheckedChange={v => setForm({ ...form, menu_compacto: v })}
              className="data-[state=checked]:bg-gray-800 dark:data-[state=checked]:bg-gray-200"
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm">
            <div>
              <p className="text-sm text-gray-800 dark:text-gray-200">Perfil Ativo</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Disponível para atribuição</p>
            </div>
            <Switch
              checked={form.ativo}
              onCheckedChange={v => setForm({ ...form, ativo: v })}
              className="data-[state=checked]:bg-gray-800 dark:data-[state=checked]:bg-gray-200"
            />
          </div>

          {/* Legenda */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-1.5 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Legenda de permissões</p>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-4 h-4 rounded bg-gray-800 dark:bg-gray-200 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white dark:text-gray-900" fill="none" viewBox="0 0 12 12">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>Ativo</span>
              <div className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 ml-2" />
              <span>Inativo</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
              <Eye className="w-3.5 h-3.5" />
              <span>= Pode visualizar</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Pencil className="w-3.5 h-3.5" />
              <span>= Pode editar / operar</span>
            </div>
          </div>
        </div>

        {/* Coluna direita: permissões */}
        <div className="space-y-1.5">
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium tracking-wide px-1 mb-2">PERMISSÕES POR MÓDULO</p>
          {MODULOS.map(modulo => (
            <ModuloCard
              key={modulo.key}
              modulo={modulo}
              permissoes={form.permissoes}
              onChange={novas => setForm({ ...form, permissoes: novas })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}