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
import { CheckCircle, AlertTriangle, Package, Search, Plus, X, Play, Copy, Eye, EyeOff, Loader2 } from 'lucide-react';
import { agora, formatarLogTime } from '@/components/utils/dateUtils';

export default function RecepcionarEmbarque({ isOpen, onClose, embarque, pedido, onRecebido }) {
  const { toast } = useToast();
  const [itens, setItens] = useState(() => 
    embarque?.itens_embarcados?.map(item => ({
      ...item,
      quantidade_recebida: item.quantidade_recebida ?? item.quantidade_embarcada
    })) || []
  );
  const [dataEntrada, setDataEntrada] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [showDivergenciaDialog, setShowDivergenciaDialog] = useState(false);
  const [showModoDialog, setShowModoDialog] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [searchProduto, setSearchProduto] = useState('');
  const [showNovoProduct, setShowNovoProduct] = useState(false);
  const [novoProduto, setNovoProduto] = useState({ nome: '', hierarquico_1: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [showCodigoConferencia, setShowCodigoConferencia] = useState(false);
  const [codigoConferencia, setCodigoConferencia] = useState('');
  const [showCodigoDecrypt, setShowCodigoDecrypt] = useState(false);
  const [isLoadingState, setIsLoadingState] = useState(false);

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

      // Gerar resumo de divergências para o log
      const divergenciasCount = itens.filter(i => i.divergencia_tipo !== 'Nenhuma').length;
      const divergenciasDesc = divergenciasCount > 0 ? ` | ${divergenciasCount} divergência(s)` : '';
      const resumoItens = itens.map(i => `${i.produto_nome}: ${i.quantidade_recebida}/${i.quantidade_embarcada}`).join('; ');

      await base44.entities.PedidoCompra.update(pedido.id, {
        embarques_registrados: embarquesAtualizados,
        status_recebimento_geral: statusRecebimento_geral,
        tem_divergencias: temComDivergencia,
        historico: (pedido.historico || '') + `\n[RECEPÇÃO EMBARQUE | Status: ${statusRecebimento}${divergenciasDesc} | Data: ${dataEntrada} | Itens: ${resumoItens} | ${formatarLogTime()}]`
      });

      await base44.functions.invoke('recalcularConclusaoPedidoCompra', { pedidoId: pedido.id });

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

      const recebimentoNumero = `REC-${String(embarque?.id || '').slice(-6) || String(Date.now()).slice(-6)}`;
      toast({ title: 'Recebimento concluído', className: 'bg-green-100 text-green-800' });
      onRecebido?.({ recebimentoNumero });
      onClose();
    } catch (error) {
      toast({ title: 'Erro ao confirmar', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const temDivergencias = itens.some(i => i.divergencia_tipo !== 'Nenhuma');
  const isReadOnly = embarque?.status_recebimento_embarque && embarque.status_recebimento_embarque !== 'Pendente';

  const iniciarRecepção = () => {
    setShowModoDialog(true);
  };

  const gerarCodigoConferencia = () => {
    const codigo = 'CONF-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    setCodigoConferencia(codigo);
    setShowCodigoConferencia(true);
    setShowCodigoDecrypt(false);
  };

  const confirmarModo = (modo) => {
    setShowModoDialog(false);
    if (modo === 'simplificado') {
      // Continua na recepção simplificada
    } else if (modo === 'conferencia') {
      gerarCodigoConferencia();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-[calc(100vw-1rem)] md:w-full h-[calc(100vh-1rem)] md:h-[90vh] bg-white dark:bg-gray-900 border-0 rounded-3xl p-0 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800/80 px-6 py-5 border-b border-gray-200 dark:border-gray-700/50 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <Package className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h2 className="font-quicksand text-lg font-semibold text-gray-900 dark:text-white">Receber Embarque</h2>
                {isReadOnly && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Somente leitura</p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Info do embarque - Grid de 2 colunas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Transportadora</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{embarque?.transportadora_nome || '-'}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">ETA Prevista</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {embarque?.eta ? new Date(embarque.eta).toLocaleDateString('pt-BR') : '-'}
                </p>
              </div>
            </div>

            {/* Itens - PDV Style */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 px-1">Itens do Embarque</h3>
              </div>
              {itens.map((item, idx) => {
                const hasDivergencia = item.divergencia_tipo !== 'Nenhuma';
                return (
                  <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 space-y-4 shadow-sm">
                    {/* Produto */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-gray-900 dark:text-white leading-snug">
                          {item.produto_nome}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Embarcado: <span className="font-medium text-gray-900 dark:text-white">{item.quantidade_embarcada} {item.unidade_medida}</span>
                        </p>
                      </div>
                      {hasDivergencia && (
                        <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-1" />
                      )}
                    </div>

                    {/* Quantidade Recebida */}
                    <div>
                      <Label className="text-xs text-gray-600 dark:text-gray-400 font-semibold block mb-2">Quantidade Recebida</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantidade_recebida || ''}
                        onChange={e => handleQuantidadeChange(idx, e.target.value)}
                        disabled={isReadOnly}
                        className="h-14 text-lg bg-white dark:bg-gray-900 border-0 rounded-xl shadow-sm font-semibold text-gray-900 dark:text-white text-center placeholder:text-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="0"
                      />
                    </div>

                    {/* Botão Divergência */}
                    <Button
                      onClick={() => abrirDivergencia(idx)}
                      disabled={isReadOnly}
                      variant={hasDivergencia ? 'default' : 'outline'}
                      className={`w-full h-12 text-sm font-semibold rounded-xl transition-colors ${
                        isReadOnly ? 'opacity-60 cursor-not-allowed' :
                        hasDivergencia
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-0'
                          : 'border-0 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      {hasDivergencia ? 'Divergência Registrada' : 'Registrar Divergência'}
                    </Button>

                    {/* Aviso de divergência */}
                    {hasDivergencia && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-3">
                        <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                          {item.divergencia_tipo === 'Quantidade A Menor' && '⚠ Quantidade menor que embarcada'}
                          {item.divergencia_tipo === 'Produto Diferente - Aceite' && `✓ Aceito: ${item.produto_nome_recebido_diferente}`}
                          {item.divergencia_tipo === 'Produto Diferente - Rejeitado' && '✗ Produto rejeitado'}
                          {item.divergencia_tipo === 'Produto Novo Recebido' && '✓ Novo produto'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer com Data e Botão */}
          <div className="shrink-0 border-t border-gray-200 dark:border-gray-700/50 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800/80 px-6 py-6 space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            {/* Data de Entrada */}
            <div>
              <Label className="text-xs text-gray-700 dark:text-gray-300 font-semibold block mb-2">Data de Entrada</Label>
              <Input
                type="date"
                value={dataEntrada}
                onChange={e => setDataEntrada(e.target.value)}
                disabled={isReadOnly}
                className="h-12 bg-white dark:bg-gray-900 border-0 rounded-xl shadow-sm text-sm text-gray-900 dark:text-white placeholder:text-gray-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              </div>

              {/* Botão Concluir */}
              {!isReadOnly && (
              <Button
                onClick={handleConfirmarRecebimento}
                disabled={isSaving}
                className="w-full h-12 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Concluir Recebimento
                  </>
                )}
              </Button>
              )}
              {isReadOnly && (
              <div className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl text-center">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">✓ Recebimento concluído</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Visualizando dados registrados</p>
              </div>
              )}
          </div>
          </DialogContent>
          </Dialog>

      {/* Dialog de Divergência - PDV Style */}
      <Dialog open={showDivergenciaDialog} onOpenChange={setShowDivergenciaDialog}>
        <DialogContent className="max-w-lg bg-white dark:bg-gray-900 border-0 rounded-3xl p-0 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800/80 px-6 py-5 border-b border-gray-200 dark:border-gray-700/50">
            <h2 className="font-quicksand text-lg font-semibold text-gray-900 dark:text-white">Registrar Divergência</h2>
          </div>

          <div className="px-6 py-6 space-y-4">
            {selectedItemIndex !== null && (
              <>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Produto</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    {itens[selectedItemIndex]?.produto_nome}
                  </p>
                </div>

                {/* Buscar produto diferente */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-600 dark:text-gray-400 font-semibold block mb-2">Buscar Produto Correto</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Nome ou código..."
                        value={searchProduto}
                        onChange={e => setSearchProduto(e.target.value)}
                        className="pl-10 h-11 bg-white dark:bg-gray-900 border-0 rounded-xl shadow-sm text-sm"
                      />
                    </div>
                  </div>

                  {filteredProdutos.length > 0 && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                      {filteredProdutos.map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleAceitarTroca(p.id, p.nome)}
                          className="w-full text-left px-4 py-3 hover:bg-teal-50 dark:hover:bg-teal-900/20 border-b border-gray-200 dark:border-gray-700 last:border-0 transition-colors"
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{p.nome}</p>
                          {p.codigo_interno && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.codigo_interno}</p>}
                        </button>
                      ))}
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNovoProduct(!showNovoProduct)}
                    className="w-full h-11 text-sm font-semibold border-0 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Novo Produto
                  </Button>

                  {showNovoProduct && (
                    <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <Input
                        placeholder="Nome do produto"
                        value={novoProduto.nome}
                        onChange={e => setNovoProduto({...novoProduto, nome: e.target.value})}
                        className="h-11 bg-white dark:bg-gray-900 border-0 rounded-lg text-sm shadow-sm"
                      />
                      <Input
                        placeholder="Categoria"
                        value={novoProduto.hierarquico_1}
                        onChange={e => setNovoProduto({...novoProduto, hierarquico_1: e.target.value})}
                        className="h-11 bg-white dark:bg-gray-900 border-0 rounded-lg text-sm shadow-sm"
                      />
                      <Button
                        onClick={handleNovoProduct}
                        className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-sm font-semibold text-white rounded-lg"
                      >
                        Criar e Aceitar
                      </Button>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleRejeitar}
                  className="w-full h-11 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-0 font-semibold text-sm rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50"
                >
                  Rejeitar Produto
                </Button>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700/50 px-6 py-4">
            <Button
              onClick={() => setShowDivergenciaDialog(false)}
              className="w-full h-11 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-0 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Seleção de Modo */}
      <AlertDialog open={showModoDialog} onOpenChange={setShowModoDialog}>
        <AlertDialogContent className="max-w-lg bg-white dark:bg-gray-900 border-0 rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">Como deseja proceder?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            <button
              onClick={() => confirmarModo('simplificado')}
              className="w-full text-left bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl p-4 transition-colors"
            >
              <p className="font-semibold text-gray-900 dark:text-white">✓ Recepção Simplificada</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Confirmar recebimento direto (modelo atual)</p>
            </button>
            <button
              onClick={() => confirmarModo('conferencia')}
              className="w-full text-left bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl p-4 transition-colors"
            >
              <p className="font-semibold text-gray-900 dark:text-white"><Search className="w-4 h-4 inline mr-1" /> Conferência Cega</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Enviar para conferência com senha de acesso</p>
            </button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-0 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-semibold">Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Código Conferência Cega */}
      <Dialog open={showCodigoConferencia} onOpenChange={setShowCodigoConferencia}>
        <DialogContent className="max-w-lg bg-white dark:bg-gray-900 border-0 rounded-3xl p-0 overflow-hidden">
          <div className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800/80 px-6 py-5 border-b border-gray-200 dark:border-gray-700/50">
            <h2 className="font-quicksand text-lg font-semibold text-gray-900 dark:text-white">Código Conferência Cega</h2>
          </div>
          <div className="px-6 py-8 space-y-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Compartilhe este código com o conferente para acessar a conferência cega em outro dispositivo.
            </p>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 text-center">
              <div className="flex items-center justify-between gap-3 bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <span className="text-2xl font-bold tracking-widest text-gray-900 dark:text-white font-mono">
                  {showCodigoDecrypt ? codigoConferencia : '••••••••••••••'}
                </span>
                <button
                  onClick={() => setShowCodigoDecrypt(!showCodigoDecrypt)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {showCodigoDecrypt ? (
                    <EyeOff className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(codigoConferencia);
                toast({ title: 'Código copiado', className: 'bg-green-100 text-green-800' });
              }}
              className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copiar Código
            </button>
            <button
              onClick={() => {
                setShowCodigoConferencia(false);
                onClose();
              }}
              className="w-full h-12 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}