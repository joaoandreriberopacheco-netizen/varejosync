import React, { useState } from 'react';
import { MoreVertical, XCircle, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import CancelarLancamentoDialog from './CancelarLancamentoDialog';

export default function LancamentoItemActoes({ lancamento, onAcao }) {
  const [showCancelarDialog, setShowCancelarDialog] = useState(false);
  
  const podeAgir = lancamento?.status === 'Pago' || lancamento?.status === 'Em Aberto';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem 
            onClick={() => setShowCancelarDialog(true)}
            disabled={!podeAgir}
            className="gap-2 cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            Cancelar Movimento
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CancelarLancamentoDialog
        isOpen={showCancelarDialog}
        onClose={() => setShowCancelarDialog(false)}
        lancamento={lancamento}
        onSuccess={() => onAcao?.()}
      />
    </>
  );
}