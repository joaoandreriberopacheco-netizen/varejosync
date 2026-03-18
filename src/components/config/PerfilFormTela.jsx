import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Shield, Eye, Pencil, ChevronDown, ChevronRight, Home } from 'lucide-react';

import {
  Monitor, LayoutDashboard, TrendingUp, Package,
  DollarSign, BookOpen, Settings
} from 'lucide-react';

const MODULO_ICONS = {
  homepage: Home,
  pdv: Monitor,
  dashboard: LayoutDashboard,
  vendas: TrendingUp,
  estoque: Package,
  financeiro: DollarSign,
  relatorios: BookOpen,
  configuracoes: Settings,
};

export const MODULOS = [
  {
    key: 'homepage', label: 'Página Inicial',
    submodulos: [
      { key: 'resumo_vendas_home', label: 'Resumo de Vendas' },
      { key: 'kpis_home', label: 'KPIs Rápidos' },
      { key: 'avisos_home', label: 'Avisos e Alertas' },
      { key: 'atalhos_personalizados', label: 'Atalhos Personalizados' },
      { key: 'acoes_rapidas', label: 'Ações Rápidas (PDV, Caixa...)' },
    ]
  },
  {
    key: 'pdv', label: 'PDV',
    submodulos: [
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
    submodulos: [
      { key: 'acesso', label: 'Acesso ao Dashboard' },
      { key: 'ver_kpis_vendas', label: 'KPIs de Vendas' },
      { key: 'ver_kpis_financeiro', label: 'KPIs Financeiros' },
      { key: 'ver_kpis_estoque', label: 'KPIs de Estoque' },
    ]
  },
  {
    key: 'vendas', label: 'Vendas',
    submodulos: [
      { key: 'acesso', label: 'Módulo de Vendas' },
      { key: 'listar_pedidos', label: 'Listar Pedidos' },
      { key: 'cancelar_pedido', label: 'Cancelar Pedido' },
      { key: 'controle_entregas', label: 'Controle de Entregas' },
      { key: 'painel_gerencial', label: 'Painel Gerencial' },
      { key: 'vendas_perdidas', label: 'Vendas Perdidas' },
    ]
  },
  {
    key: 'estoque', label: 'Estoque',
    submodulos: [
      { key: 'visualizar_produtos', label: 'Produtos' },
      { key: 'ver_custo_compra', label: 'Ver Custo de Compra' },
      { key: 'realizar_ajuste_estoque', label: 'Ajuste de Estoque' },
      { key: 'separacao_pedidos', label: 'Separação de Pedidos' },
      { key: 'conferencia_estoque', label: 'Conferência' },
      { key: 'auditoria_estoque', label: 'Auditoria' },
      {
        key: 'compras',
        label: 'Módulo de Compras',
        submodulos: [
          { key: 'sugestoes', label: 'Sugestões de Compra' },
          { key: 'cotacoes', label: 'Cotações' },
          { key: 'pedidos', label: 'Pedidos de Compra' },
          {
            key: 'hub_logistico',
            label: 'Hub Logístico',
            submodulos: [
              { key: 'manifestos', label: 'Manifestos' },
              { key: 'supermanifestos', label: 'Supermanifestos' },
              { key: 'conferencia', label: 'Conferência' },
            ]
          }
        ]
      },
      { key: 'logistica', label: 'Módulo de Logística' },
      { key: 'armazenagem', label: 'Armazenagem' },
      { key: 'tabela_precos', label: 'Tabela de Preços (Consulta)' },
      { key: 'gerar_orcamento', label: 'Gerar Orçamento na Tabela de Preços' },
    ]
  },
  {
    key: 'financeiro', label: 'Financeiro',
    submodulos: [
      { key: 'acesso', label: 'Módulo Financeiro' },
      { key: 'contas', label: 'Contas e Saldos' },
      { key: 'criar_lancamento', label: 'Criar Lançamento' },
      { key: 'aprovar_pagamentos', label: 'Aprovar Pagamentos' },
      { key: 'conciliar_movimentos', label: 'Conciliação Bancária' },
      { key: 'ver_extrato', label: 'Ver Extrato' },
      { key: 'caixas_ativos', label: 'Caixas Ativos' },
    ]
  },
  {
    key: 'relatorios', label: 'Relatórios',
    submodulos: [
      { key: 'acesso', label: 'Acesso a Relatórios' },
      { key: 'relatorio_vendas', label: 'Relatório de Vendas' },
      { key: 'relatorio_estoque', label: 'Relatório de Estoque' },
      { key: 'relatorio_financeiro', label: 'Relatório Financeiro' },
      { key: 'relatorio_margem', label: 'Relatório de Margem' },
    ]
  },
  {
    key: 'configuracoes', label: 'Configurações',
    submodulos: [
      { key: 'acesso', label: 'Acesso às Configurações' },
      { key: 'gerenciar_usuarios', label: 'Gerenciar Usuários' },
      { key: 'gerenciar_perfis', label: 'Gerenciar Perfis de Acesso' },
      { key: 'gerenciar_formas_pagamento', label: 'Formas de Pagamento' },
      { key: 'dados_empresa', label: 'Dados da Empresa' },
      { key: 'parametros_gerais', label: 'Parâmetros Gerais' },
    ]
  },
];

// ─── Contar permissões recursivamente ────────────────────────────
export function contarPermissoes(permissoes, moduloKey) {
  let ativas = 0, total = 0;
  const modulo = MODULOS.find(m => m.key === moduloKey);
  if (!modulo) return { ativas: 0, total: 0 };

  function contarRecursivo(submodulos, contexto) {
    submodulos.forEach(sub => {
      total += 1;
      const val = contexto?.[sub.key];
      if (val === true) ativas++;
      if (sub.submodulos) {
        contarRecursivo(sub.submodulos, typeof val === 'object' ? val : {});
      }
    });
  }

  contarRecursivo(modulo.submodulos || [], permissoes?.[moduloKey] || {});
  return { ativas, total };
}

// ─── Utilitário: atualiza valor em caminho aninhado ──────────────
function setDeepValue(obj, path, value) {
  const [head, ...rest] = path;
  if (rest.length === 0) {
    return { ...obj, [head]: value };
  }
  return {
    ...obj,
    [head]: setDeepValue(typeof obj[head] === 'object' && obj[head] !== null ? obj[head] : {}, rest, value),
  };
}

// ─── Renderização hierárquica corrigida ──────────────────────────
function RenderizarHierarquia({ item, moduloKey, caminho = [], permissoes, onChange, nivel = 0 }) {
  const temSubitens = item.submodulos && item.submodulos.length > 0;
  const caminhoCompleto = [...caminho, item.key]; // caminho dentro do módulo

  // Ler valor atual: permissoes[moduloKey][key1][key2]...
  let valor = permissoes?.[moduloKey];
  for (const k of caminhoCompleto) {
    valor = valor?.[k];
  }
  const checked = valor === true;

  const paddingLeft = `${nivel * 1}rem`;

  return (
    <div className="space-y-0">
      <div
        style={{ paddingLeft }}
        className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors rounded-lg group"
      >
        <Switch
          checked={checked}
          onCheckedChange={v => {
            const novoModulo = setDeepValue(
              permissoes?.[moduloKey] || {},
              caminhoCompleto,
              v
            );
            onChange({ ...permissoes, [moduloKey]: novoModulo });
          }}
          className="scale-100 data-[state=checked]:bg-gray-800 dark:data-[state=checked]:bg-gray-200 flex-shrink-0"
        />
        <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 font-medium">
          {item.label}
        </span>
      </div>

      {temSubitens && item.submodulos.map(sub => (
        <RenderizarHierarquia
          key={sub.key}
          item={sub}
          moduloKey={moduloKey}
          caminho={caminhoCompleto}
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
        {expandido ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
      </button>

      {expandido && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-700 space-y-0">
          {modulo.submodulos && modulo.submodulos.map(item => (
            <RenderizarHierarquia
              key={item.key}
              item={item}
              moduloKey={modulo.key}
              caminho={[]}
              permissoes={permissoes}
              onChange={onChange}
              nivel={0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tela completa de edição de perfil ──────────────────────────
export default function PerfilFormTela({ perfil, onSalvar, onCancelar }) {
  const VAZIO = { nome: '', descricao: '', menu_compacto: false, ativo: true, permissoes: {} };
  const base = perfil ? { ...VAZIO, ...perfil } : VAZIO;
  const [form, setForm] = useState({ ...base, permissoes: base.permissoes || {} });

  const handleSalvar = () => {
    if (!form.nome.trim()) return;
    onSalvar({ ...form });
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