import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, Receipt, Printer, X, ShoppingCart, Package, Truck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ComprovantePreVenda from '@/components/vendas/ComprovantePreVenda';
import ComprovanteCompra from '@/components/vendas/ComprovanteCompra';

const TIPOS_DOCUMENTO = [
  { value: 'prevenda', label: 'Pré-Vendas', icon: FileText, entity: 'PedidoVenda', filter: (d) => d.tipo === 'Pedido' },
  { value: 'venda', label: 'Vendas Finalizadas', icon: Receipt, entity: 'PedidoVenda', filter: (d) => d.status === 'Pedido Concluído' },
  { value: 'pedido_compra', label: 'Pedidos de Compra', icon: ShoppingCart, entity: 'PedidoCompra' },
  { value: 'movimentacao', label: 'Movimentações Estoque', icon: Package, entity: 'MovimentacaoEstoque' },
  { value: 'agenda_entrega', label: 'Agendas de Entrega', icon: Truck, entity: 'AgendaLogistica' },
];

export default function ReimpressaoDocumentos() {
  const [tipoDoc, setTipoDoc] = useState('prevenda');
  const [busca, setBusca] = useState('');
  const [documentoSelecionado, setDocumentoSelecionado] = useState(null);
  const [showComprovante, setShowComprovante] = useState(false);
  const [ultimoDocumento, setUltimoDocumento] = useState(null);

  // Buscar último documento ao trocar tipo
  useEffect(() => {
    const buscarUltimo = async () => {
      const tipo = TIPOS_DOCUMENTO.find(t => t.value === tipoDoc);
      if (!tipo) return;

      try {
        const docs = await base44.entities[tipo.entity].list('-created_date', 1);
        if (docs && docs.length > 0) {
          const doc = docs[0];
          if (tipo.filter) {
            const todosDoc = await base44.entities[tipo.entity].list('-created_date', 50);
            const filtrado = todosDoc.find(tipo.filter);
            if (filtrado) {
              setUltimoDocumento(filtrado);
              setBusca(filtrado.numero || '');
            }
          } else {
            setUltimoDocumento(doc);
            setBusca(doc.numero || '');
          }
        }
      } catch (error) {
        console.error('Erro ao buscar último documento:', error);
      }
    };

    buscarUltimo();
  }, [tipoDoc]);

  // Buscar documentos
  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ['documentos-reimpressao', tipoDoc, busca],
    queryFn: async () => {
      if (!busca || busca.length < 3) return [];
      
      const tipo = TIPOS_DOCUMENTO.find(t => t.value === tipoDoc);
      if (!tipo) return [];

      const docs = await base44.entities[tipo.entity].list('-created_date', 100);
      
      return docs.filter(d => {
        const matchFilter = tipo.filter ? tipo.filter(d) : true;
        const matchBusca = 
          d.numero?.toLowerCase().includes(busca.toLowerCase()) ||
          d.senha_atendimento?.includes(busca) ||
          d.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) ||
          d.fornecedor_nome?.toLowerCase().includes(busca.toLowerCase()) ||
          d.produto_nome?.toLowerCase().includes(busca.toLowerCase());
        
        return matchFilter && matchBusca;
      }).slice(0, 20);
    },
    enabled: busca.length >= 3,
  });

  const handlePrint = (doc) => {
    setDocumentoSelecionado(doc);
    setShowComprovante(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Printer className="w-6 h-6 text-gray-700 dark:text-gray-200" />
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white font-glacial">
              Reimpressão de Documentos
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Busque e reimprima pré-vendas ou vendas finalizadas
          </p>
        </div>

        {/* Seletor de tipo */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tipo de Documento
          </label>
          <Select value={tipoDoc} onValueChange={(val) => { setTipoDoc(val); setBusca(''); }}>
            <SelectTrigger className="bg-white dark:bg-gray-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_DOCUMENTO.map((tipo) => {
                const Icon = tipo.icon;
                return (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span>{tipo.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Busca */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por número, cliente, fornecedor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10 bg-white dark:bg-gray-800"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
          {ultimoDocumento && busca === ultimoDocumento.numero && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Último documento: {ultimoDocumento.numero}
            </p>
          )}
        </div>

        {/* Resultados */}
        {busca.length > 0 && busca.length < 3 && (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
            Digite pelo menos 3 caracteres para buscar
          </div>
        )}

        {isLoading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 dark:border-gray-700 dark:border-t-gray-200 rounded-full animate-spin mx-auto" />
          </div>
        )}

        {!isLoading && busca.length >= 3 && documentos.length === 0 && (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
            Nenhum documento encontrado
          </div>
        )}

        {!isLoading && documentos.length > 0 && (
          <div className="space-y-2">
            {documentos.map((doc) => (
              <div
                key={doc.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {doc.numero}
                      </span>
                      {tipoDoc === 'prevenda' && doc.senha_atendimento && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs rounded">
                          Senha: {doc.senha_atendimento}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                      {doc.cliente_nome || 'Cliente não informado'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(doc.created_date).toLocaleDateString('pt-BR')} •{' '}
                      R$ {(doc.valor_total || 0).toFixed(2)}
                    </p>
                  </div>
                  <Button
                    onClick={() => handlePrint(doc)}
                    size="sm"
                    className="flex-shrink-0"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Impressão */}
      {showComprovante && documentoSelecionado && (
        <Dialog open={showComprovante} onOpenChange={setShowComprovante}>
          <DialogContent className="max-w-md p-0">
            {tipoDoc === 'prevenda' ? (
              <ComprovantePreVenda
                pedido={documentoSelecionado}
                onClose={() => setShowComprovante(false)}
              />
            ) : (
              <ComprovanteCompra
                pedido={documentoSelecionado}
                onClose={() => setShowComprovante(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}