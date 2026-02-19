import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Edit, Shield, UserPlus, ShoppingCart, Building, Trash2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { base44 as base44Client } from '@/api/base44Client';

const PERFIS_EMPRESARIAIS = {
  'Microempresa': {
    label: 'Microempresa',
    icon: ShoppingCart,
    description: 'Ideal para Dono + Vendedor',
    color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    perfisDisponiveis: ['Admin', 'Vendedor']
  },
  'Média Empresa': {
    label: 'Média Empresa',
    icon: Shield,
    description: 'Equipe completa',
    color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    perfisDisponiveis: ['Admin', 'Gerente', 'Vendedor', 'Financeiro']
  },
  'Supermercado': {
    label: 'Supermercado',
    icon: Users,
    description: 'Controle total de permissões',
    color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    perfisDisponiveis: ['Admin', 'Gerente', 'Operador de Caixa', 'Estoquista', 'Vendedor']
  }
};

const PERFIS_DISPONIVEIS = {
  'Admin': { 
    label: 'Admin', 
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', 
    desc: 'Acesso total',
    dashboard: 'Dashboard'
  },
  'Gerente': { 
    label: 'Gerente', 
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', 
    desc: 'Gestão completa',
    dashboard: 'Dashboard'
  },
  'Vendedor': { 
    label: 'Vendedor', 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', 
    desc: 'Apenas vendas',
    dashboard: 'DashboardVendedor'
  },
  'Operador de Caixa': { 
    label: 'Operador de Caixa', 
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', 
    desc: 'Caixa e pagamentos',
    dashboard: 'DashboardCaixa'
  },
  'Estoquista': { 
    label: 'Estoquista', 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', 
    desc: 'Produtos e estoque',
    dashboard: 'Dashboard'
  },
  'Financeiro': { 
    label: 'Financeiro', 
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', 
    desc: 'Contas e fluxo',
    dashboard: 'Dashboard'
  }
};

