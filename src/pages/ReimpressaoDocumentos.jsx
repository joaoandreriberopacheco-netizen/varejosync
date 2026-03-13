import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, Receipt, Printer, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import ComprovantePreVenda from '@/components/vendas/ComprovantePreVenda';
import ComprovanteCompra from '@/components/vendas/ComprovanteCompra';

export default function ReimpressaoDocumentos() {
  const [tipoDoc, setTipoDoc] = useState('prevenda'); // 'prevenda' ou 'venda'
  const [busca, setBusca] = useState('');
  const [documentoSelecionado, setDocumentoSelecionado] = useState(null);
  const [showComprovante, setShowComprovante] = useState(false);

  // Buscar documentos
  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ['documentos-reimpressao', tipoDoc, busca],
    queryFn: async () => {
      if (!busca || busca.length < 3) return [];
      
      if (tipoDoc === 'prevenda') {
        const pedidos = await base44.entities.PedidoVenda.list();
        return pedidos.filter(p => 
          p.tipo === 'Pedido' &&
          (p.numero?.toLowerCase().includes(busca.toLowerCase()) ||
           p.senha_atendimento?.includes(busca) ||
           p.cliente_nome?.toLowerCase().includes(busca.toLowerCase()))
        ).slice(0, 20);
      } else {
        const vendas = await base44.entities.PedidoVenda.list();
        return vendas.filter(v => 
          v.status === 'Pedido Concluído' &&
          (v.numero?.toLowerCase().includes(busca.toLowerCase()) ||
           v.cliente_nome?.toLowerCase().includes(busca.toLowerCase()))
        ).slice(0, 20);
      }
    },
    enabled: busca.length >= 3,
  });

  const handlePrint = (doc) => {
    setDocumentoSelecionado(doc);
    setShowComprovante(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
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
        <div className="flex gap-2 mb-6">
          <Button
            onClick={() => { setTipoDoc('prevenda'); setBusca(''); }}
            variant={tipoDoc === 'prevenda' ? 'default' : 'outline'}
            className="flex-1"
          >
            <FileText className="w-4 h-4 mr-2" />
            Pré-Vendas
          </Button>
          <Button
            onClick={() => { setTipoDoc('venda'); setBusca(''); }}
            variant={tipoDoc === 'venda' ? 'default' : 'outline'}
            className="flex-1"
          >
            <Receipt className="w-4 h-4 mr-2" />
            Vendas
          </Button>
        </div>

        {/* Busca */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={`Buscar por número, ${tipoDoc === 'prevenda' ? 'senha ou' : ''} cliente...`}
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