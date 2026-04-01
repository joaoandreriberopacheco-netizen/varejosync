import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, AlertTriangle, Package, Search, Plus, X } from 'lucide-react';
import { agora, formatarLogTime } from '@/components/utils/dateUtils';

export default function RecepcionarEmbarque({ isOpen, onClose, embarque, pedido, onRecebido }) {
  const { toast } = useToast();
  const [itens, setItens] = useState(() => 
    embarque?.itens_embarcados?.map(item => ({
      ...item,
      quantidade_recebida: item.quantidade_recebida ?? item.quantidade_embarcada
    })) || []
  );
  const [showDivergenciaDialog, setShowDivergenciaDialog] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [searchProduto, setSearchProduto] = useState('');
  const [showNovoProduct, setShowNovoProduct] = useState(false);
  const [novoProduto, setNovoProduto] = useState({ nome: '', hierarquico_1: '' });
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      base44.entities.Produto.list().then(setProdutos);
    }
  }, [isOpen]);

  const handleQuantidadeChange = (index, value) => {
    const newItens = [...itens];
    newItens[index].quantidade_recebida = parseFloat(value) || 0;
    
    // Auto-detectar divergência de quantidade
    const qtdEmb = newItens[index].quantidade_embarcada;
    const qtdRec = newItens[index].quantidade_recebida;
    
    if (qtdRec < qtdEmb && newItens[index].divergencia_tipo === 'Nenhuma') {
      newItens[index].divergencia_tipo = 'Quantidade A Menor';
    } else if (qtdRec === qtdEmb && newItens[index].divergencia_tipo === 'Quantidade A Menor') {
      newItens[index].divergencia_tipo = 'Nenhuma';
    }
    
    setItens(newItens);
  };

  const abrirDivergencia = (index) => {
    setSelectedItemIndex(index);
    setShowDivergenciaDialog(true);
    setSearchProduto('');
  };

  const filteredProdutos = useMemo(() => {
    if (!searchProduto.trim()) return [];
    const lower = searchProduto.toLowerCase();
    return produtos.filter(p =>
      p.nome.toLowerCase().includes(lower) ||
      p.codigo_interno?.toLowerCase().includes(lower)
    ).slice(0, 20);
  }, [produtos, searchProduto]);

  const handleAceitarTroca = async (novoId, novoNome) => {
    const newItens = [...itens];
    newItens[selectedItemIndex] = {
      ...newItens[selectedItemIndex],
      produto_id_recebido_diferente: novoId,
      produto_nome_recebido_diferente: novoNome,
      divergencia_tipo: 'Produto Diferente - Aceite'
    };
    setItens(newItens);
    setShowDivergenciaDialog(false);
    setSelectedItemIndex(null);
    toast({ title: 'Troca aceita', description: `Produto alterado para ${novoNome}` });
  };

  const handleRejeitar = () => {
    const newItens = [...itens];
    newItens[selectedItemIndex].divergencia_tipo = 'Produto Diferente - Rejeitado';
    newItens[selectedItemIndex].quantidade_recebida = 0;
    setItens(newItens);
    setShowDivergenciaDialog(false);
    setSelectedItemIndex(null);
    toast({ title: 'Divergência registrada', variant: 'destructive' });
  };

  const handleNovoProduct = async () => {
    if (!novoProduto.nome.trim() || !novoProduto.hierarquico_1.trim()) {
      toast({ title: 'Preenchimento obrigatório', variant: 'destructive' });
      return;
    }

    try {
      const novo = await base44.entities.Produto.create({
        campo_hierarquico_1: novoProduto.hierarquico_1,
        nome: novoProduto.nome,
        preco_venda_padrao: 0,
        tipo: 'Produto',
        ativo: true
      });

      handleAceitarTroca(novo.id, novo.nome);
      setShowNovoProduct(false);
      setProdutos(prev => [...prev, novo]);
    } catch (error) {
      toast({ title: 'Erro ao criar produto', description: error.message, variant: 'destructive' });
    }
  };

  const handleConfirmarRecebimento = async () => {
    setIsSaving(true);
    try {
      // Atualizar embarque no pedido
      const novoEmbarque = { ...embarque, itens_embarcados: itens };
      
      // Determinar status do embarque
      const temDivergencia = itens.some(i => i.divergencia_tipo !== 'Nenhuma');
      const todosRecebidos = itens.every(i => i.quantidade_recebida > 0);
      
      let statusRecebimento = 'Recebido OK';
      if (temDivergencia) {
        statusRecebimento = 'Com Divergência';
      } else if (!todosRecebidos) {
        statusRecebimento = 'Recebido Parcial';
      }
      
      novoEmbarque.status_recebimento_embarque = statusRecebimento;

      // Atualizar pedido
      const embarques = pedido.embarques_registrados || [];
      const embarquesAtualizados = embarques.map(e => 
        e.id === embarque.id ? novoEmbarque : e
      );

      // Calcular status geral de recebimento
      const temComDivergencia = embarquesAtualizados.some(e => e.status_recebimento_embarque === 'Com Divergência');
      const temRecebidoParcial = embarquesAtualizados.some(e => e.status_recebimento_embarque === 'Recebido Parcial');
      const todosRecebidos_geral = embarquesAtualizados.every(e => 
        e.status_recebimento_embarque === 'Recebido OK' || e.status_recebimento_embarque === 'Com Divergência'
      );

      let statusRecebimento_geral = 'Pendente';
      if (todosRecebidos_geral) {
        statusRecebimento_geral = temComDivergencia ? 'Concluído com Divergência' : 'Concluído OK';
      } else if (temRecebidoParcial || temComDivergencia) {
        statusRecebimento_geral = 'Recebido Parcial';
      }

      await base44.entities.PedidoCompra.update(pedido.id, {
        embarques_registrados: embarquesAtualizados,
        status_recebimento_geral: statusRecebimento_geral,
        tem_divergencias: temComDivergencia,
        historico: (pedido.historico || '') + `\n[Recebimento Embarque: ${novoEmbarque.id} | Status: ${statusRecebimento} | ${formatarLogTime()}]`
      });

      // Gerar movimentações de estoque
      for (const item of itens) {
        if (item.quantidade_recebida > 0) {
          const produtoId = item.produto_id_recebido_diferente || item.produto_id;
          await base44.entities.MovimentacaoEstoque.create({
            produto_id: produtoId,
            produto_nome: item.produto_nome_recebido_diferente || item.produto_nome,
            tipo: 'Entrada',
            motivo: 'Compra',
            quantidade: item.quantidade_recebida,
            referencia_tipo: 'PedidoCompra',
            referencia_id: pedido.id,
            referencia_numero: pedido.numero
          });
        }
      }

      toast({ title: 'Recebimento concluído', className: 'bg-green-100 text-green-800' });
      onRecebido?.();
      onClose();
    } catch (error) {
      toast({ title: 'Erro ao confirmar', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const temDivergencias = itens.some(i => i.divergencia_tipo !== 'Nenhuma');

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-0 rounded-2xl">
          <DialogHeader className="sticky top-0 bg-white dark:bg-gray-900 pb-4 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-teal-600" />
              Receber Embarque
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 p-4">
            {/* Info do embarque */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Transportadora:</span>
                <span className="font-medium text-gray-900 dark:text-white">{embarque?.transportadora_nome || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">ETA:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {embarque?.eta ? new Date(embarque.eta).toLocaleDateString('pt-BR') : '-'}
                </span>
              </div>
            </div>

            {/* Itens */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Itens do Embarque</h3>
              {itens.map((item, idx) => {
                const hasDivergencia = item.divergencia_tipo !== 'Nenhuma';
                return (
                  <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {item.produto_nome}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Embarcado: {item.quantidade_embarcada} {item.unidade_medida}
                        </p>
                      </div>
                      {hasDivergencia && (
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Quantidade Recebida</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantidade_recebida || ''}
                          onChange={e => handleQuantidadeChange(idx, e.target.value)}
                          className="h-9 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirDivergencia(idx)}
                        className="h-9 text-xs mt-6 border-gray-300 dark:border-gray-600"
                      >
                        {hasDivergencia ? '⚠ Divergência' : 'Divergência'}
                      </Button>
                    </div>

                    {hasDivergencia && (
                      <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                        {item.divergencia_tipo === 'Quantidade A Menor' && 'Quantidade menor que embarcada'}
                        {item.divergencia_tipo === 'Produto Diferente - Aceite' && `Aceito: ${item.produto_nome_recebido_diferente}`}
                        {item.divergencia_tipo === 'Produto Diferente - Rejeitado' && 'Produto diferente rejeitado'}
                        {item.divergencia_tipo === 'Produto Novo Recebido' && 'Novo produto recebido'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="border-t border-gray-200 dark:border-gray-700 pt-4 gap-2">
            <Button variant="outline" onClick={onClose} className="border-0 shadow-sm">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarRecebimento}
              disabled={isSaving}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isSaving ? 'Salvando...' : temDivergencias ? 'Confirmar com Divergências' : 'Confirmar Recebimento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Divergência */}
      <Dialog open={showDivergenciaDialog} onOpenChange={setShowDivergenciaDialog}>
        <DialogContent className="max-w-lg bg-white dark:bg-gray-900 border-0 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Divergência</DialogTitle>
          </DialogHeader>

          {selectedItemIndex !== null && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {itens[selectedItemIndex]?.produto_nome}
              </p>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo de Divergência</Label>
                <Select defaultValue="Quantidade A Menor">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800">
                    <SelectItem value="Quantidade A Menor">Quantidade Menor</SelectItem>
                    <SelectItem value="Produto Diferente">Produto Trocado</SelectItem>
                    <SelectItem value="Rejeitado">Rejeitar Totalmente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Buscar produto diferente */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Se Produto Diferente, Buscar Produto Correto</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar produto..."
                    value={searchProduto}
                    onChange={e => setSearchProduto(e.target.value)}
                    className="pl-8 bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                  />
                </div>

                {filteredProdutos.length > 0 && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-40 overflow-y-auto">
                    {filteredProdutos.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleAceitarTroca(p.id, p.nome)}
                        className="w-full text-left p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700 last:border-0"
                      >
                        {p.nome}
                      </button>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNovoProduct(!showNovoProduct)}
                  className="w-full text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Criar Novo Produto
                </Button>

                {showNovoProduct && (
                  <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Input
                      placeholder="Nome do produto"
                      value={novoProduto.nome}
                      onChange={e => setNovoProduto({...novoProduto, nome: e.target.value})}
                      className="text-sm h-9 bg-white dark:bg-gray-900 border-0 rounded"
                    />
                    <Input
                      placeholder="Categoria"
                      value={novoProduto.hierarquico_1}
                      onChange={e => setNovoProduto({...novoProduto, hierarquico_1: e.target.value})}
                      className="text-sm h-9 bg-white dark:bg-gray-900 border-0 rounded"
                    />
                    <Button
                      size="sm"
                      onClick={handleNovoProduct}
                      className="w-full h-9 bg-teal-600 hover:bg-teal-700 text-xs text-white"
                    >
                      Criar e Aceitar
                    </Button>
                  </div>
                )}
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleRejeitar}
                className="w-full"
              >
                Rejeitar Produto
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDivergenciaDialog(false)} className="border-0">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}