import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { atualizarClientePedidoVenda } from '@/lib/atualizarClientePedidoVenda';

export default function AlterarClientePedidoDialog({ open, onClose, pedido, onSuccess }) {
  const [clientes, setClientes] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [salvando, setSalvando] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    base44.entities.Terceiro.filter({ tipo: ['Cliente', 'Ambos'], ativo: true })
      .then((list) => setClientes(Array.isArray(list) ? list : []))
      .catch(() => setClientes([]));
  }, [open]);

  useEffect(() => {
    if (!open || !pedido) return;
    setFiltro('');
    setClienteId(pedido.cliente_id || '');
  }, [open, pedido]);

  const clientesFiltrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => {
      const nome = (c?.nome || '').toLowerCase();
      const doc = (c?.cpf_cnpj || '').toLowerCase();
      return nome.includes(q) || doc.includes(q);
    });
  }, [clientes, filtro]);

  const handleSalvar = async () => {
    if (!pedido?.id) return;
    const cliente = clientes.find((c) => c.id === clienteId);
    if (!cliente) {
      toast({
        title: 'Selecione um cliente',
        description: 'Escolha o cliente correto antes de salvar.',
        variant: 'destructive',
      });
      return;
    }
    if (cliente.id === pedido.cliente_id) {
      toast({
        title: 'Sem alteração',
        description: 'Este pedido já está vinculado ao cliente selecionado.',
      });
      return;
    }

    setSalvando(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      const result = await atualizarClientePedidoVenda(base44, pedido, cliente, user);
      toast({
        title: 'Cliente corrigido com sucesso',
        description: `Pedido e ${result.lancamentosAtualizados} lançamento(s) financeiro(s) foram atualizados.`,
        className: 'bg-emerald-100 text-emerald-800',
      });
      onSuccess?.(cliente);
      onClose?.();
    } catch (error) {
      toast({
        title: 'Erro ao corrigir cliente',
        description: error?.message || 'Não foi possível salvar a alteração.',
        variant: 'destructive',
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose?.()}>
      <DialogContent className="max-w-xl bg-card dark:bg-card border-0">
        <DialogHeader>
          <DialogTitle className="text-foreground">Corrigir cliente do pedido</DialogTitle>
        </DialogHeader>

        {pedido ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/60 p-3 text-sm">
              <p className="font-medium text-foreground">{pedido.numero}</p>
              <p className="text-muted-foreground">
                Cliente atual: {pedido.cliente_nome || 'Não informado'}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Buscar cliente</Label>
              <Input
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Nome ou CPF/CNPJ"
                className="h-10 rounded-xl border-border/40"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Novo cliente</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger className="h-10 rounded-xl border-border/40">
                  <SelectValue placeholder="Selecione o cliente correto" />
                </SelectTrigger>
                <SelectContent className="dark:bg-muted">
                  {clientesFiltrados.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-800 dark:text-amber-300">
              Esta ação atualiza o cliente no pedido e nos lançamentos financeiros vinculados
              (incluindo vendas fiado).
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => onClose?.()}
                disabled={salvando}
                className="border-border/40"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSalvar}
                disabled={salvando || !clienteId}
                className="bg-primary hover:bg-primary/90 text-primary-foreground dark:text-white"
              >
                {salvando ? 'Salvando...' : 'Salvar correção'}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
