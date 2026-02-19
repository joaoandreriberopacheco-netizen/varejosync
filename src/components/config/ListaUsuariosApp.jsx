import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Edit, Shield, UserPlus, Trash2, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

// Mapeamento de perfis legados → nome sugerido de PerfilDeAcesso
const MAPA_LEGADO = {
  'Admin': { label: 'Admin', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  'Gerente': { label: 'Gerente', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  'Vendedor': { label: 'Vendedor', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  'Operador de Caixa': { label: 'Operador de Caixa', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  'Estoquista': { label: 'Estoquista', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  'Financeiro': { label: 'Financeiro', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
};

export default function ListaUsuariosApp() {
  const [usuarios, setUsuarios] = useState([]);
  const [perfisAcesso, setPerfisAcesso] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPerfilId, setSelectedPerfilId] = useState('');
  const [orfaos, setOrfaos] = useState([]); // usuários sem perfil_acesso_id
  const { toast } = useToast();

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = async () => {
    setIsLoading(true);
    try {
      const [users, perfis] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.PerfilDeAcesso.list()
      ]);
      setUsuarios(users || []);
      setPerfisAcesso(perfis || []);

      // Identifica órfãos: usuários sem perfil_acesso_id vinculado
      const sem = (users || []).filter(u => !u.perfil_acesso_id);
      setOrfaos(sem);
    } catch (error) {
      console.error("Erro ao carregar:", error);
      toast({ title: "Erro ao carregar", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditar = (user) => {
    setEditingUser(user);
    setSelectedPerfilId(user.perfil_acesso_id || '');
    setIsDialogOpen(true);
  };

  const handleSalvar = async () => {
    if (!editingUser) return;
    const perfilSelecionado = perfisAcesso.find(p => p.id === selectedPerfilId);
    try {
      await base44.entities.User.update(editingUser.id, {
        perfil_acesso_id: selectedPerfilId || null,
        perfil_acesso_nome: perfilSelecionado?.nome || null,
        // mantém perfil legado para compatibilidade
        perfil: perfilSelecionado?.nome || editingUser.perfil
      });
      toast({ title: "Perfil atualizado", className: "bg-green-50 text-green-800" });
      setIsDialogOpen(false);
      carregarDados();
    } catch (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    }
  };

  // Migração em massa: tenta vincular por nome igual
  const handleMigrarOrfaos = async () => {
    if (!window.confirm(`Vincular automaticamente ${orfaos.length} usuário(s) órfão(s) ao Perfil de Acesso pelo nome?`)) return;

    let migrados = 0;
    for (const user of orfaos) {
      const nomeLegado = user.perfil;
      const perfilCorrespondente = perfisAcesso.find(
        p => p.nome?.toLowerCase() === nomeLegado?.toLowerCase()
      );
      if (perfilCorrespondente) {
        await base44.entities.User.update(user.id, {
          perfil_acesso_id: perfilCorrespondente.id,
          perfil_acesso_nome: perfilCorrespondente.nome
        });
        migrados++;
      }
    }
    toast({
      title: `Migração concluída`,
      description: `${migrados} de ${orfaos.length} usuário(s) vinculados automaticamente.`,
      className: "bg-green-50 text-green-800"
    });
    carregarDados();
  };

  const getBadgePerfil = (user) => {
    if (user.perfil_acesso_nome) {
      return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-0 font-normal text-xs">{user.perfil_acesso_nome}</Badge>;
    }
    if (user.perfil) {
      const info = MAPA_LEGADO[user.perfil];
      return (
        <div className="flex items-center gap-1">
          <Badge className={`border-0 font-normal text-xs ${info?.color || 'bg-gray-100 text-gray-600'}`}>{user.perfil}</Badge>
          <Badge className="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border-0 text-[10px]">legado</Badge>
        </div>
      );
    }
    return <Badge className="bg-red-50 text-red-500 border-0 text-xs">sem perfil</Badge>;
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4 font-glacial">

      {/* Banner de órfãos */}
      {orfaos.length > 0 && (
        <Card className="border-0 shadow-sm bg-amber-50 dark:bg-amber-900/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  {orfaos.length} usuário{orfaos.length > 1 ? 's' : ''} sem Perfil de Acesso vinculado
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  Usuários com perfil legado (string) ou sem perfil. Vincule manualmente ou use a migração automática.
                </p>
              </div>
              {perfisAcesso.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMigrarOrfaos}
                  className="text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-900/20 h-8 text-xs gap-1.5 shrink-0"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Migrar automaticamente
                </Button>
              )}
              {perfisAcesso.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 shrink-0">Crie Perfis de Acesso primeiro</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Usuários do Sistema</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-light mt-0.5">Gerencie o acesso de cada usuário vinculando a um Perfil de Acesso</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-gray-800 hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-900 text-white gap-1.5 h-8 px-3 text-xs"
            onClick={() => toast({ title: "Como adicionar usuários", description: "Acesse Dashboard → Code → Functions → convidarUsuarios", duration: 6000 })}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Convidar</span>
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 pb-3 pt-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Lista de Usuários
            </CardTitle>
            <div className="flex items-center gap-2">
              {orfaos.length === 0 && usuarios.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Todos vinculados
                </span>
              )}
              <span className="text-xs text-gray-400 dark:text-gray-500">{usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-gray-100 dark:border-gray-700">
                <TableHead className="text-xs text-gray-400 font-medium">Nome</TableHead>
                <TableHead className="text-xs text-gray-400 font-medium hidden sm:table-cell">Email</TableHead>
                <TableHead className="text-xs text-gray-400 font-medium">Perfil de Acesso</TableHead>
                <TableHead className="text-right text-xs text-gray-400 font-medium">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-gray-400 dark:text-gray-500 text-sm">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                usuarios.map(user => (
                  <TableRow key={user.id} className="border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <TableCell>
                      <div className="font-medium text-gray-700 dark:text-gray-200 text-sm">{user.full_name || '-'}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="text-xs text-gray-400 dark:text-gray-500">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      {getBadgePerfil(user)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        onClick={() => handleEditar(user)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Dialog Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm dark:bg-gray-900 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-400" />
              Vincular Perfil de Acesso
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
              {editingUser?.full_name} — {editingUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {perfisAcesso.length === 0 ? (
              <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300">
                Nenhum Perfil de Acesso criado ainda. Crie perfis na aba "Perfis de Acesso" antes de atribuir.
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Perfil de Acesso</label>
                  <Select value={selectedPerfilId} onValueChange={setSelectedPerfilId}>
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-9 text-sm">
                      <SelectValue placeholder="Selecione um perfil..." />
                    </SelectTrigger>
                    <SelectContent>
                      {perfisAcesso.filter(p => p.ativo !== false).map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{p.nome}</span>
                            {p.descricao && <span className="text-xs text-gray-400">{p.descricao}</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Preview do perfil selecionado */}
                {selectedPerfilId && (() => {
                  const p = perfisAcesso.find(x => x.id === selectedPerfilId);
                  if (!p) return null;
                  const total = Object.values(p.permissoes || {}).reduce((acc, mod) => {
                    return acc + Object.values(mod || {}).filter(Boolean).length;
                  }, 0);
                  return (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{p.nome}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{total} permissões ativas</p>
                      {p.menu_compacto && <p className="text-xs text-gray-500 dark:text-gray-400">• Menu compacto</p>}
                    </div>
                  );
                })()}
              </>
            )}
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)} className="h-8 text-xs">
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-gray-800 hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-900 text-white h-8 text-xs"
              onClick={handleSalvar}
              disabled={perfisAcesso.length === 0}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}