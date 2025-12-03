import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, CreditCard } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function FormasPagamentoManager() {
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [contas, setContas] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedForma, setSelectedForma] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'Dinheiro',
    conta_destino_id: '',
    conta_destino_nome: '',
    prazo_recebimento_dias: 0,
    tipo_taxa: 'Percentual',
    valor_taxa: 0,
    parcelas_max: 1,
    adquirente: '',
    ativo: true
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [formasData, contasData] = await Promise.all([
      base44.entities.FormasDePagamento.list(),
      base44.entities.ContasFinanceiras.list()
    ]);
    setFormasPagamento(formasData);
    setContas(contasData);
  };

  const handleSave = async () => {
    const conta = contas.find(c => c.id === formData.conta_destino_id);
    const dataToSave = {
      ...formData,
      conta_destino_nome: conta?.nome || ''
    };

    if (selectedForma) {
      await base44.entities.FormasDePagamento.update(selectedForma.id, dataToSave);
      toast({ 
        title: "✓ Forma de pagamento atualizada", 
        className: "bg-white border border-gray-300 dark:bg-gray-800 dark:text-gray-200",
        duration: 2000
      });
    } else {
      await base44.entities.FormasDePagamento.create(dataToSave);
      toast({ 
        title: "✓ Forma de pagamento criada", 
        className: "bg-white border border-gray-300 dark:bg-gray-800 dark:text-gray-200",
        duration: 2000
      });
    }
    
    loadData();
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (forma) => {
    setSelectedForma(forma);
    setFormData({
      nome: forma.nome,
      tipo: forma.tipo,
      conta_destino_id: forma.conta_destino_id,
      conta_destino_nome: forma.conta_destino_nome,
      prazo_recebimento_dias: forma.prazo_recebimento_dias,
      tipo_taxa: forma.tipo_taxa,
      valor_taxa: forma.valor_taxa,
      parcelas_max: forma.parcelas_max,
      adquirente: forma.adquirente || '',
      ativo: forma.ativo
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Deseja realmente excluir esta forma de pagamento?')) {
      await base44.entities.FormasDePagamento.delete(id);
      toast({ 
        title: "✓ Forma de pagamento excluída", 
        className: "bg-white border border-gray-300 dark:bg-gray-800 dark:text-gray-200",
        duration: 2000
      });
      loadData();
    }
  };

  const handleAddNew = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedForma(null);
    setFormData({
      nome: '',
      tipo: 'Dinheiro',
      conta_destino_id: '',
      conta_destino_nome: '',
      prazo_recebimento_dias: 0,
      tipo_taxa: 'Percentual',
      valor_taxa: 0,
      parcelas_max: 1,
      adquirente: '',
      ativo: true
    });
  };

  return (
    <div className="space-y-4 font-glacial">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-base md:text-lg font-medium text-gray-800 dark:text-gray-200">Formas de Pagamento</h3>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Maquininhas, PIX, Dinheiro e outras formas</p>
        </div>
        <Button onClick={handleAddNew} className="gap-2 bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 w-full md:w-auto">
          <PlusCircle className="w-4 h-4" /> Nova Forma
        </Button>
      </div>

      {/* Lista */}
      {formasPagamento.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
          <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">Nenhuma forma de pagamento cadastrada</p>
          <Button onClick={handleAddNew} className="gap-2 bg-gray-700 hover:bg-gray-600 dark:bg-gray-600">
            <PlusCircle className="w-4 h-4" /> Criar Primeira Forma
          </Button>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden bg-white dark:bg-gray-800 overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-700">
              <TableRow className="border-b border-gray-200 dark:border-gray-700">
                <TableHead className="text-gray-700 dark:text-gray-300 whitespace-nowrap">Nome</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300 whitespace-nowrap">Tipo</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300 whitespace-nowrap">Adquirente</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300 whitespace-nowrap">Conta Destino</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300 whitespace-nowrap">Taxa</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300 whitespace-nowrap">Prazo</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300 whitespace-nowrap">Status</TableHead>
                <TableHead className="text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formasPagamento.map(forma => (
                <TableRow key={forma.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <TableCell className="font-medium text-gray-800 dark:text-gray-200">{forma.nome}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">{forma.tipo}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">{forma.adquirente || '-'}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">{forma.conta_destino_nome}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {forma.tipo_taxa === 'Percentual' ? `${forma.valor_taxa}%` : `R$ ${forma.valor_taxa.toFixed(2)}`}
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">{forma.prazo_recebimento_dias}d</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      forma.ativo 
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-500'
                    }`}>
                      {forma.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(forma)}
                        className="hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDelete(forma.id)}
                        className="hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <Trash2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="dark:bg-gray-800 dark:border-gray-700 font-glacial max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-800 dark:text-gray-200">
              {selectedForma ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Nome *</Label>
              <Input 
                value={formData.nome}
                onChange={e => setFormData({...formData, nome: e.target.value})}
                placeholder="Ex: Cielo Crédito 3x"
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Tipo *</Label>
                <Select value={formData.tipo} onValueChange={v => setFormData({...formData, tipo: v})}>
                  <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Cartão Débito">Cartão Débito</SelectItem>
                    <SelectItem value="Cartão Crédito">Cartão Crédito</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300">Adquirente</Label>
                <Input 
                  value={formData.adquirente}
                  onChange={e => setFormData({...formData, adquirente: e.target.value})}
                  placeholder="Ex: Cielo, Stone"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-700 dark:text-gray-300">Conta Destino *</Label>
              <Select value={formData.conta_destino_id} onValueChange={v => setFormData({...formData, conta_destino_id: v})}>
                <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                  <SelectValue placeholder="Selecione a conta..." />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {contas.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Tipo Taxa</Label>
                <Select value={formData.tipo_taxa} onValueChange={v => setFormData({...formData, tipo_taxa: v})}>
                  <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    <SelectItem value="Percentual">Percentual</SelectItem>
                    <SelectItem value="Fixo">Fixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300">Valor Taxa</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={formData.valor_taxa}
                  onChange={e => setFormData({...formData, valor_taxa: parseFloat(e.target.value) || 0})}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                />
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300">Parcelas Máx</Label>
                <Input 
                  type="number"
                  value={formData.parcelas_max}
                  onChange={e => setFormData({...formData, parcelas_max: parseInt(e.target.value) || 1})}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-700 dark:text-gray-300">Prazo Recebimento (dias)</Label>
              <Input 
                type="number"
                value={formData.prazo_recebimento_dias}
                onChange={e => setFormData({...formData, prazo_recebimento_dias: parseInt(e.target.value) || 0})}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="dark:bg-gray-700 dark:border-gray-600">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-gray-700 hover:bg-gray-600 dark:bg-gray-600">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}