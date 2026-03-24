import React from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent } from '@/components/ui/dialog.jsx';
import ProdutoFormCompleto from '@/components/produtos/ProdutoFormCompleto';

export default function NovoProdutoRapidoDialog({ isOpen, onClose, onSuccess, nomeInicial = '' }) {
  // Produto "semente" com o nome digitado na busca preenchido
  const produtoSemente = nomeInicial
    ? { campo_hierarquico_1: nomeInicial, nome: nomeInicial }
    : null;

  const handleSave = async () => {
    // Após salvar, busca o produto mais recente criado para passar ao callback
    try {
      const todos = await base44.entities.Produto.list('-created_date', 1);
      if (todos?.[0]) {
        onSuccess(todos[0]);
      }
    } catch (e) {
      // ignora erro ao buscar — fluxo continua
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full h-[90vh] p-0 overflow-hidden bg-white dark:bg-gray-900 border-0 shadow-2xl rounded-2xl">
        <ProdutoFormCompleto
          produto={produtoSemente}
          onSave={handleSave}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}