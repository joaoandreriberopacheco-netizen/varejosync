import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Wallet, Edit, Trash2, PlusCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { getTenantId } from '@/components/utils/tenant';

export default function ContasFinanceirasManager() {
  const [contas, setContas] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedConta, setSelectedConta] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'Conta Bancária',
    banco: '',
    agencia: '',
    conta: '',
    saldo_inicial: 0,
    saldo_atual: 0,
    cor: '#10B981',
    observacoes: '',
    ativo: true
  });
  const { toast } = useToast();

  useEffect(() => {
    loadContas();
  }, []);

  const loadContas = async () => {
    const tenantId = getTenantId();
    const data = await base44.entities.ContasFinanceiras.filter({ empresa_id: tenantId });
    setContas(data);
  };

  const handleEdit = (conta) => {
    setSelectedConta(conta);
    setFormData(conta);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedConta(null);
    setFormData({
      nome: '',
      tipo: 'Conta Bancária',
      banco: '',
      agencia: '',
      conta: '',
      saldo_inicial: 0,
      saldo_atual: 0,
      cor: '#10B981',
      observacoes: '',
      ativo: true
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (conta) => {
    if (!confirm(`Excluir conta "${conta.nome}"?`)) return;
    
    try {
      await base44.entities.ContasFinanceiras.delete(conta.id);
      toast({
        title: "Conta excluída!",
        className: "bg-red-100 text-red-800"
      });
      loadContas();
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    try {
      const dataToSave = { ...formData };
      if (!selectedConta) {
        dataToSave.saldo_atual = dataToSave.saldo_inicial;
      }

      if (selectedConta) {
        await base44.entities.ContasFinanceiras.update(selectedConta.id, dataToSave);
      } else {
        const tenantId = getTenantId();
        await base44.entities.ContasFinanceiras.create({ ...dataToSave, empresa_id: tenantId });
      }

      toast({
        title: "Conta salva!",
        className: "bg-emerald-100 text-emerald-800"
      });

      loadContas();
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="font-glacial border-0 shadow-sm bg-white dark:bg-gray-800">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base md:text-lg font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-yellow-600" />
            Contas Financeiras (Cofres)
          </CardTitle>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Caixas físicos, Contas bancárias, Carteiras digitais</p>
        </div>
        <Button onClick={handleAddNew} className="bg-emerald-600 hover:bg-emerald-700 w-full md:w-auto">
          <PlusCircle className="w-4 h-4 mr-2" />
          Nova Conta
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
        {contas.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500 mb-4">Nenhuma conta cadastrada</p>
            <Button onClick={handleAddNew} className="bg-emerald-600 hover:bg-emerald-700">
              Criar Primeira Conta
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Nome</TableHead>
                <TableHead className="whitespace-nowrap">Tipo</TableHead>
                <TableHead className="whitespace-nowrap">Banco/Agência/Conta</TableHead>
                <TableHead className="whitespace-nowrap">Saldo Atual</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contas.map(conta => (
                <TableRow key={conta.id}>
                  <TableCell className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: conta.cor }} />
                    <span className="font-medium">{conta.nome}</span>
                  </TableCell>
                  <TableCell>{conta.tipo}</TableCell>
                  <TableCell>
                    {conta.banco && (
                      <span className="text-sm text-gray-600">
                        {conta.banco} {conta.agencia && `| Ag: ${conta.agencia}`} {conta.conta && `| Cc: ${conta.conta}`}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-100 text-emerald-800 font-semibold">
                      R$ {conta.saldo_atual?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {conta.ativo ? '✓ Ativa' : '✗ Inativa'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(conta)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(conta)} className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        </div>
      </CardContent>
      
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl font-glacial max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedConta ? 'Editar Conta' : 'Nova Conta Financeira'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="col-span-2">
                <Label>Nome da Conta *</Label>
                <Input
                  placeholder="Ex: Caixa Loja 1, Banco Itaú"
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              <div>
                <Label>Tipo *</Label>
                <Select value={formData.tipo} onValueChange={v => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Caixa Físico">Caixa Físico</SelectItem>
                    <SelectItem value="Conta Bancária">Conta Bancária</SelectItem>
                    <SelectItem value="Carteira Digital">Carteira Digital</SelectItem>
                    <SelectItem value="Poupança">Poupança</SelectItem>
                    <SelectItem value="Investimento">Investimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Cor</Label>
                <Input
                  type="color"
                  value={formData.cor}
                  onChange={e => setFormData({ ...formData, cor: e.target.value })}
                />
              </div>

              <div>
                <Label>Banco</Label>
                <Input
                  value={formData.banco}
                  onChange={e => setFormData({ ...formData, banco: e.target.value })}
                  placeholder="Nome do banco"
                />
              </div>

              <div>
                <Label>Agência</Label>
                <Input
                  value={formData.agencia}
                  onChange={e => setFormData({ ...formData, agencia: e.target.value })}
                  placeholder="0000"
                />
              </div>

              <div>
                <Label>Conta</Label>
                <Input
                  value={formData.conta}
                  onChange={e => setFormData({ ...formData, conta: e.target.value })}
                  placeholder="00000-0"
                />
              </div>

              <div>
                <Label>Saldo Inicial</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.saldo_inicial}
                  onChange={e => setFormData({ ...formData, saldo_inicial: parseFloat(e.target.value) || 0 })}
                  disabled={!!selectedConta}
                />
                {!!selectedConta && (
                  <p className="text-xs text-gray-500 mt-1">Saldo inicial não pode ser editado</p>
                )}
              </div>

              <div className="col-span-2">
                <Label>Observações</Label>
                <Input
                  value={formData.observacoes}
                  onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Informações adicionais..."
                />
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.ativo}
                  onChange={e => setFormData({ ...formData, ativo: e.target.checked })}
                  className="w-4 h-4 accent-emerald-600"
                />
                <Label>Conta ativa</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </Card>
  );
}