import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus, Pencil, Trash2, Shield, ChevronDown, ChevronRight,
  Users, Monitor, LayoutDashboard, TrendingUp, Package,
  DollarSign, BookOpen, Settings
} from 'lucide-react';

const MODULO_ICONS = {
  pdv: Monitor,
  dashboard: LayoutDashboard,
  vendas: TrendingUp,
  estoque: Package,
  financeiro: DollarSign,
  relatorios: BookOpen,
  configuracoes: Settings,
};

const MODULOS = [
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
      { key: 'acesso', label: 'Acesso ao Módulo' },
      { key: 'listar_pedidos', label: 'Listar Pedidos' },
      { key: 'editar_pedido', label: 'Editar Pedido' },
      { key: 'cancelar_pedido', label: 'Cancelar Pedido' },
      { key: 'controle_entregas', label: 'Controle de Entregas' },
      { key: 'painel_gerencial', label: 'Painel Gerencial' },
      { key: 'vendas_perdidas', label: 'Vendas Perdidas' },
    ]
  },
  {
    key: 'estoque', label: 'Estoque',
    permissoes: [
      { key: 'acesso', label: 'Acesso ao Módulo' },
      { key: 'visualizar_produtos', label: 'Visualizar Produtos' },
      { key: 'criar_produto', label: 'Criar Produto' },
      { key: 'editar_produto', label: 'Editar Produto' },
      { key: 'deletar_produto', label: 'Deletar Produto' },
      { key: 'ver_custo_compra', label: 'Ver Custo de Compra' },
      { key: 'realizar_ajuste_estoque', label: 'Ajuste de Estoque' },
      { key: 'separacao_pedidos', label: 'Separação de Pedidos' },
      { key: 'compras', label: 'Módulo de Compras' },
      { key: 'logistica', label: 'Módulo de Logística' },
      { key: 'armazenagem', label: 'Armazenagem' },
    ]
  },
  {
    key: 'financeiro', label: 'Financeiro',
    permissoes: [
      { key: 'acesso', label: 'Acesso ao Módulo' },
      { key: 'visualizar_contas', label: 'Visualizar Contas' },
      { key: 'ver_saldos', label: 'Ver Saldos' },
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

const PERFIL_VAZIO = { nome: '', descricao: '', menu_compacto: false, ativo: true, permissoes: {} };

function getPermissao(permissoes, modulo, chave) {
  return permissoes?.[modulo]?.[chave] === true;
}

function setPermissao(permissoes, modulo, chave, valor) {
  const novo = { ...permissoes };
  if (!novo[modulo]) novo[modulo] = {};
  novo[modulo] = { ...novo[modulo], [chave]: valor };
  return novo;
}

function contarPermissoes(permissoes, modulo) {
  const mod = MODULOS.find(m => m.key === modulo);
  if (!mod) return { ativas: 0, total: 0 };
  const total = mod.permissoes.length;
  const ativas = mod.permissoes.filter(p => permissoes?.[modulo]?.[p.key] === true).length;
  return { ativas, total };
}

function ModuloPermissoes({ modulo, permissoes, onChange }) {
  const [expandido, setExpandido] = useState(false);
  const { ativas, total } = contarPermissoes(permissoes, modulo.key);
  const todosMarcados = ativas === total && total > 0;
  const Icon = MODULO_ICONS[modulo.key] || Shield;

  const toggleTodos = (e) => {
    e.stopPropagation();
    let novo = { ...permissoes };
    modulo.permissoes.forEach(p => {
      novo = setPermissao(novo, modulo.key, p.key, !todosMarcados);
    });
    onChange(novo);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          </div>
          <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">{modulo.label}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-md font-mono ${
            ativas > 0
              ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
              : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
          }`}>
            {ativas}/{total}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTodos}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            {todosMarcados ? 'Desmarcar' : 'Todos'}
          </button>
          {expandido
            ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
        </div>
      </button>

      {expandido && (
        <div className="px-4 pb-4 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-t border-gray-100 dark:border-gray-700">
          {modulo.permissoes.map(p => (
            <label key={p.key} className="flex items-center gap-2.5 cursor-pointer group">
              <Switch
                checked={getPermissao(permissoes, modulo.key, p.key)}
                onCheckedChange={(v) => onChange(setPermissao(permissoes, modulo.key, p.key, v))}
                className="scale-90 data-[state=checked]:bg-gray-800 dark:data-[state=checked]:bg-gray-200"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                {p.label}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PerfisDeAcessoManager() {
  const [perfis, setPerfis] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [perfilEditando, setPerfilEditando] = useState(null);
  const [form, setForm] = useState(PERFIL_VAZIO);
  const { toast } = useToast();

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [perfisData, usuariosData] = await Promise.all([
        base44.entities.PerfilDeAcesso.list(),
        base44.entities.User.list()
      ]);
      setPerfis(perfisData);
      setUsuarios(usuariosData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const abrirCriar = () => { setPerfilEditando(null); setForm(PERFIL_VAZIO); setDialogAberto(true); };
  const abrirEditar = (p) => { setPerfilEditando(p); setForm({ ...PERFIL_VAZIO, ...p }); setDialogAberto(true); };

  const salvar = async () => {
    if (!form.nome.trim()) { toast({ title: 'Informe um nome para o perfil', variant: 'destructive' }); return; }
    try {
      if (perfilEditando) {
        await base44.entities.PerfilDeAcesso.update(perfilEditando.id, form);
      } else {
        await base44.entities.PerfilDeAcesso.create(form);
      }
      toast({ title: perfilEditando ? 'Perfil atualizado' : 'Perfil criado', className: 'bg-green-50 text-green-800' });
      setDialogAberto(false);
      carregarDados();
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    }
  };

  const deletar = async (id) => {
    if (!window.confirm('Excluir este perfil?')) return;
    try {
      await base44.entities.PerfilDeAcesso.delete(id);
      toast({ title: 'Perfil excluído', className: 'bg-green-50 text-green-800' });
      carregarDados();
    } catch (e) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    }
  };

  const usuariosComPerfil = (perfilId) => usuarios.filter(u => u.perfil_acesso_id === perfilId).length;

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Perfis de Acesso</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Defina o que cada função pode ver e fazer</p>
        </div>
        <Button
          onClick={abrirCriar}
          size="sm"
          className="bg-gray-800 hover:bg-gray-900 text-white dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-white gap-1.5 h-8 px-3"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="text-xs">Novo Perfil</span>
        </Button>
      </div>

      {/* Lista de perfis */}
      {perfis.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm text-center py-14">
          <Shield className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum perfil criado ainda</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Crie perfis para controlar o acesso de cada usuário</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {perfis.map(perfil => {
            const totalAtivas = MODULOS.reduce((acc, m) => acc + contarPermissoes(perfil.permissoes, m.key).ativas, 0);
            const totalGeral = MODULOS.reduce((acc, m) => acc + m.permissoes.length, 0);
            const qtdUsuarios = usuariosComPerfil(perfil.id);
            const pct = totalGeral > 0 ? (totalAtivas / totalGeral) * 100 : 0;

            return (
              <div key={perfil.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex flex-col gap-3">
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm leading-tight">{perfil.nome}</p>
                      {perfil.descricao && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1 mt-0.5">{perfil.descricao}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => abrirEditar(perfil)}
                      className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deletar(perfil.id)}
                      className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                    {totalAtivas}/{totalGeral}
                  </span>
                  {qtdUsuarios > 0 && (
                    <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {qtdUsuarios}
                    </span>
                  )}
                  {perfil.menu_compacto && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                      Compacto
                    </span>
                  )}
                  {!perfil.ativo && (
                    <span className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-md">
                      Inativo
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1">
                  <div
                    className="h-1 rounded-full bg-gray-600 dark:bg-gray-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog criar/editar */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-500" />
              {perfilEditando ? 'Editar Perfil' : 'Novo Perfil de Acesso'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Nome do Perfil *</Label>
                <Input
                  placeholder="Ex: Operador de Caixa, Vendedor Júnior..."
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm dark:text-white text-sm h-9"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Descrição</Label>
                <Input
                  placeholder="Responsabilidades e contexto de uso..."
                  value={form.descricao}
                  onChange={e => setForm({ ...form, descricao: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm dark:text-white text-sm h-9"
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm">
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
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm">
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
            </div>

            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 font-medium tracking-wide">PERMISSÕES POR MÓDULO</p>
              <div className="space-y-1.5">
                {MODULOS.map(modulo => (
                  <ModuloPermissoes
                    key={modulo.key}
                    modulo={modulo}
                    permissoes={form.permissoes}
                    onChange={novasPermissoes => setForm({ ...form, permissoes: novasPermissoes })}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setDialogAberto(false)}
              className="text-gray-500 dark:text-gray-400 h-9 text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={salvar}
              className="bg-gray-800 hover:bg-gray-900 text-white dark:bg-gray-200 dark:text-gray-900 h-9 text-sm"
            >
              {perfilEditando ? 'Salvar Alterações' : 'Criar Perfil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}