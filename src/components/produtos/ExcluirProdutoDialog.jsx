import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Loader2, Trash2, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Dialog de exclusão/inativação de produto.
 *
 * Regras:
 * - Se tiver estoque atual > 0 ou movimentações → só inativa (ativo = false)
 * - Se não tiver → exclui de verdade
 * - Se já estiver inativo → oferece reativar
 */
export default function ExcluirProdutoDialog({ produto, open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [fase, setFase] = useState('verificando'); // 'verificando' | 'pode_excluir' | 'so_inativar' | 'ja_inativo'
  const [temMovimentos, setTemMovimentos] = useState(false);

  useEffect(() => {
    if (!open || !produto) return;
    verificarDependencias();
  }, [open, produto]);

  const verificarDependencias = async () => {
    setFase('verificando');
    setLoading(true);
    try {
      const temEstoque = (produto.estoque_atual || 0) > 0;

      // Verifica se tem movimentações de estoque
      const movs = await base44.entities.MovimentacaoEstoque.filter(
        { produto_id: produto.id },
        '-created_date',
        1
      );
      const possuiMovimentos = Array.isArray(movs) && movs.length > 0;
      setTemMovimentos(possuiMovimentos);

      if (!produto.ativo) {
        setFase('ja_inativo');
      } else if (temEstoque || possuiMovimentos) {
        setFase('so_inativar');
      } else {
        setFase('pode_excluir');
      }
    } catch {
      setFase('pode_excluir');
    } finally {
      setLoading(false);
    }
  };

  const handleInativar = async () => {
    setLoading(true);
    try {
      await base44.entities.Produto.update(produto.id, { ativo: false });
      toast.success(`"${produto.nome}" foi inativado.`);
      onSuccess?.();
      onClose();
    } catch {
      toast.error('Erro ao inativar produto.');
    } finally {
      setLoading(false);
    }
  };

  const handleReativar = async () => {
    setLoading(true);
    try {
      await base44.entities.Produto.update(produto.id, { ativo: true });
      toast.success(`"${produto.nome}" foi reativado.`);
      onSuccess?.();
      onClose();
    } catch {
      toast.error('Erro ao reativar produto.');
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async () => {
    setLoading(true);
    try {
      await base44.entities.Produto.delete(produto.id);
      toast.success(`"${produto.nome}" excluído permanentemente.`);
      onSuccess?.();
      onClose();
    } catch {
      toast.error('Erro ao excluir produto.');
    } finally {
      setLoading(false);
    }
  };

  if (!produto) return null;

  return (
    <AlertDialog open={open} onOpenChange={v => !v && onClose()}>
      <AlertDialogContent className="dark:bg-gray-900 dark:border-gray-800 max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base text-gray-900 dark:text-white">
            {fase === 'ja_inativo' ? 'Produto Inativo' : 'Remover Produto'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{produto.nome}</p>

              {fase === 'verificando' && (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <span>Verificando dependências...</span>
                </div>
              )}

              {fase === 'pode_excluir' && (
                <p>Este produto não possui estoque nem movimentações. Deseja <strong className="text-red-600 dark:text-red-400">excluí-lo permanentemente</strong>?</p>
              )}

              {fase === 'so_inativar' && (
                <div className="space-y-1.5">
                  <p>Este produto não pode ser excluído pois possui:</p>
                  <ul className="list-disc ml-4 text-xs space-y-0.5">
                    {(produto.estoque_atual || 0) > 0 && (
                      <li>Estoque atual: <strong>{produto.estoque_atual} {produto.unidade_principal}</strong></li>
                    )}
                    {temMovimentos && <li>Movimentações de estoque registradas</li>}
                  </ul>
                  <p className="pt-1">Ele será <strong className="text-orange-600 dark:text-orange-400">inativado</strong> e ficará oculto nas listagens.</p>
                </div>
              )}

              {fase === 'ja_inativo' && (
                <p>Este produto está inativo. Deseja <strong className="text-green-600 dark:text-green-400">reativá-lo</strong>?</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 flex-col sm:flex-row">
          <AlertDialogCancel
            disabled={loading}
            onClick={onClose}
            className="dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700 text-sm"
          >
            Cancelar
          </AlertDialogCancel>

          {fase === 'pode_excluir' && (
            <Button
              variant="destructive"
              onClick={handleExcluir}
              disabled={loading}
              className="text-sm gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Excluir permanentemente
            </Button>
          )}

          {fase === 'so_inativar' && (
            <Button
              onClick={handleInativar}
              disabled={loading}
              className="text-sm gap-1.5 bg-orange-600 hover:bg-orange-700 text-white"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <EyeOff className="w-3.5 h-3.5" />}
              Inativar produto
            </Button>
          )}

          {fase === 'ja_inativo' && (
            <Button
              onClick={handleReativar}
              disabled={loading}
              className="text-sm gap-1.5 bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Reativar produto
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}