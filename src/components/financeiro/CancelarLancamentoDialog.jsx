import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cancelarLancamentoFinanceiro } from '@/functions/cancelarLancamentoFinanceiro';
import { toast } from 'sonner';

export default function CancelarLancamentoDialog({ isOpen, onClose, lancamento, onSuccess }) {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCancelar = async () => {
    if (!motivo.trim()) {
      toast.error('Informe o motivo do cancelamento');
      return;
    }

    setLoading(true);
    try {
      const response = await cancelarLancamentoFinanceiro({
        lancamentoId: lancamento.id,
        motivo: motivo.trim()
      });

      if (response.data.sucesso) {
        toast.success(`${response.data.cancelados} lançamento(s) cancelado(s)`);
        onSuccess?.();
        onClose();
        setMotivo('');
      }
    } catch (error) {
      toast.error('Erro ao cancelar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancelar Lançamento</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p><strong>Descrição:</strong> {lancamento?.descricao}</p>
            <p><strong>Valor:</strong> R$ {lancamento?.valor?.toFixed(2)}</p>
            {lancamento?.grupo_lancamento_id && (
              <p className="text-xs text-muted-foreground mt-2">⚠️ Isto cancelará o par de entrada/saída</p>
            )}
          </div>

          <Textarea
            placeholder="Motivo do cancelamento..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="min-h-20"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Voltar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleCancelar}
            disabled={loading}
          >
            {loading ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}