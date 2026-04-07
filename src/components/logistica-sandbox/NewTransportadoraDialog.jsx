import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function NewTransportadoraDialog({ open, onOpenChange }) {
  const [nome, setNome] = useState('');
  const [regraViagem, setRegraViagem] = useState('');

  useEffect(() => {
    if (open) {
      setNome('');
      setRegraViagem('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-lg rounded-[28px] border-0 bg-white dark:bg-gray-900 p-0 overflow-hidden shadow-2xl">
        <div className="p-5 space-y-4">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-semibold font-glacial text-gray-900 dark:text-gray-100">Nova transportadora</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da transportadora" className="h-12 rounded-2xl border-0 bg-gray-100 dark:bg-gray-800 shadow-none" />
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-3 space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Saída de referência</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Informe a data-chave da rota. O sistema interpreta que houve uma chegada 7 dias antes dessa saída, calcula o ETA ao fim do ciclo e entende a próxima chegada 7 dias após o ETA.</p>
              <Input value={regraViagem} onChange={(e) => setRegraViagem(e.target.value)} placeholder="Ex: Saída em 10/04/2026 → chegada anterior 7 dias antes → ETA no fim do ciclo" className="h-12 rounded-2xl border-0 bg-white dark:bg-gray-900 shadow-none" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)} className="rounded-2xl bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200">Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}