import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import QRCode from 'qrcode';

export default function LiberacaoEntrega({ open, onClose, pedido, cliente }) {
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  useEffect(() => {
    if (open && pedido?.id) {
      QRCode.toDataURL(pedido.id, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).then(url => {
        setQrCodeUrl(url);
      });
    }
  }, [open, pedido?.id]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [open]);

  const formatValor = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  };

  if (!pedido) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto print:max-w-full print:shadow-none">
        <div className="print:p-8">
          {/* Cabeçalho */}
          <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
            <h1 className="text-2xl font-bold">LIBERAÇÃO PARA ENTREGA</h1>
            <p className="text-sm text-gray-600 mt-1">DOCUMENTO DE CONTROLE INTERNO</p>
          </div>

          {/* Grid Principal */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Coluna Esquerda - Informações do Pedido */}
            <div className="space-y-4">
              {/* Identificação */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-500 mb-2">IDENTIFICAÇÃO</h3>
                <div className="space-y-1">
                  <p className="text-lg font-bold">PEDIDO: {pedido.numero}</p>
                  {pedido.senha_atendimento && (
                    <p className="text-lg font-bold">SENHA: {pedido.senha_atendimento}</p>
                  )}
                  <p className="text-sm text-gray-600">
                    DATA: {new Date(pedido.created_date).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-sm text-gray-600">
                    HORA: {new Date(pedido.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Dados do Cliente */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-500 mb-2">DADOS DO CLIENTE</h3>
                <div className="space-y-1">
                  <p className="font-semibold">{pedido.cliente_nome}</p>
                  {cliente && (
                    <>
                      {cliente.telefone && (
                        <p className="text-sm">TEL: {cliente.telefone}</p>
                      )}
                      {cliente.endereco && (
                        <p className="text-sm">
                          {cliente.endereco}
                          {cliente.bairro && `, ${cliente.bairro}`}
                        </p>
                      )}
                      {(cliente.cidade || cliente.estado || cliente.cep) && (
                        <p className="text-sm">
                          {cliente.cidade && `${cliente.cidade}`}
                          {cliente.estado && ` - ${cliente.estado}`}
                          {cliente.cep && ` - CEP: ${cliente.cep}`}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Método de Entrega */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-500 mb-2">ENTREGA</h3>
                <p className="text-xl font-bold">
                  {pedido.metodo_entrega === 'Delivery' ? '🚚 DELIVERY' : '🏪 RETIRADA NO BALCÃO'}
                </p>
                {pedido.data_entrega && (
                  <p className="text-sm text-gray-600 mt-1">
                    PREVISTA: {new Date(pedido.data_entrega).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>

            {/* Coluna Direita - QR Code */}
            <div className="flex flex-col items-center justify-center bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-500 mb-3">ESCANEIE PARA INICIAR SEPARAÇÃO</h3>
              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 border-4 border-gray-800" />
              )}
              <p className="text-xs text-gray-500 mt-2 text-center">
                USE O LEITOR DE QR CODE PARA MARCAR COMO "EM SEPARAÇÃO"
              </p>
            </div>
          </div>

          {/* Itens do Pedido */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-2 bg-gray-50 p-2 rounded">ITENS DO PEDIDO</h3>
            <table className="w-full text-sm">
              <thead className="border-b-2 border-gray-800">
                <tr>
                  <th className="text-left py-2">QTD</th>
                  <th className="text-left py-2">PRODUTO</th>
                  <th className="text-right py-2">UNITÁRIO</th>
                  <th className="text-right py-2">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {pedido.itens?.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-2 font-bold">{item.quantidade}</td>
                    <td className="py-2">{item.produto_nome}</td>
                    <td className="py-2 text-right">{formatValor(item.preco_unitario_praticado)}</td>
                    <td className="py-2 text-right font-semibold">{formatValor(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totais */}
          <div className="bg-gray-100 p-4 rounded-lg mb-6">
            <div className="flex justify-between text-sm mb-1">
              <span>SUBTOTAL:</span>
              <span>{formatValor(pedido.subtotal)}</span>
            </div>
            {pedido.valor_desconto > 0 && (
              <div className="flex justify-between text-sm mb-1 text-red-600">
                <span>DESCONTO:</span>
                <span>-{formatValor(pedido.valor_desconto)}</span>
              </div>
            )}
            {pedido.valor_frete > 0 && (
              <div className="flex justify-between text-sm mb-1">
                <span>FRETE:</span>
                <span>{formatValor(pedido.valor_frete)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold border-t-2 border-gray-800 mt-2 pt-2">
              <span>VALOR TOTAL:</span>
              <span>{formatValor(pedido.valor_total)}</span>
            </div>
          </div>

          {/* Observações */}
          {pedido.observacoes && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">OBSERVAÇÕES:</h3>
              <p className="text-sm">{pedido.observacoes}</p>
            </div>
          )}

          {/* Área de Controle */}
          <div className="border-t-2 border-gray-800 pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">SEPARADO POR:</p>
                <div className="border-b-2 border-gray-300 h-8"></div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">DATA/HORA:</p>
                <div className="border-b-2 border-gray-300 h-8"></div>
              </div>
            </div>
            
            {pedido.metodo_entrega === 'Delivery' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">ENTREGADOR:</p>
                  <div className="border-b-2 border-gray-300 h-8"></div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">SAÍDA:</p>
                  <div className="border-b-2 border-gray-300 h-8"></div>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs text-gray-500 mb-1">ASSINATURA DO RECEBEDOR:</p>
              <div className="border-b-2 border-gray-300 h-12"></div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 mt-6 border-t pt-4">
            <p>DOCUMENTO GERADO AUTOMATICAMENTE - VAREJOSYNC ERP</p>
            <p>PAGAMENTO CONFIRMADO E PROCESSADO</p>
          </div>
        </div>

        {/* Botões (não aparecem na impressão) */}
        <div className="flex gap-2 print:hidden mt-4">
          <Button onClick={() => window.print()} className="flex-1">
            <Printer className="w-4 h-4 mr-2" />
            IMPRIMIR
          </Button>
          <Button onClick={onClose} variant="outline">
            <X className="w-4 h-4 mr-2" />
            FECHAR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}