export default function ListaUsuariosApp() {
  const [usuarios, setUsuarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPerfil, setSelectedPerfil] = useState('');
  const [perfilEmpresarial, setPerfilEmpresarial] = useState(null);
  const [showPerfilSelector, setShowPerfilSelector] = useState(false);
  const [isDeduplicating, setIsDeduplicating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUsuarios();
    loadPerfilEmpresarial();
  }, []);

  const loadUsuarios = async () => {
    setIsLoading(true);
    try {
      const users = await base44.entities.User.list();
      setUsuarios(users || []);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast({ 
        title: "Erro ao carregar", 
        description: "Não foi possível carregar a lista de usuários.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPerfilEmpresarial = async () => {
    try {
      const perfis = await base44.entities.PerfilEmpresa.list();
      if (perfis.length > 0) {
        setPerfilEmpresarial(perfis[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar perfil empresarial:", error);
    }
  };

  const handleSelecionarPerfilEmpresarial = async (tipo) => {
    try {
      const perfis = await base44.entities.PerfilEmpresa.list();
      if (perfis.length > 0) {
        await base44.entities.PerfilEmpresa.update(perfis[0].id, { tipo });
      } else {
        await base44.entities.PerfilEmpresa.create({ tipo });
      }
      await loadPerfilEmpresarial();
      setShowPerfilSelector(false);
      toast({ 
        title: "Perfil configurado", 
        description: `Perfil ${tipo} configurado com sucesso`,
        className: "bg-green-100 text-green-800"
      });
    } catch (error) {
      console.error("Erro ao salvar perfil empresarial:", error);
      toast({ 
        title: "Erro ao configurar", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const handleEditPerfil = (user) => {
    setEditingUser(user);
    setSelectedPerfil(user.perfil || 'Vendedor');
    setIsDialogOpen(true);
  };

  const handleSavePerfil = async () => {
    if (!editingUser) return;

    try {
      await base44.entities.User.update(editingUser.id, {
        perfil: selectedPerfil
      });

      toast({ 
        title: "Perfil atualizado", 
        description: `${editingUser.full_name} agora é ${selectedPerfil}. Dashboard: ${PERFIS_DISPONIVEIS[selectedPerfil]?.dashboard}`,
        className: "bg-green-100 text-green-800" 
      });

      setIsDialogOpen(false);
      loadUsuarios();
    } catch (error) {
      toast({ 
        title: "Erro ao atualizar", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const handleConvidarNovoUsuario = async () => {
    toast({ 
      title: "Como adicionar usuários", 
      description: "Use a função 'convidarUsuarios' no dashboard > code > functions ou peça ajuda ao administrador do sistema.",
      duration: 6000
    });
  };

  const handleDeduplicar = async () => {
    if (!confirm('Deseja remover usuários duplicados? Será mantido apenas o registro mais antigo de cada email.')) {
      return;
    }

    setIsDeduplicating(true);
    try {
      const response = await base44Client.functions.invoke('deduplicarUsuarios');
      
      if (response.data.success) {
        toast({
          title: "Deduplicação concluída",
          description: `${response.data.usuarios_removidos} usuário(s) duplicado(s) removido(s) de ${response.data.emails_duplicados} email(s).`,
          className: "bg-green-100 text-green-800"
        });
        loadUsuarios();
      } else {
        throw new Error('Falha na deduplicação');
      }
    } catch (error) {
      console.error("Erro na deduplicação:", error);
      toast({
        title: "Erro ao desduplicar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsDeduplicating(false);
    }
  };

  const getPerfilInfo = (perfil) => {
    return PERFIS_DISPONIVEIS[perfil] || 
           { label: perfil, color: 'bg-gray-100 text-gray-800', desc: '-', dashboard: '-' };
  };

  const perfisDisponiveis = perfilEmpresarial 
    ? PERFIS_EMPRESARIAIS[perfilEmpresarial.tipo]?.perfisDisponiveis || Object.keys(PERFIS_DISPONIVEIS)
    : Object.keys(PERFIS_DISPONIVEIS);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-glacial">
      {/* Seletor de Perfil Empresarial (se não configurado) */}
      {!perfilEmpresarial && (
        <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <Building className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Configure o Perfil da sua Empresa</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Escolha o modelo que melhor se encaixa no seu negócio para configurar os perfis de usuário disponíveis.
                </p>
                <Button onClick={() => setShowPerfilSelector(true)} className="gap-2 bg-gray-800 hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-800">
                  <Building className="w-4 h-4" />
                  Configurar Perfil
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg md:text-2xl font-medium text-gray-800 dark:text-gray-100">Gestão de Usuários</h2>
            {perfilEmpresarial && (
              <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-0 font-normal">
                {PERFIS_EMPRESARIAIS[perfilEmpresarial.tipo]?.label}
              </Badge>
            )}
          </div>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-light">Configure os usuários da empresa e seus perfis de acesso</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleDeduplicar}
            disabled={isDeduplicating}
            className="gap-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">{isDeduplicating ? 'Processando...' : 'Desduplicar'}</span>
          </Button>
          {perfilEmpresarial && (
            <Button 
              variant="outline"
              onClick={() => setShowPerfilSelector(true)}
              className="gap-2"
            >
              <Building className="w-4 h-4" />
              <span className="hidden sm:inline">Alterar Perfil</span>
            </Button>
          )}
          <Button 
            className="bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white gap-2 shadow-sm"
            onClick={handleConvidarNovoUsuario}
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Usuário</span>
          </Button>
        </div>
      </div>

      {/* Informação */}
      <Card className="border-0 shadow-sm bg-gray-50 dark:bg-gray-800/60">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
              <Shield className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <p className="font-medium">Sobre Usuários e Perfis</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Cada email corresponde a um usuário único no sistema. Configure o perfil para definir o que ele pode acessar no menu lateral e qual dashboard visualiza.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Lista de Usuários
            </CardTitle>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              {usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''}
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-transparent">
              <TableRow className="hover:bg-transparent border-gray-100 dark:border-gray-700">
                <TableHead className="font-medium text-xs text-gray-500 dark:text-gray-400">Nome</TableHead>
                <TableHead className="font-medium text-xs text-gray-500 dark:text-gray-400">Email</TableHead>
                <TableHead className="font-medium text-xs text-gray-500 dark:text-gray-400">Perfil</TableHead>
                <TableHead className="font-medium text-xs text-gray-500 dark:text-gray-400">Dashboard</TableHead>
                <TableHead className="text-right font-medium text-xs text-gray-500 dark:text-gray-400">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-gray-400 dark:text-gray-500">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                usuarios.map(user => {
                  const perfilInfo = getPerfilInfo(user.perfil);
                  return (
                    <TableRow key={user.id} className="border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <TableCell>
                        <div className="font-medium text-gray-700 dark:text-gray-200 text-sm">{user.full_name || '-'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`font-normal text-xs border-0 ${perfilInfo.color}`}>
                          {perfilInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{perfilInfo.dashboard}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => handleEditPerfil(user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Dialog Seletor de Perfil Empresarial */}
      <Dialog open={showPerfilSelector} onOpenChange={setShowPerfilSelector}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Escolha o Perfil da sua Empresa</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Selecione o modelo que define quais perfis de usuário estarão disponíveis
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
            {Object.entries(PERFIS_EMPRESARIAIS).map(([tipo, config]) => {
              const IconComponent = config.icon;
              const isSelected = perfilEmpresarial?.tipo === tipo;
              
              return (
                <div
                  key={tipo}
                  onClick={() => handleSelecionarPerfilEmpresarial(tipo)}
                  className={`rounded-xl p-6 cursor-pointer transition-all group shadow-sm ${
                      isSelected
                        ? 'bg-gray-100 dark:bg-gray-700 ring-2 ring-gray-400 dark:ring-gray-500'
                        : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <IconComponent className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{config.label}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{config.description}</p>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        <p className="font-medium mb-1">Sugestão:</p>
                        <p>{config.perfisDisponiveis.join(', ')}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <Badge className="bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 border-0">Selecionado</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição de Perfil */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium text-gray-800 dark:text-gray-100">
              Configurar Perfil de Usuário
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
              Defina o perfil de {editingUser?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Perfil</label>
              <Select value={selectedPerfil} onValueChange={setSelectedPerfil}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  {perfisDisponiveis.map(perfilKey => {
                    const perfil = PERFIS_DISPONIVEIS[perfilKey];
                    return (
                      <SelectItem key={perfilKey} value={perfilKey}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{perfil.label}</span>
                          <span className="text-xs text-gray-500">- {perfil.desc}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedPerfil && PERFIS_DISPONIVEIS[selectedPerfil] && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p className="font-medium text-gray-700 dark:text-gray-300">Sobre o perfil selecionado:</p>
                <p>• {PERFIS_DISPONIVEIS[selectedPerfil].desc}</p>
                <p className="text-blue-600 dark:text-blue-400">• Dashboard: {PERFIS_DISPONIVEIS[selectedPerfil].dashboard}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white"
              onClick={handleSavePerfil}
            >
              Salvar Perfil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}