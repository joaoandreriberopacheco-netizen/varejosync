import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Pencil, Trash2, Shield, ChevronDown, ChevronRight, Users, Monitor, LayoutDashboard, TrendingUp, Package, DollarSign, BookOpen, Settings } from 'lucide-react';

// Definição dos módulos e permissões para a UI
const MODULOS = [
  {
    key: 'pdv', label: 'PDV', icon: '🖥️',
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
    key: 'dashboard', label: 'Dashboard', icon: '📊',
    permissoes: [
      { key: 'acesso', label: 'Acesso ao Dashboard' },
      { key: 'ver_kpis_vendas', label: 'KPIs de Vendas' },
      { key: 'ver_kpis_financeiro', label: 'KPIs Financeiros' },
      { key: 'ver_kpis_estoque', label: 'KPIs de Estoque' },
    ]
  },
  {
    key: 'vendas', label: 'Vendas', icon: '📦',
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
    key: 'estoque', label: 'Estoque', icon: '🏭',
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
    key: 'financeiro', label: 'Financeiro', icon: '💰',
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
    key: 'relatorios', label: 'Relatórios', icon: '📋',
    permissoes: [
      { key: 'acesso', label: 'Acesso a Relatórios' },
      { key: 'relatorio_vendas', label: 'Relatório de Vendas' },
      { key: 'relatorio_estoque', label: 'Relatório de Estoque' },
      { key: 'relatorio_financeiro', label: 'Relatório Financeiro' },
      { key: 'relatorio_margem', label: 'Relatório de Margem' },
    ]
  },
  {
    key: 'configuracoes', label: 'Configurações', icon: '⚙️',
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

const PERFIL_VAZIO = {
  nome: '', descricao: '', cor: '#6B7280', menu_compacto: false, ativo: true,
  permissoes: {}
};

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
  if (!permissoes?.[modulo]) return { ativas: 0, total: 0 };
  const mod = MODULOS.find(m => m.key === modulo);
  if (!mod) return { ativas: 0, total: 0 };
  const total = mod.permissoes.length;
  const ativas = mod.permissoes.filter(p => permissoes[modulo]?.[p.key] === true).length;
  return { ativas, total };
}

function ModuloPermissoes({ modulo, permissoes, onChange }) {
  const [expandido, setExpandido] = useState(false);
  const { ativas, total } = contarPermissoes(permissoes, modulo.key);
  const todosMarcados = ativas === total;

  const toggleTodos = () => {
    let novo = { ...permissoes };
    modulo.permissoes.forEach(p => {
      novo = setPermissao(novo, modulo.key, p.key, !todosMarcados);
    });
    onChange(novo);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{modulo.icon}</span>
          <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">{modulo.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            ativas > 0 ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            {ativas}/{total}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleTodos(); }}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
          >
            {todosMarcados ? 'Desmarcar todos' : 'Marcar todos'}
          </button>
          {expandido ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expandido && (
        <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-gray-100 dark:border-gray-700 pt-3">
          {modulo.permissoes.map(p => (
            <label key={p.key} className="flex items-center gap-2 cursor-pointer group">
              <Switch
                checked={getPermissao(permissoes, modulo.key, p.key)}
                onCheckedChange={(v) => onChange(setPermissao(permissoes, modulo.key, p.key, v))}
                className="scale-90"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
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

  useEffect(() => {
    carregarDados();
  }, []);

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

  const abrirCriar = () => {
    setPerfilEditando(null);
    setForm(PERFIL_VAZIO);
    setDialogAberto(true);
  };

  const abrirEditar = (perfil) => {
    setPerfilEditando(perfil);
    setForm({ ...PERFIL_VAZIO, ...perfil });
    setDialogAberto(true);
  };

  const salvar = async () => {
    if (!form.nome.trim()) {
      toast({ title: 'Informe um nome para o perfil', variant: 'destructive' });
      return;
    }
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
      <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Perfis de Acesso
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Defina o que cada função pode ver e fazer</p>
        </div>
        <Button onClick={abrirCriar} className="bg-gray-800 hover:bg-gray-900 text-white gap-2 dark:bg-gray-200 dark:text-gray-800 dark:hover:bg-white">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Perfil</span>
        </Button>
      </div>

      {/* Lista de perfis */}
      {perfis.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm text-center py-12">
          <Shield className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Nenhum perfil criado ainda</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Crie perfis personalizados para controlar o acesso dos usuários</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {perfis.map(perfil => {
            const totalAtivas = MODULOS.reduce((acc, m) => {
              return acc + contarPermissoes(perfil.permissoes, m.key).ativas;
            }, 0);
            const totalGeral = MODULOS.reduce((acc, m) => acc + m.permissoes.length, 0);
            const qtdUsuarios = usuariosComPerfil(perfil.id);

            return (
              <div key={perfil.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: (perfil.cor || '#6B7280') + '20' }}>
                      <Shield className="w-5 h-5" style={{ color: perfil.cor || '#6B7280' }} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{perfil.nome}</p>
                      {perfil.descricao && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{perfil.descricao}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => abrirEditar(perfil)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deletar(perfil.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                    {totalAtivas}/{totalGeral} permissões
                  </span>
                  {qtdUsuarios > 0 && (
                    <span className="text-xs bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {qtdUsuarios} usuário{qtdUsuarios !== 1 ? 's' : ''}
                    </span>
                  )}
                  {perfil.menu_compacto && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                      Menu Compacto
                    </span>
                  )}
                  {!perfil.ativo && (
                    <span className="text-xs bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 px-2 py-0.5 rounded-full">
                      Inativo
                    </span>
                  )}
                </div>

                {/* Barra de progresso de permissões */}
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-gray-700 dark:bg-gray-300 transition-all"
                    style={{ width: `${totalGeral > 0 ? (totalAtivas / totalGeral) * 100 : 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog de criação/edição */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {perfilEditando ? 'Editar Perfil' : 'Novo Perfil de Acesso'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Dados básicos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-gray-700 dark:text-gray-300 text-xs mb-1 block">Nome do Perfil *</Label>
                <Input
                  placeholder="Ex: Operador de Caixa, Vendedor Júnior..."
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-gray-700 dark:text-gray-300 text-xs mb-1 block">Descrição</Label>
                <Input
                  placeholder="Responsabilidades e contexto de uso..."
                  value={form.descricao}
                  onChange={e => setForm({ ...form, descricao: e.target.value })}
                  className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <Switch
                  checked={form.menu_compacto}
                  onCheckedChange={v => setForm({ ...form, menu_compacto: v })}
                />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Menu Compacto</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Interface simplificada para funções operacionais</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <Switch
                  checked={form.ativo}
                  onCheckedChange={v => setForm({ ...form, ativo: v })}
                />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Perfil Ativo</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Disponível para atribuição a usuários</p>
                </div>
              </div>
            </div>

            {/* Permissões por módulo */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">PERMISSÕES POR MÓDULO</p>
              <div className="space-y-2">
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

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogAberto(false)} className="dark:bg-gray-800 dark:border-gray-700 dark:text-white">
              Cancelar
            </Button>
            <Button onClick={salvar} className="bg-gray-800 hover:bg-gray-900 text-white dark:bg-gray-200 dark:text-gray-800">
              {perfilEditando ? 'Salvar Alterações' : 'Criar Perfil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}