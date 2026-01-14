import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Edit, Shield, UserPlus, Mail } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

const PERFIS_DISPONIVEIS = [
  { value: 'Admin', label: 'Admin', color: 'bg-red-100 text-red-800', desc: 'Acesso total' },
  { value: 'Gerente', label: 'Gerente', color: 'bg-purple-100 text-purple-800', desc: 'Gestão completa' },
  { value: 'Vendedor', label: 'Vendedor', color: 'bg-blue-100 text-blue-800', desc: 'Apenas vendas' },
  { value: 'Operador de Caixa', label: 'Operador de Caixa', color: 'bg-green-100 text-green-800', desc: 'Caixa e pagamentos' },
  { value: 'Estoquista', label: 'Estoquista', color: 'bg-orange-100 text-orange-800', desc: 'Produtos e estoque' },
  { value: 'Financeiro', label: 'Financeiro', color: 'bg-yellow-100 text-yellow-800', desc: 'Contas e fluxo' }
];

export default function ListaUsuariosApp() {
  const [usuarios, setUsuarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPerfil, setSelectedPerfil] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadUsuarios();
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
        description: `${editingUser.full_name} agora é ${selectedPerfil}`,
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

  const getPerfilInfo = (perfil) => {
    return PERFIS_DISPONIVEIS.find(p => p.value === perfil) || 
           { value: perfil, label: perfil, color: 'bg-gray-100 text-gray-800', desc: '-' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-glacial">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg md:text-2xl font-medium text-gray-800 dark:text-gray-100">Gestão de Usuários</h2>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-light">Configure os usuários da empresa e seus perfis de acesso</p>
        </div>
        <Button 
          className="bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white gap-2 shadow-sm"
          onClick={handleConvidarNovoUsuario}
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Usuário</span>
        </Button>
      </div>

      {/* Informação */}
      <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded">
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-300" />
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <p className="font-medium">Sobre Usuários e Perfis</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Cada email corresponde a um usuário único no sistema. Configure o perfil para definir o que ele pode acessar no menu lateral.
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
                <TableHead className="font-medium text-xs text-gray-500 dark:text-gray-400">Role</TableHead>
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
                        <Badge variant="outline" className="text-xs">
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </Badge>
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
                  {PERFIS_DISPONIVEIS.map(perfil => (
                    <SelectItem key={perfil.value} value={perfil.value}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{perfil.label}</span>
                        <span className="text-xs text-gray-500">- {perfil.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p className="font-medium text-gray-700 dark:text-gray-300">Sobre o perfil selecionado:</p>
              {selectedPerfil === 'Admin' && <p>• Acesso completo a todas as funcionalidades</p>}
              {selectedPerfil === 'Vendedor' && <p>• Acesso ao PDV Vendedor e Dashboard</p>}
              {selectedPerfil === 'Operador de Caixa' && <p>• Acesso apenas ao PDV Caixa</p>}
              {selectedPerfil === 'Gerente' && <p>• Acesso a vendas, estoque, relatórios e financeiro</p>}
              {selectedPerfil === 'Estoquista' && <p>• Acesso a produtos, compras e armazenagem</p>}
              {selectedPerfil === 'Financeiro' && <p>• Acesso a contas, caixas e financeiro</p>}
            </div>
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