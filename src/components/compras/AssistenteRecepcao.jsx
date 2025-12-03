import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, Camera, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';

export default function AssistenteRecepcao({ evento, onConcluir, onCancelar }) {
  const [etapa, setEtapa] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [produtos, setProdutos] = useState([]);
  
  // Etapa 1 - Diário de Bordo
  const [teveAtraso, setTeveAtraso] = useState(false);
  const [causaAtraso, setCausaAtraso] = useState('');
  const [teveAvarias, setTeveAvarias] = useState(false);
  const [fotoAvarias, setFotoAvarias] = useState(null);
  const [sugestaoMelhoria, setSugestaoMelhoria] = useState('');
  
  // Etapa 2 - Gateway de Recepção
  const [contagemVolumesOk, setContagemVolumesOk] = useState(true);
  const [itensRecebidos, setItensRecebidos] = useState([]);
  
  // Etapa 3 - Veredito
  const [veredito, setVeredito] = useState('');
  const [observacoesDiscrepancia, setObservacoesDiscrepancia] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      // Buscar produtos dos POs associados
      const todosProdutos = await base44.entities.Produto.list();
      setProdutos(todosProdutos);
      
      // Buscar os POs do evento para montar a lista de itens esperados
      const todosPOs = await base44.entities.PedidoCompra.list();
      const posDoEvento = todosPOs.filter(po => evento.pedidos_compra_ids?.includes(po.id));
      
      // Consolidar itens de todos os POs
      const itensConsolidados = [];
      posDoEvento.forEach(po => {
        po.itens?.forEach(item => {
          const existente = itensConsolidados.find(i => i.produto_id === item.produto_id);
          if (existente) {
            existente.quantidade_esperada += item.quantidade;
          } else {
            itensConsolidados.push({
              produto_id: item.produto_id,
              produto_nome: item.produto_nome,
              quantidade_esperada: item.quantidade,
              quantidade_recebida: item.quantidade, // Pré-preencher com esperado
              lote: '',
              validade: '',
              tem_avaria: false
            });
          }
        });
      });
      
      setItensRecebidos(itensConsolidados);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const handleUploadFoto = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setFotoAvarias(file_url);
        toast({
          title: "✓ Foto enviada!",
          className: "bg-emerald-100 text-emerald-800"
        });
      } catch (error) {
        toast({
          title: "Erro ao enviar foto",
          description: error.message,
          variant: "destructive"
        });
      }
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItens = [...itensRecebidos];
    newItens[index][field] = value;
    setItensRecebidos(newItens);
  };

  const calcularDiscrepancia = () => {
    return itensRecebidos.some(item => 
      item.quantidade_recebida !== item.quantidade_esperada || item.tem_avaria
    );
  };

  const handleProximaEtapa = () => {
    if (etapa < 3) {
      setEtapa(etapa + 1);
    }
  };

  const handleVoltarEtapa = () => {
    if (etapa > 1) {
      setEtapa(etapa - 1);
    }
  };

  const handleConcluir = async () => {
    if (!veredito) {
      toast({
        title: "Selecione o veredito",
        description: "É necessário informar se está tudo em ordem ou há discrepância.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Atualizar o evento com os dados coletados
      await base44.entities.EventosLogisticos.update(evento.id, {
        status: 'Concluído',
        teve_atraso: teveAtraso,
        causa_atraso: teveAtraso ? causaAtraso : null,
        teve_avarias: teveAvarias,
        foto_avarias_url: fotoAvarias,
        sugestao_melhoria: sugestaoMelhoria,
        contagem_volumes_ok: contagemVolumesOk,
        itens_recebidos: itensRecebidos,
        veredito_conformidade: veredito,
        observacoes_discrepancia: veredito === 'Há Discrepância' ? observacoesDiscrepancia : null,
        data_hora_conclusao: new Date().toISOString()
      });

      // BIFURCAÇÃO BASEADA NO VEREDITO
      if (veredito === 'Tudo em Ordem') {
        // ✅ CAMINHO VERDE: Tudo OK
        
        // 1. Criar MovimentacoesEstoque para cada item
        for (const item of itensRecebidos) {
          const produto = produtos.find(p => p.id === item.produto_id);
          await base44.entities.MovimentacaoEstoque.create({
            produto_id: item.produto_id,
            produto_nome: item.produto_nome,
            tipo: 'Entrada',
            motivo: 'Compra',
            quantidade: item.quantidade_recebida,
            custo_unitario: produto?.preco_custo_calculado || 0,
            documento_referencia: evento.numero,
            observacoes: `Recepção via ${evento.titulo}`,
            usuario_responsavel: currentUser.full_name
          });
          
          // Atualizar estoque do produto
          if (produto) {
            await base44.entities.Produto.update(item.produto_id, {
              estoque_atual: (produto.estoque_atual || 0) + item.quantidade_recebida
            });
          }
        }
        
        // 2. Mudar status dos POs para "Recebido"
        const todosPOs = await base44.entities.PedidoCompra.list();
        const posDoEvento = todosPOs.filter(po => evento.pedidos_compra_ids?.includes(po.id));
        
        for (const po of posDoEvento) {
          await base44.entities.PedidoCompra.update(po.id, {
            status: 'Recebido'
          });
          
          // 3. Buscar LancamentoFinanceiro do PO e liberar para pagamento
          const lancamentos = await base44.entities.LancamentoFinanceiro.list();
          const lancamentoDoPO = lancamentos.find(l => l.referencia_id === po.id && l.status === 'Aguardando Recepção');
          
          if (lancamentoDoPO) {
            await base44.entities.LancamentoFinanceiro.update(lancamentoDoPO.id, {
              status: 'Liberado para Pagamento'
            });
            
            // 4. Criar Tarefa para o Financeiro
            await base44.entities.Tarefa.create({
              titulo: `Pagar Fatura - ${po.numero}`,
              tipo: 'Pagar Fatura',
              status: 'Pendente',
              prioridade: 'Alta',
              responsavel_id: currentUser.id, // Idealmente, seria o gestor financeiro
              responsavel_nome: 'Equipe Financeira',
              referencia_tipo: 'LancamentoFinanceiro',
              referencia_id: lancamentoDoPO.id,
              referencia_numero: po.numero,
              valor_pendente: lancamentoDoPO.valor,
              descricao: `Pagamento liberado após recepção OK de ${po.numero}. Pagar ao fornecedor ${po.fornecedor_nome}.`,
              data_vencimento: lancamentoDoPO.data_vencimento
            });
          }
        }
        
        toast({
          title: "✓ Recepção Concluída!",
          description: `Estoque atualizado e ${posDoEvento.length} pagamento(s) liberado(s).`,
          className: "bg-emerald-100 text-emerald-800",
          duration: 5000
        });
        
      } else {
        // ⚠️ CAMINHO VERMELHO: Há Discrepância
        
        // 1. Mudar status dos POs para "Recebido com Discrepância"
        const todosPOs = await base44.entities.PedidoCompra.list();
        const posDoEvento = todosPOs.filter(po => evento.pedidos_compra_ids?.includes(po.id));
        
        for (const po of posDoEvento) {
          await base44.entities.PedidoCompra.update(po.id, {
            status: 'Recebido com Discrepância'
          });
          
          // 2. Buscar LancamentoFinanceiro do PO - MANTER BLOQUEADO
          const lancamentos = await base44.entities.LancamentoFinanceiro.list();
          const lancamentoDoPO = lancamentos.find(l => l.referencia_id === po.id && l.status === 'Aguardando Recepção');
          
          // Não mudar status, continua "Aguardando Recepção" (BLOQUEADO)
          
          // 3. Criar Tarefa URGENTE para o Comprador
          await base44.entities.Tarefa.create({
            titulo: `🔴 Resolver Discrepância - ${po.numero}`,
            tipo: 'Resolver Discrepância',
            status: 'Atrasada',
            prioridade: 'Urgente',
            responsavel_id: currentUser.id,
            responsavel_nome: currentUser.full_name,
            referencia_tipo: 'PedidoCompra',
            referencia_id: po.id,
            referencia_numero: po.numero,
            valor_pendente: lancamentoDoPO?.valor || po.valor_total,
            descricao: `Discrepância identificada na recepção: ${observacoesDiscrepancia}. Pagamento bloqueado até resolução.`,
            data_vencimento: format(new Date(), 'yyyy-MM-dd')
          });
        }
        
        toast({
          title: "⚠️ Discrepância Registrada",
          description: `Pagamento bloqueado. Tarefa urgente criada para resolução.`,
          className: "bg-red-100 text-red-800",
          duration: 5000
        });
      }
      
      onConcluir();
      
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const progresso = (etapa / 3) * 100;

  return (
    <Dialog open={true} onOpenChange={onCancelar}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Assistente de Recepção - {evento?.titulo}
          </DialogTitle>
          <div className="mt-4">
            <Progress value={progresso} className="h-2" />
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span className={etapa === 1 ? 'font-bold text-emerald-600' : ''}>1. Diário de Bordo</span>
              <span className={etapa === 2 ? 'font-bold text-emerald-600' : ''}>2. Gateway de Recepção</span>
              <span className={etapa === 3 ? 'font-bold text-emerald-600' : ''}>3. Veredito Final</span>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6">
          {/* ETAPA 1: DIÁRIO DE BORDO */}
          {etapa === 1 && (
            <div className="space-y-6">
              <Card className="bg-emerald-50 border-emerald-200">
                <CardHeader>
                  <CardTitle className="text-lg">📋 Diário de Bordo da Operação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Houve atraso na coleta/chegada?</Label>
                    <RadioGroup value={teveAtraso ? 'sim' : 'nao'} onValueChange={(v) => setTeveAtraso(v === 'sim')}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="nao" id="nao-atraso" />
                        <Label htmlFor="nao-atraso" className="cursor-pointer">Não</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sim" id="sim-atraso" />
                        <Label htmlFor="sim-atraso" className="cursor-pointer">Sim</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {teveAtraso && (
                    <div>
                      <Label>Causa do atraso:</Label>
                      <RadioGroup value={causaAtraso} onValueChange={setCausaAtraso}>
                        <div className="space-y-2 mt-2">
                          {['Congestionamento', 'Mau Tempo', 'Problemas Mecânicos', 'Atraso do Fornecedor', 'Outro'].map(causa => (
                            <div key={causa} className="flex items-center space-x-2">
                              <RadioGroupItem value={causa} id={causa} />
                              <Label htmlFor={causa} className="cursor-pointer">{causa}</Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  <div>
                    <Label className="text-base font-semibold mb-3 block">Avarias registradas na coleta?</Label>
                    <RadioGroup value={teveAvarias ? 'sim' : 'nao'} onValueChange={(v) => setTeveAvarias(v === 'sim')}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="nao" id="nao-avaria" />
                        <Label htmlFor="nao-avaria" className="cursor-pointer">Não</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sim" id="sim-avaria" />
                        <Label htmlFor="sim-avaria" className="cursor-pointer">Sim (Anexar foto)</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {teveAvarias && (
                    <div>
                      <Label>Foto da avaria:</Label>
                      <div className="mt-2">
                        <Input type="file" accept="image/*" onChange={handleUploadFoto} />
                        {fotoAvarias && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" />
                            Foto anexada com sucesso
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>Sugestões para a próxima operação:</Label>
                    <Textarea
                      placeholder="Ex: Solicitar caminhão maior, combinar horário diferente..."
                      value={sugestaoMelhoria}
                      onChange={(e) => setSugestaoMelhoria(e.target.value)}
                      rows={3}
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ETAPA 2: GATEWAY DE RECEPÇÃO */}
          {etapa === 2 && (
            <div className="space-y-6">
              <Card className="bg-teal-50 border-teal-200">
                <CardHeader>
                  <CardTitle className="text-lg">📦 Conferência de Recebimento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Contagem de volumes vs. NF está OK?</Label>
                    <RadioGroup value={contagemVolumesOk ? 'sim' : 'nao'} onValueChange={(v) => setContagemVolumesOk(v === 'sim')}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sim" id="volumes-ok" />
                        <Label htmlFor="volumes-ok" className="cursor-pointer">Sim</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="nao" id="volumes-nok" />
                        <Label htmlFor="volumes-nok" className="cursor-pointer">Não (Há divergência)</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Contagem Cega (Itens Esperados)</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {itensRecebidos.map((item, index) => (
                        <Card key={index} className="bg-white">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold">{item.produto_nome}</div>
                                <div className="text-sm text-gray-600">Esperado: {item.quantidade_esperada}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Qtd. Recebida *</Label>
                                <Input
                                  type="number"
                                  value={item.quantidade_recebida}
                                  onChange={(e) => handleItemChange(index, 'quantidade_recebida', parseFloat(e.target.value) || 0)}
                                  className="font-bold"
                                />
                              </div>
                              <div>
                                <Label>Lote</Label>
                                <Input
                                  value={item.lote}
                                  onChange={(e) => handleItemChange(index, 'lote', e.target.value)}
                                  placeholder="Ex: L2024-001"
                                />
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={item.tem_avaria}
                                onCheckedChange={(checked) => handleItemChange(index, 'tem_avaria', checked)}
                              />
                              <Label className="cursor-pointer">Este item apresenta avaria</Label>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ETAPA 3: VEREDITO FINAL */}
          {etapa === 3 && (
            <div className="space-y-6">
              <Card className={calcularDiscrepancia() ? "bg-yellow-50 border-yellow-300" : "bg-emerald-50 border-emerald-200"}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {calcularDiscrepancia() ? (
                      <>
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        Possível Discrepância Detectada
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        Análise Preliminar: Sem Divergências
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {calcularDiscrepancia() && (
                    <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                      <p className="text-sm text-yellow-800 font-semibold">
                        ⚠️ Foram identificadas diferenças entre as quantidades esperadas e recebidas, ou produtos com avaria.
                      </p>
                    </div>
                  )}

                  <div>
                    <Label className="text-base font-bold mb-4 block">🎯 VEREDITO FINAL: O material está em conformidade?</Label>
                    <RadioGroup value={veredito} onValueChange={setVeredito}>
                      <div className="space-y-3">
                        <Card className={veredito === 'Tudo em Ordem' ? 'border-2 border-emerald-500 bg-emerald-50' : 'border-2 border-gray-200'}>
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                              <RadioGroupItem value="Tudo em Ordem" id="veredito-ok" />
                              <Label htmlFor="veredito-ok" className="cursor-pointer flex-1">
                                <div className="font-bold text-emerald-700">✓ SIM, TUDO EM ORDEM</div>
                                <div className="text-sm text-gray-600">Liberar estoque e pagamento</div>
                              </Label>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className={veredito === 'Há Discrepância' ? 'border-2 border-red-500 bg-red-50' : 'border-2 border-gray-200'}>
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                              <RadioGroupItem value="Há Discrepância" id="veredito-nok" />
                              <Label htmlFor="veredito-nok" className="cursor-pointer flex-1">
                                <div className="font-bold text-red-700">✗ NÃO, HÁ UMA DISCREPÂNCIA</div>
                                <div className="text-sm text-gray-600">Bloquear pagamento e criar tarefa urgente</div>
                              </Label>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </RadioGroup>
                  </div>

                  {veredito === 'Há Discrepância' && (
                    <div>
                      <Label>Descrever a discrepância identificada: *</Label>
                      <Textarea
                        placeholder="Ex: Faltaram 5 unidades do produto X, item Y veio com embalagem danificada..."
                        value={observacoesDiscrepancia}
                        onChange={(e) => setObservacoesDiscrepancia(e.target.value)}
                        rows={4}
                        className="mt-2"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center border-t pt-4">
          <Button
            variant="outline"
            onClick={handleVoltarEtapa}
            disabled={etapa === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          {etapa < 3 ? (
            <Button onClick={handleProximaEtapa} className="bg-emerald-600 hover:bg-emerald-700">
              Próxima Etapa
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleConcluir} 
              disabled={!veredito || isProcessing}
              className={veredito === 'Tudo em Ordem' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isProcessing ? 'Processando...' : 'Concluir Recepção'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}