import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import OperacaoAuthenticator from '@/components/auth/OperacaoAuthenticator';
import { getTenantId } from '@/components/utils/tenant';

const ENTITIES = [
  { id: 'Produto', label: 'Produtos', description: 'Todos os produtos cadastrados (exclui CustoDetalhado junto)' },
  { id: 'Terceiro', label: 'Terceiros', description: 'Clientes e fornecedores' },
  { id: 'ContasFinanceiras', label: 'Contas Financeiras', description: 'Contas bancárias e caixas' },
  { id: 'LancamentoFinanceiro', label: 'Lançamentos Financeiros', description: 'Receitas e despesas' },
  { id: 'PedidoCompra', label: 'Pedidos de Compra', description: 'Todos os pedidos de compra' },
  { id: 'PedidoVenda', label: 'Pedidos de Venda', description: 'Todas as vendas e orçamentos' },
  { id: 'MovimentacaoEstoque', label: 'Movimentações de Estoque', description: 'Histórico de entradas/saídas' },
  { id: 'Supermanifesto', label: 'Supermanifestos', description: 'Manifestos logísticos' },
  { id: 'Tarefa', label: 'Tarefas', description: 'Todas as tarefas do sistema' },
  { id: 'Categoria', label: 'Categorias', description: 'Categorias de produtos' },
  { id: 'Cotacao', label: 'Cotações', description: 'Todas as cotações de compra' }
];

export default function RecomecarDoZero() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleToggleEntity = (entityId) => {
    setSelectedEntities(prev => 
      prev.includes(entityId) 
        ? prev.filter(id => id !== entityId)
        : [...prev, entityId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEntities.length === ENTITIES.length) {
      setSelectedEntities([]);
    } else {
      setSelectedEntities(ENTITIES.map(e => e.id));
    }
  };

  const handleInitiateDelete = () => {
    if (selectedEntities.length === 0) {
      toast({
        title: "Nenhuma entidade selecionada",
        description: "Selecione pelo menos uma entidade para zerar.",
        variant: "destructive"
      });
      return;
    }
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = async (authData) => {
    setIsProcessing(true);
    let totalDeleted = 0;
    let errorCount = 0;

    try {
      // Ordem de deleção: primeiro dependências, depois entidades principais
      const ordenacaoDependencias = [
        'MovimentacaoEstoque', 
        'OrdemSeparacao', 
        'ProtocoloEntrega', 
        'AgendaLogistica',
        'LancamentoFinanceiro', 
        'MovimentosCaixa',
        'PedidoVenda', 
        'PedidoCompra', 
        'VendaPerdida', 
        'Cotacao', 
        'Tarefa',
        'Supermanifesto',
        'Produto',
        'Veiculo', 
        'Campanha', 
        'TabelaPreco', 
        'Terceiro',
        'ContasFinanceiras', 
        'FormasDePagamento',
        'Categoria'
      ];

      // Deletar apenas as entidades selecionadas, na ordem de dependências
      for (const entityId of ordenacaoDependencias) {
        if (!selectedEntities.includes(entityId)) continue;

        try {
          let hasMore = true;
          let pageCount = 0;
          
          while (hasMore && pageCount < 50) {
            const records = await base44.entities[entityId].list('-created_date', 100);
            
            if (records && records.length > 0) {
              await Promise.all(records.map(r => base44.entities[entityId].delete(r.id)));
              totalDeleted += records.length;
              pageCount++;
              
              if (records.length < 100) hasMore = false;
              
              await new Promise(resolve => setTimeout(resolve, 100));
            } else {
              hasMore = false;
            }
          }
          successCount++;
        } catch (error) {
          console.error(`Erro ao zerar ${entityId}:`, error);
          errorCount++;
        }
      }

      toast({
        title: "Operação concluída",
        description: `${totalDeleted} registro(s) deletado(s) de ${successCount} entidade(s). ${errorCount > 0 ? `${errorCount} erro(s).` : ''}`,
        className: "bg-emerald-100 text-emerald-800"
      });

      setSelectedEntities([]);
      setIsOpen(false);
      setIsAuthOpen(false);
      
      // Recarregar página após 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      toast({
        title: "Erro na operação",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border-0">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              Recomeçar do Zero
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ferramenta para zerar bases de dados específicas. Use com cautela - esta ação é irreversível.
            </p>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="gap-2 border-0 shadow-sm"
          onClick={() => setIsOpen(true)}
        >
          <Trash2 className="w-4 h-4" />
          Abrir Ferramenta
        </Button>
      </div>

      {/* Dialog Principal */}
      <Dialog open={isOpen && !isAuthOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl dark:bg-gray-800 border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Recomeçar do Zero
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border-0">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900 dark:text-red-200 mb-1">
                    Atenção: Operação Irreversível
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Esta ação irá deletar permanentemente todos os registros das entidades selecionadas. 
                    Não há como recuperar os dados após a exclusão.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Selecione as entidades para zerar:
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-7 text-xs"
                >
                  {selectedEntities.length === ENTITIES.length ? 'Desmarcar Todas' : 'Marcar Todas'}
                </Button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {ENTITIES.map(entity => (
                  <label
                    key={entity.id}
                    className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-colors border-0 ${
                      selectedEntities.includes(entity.id)
                        ? 'bg-gray-100 dark:bg-gray-700'
                        : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Checkbox
                      checked={selectedEntities.includes(entity.id)}
                      onCheckedChange={() => handleToggleEntity(entity.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {entity.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {entity.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {selectedEntities.length > 0 && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border-0">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Entidades selecionadas
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedEntities.length} de {ENTITIES.length}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="border-0 shadow-sm"
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleInitiateDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={selectedEntities.length === 0 || isProcessing}
            >
              {isProcessing ? 'Processando...' : 'Autenticar e Zerar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Authenticator */}
      <OperacaoAuthenticator
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
        operationName={`Zerar ${selectedEntities.length} Entidade(s)`}
      />
    </>
  );
}