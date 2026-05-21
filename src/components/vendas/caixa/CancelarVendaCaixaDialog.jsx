import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Ban } from 'lucide-react';
import PinValidationDialog from '@/components/auth/PinValidationDialog';
import { base44 } from '@/api/base44Client';
import { registrarCancelamentoVenda } from '@/lib/registrarCancelamentoVenda';
import { useToast } from '@/components/ui/use-toast';

export default function CancelarVendaCaixaDialog({
  open,
  onOpenChange,
  pedido,
  turno,
  operadorNome,
  formatValor,
  onSuccess,
}) {
  const [motivo, setMotivo] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const { toast } = useToast();

  const handleClose = () => {
    setMotivo('');
    setShowPin(false);
    onOpenChange(false);
  };

  const executarCancelamento = async () => {
    setSalvando(true);
    try {
      const res = await registrarCancelamentoVenda(base44, {
        pedido,
        turno,
        motivo,
        operador_nome: operadorNome,
      });
      if (!res.ok) {
        toast({ title: 'Não foi possível cancelar', description: res.error, variant: 'destructive' });
        return;
      }
      toast({
        title: 'Venda cancelada',
        description: `${pedido.numero} removida do total do turno.`,
        className: 'bg-red-50 text-red-800',
      });
      handleClose();
      onSuccess?.();
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const handleSolicitarPin = () => {
    if (!motivo.trim()) {
      toast({ title: 'Motivo obrigatório', description: 'Descreva por que a venda está sendo cancelada.', variant: 'destructive' });
      return;
    }
    setShowPin(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <Ban className="w-5 h-5" />
              Cancelar venda {pedido?.numero}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-gray-600 dark:text-gray-400">
              O valor de{' '}
              <strong>{formatValor?.(pedido?.valor_total) ?? `R$ ${Number(pedido?.valor_total || 0).toFixed(2)}`}</strong>{' '}
              deixa de contar no total do dia. O comprovante passará a mostrar &quot;venda cancelada&quot;.
            </p>
            <Textarea
              placeholder="Motivo do cancelamento (obrigatório)..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="min-h-24"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleSolicitarPin} disabled={salvando}>
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PinValidationDialog
        isOpen={showPin}
        onClose={() => setShowPin(false)}
        onSuccess={executarCancelamento}
        operationName={`Cancelar venda ${pedido?.numero || ''}`}
      />
    </>
  );
}
