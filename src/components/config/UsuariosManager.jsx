import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Users, Edit, Shield, ShoppingCart, AlertCircle, Info, UserPlus, Plus, Trash2, Check, Mail } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { getTenantId } from '@/components/utils/tenant';

// Preset definitions for Roles
const ROLES = {
  'Admin': { 
    perfil: 'Admin', 
    limite_desconto: 100, 
    acesso_caixa: true, 
    acesso_produtos: true,
    acesso_estoque: true,
    acesso_financeiro: true,
    acesso_config: true,
    color: 'bg-red-100 text-red-800'
  },
  'Gerente': { 
    perfil: 'Gerente', 
    limite_desconto: 20, 
    acesso_caixa: true, 
    acesso_produtos: true,
    acesso_estoque: true,
    acesso_financeiro: true,
    acesso_config: false,
    color: 'bg-purple-100 text-purple-800'
  },
  'Vendedor': { 
    perfil: 'Vendedor', 
    limite_desconto: 10, 
    acesso_caixa: false, 
    acesso_produtos: false,
    acesso_estoque: false,
    acesso_financeiro: false,
    acesso_config: false,
    color: 'bg-blue-100 text-blue-800'
  },
  'Caixa': { 
    perfil: 'Caixa', 
    limite_desconto: 0, 
    acesso_caixa: true, 
    acesso_produtos: false,
    acesso_estoque: false,
    acesso_financeiro: false,
    acesso_config: false,
    color: 'bg-green-100 text-green-800'
  },
  'Estoquista': { 
    perfil: 'Estoquista', 
    limite_desconto: 0, 
    acesso_caixa: false, 
    acesso_produtos: true,
    acesso_estoque: true,
    acesso_financeiro: false,
    acesso_config: false,
    color: 'bg-orange-100 text-orange-800'
  },
  'Financeiro': { 
    perfil: 'Financeiro', 
    limite_desconto: 0, 
    acesso_caixa: true, 
    acesso_produtos: false,
    acesso_estoque: false,
    acesso_financeiro: true,
    acesso_config: false,
    color: 'bg-yellow-100 text-yellow-800'
  }
};

