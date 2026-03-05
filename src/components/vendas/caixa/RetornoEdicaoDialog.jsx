import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit } from 'lucide-react';

export default function RetornoEdicaoDialog({ open, onOpenChange, motivo, onMotivoChange, onConfirmar }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md dark:bg-gray-900 dark:text-gray-200">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2 text-gray-800 dark:text-gray-200">
            <Edit className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            Retornar para Edição
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              O rascunho será devolvido ao vendedor para correção.
            </p>
          </div>
          <div>
            <Label className="text-gray-700 dark:text-gray-300">Motivo do retorno *</Label>
            <Textarea
              placeholder="Ex: Cliente solicitou alteração de produto, erro no valor..."
              value={motivo}
              onChange={(e) => onMotivoChange(e.target.value)}
              rows={3}
              className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => { onOpenChange(false); onMotivoChange(''); }}
              className="flex-1 border-gray-300 hover:bg-gray-50 text-gray-700 dark:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-300">
              Cancelar
            </Button>
            <Button
              onClick={onConfirmar}
              className="flex-1 bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600">
              Confirmar Retorno
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}