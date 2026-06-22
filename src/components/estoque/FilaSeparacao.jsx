import React, { useState, useEffect } from 'react';
import { OrdemSeparacao } from '@/entities/OrdemSeparacao';
import { PedidoVenda } from '@/entities/PedidoVenda';
import { Produto } from '@/entities/Produto';
import { MovimentacaoEstoque } from '@/entities/MovimentacaoEstoque';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, P38TableShell } from '@/components/ui/table';
import {
  P38MobileLineList,
  P38MobileLine,
  p38StatusTone,
  p38AccentKeyFromTone,
  P38StatusLabel,
} from '@/components/ui/p38-mobile-line';
import { Package, CheckCircle, Clock, Play, X, Camera, Barcode } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function FilaSeparacao() {
  const [ordens, setOrdens] = useState([]);
  const [ordemSelecionada, setOrdemSelecionada] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [itemAtualIndex, setItemAtualIndex] = useState(0);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const user = await base44.auth.me();
    setCurrentUser(user);
    
    const ordensData = await OrdemSeparacao.filter({ 
      status: ['Pendente', 'Em Separação'] 
    });
    setOrdens(ordensData);
  };

  const handleIniciarSeparacao = async (ordem) => {
    const ordemAtualizada = await OrdemSeparacao.update(ordem.id, {
      status: 'Em Separação',
      estoquista_id: currentUser.id,
      estoquista_nome: currentUser.full_name,
      data_hora_inicio: new Date().toISOString()
    });
    
    setOrdemSelecionada(ordemAtualizada);
    setItemAtualIndex(0);
    setIsDialogOpen(true);
  };

  const handleItemChange = (index, field, value) => {
    const newOrdem = { ...ordemSelecionada };
    newOrdem.itens[index][field] = value;
    setOrdemSelecionada(newOrdem);
  };

  const handleProximoItem = () => {
    if (itemAtualIndex < ordemSelecionada.itens.length - 1) {
      setItemAtualIndex(itemAtualIndex + 1);
    }
  };

  const handleScanBarcode = () => {
    // Simular scan (em produção, usar biblioteca como html5-qrcode ou zxing-js)
    toast({
      title: "Scanner ativado",
      description: "Aponte a câmera para o código de barras",
      className: "bg-blue-100 text-blue-800"
    });
    setIsScannerOpen(true);
    
    // Simular leitura após 2 segundos
    setTimeout(() => {
      setIsScannerOpen(false);
      toast({
        title: "✓ Código lido!",
        description: "Produto identificado",
        className: "bg-green-100 text-green-800"
      });
    }, 2000);
  };

  const handleConcluirSeparacao = async () => {
    try {
      const itemAtual = ordemSelecionada.itens[itemAtualIndex];
      const qtdSeparada = parseFloat(itemAtual.quantidade_separada) || 0;
      const qtdSolicitada = parseFloat(itemAtual.quantidade_solicitada);

      if (qtdSeparada !== qtdSolicitada) {
        toast({
          title: "Atenção",
          description: "A quantidade separada deve ser igual à solicitada.",
          variant: "destructive"
        });
        return;
      }

      // Se não é o último item, ir para o próximo
      if (itemAtualIndex < ordemSelecionada.itens.length - 1) {
        handleProximoItem();
        return;
      }

      // Se é o último item, finalizar a separação
      const todosItensOk = ordemSelecionada.itens.every(item => 
        parseFloat(item.quantidade_separada) === parseFloat(item.quantidade_solicitada)
      );

      if (!todosItensOk) {
        toast({
          title: "Atenção",
          description: "Verifique as quantidades de todos os itens.",
          variant: "destructive"
        });
        return;
      }

      await OrdemSeparacao.update(ordemSelecionada.id, {
        status: 'Separado',
        itens: ordemSelecionada.itens,
        data_hora_conclusao: new Date().toISOString()
      });

      const movimentacoes = ordemSelecionada.itens.map(item => ({
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        tipo: 'Saída',
        motivo: 'Venda',
        quantidade: item.quantidade_separada,
        custo_unitario: item.custo_unitario_momento || 0,
        documento_referencia: ordemSelecionada.pedido_numero,
        usuario_responsavel: currentUser.full_name,
        observacoes: item.lote ? `Lote: ${item.lote}, Validade: ${item.validade}` : ''
      }));
      
      await MovimentacaoEstoque.bulkCreate(movimentacoes);

      for (const item of ordemSelecionada.itens) {
        const produto = await Produto.get(item.produto_id);
        const novoEstoque = (produto.estoque_atual || 0) - item.quantidade_separada;
        await Produto.update(produto.id, { estoque_atual: Math.max(0, novoEstoque) });
      }

      await PedidoVenda.update(ordemSelecionada.pedido_venda_id, {
        status: 'Pronto para Expedição'
      });

      toast({
        title: "✓ Separação concluída!",
        description: "Produtos separados e estoque atualizado.",
        className: "bg-green-100 text-green-800"
      });

      setIsDialogOpen(false);
      setOrdemSelecionada(null);
      setItemAtualIndex(0);
      loadData();

    } catch (error) {
      toast({
        title: "Erro na separação",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      "Pendente": { color: "bg-muted text-muted-foreground border-border/40", icon: Clock },
      "Em Separação": { color: "bg-blue-50 text-blue-700 border-blue-100", icon: Play },
      "Separado": { color: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: CheckCircle }
    };
    
    const { color, icon: Icon } = config[status] || config["Pendente"];
    
    return (
      <Badge variant="outline" className={`${color} gap-1.5 font-normal border rounded-full px-3`}>
        <Icon className="w-3.5 h-3.5" />
        {status}
      </Badge>
    );
  };

  const renderOrdemTrailing = (ordem) => (
    <div className="flex flex-col gap-1 shrink-0">
      {ordem.status === 'Pendente' && (
        <Button size="sm" onClick={() => handleIniciarSeparacao(ordem)} variant="outline" className="h-7 text-xs px-2">
          Iniciar
        </Button>
      )}
      {ordem.status === 'Em Separação' && ordem.estoquista_id === currentUser?.id && (
        <Button
          size="sm"
          onClick={() => {
            setOrdemSelecionada(ordem);
            setItemAtualIndex(0);
            setIsDialogOpen(true);
          }}
          variant="outline"
          className="h-7 text-xs px-2"
        >
          Continuar
        </Button>
      )}
    </div>
  );

  const itemAtual = ordemSelecionada?.itens?.[itemAtualIndex];
  const progresso = ordemSelecionada ? `Item ${itemAtualIndex + 1}/${ordemSelecionada.itens.length}` : '';

  return (
    <div className="space-y-4">
      {/* Header Mobile */}
      <Card className="desktop-layout:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-lg font-normal text-foreground/90">
            <div className="p-2 bg-muted/40 rounded-lg">
              <Package className="w-4 h-4 text-muted-foreground" />
            </div>
            Fila de Separação
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Lista Mobile */}
      <P38MobileLineList>
        {ordens.map((ordem, index) => {
          const tone = p38StatusTone(ordem.status);
          return (
            <P38MobileLine
              key={ordem.id}
              striped={index % 2 === 1}
              accent={p38AccentKeyFromTone(tone)}
              title={ordem.pedido_numero}
              subtitle={ordem.cliente_nome || 'Cliente não identificado'}
              meta={
                <>
                  <P38StatusLabel tone={tone}>{ordem.status}</P38StatusLabel>
                  <span>{ordem.itens?.length || 0} itens</span>
                  {ordem.estoquista_nome ? <span className="truncate">Resp: {ordem.estoquista_nome}</span> : null}
                </>
              }
              trailing={renderOrdemTrailing(ordem)}
            />
          );
        })}
        {ordens.length === 0 && (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">Nenhuma ordem pendente</p>
          </div>
        )}
      </P38MobileLineList>

      {/* Tabela Desktop */}
      <Card className="hidden desktop-layout:block">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-lg font-normal text-foreground/90">
            <div className="p-2 bg-muted/40 rounded-lg">
              <Package className="w-4 h-4 text-muted-foreground" />
            </div>
            Fila de Separação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <P38TableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Qtd. Itens</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordens.map(ordem => (
                  <TableRow key={ordem.id}>
                    <TableCell className="font-medium">{ordem.pedido_numero}</TableCell>
                    <TableCell>{ordem.cliente_nome || 'N/A'}</TableCell>
                    <TableCell>{ordem.itens?.length || 0}</TableCell>
                    <TableCell>{getStatusBadge(ordem.status)}</TableCell>
                    <TableCell>{ordem.estoquista_nome || '-'}</TableCell>
                    <TableCell className="text-right">
                      {ordem.status === 'Pendente' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleIniciarSeparacao(ordem)}
                          variant="outline"
                          className="bg-card border-border/40 text-foreground/90 hover:bg-muted/40 font-medium rounded-lg shadow-sm"
                        >
                          Iniciar
                        </Button>
                      )}
                      {ordem.status === 'Em Separação' && ordem.estoquista_id === currentUser?.id && (
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setOrdemSelecionada(ordem);
                            setItemAtualIndex(0);
                            setIsDialogOpen(true);
                          }}
                          variant="outline"
                          className="border-border/40 text-foreground/90 hover:bg-muted/40 font-medium rounded-lg"
                        >
                          Continuar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {ordens.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma ordem de separação pendente.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </P38TableShell>
        </CardContent>
      </Card>

      {/* Dialog de Separação - ULTRA COMPACTO */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md h-screen m-0 p-0 rounded-none sm:rounded-lg sm:h-auto sm:max-h-[90vh]">
          {ordemSelecionada && itemAtual && (
            <div className="flex flex-col h-full bg-card">
              {/* Header Clean */}
              <div className="bg-card text-foreground px-4 py-4 border-b border-border/40 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{progresso}</p>
                  <p className="text-base font-medium mt-0.5">Separação {ordemSelecionada.pedido_numero}</p>
                </div>
                <button onClick={() => setIsDialogOpen(false)} className="p-2 bg-muted/40 rounded-full hover:bg-muted transition-colors text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Barra de Progresso */}
              <div className="h-1 bg-muted">
                <div 
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${((itemAtualIndex + 1) / ordemSelecionada.itens.length) * 100}%` }}
                />
              </div>

              {/* Conteúdo Compacto */}
              <div className="flex-1 overflow-y-auto p-3">
                {/* Produto */}
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground font-medium tracking-wide mb-1">PRODUTO</p>
                  <h2 className="text-lg font-medium text-foreground leading-snug">
                    {itemAtual.produto_nome}
                  </h2>
                </div>

                {/* Quantidade Solicitada */}
                <div className="mb-6 p-4 bg-muted/40 rounded-xl border border-border/40">
                  <p className="text-xs text-muted-foreground mb-1 text-center">Quantidade Solicitada</p>
                  <p className="text-4xl font-light text-center text-foreground">
                    {itemAtual.quantidade_solicitada}
                  </p>
                </div>

                {/* Quantidade Separada */}
                <div className="mb-4">
                  <Label className="text-xs text-muted-foreground font-medium mb-2 block">
                    Quantidade Separada *
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={itemAtual.quantidade_separada || ''}
                      onChange={(e) => handleItemChange(itemAtualIndex, 'quantidade_separada', parseFloat(e.target.value) || 0)}
                      className="h-14 text-3xl font-light text-center pr-12 border-border/40 rounded-xl focus:ring-1 focus:ring-border/40 focus:border-border/40"
                      placeholder="0"
                      autoFocus
                    />
                    <button
                      onClick={handleScanBarcode}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-muted rounded-lg hover:bg-muted transition"
                    >
                      <Barcode className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Lote e Validade */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] mb-1 block text-muted-foreground">Lote</Label>
                    <Input
                      value={itemAtual.lote || ''}
                      onChange={(e) => handleItemChange(itemAtualIndex, 'lote', e.target.value)}
                      placeholder="Opcional"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] mb-1 block text-muted-foreground">Validade</Label>
                    <Input
                      type="date"
                      value={itemAtual.validade || ''}
                      onChange={(e) => handleItemChange(itemAtualIndex, 'validade', e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Compacto */}
              <div className="border-t p-3 grid grid-cols-2 gap-2">
                <Button
                  onClick={() => setIsDialogOpen(false)}
                  variant="outline"
                  className="h-11 text-sm"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConcluirSeparacao}
                  className="h-11 text-sm font-medium bg-muted text-foreground hover:bg-muted rounded-xl"
                >
                  {itemAtualIndex < ordemSelecionada.itens.length - 1 ? (
                    <>Próximo Item</>
                  ) : (
                    <>Finalizar Separação <CheckCircle className="w-4 h-4 ml-1" /></>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Scanner Modal Simulado */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center">
          <div className="text-center">
            <Camera className="w-16 h-16 text-white mx-auto mb-4 animate-pulse" />
            <p className="text-white text-lg">Escaneando código de barras...</p>
            <p className="text-white/70 text-sm mt-2">Aponte para o código</p>
          </div>
        </div>
      )}
    </div>
  );
}