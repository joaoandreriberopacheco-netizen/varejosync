import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, CheckCircle2, XCircle, FileText, Camera } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function PendenciasPedido({ pedido }) {
  const [divergencias, setDivergencias] = useState([]);
  const [conferencia, setConferencia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDiv, setSelectedDiv] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [resolucao, setResolucao] = useState('');
  const [acaoTomada, setAcaoTomada] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (pedido) {
      loadDivergencias();
      loadUser();
    }
  }, [pedido]);

  const loadUser = async () => {
    const user = await base44.auth.me();
    setCurrentUser(user);
  };

  const loadDivergencias = async () => {
    setLoading(true);
    try {
      const lista = await base44.entities.DivergenciaCompra.filter({
        pedido_compra_id: pedido.id
      });
      setDivergencias(lista);

      // Verificar se há conferência finalizada
      const conferencias = await base44.entities.ConferenciaCompra.filter({
        pedido_compra_id: pedido.id,
        status: 'Finalizada'
      });
      setConferencia(conferencias.length > 0 ? conferencias[0] : null);
    } catch (error) {
      console.error('Erro ao carregar divergências:', error);
    }
    setLoading(false);
  };

  const handleResolverDivergencia = (div) => {
    setSelectedDiv(div);
    setResolucao(div.resolucao || '');
    setAcaoTomada(div.acao_tomada || '');
    setShowDialog(true);
  };

  const salvarResolucao = async () => {
    try {
      await base44.entities.DivergenciaCompra.update(selectedDiv.id, {
        status: 'Resolvida',
        resolucao,
        acao_tomada: acaoTomada,
        responsavel_resolucao_id: currentUser.id,
        responsavel_resolucao_nome: currentUser.full_name,
        data_resolucao: new Date().toISOString()
      });

      // Recarregar todas as divergências após salvar
      await loadDivergencias();
      
      toast({ title: 'Divergência resolvida com sucesso!' });
      setShowDialog(false);
    } catch (error) {
      toast({ title: 'Erro ao resolver divergência', variant: 'destructive' });
    }
  };

  const handleConcluirPedido = async () => {
    try {
      await base44.entities.PedidoCompra.update(pedido.id, {
        status: 'Concluído',
        tem_divergencias: false,
        data_conclusao: new Date().toISOString()
      });
      toast({ title: 'Pedido concluído com sucesso!' });
      window.location.reload();
    } catch (error) {
      toast({ title: 'Erro ao concluir pedido', variant: 'destructive' });
    }
  };

  const getTipoColor = (tipo) => {
    const map = {
      'Falta': 'bg-red-100 text-red-800',
      'Avaria': 'bg-orange-100 text-orange-800',
      'Produto a Mais': 'bg-blue-100 text-blue-800',
      'Pedido Diferente': 'bg-purple-100 text-purple-800'
    };
    return map[tipo] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const map = {
      'Pendente': 'bg-yellow-100 text-yellow-800',
      'Em Análise': 'bg-blue-100 text-blue-800',
      'Resolvida': 'bg-green-100 text-green-800',
      'Aceita': 'bg-green-100 text-green-800',
      'Rejeitada': 'bg-red-100 text-red-800'
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <div>Carregando...</div>;

  // Verifica se há conferência finalizada
  if (!conferencia) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-12 text-center text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="font-semibold text-lg text-foreground/90">Aguardando Resultado da Conferência</p>
          <p className="text-sm mt-1">A conferência ainda não foi finalizada</p>
        </CardContent>
      </Card>
    );
  }

  // Conferência finalizada mas sem divergências
  const pendentesCount = divergencias.filter(d => d.status !== 'Resolvida').length;
  const todasResolvidas = divergencias.length > 0 && pendentesCount === 0;
  const semDivergencias = divergencias.length === 0;

  if (semDivergencias) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <p className="font-semibold text-lg text-foreground dark:text-gray-100">Nenhuma Pendência</p>
          <p className="text-sm text-muted-foreground mb-6">Todos os itens foram conferidos sem divergências</p>
          
          {pedido.status !== 'Concluído' && (
            <Button 
              onClick={handleConcluirPedido}
              className="bg-green-600 hover:bg-green-700 shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Concluir Pedido
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Pendências de Conferência
            </div>
            {todasResolvidas && pedido.status !== 'Concluído' && (
              <Button 
                onClick={handleConcluirPedido}
                className="bg-green-600 hover:bg-green-700 shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Concluir Pedido
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {divergencias.map(div => (
            <div key={div.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold">{div.produto_nome}</h4>
                  <div className="flex gap-2 mt-2">
                    <Badge className={getTipoColor(div.tipo)}>{div.tipo}</Badge>
                    <Badge className={getStatusColor(div.status)}>{div.status}</Badge>
                  </div>
                </div>
                {div.status === 'Pendente' && (
                  <Button
                    size="sm"
                    onClick={() => handleResolverDivergencia(div)}
                    className="bg-indigo-600"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Resolver
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Esperado:</span>
                  <span className="ml-2 font-semibold">{div.quantidade_esperada}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Recebido:</span>
                  <span className="ml-2 font-semibold">{div.quantidade_recebida}</span>
                </div>
                {div.quantidade_avariada > 0 && (
                  <div>
                    <span className="text-muted-foreground">Avariado:</span>
                    <span className="ml-2 font-semibold text-red-600">{div.quantidade_avariada}</span>
                  </div>
                )}
              </div>

              {div.descricao && (
                <div className="text-sm text-muted-foreground bg-muted/40 p-2 rounded">
                  {div.descricao}
                </div>
              )}

              {div.fotos_urls && div.fotos_urls.length > 0 && (
                <div className="flex gap-2">
                  {div.fotos_urls.map((foto, i) => (
                    <img key={i} src={foto} className="w-24 h-24 object-cover rounded border" />
                  ))}
                </div>
              )}

              {div.status === 'Resolvida' && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="font-semibold text-green-800 mb-1">Resolução:</div>
                  <div className="text-sm text-green-700">{div.resolucao}</div>
                  <div className="text-xs text-green-600 mt-2">
                    Ação: {div.acao_tomada} • Resolvido por: {div.responsavel_resolucao_nome}
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolver Divergência</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted/40 rounded-lg">
              <h4 className="font-semibold mb-2">{selectedDiv?.produto_nome}</h4>
              <Badge className={getTipoColor(selectedDiv?.tipo)}>{selectedDiv?.tipo}</Badge>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ação Tomada</label>
              <Select value={acaoTomada} onValueChange={setAcaoTomada}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Devolução">Devolução ao Fornecedor</SelectItem>
                  <SelectItem value="Desconto">Negociar Desconto</SelectItem>
                  <SelectItem value="Troca">Solicitar Troca</SelectItem>
                  <SelectItem value="Aceitar Como Está">Aceitar Como Está</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Descrição da Resolução</label>
              <Textarea
                value={resolucao}
                onChange={e => setResolucao(e.target.value)}
                placeholder="Descreva como a divergência foi resolvida..."
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={salvarResolucao} className="flex-1 bg-green-600">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirmar Resolução
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}