export default function UsuariosManager() {
  const [colaboradores, setColaboradores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentColab, setCurrentColab] = useState(null); // For editing/creating
  const [globalConfig, setGlobalConfig] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cargo: 'Vendedor',
    perfil: 'Vendedor',
    limite_desconto: 10,
    acesso_caixa: false,
    acesso_produtos: false,
    acesso_estoque: false,
    acesso_financeiro: false,
    acesso_config: false,
    ativo: true
  });

  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const tenantId = getTenantId();
      if (!tenantId) return;

      const [data, configs] = await Promise.all([
        base44.entities.Colaborador.filter({ empresa_id: tenantId }),
        base44.entities.ConfiguracoesVenda.filter({ empresa_id: tenantId })
      ]);
      setColaboradores(data);
      if (configs && configs.length > 0) {
        setGlobalConfig(configs[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (colab = null) => {
    if (colab) {
      setCurrentColab(colab);
      setFormData(colab);
    } else {
      setCurrentColab(null);
      // Default new user is Vendedor
      const defaultRole = ROLES['Vendedor'];
      setFormData({
        nome: '',
        email: '',
        cargo: 'Vendedor',
        ...defaultRole,
        ativo: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleRoleChange = (roleName) => {
    const roleSettings = ROLES[roleName];
    setFormData(prev => ({
      ...prev,
      cargo: roleName,
      ...roleSettings
    }));
  };

  const handleSave = async () => {
    if (!formData.nome) {
      toast({ title: "Nome obrigatório", description: "Por favor, informe o nome do usuário.", variant: "destructive", duration: 3000 });
      return;
    }

    try {
      const tenantId = getTenantId();
      const dataToSave = { ...formData, empresa_id: tenantId };

      if (currentColab) {
        await base44.entities.Colaborador.update(currentColab.id, dataToSave);
        toast({ title: "Usuário atualizado", className: "bg-green-100 text-green-800", duration: 3000 });
      } else {
        await base44.entities.Colaborador.create(dataToSave);
        toast({ title: "Usuário criado", description: "O usuário foi criado com sucesso no sistema.", className: "bg-green-100 text-green-800", duration: 3000 });
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive", duration: 5000 });
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Tem certeza que deseja remover este usuário?")) {
      try {
        await base44.entities.Colaborador.delete(id);
        toast({ title: "Usuário removido", duration: 3000 });
        loadData();
      } catch (error) {
        toast({ title: "Erro ao remover", description: error.message, variant: "destructive", duration: 5000 });
      }
    }
  };

  const handleInvite = async (colab) => {
    if (!colab.email) {
      toast({ title: "Erro", description: "Este usuário não possui e-mail cadastrado.", variant: "destructive" });
      return;
    }

    try {
      const appUrl = window.location.origin;
      await base44.integrations.Core.SendEmail({
        to: colab.email,
        subject: `Convite para acessar o VarejoSync - ${colab.empresa_id}`,
        body: `
          Olá ${colab.nome},
          
          Você foi convidado para colaborar no sistema VarejoSync.
          
          Para acessar, clique no link abaixo e faça seu CADASTRO (Sign Up) usando este mesmo e-mail (${colab.email}).
          Você definirá sua senha neste momento.
          
          Acesse aqui: ${appUrl}
          
          Atenciosamente,
          Equipe VarejoSync
        `
      });
      toast({ title: "Convite enviado!", description: `E-mail enviado para ${colab.email}`, className: "bg-blue-100 text-blue-800" });
    } catch (error) {
      console.error("Erro ao enviar convite:", error);
      toast({ title: "Erro ao enviar", description: "Não foi possível enviar o e-mail.", variant: "destructive" });
    }
  };

  return (
  <div className="space-y-6 md:space-y-8 font-glacial">
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 className="text-lg md:text-2xl font-medium text-slate-800 dark:text-slate-100 tracking-tight">Gestão de Usuários</h2>
        <p className="text-xs md:text-sm text-slate-500 font-light">Crie e configure os usuários do sistema conforme o perfil da empresa</p>
      </div>
        <Button 
          className="bg-sky-600 hover:bg-sky-700 text-white gap-2 shadow-sm border-0 font-medium"
          onClick={() => handleOpenDialog()}
        >
          <Plus className="w-4 h-4" />
          Novo Usuário
        </Button>
      </div>

      {/* Cards Informativos - Design Glacial - Agora como "Tipos de Empresa" */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow group cursor-pointer" onClick={() => toast({ title: "Dica", description: "Para Microempresa, crie 1 Admin (Dono) e 1 Vendedor.", duration: 3000 })}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-sky-50 rounded-xl group-hover:bg-sky-100 transition-colors">
                <ShoppingCart className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-slate-800">Microempresa</h3>
                <p className="text-xs text-slate-500 mt-1 font-light leading-relaxed">
                  Ideal para: Dono + Vendedor. <br/>
                  <span className="text-sky-600 font-medium">Sugestão: 1 Admin, 1 Vendedor.</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow group cursor-pointer" onClick={() => toast({ title: "Dica", description: "Para Média Empresa, adicione Gerente e Vendedores Plenos.", duration: 3000 })}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-slate-800">Média Empresa</h3>
                <p className="text-xs text-slate-500 mt-1 font-light leading-relaxed">
                  Ideal para: Equipe completa.<br/>
                  <span className="text-emerald-600 font-medium">Sugestão: Gerente + Vendedores.</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow group cursor-pointer" onClick={() => toast({ title: "Dica", description: "Para Supermercado, separe bem as funções de Caixa e Estoque.", duration: 3000 })}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-violet-50 rounded-xl group-hover:bg-violet-100 transition-colors">
                <Users className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-slate-800">Supermercado</h3>
                <p className="text-xs text-slate-500 mt-1 font-light leading-relaxed">
                  Controle total de permissões.<br/>
                  <span className="text-violet-600 font-medium">Sugestão: Caixas, Estoquistas e Gerente.</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Usuários - Design Glacial */}
      <Card className="border-0 shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-50 bg-slate-50/30 pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium text-slate-700">Lista de Colaboradores</CardTitle>
          <div className="text-xs text-slate-400 font-light">
            {colaboradores.length} usuários cadastrados
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-transparent">
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="font-medium text-xs text-slate-400 uppercase tracking-wider">Nome / Email</TableHead>
                <TableHead className="font-medium text-xs text-slate-400 uppercase tracking-wider">Cargo</TableHead>
                <TableHead className="font-medium text-xs text-slate-400 uppercase tracking-wider">Acessos Principais</TableHead>
                <TableHead className="font-medium text-xs text-slate-400 uppercase tracking-wider">Desc. Max</TableHead>
                <TableHead className="text-right font-medium text-xs text-slate-400 uppercase tracking-wider">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {colaboradores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-400 font-light">
                    Nenhum usuário cadastrado. Clique em "Novo Usuário" para começar.
                  </TableCell>
                </TableRow>
              ) : (
                colaboradores.map(colab => (
                  <TableRow key={colab.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="font-medium text-slate-700">{colab.nome}</div>
                      <div className="text-xs text-slate-400 font-light">{colab.email || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`font-normal border-0 ${ROLES[colab.cargo]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {colab.cargo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {colab.acesso_caixa && <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-100">Caixa</Badge>}
                        {colab.acesso_produtos && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-100">Produtos</Badge>}
                        {colab.acesso_estoque && <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-100">Estoque</Badge>}
                        {colab.acesso_financeiro && <Badge variant="outline" className="text-[10px] bg-yellow-50 text-yellow-700 border-yellow-100">Finan.</Badge>}
                        {colab.acesso_config && <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-100">Config</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                        {colab.limite_desconto}%
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full" onClick={() => handleInvite(colab)} title="Enviar Convite">
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-full" onClick={() => handleOpenDialog(colab)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full" onClick={() => handleDelete(colab.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Dialog de Criação/Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-light text-slate-800">
              {currentColab ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
            <DialogDescription>
              Defina os dados e permissões do colaborador.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Dados Básicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input 
                  id="nome" 
                  value={formData.nome} 
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  placeholder="Ex: João Silva"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (Opcional)</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="joao@empresa.com"
                  />
                  </div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg flex gap-3 items-start border border-blue-100">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-800">
                    <strong>Sobre o Acesso:</strong> O usuário deverá acessar o sistema e clicar em <strong>"Cadastrar" (Sign Up)</strong> usando este e-mail. A senha será definida por ele nesse momento.
                  </div>
                  </div>

                  <div className="bg-amber-50 p-3 rounded-lg flex gap-3 items-start border border-amber-100 mt-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800">
                    <strong>Atenção (Multi-tenant):</strong> Este formulário adiciona um membro à <strong>SUA EMPRESA ATUAL</strong>. Ele verá os dados desta empresa.
                    <br/>
                    Para criar um ambiente de teste totalmente novo e isolado (outra empresa), <strong>NÃO crie o usuário aqui</strong>. Apenas faça login/cadastro com um novo e-mail em uma aba anônima.
                  </div>
                  </div>

            {/* Seleção de Cargo (Presets) */}
            <div className="space-y-3">
              <Label>Selecione o Cargo (Define Permissões Padrão)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.keys(ROLES).map(role => {
                  const isActive = formData.cargo === role;
                  return (
                    <div 
                      key={role}
                      onClick={() => handleRoleChange(role)}
                      className={`cursor-pointer p-3 rounded-xl border transition-all relative ${
                        isActive
                          ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-500' 
                          : 'border-slate-200 hover:border-sky-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${isActive ? 'text-sky-900' : 'text-slate-700'}`}>{role}</span>
                        {isActive && <Check className="w-4 h-4 text-sky-600" />}
                      </div>
                      <div className="text-[10px] text-slate-500 leading-tight">
                        {role === 'Admin' && 'Acesso total ao sistema.'}
                        {role === 'Gerente' && 'Supervisão geral e relatórios.'}
                        {role === 'Vendedor' && 'Realiza vendas (pré-venda).'}
                        {role === 'Caixa' && 'Frente de caixa e pagamentos.'}
                        {role === 'Estoquista' && 'Gestão de produtos e estoque.'}
                        {role === 'Financeiro' && 'Contas e fluxo de caixa.'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4">
               <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-sky-600" />
                    Permissões de Acesso
                  </h4>
                  <Badge variant="outline" className="text-[10px] bg-white">
                    {formData.cargo === 'Customizado' ? 'Customizado' : `Padrão: ${formData.cargo}`}
                  </Badge>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between space-x-2 p-2 bg-white rounded border border-slate-100">
                    <Label htmlFor="acesso_caixa" className="flex-1 cursor-pointer text-sm">Acesso ao Caixa (PDV)</Label>
                    <Switch 
                      id="acesso_caixa" 
                      checked={formData.acesso_caixa}
                      onCheckedChange={(checked) => setFormData({...formData, acesso_caixa: checked, cargo: 'Customizado'})}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2 p-2 bg-white rounded border border-slate-100">
                    <Label htmlFor="acesso_produtos" className="flex-1 cursor-pointer text-sm">Gerenciar Produtos</Label>
                    <Switch 
                      id="acesso_produtos" 
                      checked={formData.acesso_produtos}
                      onCheckedChange={(checked) => setFormData({...formData, acesso_produtos: checked, cargo: 'Customizado'})}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2 p-2 bg-white rounded border border-slate-100">
                    <Label htmlFor="acesso_estoque" className="flex-1 cursor-pointer text-sm">Movimentar Estoque</Label>
                    <Switch 
                      id="acesso_estoque" 
                      checked={formData.acesso_estoque}
                      onCheckedChange={(checked) => setFormData({...formData, acesso_estoque: checked, cargo: 'Customizado'})}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2 p-2 bg-white rounded border border-slate-100">
                    <Label htmlFor="acesso_financeiro" className="flex-1 cursor-pointer text-sm">Ver Financeiro</Label>
                    <Switch 
                      id="acesso_financeiro" 
                      checked={formData.acesso_financeiro}
                      onCheckedChange={(checked) => setFormData({...formData, acesso_financeiro: checked, cargo: 'Customizado'})}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2 p-2 bg-white rounded border border-slate-100">
                    <Label htmlFor="acesso_config" className="flex-1 cursor-pointer text-sm">Acesso Configurações</Label>
                    <Switch 
                      id="acesso_config" 
                      checked={formData.acesso_config}
                      onCheckedChange={(checked) => setFormData({...formData, acesso_config: checked, cargo: 'Customizado'})}
                    />
                  </div>
               </div>

               {/* Alerta de Conflito com Modo de Operação */}
               {globalConfig?.fluxo_venda_padrao === 'supermercado' && !formData.acesso_caixa && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <span className="font-medium block mb-1">Atenção: Modo Supermercado Ativo</span>
                      Neste modo, o fluxo de venda e pagamento é unificado. 
                      Se este usuário for operar vendas, ele <strong>precisa</strong> de acesso ao Caixa.
                    </div>
                  </div>
               )}
               
               {globalConfig?.fluxo_venda_padrao === 'supermercado' && formData.acesso_caixa && formData.cargo === 'Vendedor' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-300">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <span className="font-medium block mb-1">Adaptação Automática</span>
                      No modo Supermercado, Vendedores com acesso ao caixa atuarão como Operadores de PDV unificado.
                    </div>
                  </div>
               )}

               <div className="pt-2 border-t border-slate-200 mt-2">
                  <div className="w-full sm:w-1/2">
                    <Label className="mb-1.5 block text-xs uppercase text-slate-500 font-semibold">Limite de Desconto (%)</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" 
                        value={formData.limite_desconto}
                        onChange={(e) => setFormData({...formData, limite_desconto: parseFloat(e.target.value), cargo: 'Customizado'})}
                        className="w-24 bg-white"
                      />
                      <span className="text-sm text-slate-500">% por venda</span>
                    </div>
                  </div>
               </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-sky-600 hover:bg-sky-700 text-white">
              {currentColab ? 'Salvar Alterações' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}