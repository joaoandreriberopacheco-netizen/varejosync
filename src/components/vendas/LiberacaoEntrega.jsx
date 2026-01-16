import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, FileText, Receipt } from "lucide-react";
import QRCode from 'qrcode';

export default function LiberacaoEntrega({ open, onClose, pedido, cliente }) {
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [formato, setFormato] = useState("a4"); // "a4" ou "cupom"

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
      <DialogContent className={`max-h-[90vh] overflow-y-auto print:shadow-none ${
        formato === "a4" ? "max-w-2xl print:max-w-full" : "max-w-sm print:max-w-[80mm]"
      }`}>
        {/* Seletor de Formato (não aparece na impressão) */}
        <div className="flex gap-2 mb-4 print:hidden">
          <Button
            variant={formato === "a4" ? "default" : "outline"}
            onClick={() => setFormato("a4")}
            className="flex-1"
            size="sm"
          >
            <FileText className="w-4 h-4 mr-2" />
            FORMATO A4
          </Button>
          <Button
            variant={formato === "cupom" ? "default" : "outline"}
            onClick={() => setFormato("cupom")}
            className="flex-1"
            size="sm"
          >
            <Receipt className="w-4 h-4 mr-2" />
            FORMATO CUPOM
          </Button>
        </div>

        <div className={formato === "a4" ? "print:p-8" : "print:p-2"}>
          {/* Cabeçalho */}
          <div className={`text-center border-b-2 border-gray-800 pb-4 ${formato === "a4" ? "mb-6" : "mb-3"}`}>
            <h1 className={formato === "a4" ? "text-2xl font-bold" : "text-lg font-bold"}>LIBERAÇÃO PARA ENTREGA</h1>
            <p className={formato === "a4" ? "text-sm text-gray-600 mt-1" : "text-xs text-gray-600 mt-0.5"}>
              DOCUMENTO DE CONTROLE INTERNO
            </p>
          </div>

          {/* Grid Principal */}
          <div className={`mb-6 ${formato === "a4" ? "grid grid-cols-2 gap-4" : "space-y-3"}`}>
            {/* Coluna Esquerda - Informações do Pedido */}
            <div className={formato === "a4" ? "space-y-4" : "space-y-2"}>
              {/* Identificação */}
              <div className={`bg-gray-50 rounded-lg ${formato === "a4" ? "p-4" : "p-2"}`}>
                <h3 className={`font-semibold text-gray-500 mb-2 ${formato === "a4" ? "text-sm" : "text-xs"}`}>
                  IDENTIFICAÇÃO
                </h3>
                <div className="space-y-1">
                  <p className={formato === "a4" ? "text-lg font-bold" : "text-sm font-bold"}>
                    PEDIDO: {pedido.numero}
                  </p>
                  {pedido.senha_atendimento && (
                    <p className={formato === "a4" ? "text-lg font-bold" : "text-sm font-bold"}>
                      SENHA: {pedido.senha_atendimento}
                    </p>
                  )}
                  <p className={formato === "a4" ? "text-sm text-gray-600" : "text-xs text-gray-600"}>
                    DATA: {new Date(pedido.created_date).toLocaleDateString('pt-BR')}
                  </p>
                  <p className={formato === "a4" ? "text-sm text-gray-600" : "text-xs text-gray-600"}>
                    HORA: {new Date(pedido.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Dados do Cliente */}
              <div className={`bg-gray-50 rounded-lg ${formato === "a4" ? "p-4" : "p-2"}`}>
                <h3 className={`font-semibold text-gray-500 mb-2 ${formato === "a4" ? "text-sm" : "text-xs"}`}>
                  DADOS DO CLIENTE
                </h3>
                <div className="space-y-1">
                  <p className={formato === "a4" ? "font-semibold" : "text-sm font-semibold"}>
                    {pedido.cliente_nome}
                  </p>
                  {cliente && (
                    <>
                      {cliente.telefone && (
                        <p className={formato === "a4" ? "text-sm" : "text-xs"}>TEL: {cliente.telefone}</p>
                      )}
                      {cliente.endereco && (
                        <p className={formato === "a4" ? "text-sm" : "text-xs"}>
                          {cliente.endereco}
                          {cliente.bairro && `, ${cliente.bairro}`}
                        </p>
                      )}
                      {(cliente.cidade || cliente.estado || cliente.cep) && (
                        <p className={formato === "a4" ? "text-sm" : "text-xs"}>
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
              <div className={`bg-gray-50 rounded-lg ${formato === "a4" ? "p-4" : "p-2"}`}>
                <h3 className={`font-semibold text-gray-500 mb-2 ${formato === "a4" ? "text-sm" : "text-xs"}`}>
                  ENTREGA
                </h3>
                <p className={formato === "a4" ? "text-xl font-bold" : "text-sm font-bold"}>
                  {pedido.metodo_entrega === 'Delivery' ? '🚚 DELIVERY' : '🏪 RETIRADA NO BALCÃO'}
                </p>
                {pedido.data_entrega && (
                  <p className={`text-gray-600 mt-1 ${formato === "a4" ? "text-sm" : "text-xs"}`}>
                    PREVISTA: {new Date(pedido.data_entrega).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>

            {/* Coluna Direita - QR Code */}
            <div className={`flex flex-col items-center justify-center bg-gray-50 rounded-lg ${
              formato === "a4" ? "p-4" : "p-2"
            }`}>
              <h3 className={`font-semibold text-gray-500 mb-3 text-center ${
                formato === "a4" ? "text-sm" : "text-xs"
              }`}>
                ESCANEIE PARA INICIAR SEPARAÇÃO
              </h3>
              {qrCodeUrl && (
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  className={`border-4 border-gray-800 ${formato === "a4" ? "w-48 h-48" : "w-32 h-32"}`}
                />
              )}
              <p className={`text-gray-500 mt-2 text-center ${formato === "a4" ? "text-xs" : "text-[10px]"}`}>
                USE O LEITOR DE QR CODE PARA MARCAR COMO "EM SEPARAÇÃO"
              </p>
            </div>
          </div>

          {/* Itens do Pedido */}
          <div className="mb-6">
            <h3 className={`font-semibold text-gray-500 mb-2 bg-gray-50 p-2 rounded ${
              formato === "a4" ? "text-sm" : "text-xs"
            }`}>
              ITENS DO PEDIDO
            </h3>
            <table className={`w-full ${formato === "a4" ? "text-sm" : "text-xs"}`}>
              <thead className="border-b-2 border-gray-800">
                <tr>
                  <th className={`text-left ${formato === "a4" ? "py-2" : "py-1"}`}>QTD</th>
                  <th className={`text-left ${formato === "a4" ? "py-2" : "py-1"}`}>PRODUTO</th>
                  {formato === "a4" && <th className="text-right py-2">UNITÁRIO</th>}
                  <th className={`text-right ${formato === "a4" ? "py-2" : "py-1"}`}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {pedido.itens?.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className={`font-bold ${formato === "a4" ? "py-2" : "py-1"}`}>
                      {item.quantidade}
                    </td>
                    <td className={formato === "a4" ? "py-2" : "py-1"}>{item.produto_nome}</td>
                    {formato === "a4" && (
                      <td className="py-2 text-right">{formatValor(item.preco_unitario_praticado)}</td>
                    )}
                    <td className={`text-right font-semibold ${formato === "a4" ? "py-2" : "py-1"}`}>
                      {formatValor(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totais */}
          <div className={`bg-gray-100 rounded-lg mb-6 ${formato === "a4" ? "p-4" : "p-2"}`}>
            <div className={`flex justify-between mb-1 ${formato === "a4" ? "text-sm" : "text-xs"}`}>
              <span>SUBTOTAL:</span>
              <span>{formatValor(pedido.subtotal)}</span>
            </div>
            {pedido.valor_desconto > 0 && (
              <div className={`flex justify-between mb-1 text-red-600 ${formato === "a4" ? "text-sm" : "text-xs"}`}>
                <span>DESCONTO:</span>
                <span>-{formatValor(pedido.valor_desconto)}</span>
              </div>
            )}
            {pedido.valor_frete > 0 && (
              <div className={`flex justify-between mb-1 ${formato === "a4" ? "text-sm" : "text-xs"}`}>
                <span>FRETE:</span>
                <span>{formatValor(pedido.valor_frete)}</span>
              </div>
            )}
            <div className={`flex justify-between font-bold border-t-2 border-gray-800 mt-2 pt-2 ${
              formato === "a4" ? "text-xl" : "text-sm"
            }`}>
              <span>VALOR TOTAL:</span>
              <span>{formatValor(pedido.valor_total)}</span>
            </div>
          </div>

          {/* Observações */}
          {pedido.observacoes && (
            <div className={`bg-yellow-50 border-l-4 border-yellow-400 mb-6 ${formato === "a4" ? "p-4" : "p-2"}`}>
              <h3 className={`font-semibold text-gray-700 mb-1 ${formato === "a4" ? "text-sm" : "text-xs"}`}>
                OBSERVAÇÕES:
              </h3>
              <p className={formato === "a4" ? "text-sm" : "text-xs"}>{pedido.observacoes}</p>
            </div>
          )}

          {/* Área de Controle */}
          <div className={`border-t-2 border-gray-800 pt-4 ${formato === "a4" ? "space-y-4" : "space-y-2"}`}>
            <div className={formato === "a4" ? "grid grid-cols-2 gap-4" : "space-y-2"}>
              <div>
                <p className={`text-gray-500 mb-1 ${formato === "a4" ? "text-xs" : "text-[10px]"}`}>
                  SEPARADO POR:
                </p>
                <div className={`border-b-2 border-gray-300 ${formato === "a4" ? "h-8" : "h-6"}`}></div>
              </div>
              <div>
                <p className={`text-gray-500 mb-1 ${formato === "a4" ? "text-xs" : "text-[10px]"}`}>
                  DATA/HORA:
                </p>
                <div className={`border-b-2 border-gray-300 ${formato === "a4" ? "h-8" : "h-6"}`}></div>
              </div>
            </div>
            
            {pedido.metodo_entrega === 'Delivery' && (
              <div className={formato === "a4" ? "grid grid-cols-2 gap-4" : "space-y-2"}>
                <div>
                  <p className={`text-gray-500 mb-1 ${formato === "a4" ? "text-xs" : "text-[10px]"}`}>
                    ENTREGADOR:
                  </p>
                  <div className={`border-b-2 border-gray-300 ${formato === "a4" ? "h-8" : "h-6"}`}></div>
                </div>
                <div>
                  <p className={`text-gray-500 mb-1 ${formato === "a4" ? "text-xs" : "text-[10px]"}`}>
                    SAÍDA:
                  </p>
                  <div className={`border-b-2 border-gray-300 ${formato === "a4" ? "h-8" : "h-6"}`}></div>
                </div>
              </div>
            )}

            <div>
              <p className={`text-gray-500 mb-1 ${formato === "a4" ? "text-xs" : "text-[10px]"}`}>
                ASSINATURA DO RECEBEDOR:
              </p>
              <div className={`border-b-2 border-gray-300 ${formato === "a4" ? "h-12" : "h-8"}`}></div>
            </div>
          </div>

          {/* Footer */}
          <div className={`text-center text-gray-500 mt-6 border-t pt-4 ${formato === "a4" ? "text-xs" : "text-[10px]"}`}>
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