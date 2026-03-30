import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Package, User, DollarSign, Calendar, PlusCircle, CheckCircle, AlertTriangle, Search, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { registrarTransicao } from './transicaoHelper';

export default function VincularPedidosManifestos({ pedidosAguardando, onRefresh }) {
  const [selectedPedidos, setSelectedPedidos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const pedidosFiltrados = pedidosAguardando.filter(p => 
    p.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.fornecedor_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Agrupar por fornecedor
  const pedidosPorFornecedor = pedidosFiltrados.reduce((acc, pedido) => {
    const fornecedorId = pedido.fornecedor_id;
    if (!acc[fornecedorId]) {
      acc[fornecedorId] = {
        fornecedor_id: fornecedorId,
        fornecedor_nome: pedido.fornecedor_nome,
        pedidos: []
      };
    }
    acc[fornecedorId].pedidos.push(pedido);
    return acc;
  }, {});

  const grupos = Object.values(pedidosPorFornecedor);

  const togglePedido = (pedidoId) => {
    setSelectedPedidos(prev => 
      prev.includes(pedidoId) 
        ? prev.filter(id => id !== pedidoId)
        : [...prev, pedidoId]
    );
  };

  const handleVincular = () => {
    if (selectedPedidos.length === 0) {
      toast.error('Selecione pelo menos um pedido');
      return;
    }
    setShowConfirm(true);
  };

  const confirmarVinculacao = async () => {
    console.log('Iniciando vinculação, pedidos selecionados:', selectedPedidos);
    
    if (selectedPedidos.length === 0) {
      toast.error('Selecione pelo menos um pedido');
      setShowConfirm(false);
      return;
    }

    try {
      toast.loading('Criando manifesto(s)...');
      
      // Buscar os pedidos selecionados
      const pedidosSelecionadosData = pedidosAguardando.filter(p => selectedPedidos.includes(p.id));
      console.log('Pedidos encontrados:', pedidosSelecionadosData);
      
      if (pedidosSelecionadosData.length === 0) {
        toast.error('Nenhum pedido encontrado');
        setShowConfirm(false);
        return;
      }
      
      // Agrupar pedidos por fornecedor
      const pedidosPorFornecedor = pedidosSelecionadosData.reduce((acc, pedido) => {
        const fornecedorId = pedido.fornecedor_id;
        if (!acc[fornecedorId]) {
          acc[fornecedorId] = {
            fornecedor_id: fornecedorId,
            fornecedor_nome: pedido.fornecedor_nome,
            pedidos: []
          };
        }
        acc[fornecedorId].pedidos.push(pedido);
        return acc;
      }, {});

      const gruposFornecedores = Object.values(pedidosPorFornecedor);
      console.log(`Criando ${gruposFornecedores.length} manifesto(s) para ${gruposFornecedores.length} fornecedor(es)`);

      // Gerar números dos manifestos
      const todosManifestos = await base44.entities.ManifestoEntrada.list();
      let contadorManifestos = todosManifestos.length + 1;

      const manifestosCriados = [];

      // Criar um manifesto para cada fornecedor
      for (const grupo of gruposFornecedores) {
        const numero = `ME-${String(contadorManifestos).padStart(5, '0')}`;
        console.log(`Criando manifesto ${numero} para fornecedor ${grupo.fornecedor_nome}`);

        // Consolidar itens dos pedidos deste fornecedor
        const itensEsperados = [];
        
        for (const pedido of grupo.pedidos) {
          for (const item of pedido.itens || []) {
            const existente = itensEsperados.find(ie => ie.produto_id === item.produto_id);
            if (existente) {
              existente.quantidade_esperada += (item.quantidade || 0);
            } else {
              itensEsperados.push({
                produto_id: item.produto_id,
                produto_nome: item.produto_nome,
                quantidade_esperada: item.quantidade || 0,
                quantidade_conferida: 0,
                divergencia: false
              });
            }
          }
        }

        // Criar o manifesto
        const novoManifesto = await base44.entities.ManifestoEntrada.create({
          numero,
          pedido_compra_id: grupo.pedidos[0].id,
          pedido_numero: grupo.pedidos[0].numero,
          fornecedor_id: grupo.fornecedor_id,
          fornecedor_nome: grupo.fornecedor_nome,
          data_recebimento: new Date().toISOString(),
          status: 'Aguardando Conferência',
          itens_esperados: itensEsperados
        });

        console.log('Manifesto criado:', novoManifesto);
        manifestosCriados.push(novoManifesto);

        // Atualizar pedidos deste fornecedor com o manifesto_entrada_id
        await Promise.all(
          grupo.pedidos.map(async (pedido) => {
            await base44.entities.PedidoCompra.update(pedido.id, {
              manifesto_entrada_id: novoManifesto.id,
              status: 'Em Trânsito'
            });
            await registrarTransicao({
              pedidoId: pedido.id,
              pedidoNumero: pedido.numero,
              statusAnterior: pedido.status,
              statusNovo: 'Em Trânsito',
              responsavel: { id: '', nome: 'Sistema', email: '' },
              observacao: `Vinculado ao Manifesto ${novoManifesto.numero}`,
              tipoAutenticacao: 'Sistema',
            });
          })
        );

        contadorManifestos++;
      }

      console.log('Todos os manifestos criados com sucesso:', manifestosCriados);
      toast.dismiss();
      
      if (manifestosCriados.length === 1) {
        toast.success(`Manifesto ${manifestosCriados[0].numero} criado com sucesso!`);
      } else {
        toast.success(`${manifestosCriados.length} manifestos criados com sucesso!`);
      }
      
      setSelectedPedidos([]);
      setShowConfirm(false);
      await onRefresh();
    } catch (error) {
      console.error('Erro completo ao vincular:', error);
      toast.dismiss();
      toast.error(`Erro ao criar manifesto(s): ${error.message}`);
      setShowConfirm(false);
    }
  };

  const formatValor = (valor) => {
    return (valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Buscar por Nº ou fornecedor..." 
            className="h-11 pl-9 bg-white dark:bg-gray-800 border-0 shadow-sm rounded-2xl" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        <Button 
          onClick={handleVincular} 
          disabled={selectedPedidos.length === 0}
          className="h-11 bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 gap-2 shadow-sm rounded-2xl"
        >
          <CheckCircle className="w-4 h-4" />
          Criar Manifesto ({selectedPedidos.length})
        </Button>
      </div>

      {grupos.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhum pedido aguardando vinculação</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grupos.map(grupo => (
            <div key={grupo.fornecedor_id} className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-3 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{grupo.fornecedor_nome}</h3>
                      <p className="text-[11px] text-gray-500">{grupo.pedidos.length} pedido(s)</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const todosSelecionados = grupo.pedidos.every(p => selectedPedidos.includes(p.id));
                      if (todosSelecionados) {
                        setSelectedPedidos(prev => prev.filter(id => !grupo.pedidos.map(p => p.id).includes(id)));
                      } else {
                        setSelectedPedidos(prev => [...new Set([...prev, ...grupo.pedidos.map(p => p.id)])]);
                      }
                    }}
                    className="h-9 gap-2 border-0 shadow-sm rounded-2xl px-3"
                  >
                    {grupo.pedidos.every(p => selectedPedidos.includes(p.id)) ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {grupo.pedidos.map(pedido => {
                  const isSelected = selectedPedidos.includes(pedido.id);
                  return (
                    <div
                      key={pedido.id}
                      onClick={() => togglePedido(pedido.id)}
                      className={`p-3 cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-gray-100 dark:bg-gray-700/70 ring-1 ring-gray-300 dark:ring-gray-600' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                          isSelected 
                            ? 'bg-gray-900 border-gray-900 dark:bg-gray-100 dark:border-gray-100' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isSelected && <CheckCircle className="w-3 h-3 text-white dark:text-gray-900" />}
                        </div>

                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2.5">
                          <div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-0.5">Número</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{pedido.numero}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-0.5">Criação</p>
                            <p className="text-xs text-gray-700 dark:text-gray-300">
                              {pedido.created_date ? format(parseISO(pedido.created_date), 'dd/MM/yyyy') : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-0.5">Itens</p>
                            <p className="text-xs text-gray-700 dark:text-gray-300">{pedido.itens?.length || 0}</p>
                          </div>
                          <div className="text-left md:text-right col-span-2 md:col-span-1">
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-0.5">Total</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">R$ {formatValor(pedido.valor_total)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              Criar Manifesto de Entrada
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {(() => {
              const pedidosSelecionadosData = pedidosAguardando.filter(p => selectedPedidos.includes(p.id));
              const fornecedoresUnicos = [...new Set(pedidosSelecionadosData.map(p => p.fornecedor_id))];
              
              if (fornecedoresUnicos.length === 1) {
                return (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Será criado um novo <strong>Manifesto de Entrada</strong> agrupando os {selectedPedidos.length} pedido(s) selecionado(s).
                    </p>
                    <p className="text-xs text-gray-500 mt-3">
                      Os itens de todos os pedidos serão consolidados no manifesto para conferência única.
                    </p>
                  </>
                );
              } else {
                return (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Serão criados <strong>{fornecedoresUnicos.length} Manifestos de Entrada</strong>, um para cada fornecedor.
                    </p>
                    <p className="text-xs text-gray-500 mt-3">
                      Total de {selectedPedidos.length} pedido(s) selecionado(s) de {fornecedoresUnicos.length} fornecedor(es) diferentes.
                    </p>
                  </>
                );
              }
            })()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} className="border-0 shadow-sm">
              Cancelar
            </Button>
            <Button onClick={confirmarVinculacao} className="bg-teal-600 hover:bg-teal-700">
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}