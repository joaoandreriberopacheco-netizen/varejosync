import React, { useState, useEffect } from 'react';
import { Produto } from '@/entities/Produto';
import { PedidoCompra } from '@/entities/PedidoCompra';
import { MovimentacaoEstoque } from '@/entities/MovimentacaoEstoque';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from "@/components/ui/use-toast";
import { User } from '@/entities/User';
import { Loader2 } from 'lucide-react';

export default function MovimentacaoEstoqueForm() {
  const [motivo, setMotivo] = useState('Ajuste de Inventário');
  const [observacoes, setObservacoes] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [poItens, setPoItens] = useState([]);
  const [isLoadingPO, setIsLoadingPO] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    User.me().then(setCurrentUser);
  }, []);

  const handleLoadPO = async () => {
    if (!poNumber) return;
    setIsLoadingPO(true);
    try {
      const pedidos = await PedidoCompra.filter({ numero: poNumber });
      if (pedidos.length > 0) {
        const pedido = pedidos[0];
        const itensComRecebido = pedido.itens.map(item => ({ ...item, quantidade_recebida: '' }));
        setPoItens(itensComRecebido);
      } else {
        toast({ title: "Pedido de Compra não encontrado.", variant: "destructive" });
        setPoItens([]);
      }
    } catch (error) {
      toast({ title: "Erro ao buscar Pedido de Compra.", description: error.message, variant: "destructive" });
    }
    setIsLoadingPO(false);
  };
  
  const handleItemChange = (index, value) => {
    const newItems = [...poItens];
    newItems[index].quantidade_recebida = value;
    setPoItens(newItems);
  };

  const handleSaveMovimentacao = async () => {
    if (poItens.length === 0) return;
    setIsSaving(true);
    
    const movimentacoesParaCriar = [];
    const produtosParaAtualizar = [];

    for (const item of poItens) {
      const quantidadeRecebida = parseFloat(item.quantidade_recebida);
      if (!isNaN(quantidadeRecebida) && quantidadeRecebida > 0) {
        movimentacoesParaCriar.push({
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          tipo: 'Entrada',
          motivo: 'Compra',
          quantidade: quantidadeRecebida,
          custo_unitario: item.custo_unitario,
          documento_referencia: poNumber,
          observacoes,
          usuario_responsavel: currentUser?.full_name || 'Sistema'
        });
        
        produtosParaAtualizar.push({
            id: item.produto_id,
            quantidade: quantidadeRecebida
        });
      }
    }
    
    try {
        if(movimentacoesParaCriar.length > 0) {
            await MovimentacaoEstoque.bulkCreate(movimentacoesParaCriar);
            
            const produtosAtuais = await Produto.list(null, 0, { id: { '$in': produtosParaAtualizar.map(p => p.id)}});

            const updates = produtosAtuais.map(produto => {
                const adicional = produtosParaAtualizar.find(p => p.id === produto.id).quantidade;
                return Produto.update(produto.id, { estoque_atual: (produto.estoque_atual || 0) + adicional });
            });
            
            await Promise.all(updates);

            toast({ title: "Movimentação salva com sucesso!", description: `${movimentacoesParaCriar.length} itens tiveram seu estoque atualizado.` });
            setPoNumber('');
            setPoItens([]);
            setObservacoes('');
        }
    } catch(error) {
        toast({ title: "Erro ao salvar movimentação.", description: error.message, variant: "destructive" });
    }

    setIsSaving(false);
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Movimentação de Estoque</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 items-end">
          <div className="w-1/3">
            <Label>Motivo da Movimentação</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Entrada por Compra">Entrada por Compra</SelectItem>
                <SelectItem value="Ajuste de Inventário">Ajuste de Inventário (Entrada)</SelectItem>
                <SelectItem value="Ajuste de Inventário (Saída)">Ajuste de Inventário (Saída)</SelectItem>
                <SelectItem value="Perda">Perda / Avaria</SelectItem>
                <SelectItem value="Consumo Interno">Consumo Interno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {motivo === 'Entrada por Compra' && (
            <div className="flex-1 flex gap-2 items-end">
              <div className="w-1/2">
                <Label htmlFor="poNumber">Nº do Pedido de Compra</Label>
                <Input id="poNumber" value={poNumber} onChange={e => setPoNumber(e.target.value)} />
              </div>
              <Button onClick={handleLoadPO} disabled={isLoadingPO}>
                {isLoadingPO && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Carregar Itens
              </Button>
            </div>
          )}
        </div>
        
        {motivo === 'Entrada por Compra' && poItens.length > 0 && (
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-semibold">Itens do Pedido {poNumber} (Conferência Cega)</h3>
            <div className="border rounded-md overflow-hidden">
             <Table>
                <TableHeader className="bg-gray-50">
                    <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Quantidade Pedida</TableHead>
                        <TableHead className="w-1/4">Quantidade Recebida</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {poItens.map((item, index) => (
                        <TableRow key={item.produto_id}>
                            <TableCell>{item.produto_nome}</TableCell>
                            <TableCell>{item.quantidade}</TableCell>
                            <TableCell>
                                <Input 
                                    type="number" 
                                    value={item.quantidade_recebida} 
                                    onChange={e => handleItemChange(index, e.target.value)}
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            </div>
             <div className="w-full">
                <Label htmlFor="obs-compra">Observações</Label>
                <Input id="obs-compra" value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Ex: caixa avariada, item faltante..." />
            </div>
            <div className="text-right">
                <Button onClick={handleSaveMovimentacao} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar Recebimento e Atualizar Estoque
                </Button>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}