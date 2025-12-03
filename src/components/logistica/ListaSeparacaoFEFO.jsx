import React, { useState, useEffect } from 'react';
import { PedidoVenda } from '@/entities/PedidoVenda';
import { Produto } from '@/entities/Produto';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Package, AlertTriangle, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function ListaSeparacaoFEFO({ pedidoId }) {
  const [pedido, setPedido] = useState(null);
  const [itensComLote, setItensComLote] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPedidoComLotes();
  }, [pedidoId]);

  const loadPedidoComLotes = async () => {
    setIsLoading(true);
    try {
      // Buscar pedido
      const pedidoData = await PedidoVenda.filter({ id: pedidoId });
      if (pedidoData.length === 0) return;
      
      const ped = pedidoData[0];
      setPedido(ped);

      // Para cada item, verificar se controla lote/validade
      const produtosIds = ped.itens.map(i => i.produto_id);
      const produtos = await Produto.list(null, 0, { id: { '$in': produtosIds } });

      const itensEnriquecidos = ped.itens.map(item => {
        const produto = produtos.find(p => p.id === item.produto_id);
        
        // Simulação de lotes (em produção, viria de uma entidade Lote)
        let lotesSugeridos = [];
        if (produto?.controla_lote_validade) {
          // Simular 2-3 lotes disponíveis, ordenados por FEFO
          lotesSugeridos = [
            {
              numero_lote: `LT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
              data_validade: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              quantidade_disponivel: Math.floor(item.quantidade * 0.6),
              localizacao: 'A-12-3'
            },
            {
              numero_lote: `LT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
              data_validade: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              quantidade_disponivel: Math.ceil(item.quantidade * 0.4),
              localizacao: 'A-12-4'
            }
          ].sort((a, b) => new Date(a.data_validade) - new Date(b.data_validade));
        }

        return {
          ...item,
          controla_lote: produto?.controla_lote_validade || false,
          lotes_sugeridos: lotesSugeridos
        };
      });

      setItensComLote(itensEnriquecidos);
    } catch (error) {
      console.error("Erro ao carregar lista de separação:", error);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return <div className="p-4">Carregando lista de separação...</div>;
  }

  if (!pedido) {
    return <div className="p-4">Pedido não encontrado.</div>;
  };

  const formatDate = (dateString) => format(new Date(dateString), 'dd/MM/yyyy');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          Lista de Separação - {pedido.numero}
        </CardTitle>
        <p className="text-sm text-gray-600">
          Cliente: {pedido.cliente_nome} | Vendedor: {pedido.vendedor_nome}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {itensComLote.map((item, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">{item.produto_nome}</h4>
                <p className="text-sm text-gray-600">
                  Quantidade: <strong>{item.quantidade}</strong> unidades
                </p>
              </div>
              {item.controla_lote && (
                <Badge className="bg-purple-100 text-purple-800">
                  Controla Lote
                </Badge>
              )}
            </div>

            {item.controla_lote && item.lotes_sugeridos.length > 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-xs font-semibold text-yellow-800 mb-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Separar pelos seguintes lotes (FEFO - Primeiro que Vence, Primeiro que Sai):
                </p>
                <div className="space-y-2">
                  {item.lotes_sugeridos.map((lote, loteIndex) => (
                    <div key={loteIndex} className="flex items-center justify-between text-sm bg-white p-2 rounded">
                      <div>
                        <span className="font-mono font-semibold">{lote.numero_lote}</span>
                        <span className="text-gray-500 mx-2">•</span>
                        <span className="text-gray-700">Validade: {formatDate(lote.data_validade)}</span>
                        <span className="text-gray-500 mx-2">•</span>
                        <span className="text-gray-600">Loc: {lote.localizacao}</span>
                      </div>
                      <Badge variant="outline">
                        {lote.quantidade_disponivel} un.
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              !item.controla_lote && (
                <p className="text-sm text-gray-500">
                  Este produto não exige controle de lote. Separar da localização de estoque padrão.
                </p>
              )
            )}
          </div>
        ))}

        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-800 text-sm">
            <strong>Instruções:</strong> Separe os itens seguindo a ordem de lotes indicada (quando aplicável). 
            Após a separação, marque os itens como separados no sistema.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}