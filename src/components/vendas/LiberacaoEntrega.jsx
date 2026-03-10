import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import QRCode from 'qrcode';

export default function LiberacaoEntrega({ open, onClose, pedido, cliente }) {
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  // Gera o QR Code quando o modal abre
  useEffect(() => {
    if (open && pedido?.id) {
      QRCode.toDataURL(pedido.id, {
        width: 200,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' }
      }).then(url => {
        setQrCodeUrl(url);
      });
    }
  }, [open, pedido?.id]);

  // Dispara a impressão automática
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
      {/* Container responsivo: largo no ecrã (A4), mas espreme no mobile/POS */}
      <DialogContent className="max-w-3xl p-0 bg-gray-200 flex justify-center overflow-hidden max-h-[95vh]">
        
        {/* Estilos de Impressão Fluida */}
        <style type="text/css" media="print">
          {`
            @page { margin: 0.5cm; size: auto; }
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body * { visibility: hidden; }
            #area-liberacao, #area-liberacao * { visibility: visible; }
            #area-liberacao { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
          `}
        </style>

        {/* Área imprimível */}
        <div 
          id="area-liberacao"
          className="bg-white p-4 sm:p-8 w-full font-sans text-gray-800 shadow-lg print:shadow-none overflow-y-auto print:overflow-visible"
        >
          
          {/* Cabeçalho */}
          <div className="text-center pb-4 mb-6 border-b border-gray-200">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">LIBERAÇÃO PARA ENTREGA</h1>
            <p className="text-[11px] sm:text-sm text-gray-500 mt-1 uppercase tracking-widest">Documento de Controle Interno</p>
          </div>

          {/* Secção Superior: Dados vs QR Code */}
          <div className="flex flex-col sm:flex-row gap-6 mb-8">
            
            {/* Coluna da Esquerda: Dados */}
            <div className="flex-1 space-y-4">
              
              {/* Identificação */}
              <div className="bg-gray-50/50 border border-gray-100 p-3 sm:p-4 rounded-md">
                <h3 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Identificação</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500 text-xs">Pedido:</span>
                    <p className="font-bold text-gray-900">{pedido.numero}</p>
                  </div>
                  {pedido.senha_atendimento && (
                    <div>
                      <span className="text-gray-500 text-xs">Senha:</span>
                      <p className="font-bold text-gray-900">{pedido.senha_atendimento}</p>
                    </div>
                  )}
                  <div className="col-span-2 sm:col-span-1 mt-1">
                    <span className="text-gray-500 text-xs">Data/Hora:</span>
                    <p className="text-gray-900">
                      {new Date(pedido.created_date).toLocaleDateString('pt-BR')} às {new Date(pedido.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cliente & Entrega combinados no A4, empilhados no 80mm */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 bg-gray-50/50 border border-gray-100 p-3 sm:p-4 rounded-md">
                  <h3 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Cliente</h3>
                  <p className="font-semibold text-gray-900 text-sm mb-1">{pedido.cliente_nome}</p>
                  {cliente && (
                    <div className="text-[11px] sm:text-xs text-gray-600 space-y-0.5">
                      {cliente.telefone && <p>Tel: {cliente.telefone}</p>}
                      {cliente.endereco && <p>{cliente.endereco}{cliente.bairro && `, ${cliente.bairro}`}</p>}
                      {(cliente.cidade || cliente.estado) && <p>{cliente.cidade} - {cliente.estado}</p>}
                    </div>
                  )}
                </div>

                <div className="flex-1 bg-gray-50/50 border border-gray-100 p-3 sm:p-4 rounded-md">
                  <h3 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Método de Entrega</h3>
                  <p className="text-base sm:text-lg font-bold text-gray-900 mt-1">
                    {pedido.metodo_entrega === 'Delivery' ? '🚚 Delivery' : '🏪 Retirada no Balcão'}
                  </p>
                  {pedido.data_entrega && (
                    <p className="text-[11px] sm:text-xs text-gray-600 mt-1">
                      Prevista: {new Date(pedido.data_entrega).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna da Direita: QR Code */}
            <div className="w-full sm:w-56 flex flex-col items-center justify-center bg-gray-50/80 border border-gray-200 p-4 rounded-md print:break-inside-avoid">
              <h3 className="text-[11px] sm:text-xs font-bold text-gray-800 text-center mb-3 leading-tight">
                ESCANEIE PARA INICIAR SEPARAÇÃO
              </h3>
              {qrCodeUrl && (
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code Separação" 
                  className="w-32 h-32 sm:w-40 sm:h-40 border border-gray-300 rounded bg-white p-1"
                />
              )}
              <p className="text-[9px] sm:text-[10px] text-gray-500 mt-3 text-center leading-tight">
                Use o leitor de QR Code para marcar como "Em separação"
              </p>
            </div>
          </div>

          {/* Observações (Destacadas se existirem) */}
          {pedido.observacoes && (
            <div className="bg-yellow-50/50 border border-yellow-200 p-3 sm:p-4 rounded-md mb-6">
              <h3 className="text-[10px] sm:text-xs font-bold text-yellow-800 uppercase tracking-wider mb-1">Observações do Pedido</h3>
              <p className="text-xs sm:text-sm text-yellow-900">{pedido.observacoes}</p>
            </div>
          )}

          {/* Lista de Itens (Estilo Clip Careers Responsivo) */}
          <div className="mb-8 space-y-2">
            <h3 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Itens do Pedido</h3>
            
            {pedido.itens?.map((item, idx) => (
              <div 
                key={idx} 
                className="border border-gray-200 bg-gray-50/30 rounded-md p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 print:border-gray-300 print:break-inside-avoid"
              >
                <div className="flex-1 min-w-0 flex gap-3">
                  {/* Quantidade em destaque */}
                  <div className="bg-gray-200 text-gray-800 font-bold rounded px-2 py-1 h-fit text-xs sm:text-sm">
                    {item.quantidade}x
                  </div>
                  {/* Descrição */}
                  <div>
                    <p className="font-semibold text-[13px] sm:text-sm text-gray-900 break-words leading-tight mt-0.5">
                      {item.produto_nome}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:hidden">
                      Unit: {formatValor(item.preco_unitario_praticado)}
                    </p>
                  </div>
                </div>
                
                {/* Valores */}
                <div className="flex justify-end items-center gap-6 mt-2 sm:mt-0">
                  <div className="hidden sm:block text-right">
                    <p className="text-[10px] text-gray-400 uppercase">Unitário</p>
                    <p className="text-sm text-gray-600">{formatValor(item.preco_unitario_praticado)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase hidden sm:block">Total</p>
                    <p className="font-bold text-[13px] sm:text-sm text-gray-900">{formatValor(item.total)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Área de Totais */}
          <div className="flex flex-col items-end border-t border-gray-200 pt-4 mb-8">
            <div className="w-full sm:w-64 space-y-1.5 text-xs sm:text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatValor(pedido.subtotal)}</span>
              </div>
              {pedido.valor_desconto > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Desconto:</span>
                  <span>-{formatValor(pedido.valor_desconto)}</span>
                </div>
              )}
              {pedido.valor_frete > 0 && (
                <div className="flex justify-between">
                  <span>Frete:</span>
                  <span>{formatValor(pedido.valor_frete)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base sm:text-lg text-gray-900 pt-2 border-t border-gray-200 mt-2">
                <span>Valor Total:</span>
                <span>{formatValor(pedido.valor_total)}</span>
              </div>
            </div>
          </div>

          {/* Área de Controle / Assinaturas (Responsiva) */}
          <div className="border-t-2 border-gray-300 pt-6">
            <h3 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 text-center sm:text-left">
              Controle de Separação e Entrega
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
              {/* Bloco 1 */}
              <div>
                <p className="text-[10px] sm:text-xs text-gray-500 mb-6">Separado por:</p>
                <div className="border-b border-gray-400"></div>
              </div>
              {/* Bloco 2 */}
              <div>
                <p className="text-[10px] sm:text-xs text-gray-500 mb-6">Data / Hora:</p>
                <div className="border-b border-gray-400"></div>
              </div>

              {/* Blocos Extras para Delivery */}
              {pedido.metodo_entrega === 'Delivery' && (
                <>
                  <div>
                    <p className="text-[10px] sm:text-xs text-gray-500 mb-6">Entregador:</p>
                    <div className="border-b border-gray-400"></div>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-gray-500 mb-6">Horário de Saída:</p>
                    <div className="border-b border-gray-400"></div>
                  </div>
                </>
              )}
            </div>

            {/* Assinatura Final (Ocupa a largura toda) */}
            <div className="mt-8">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-8">Assinatura do Recebedor:</p>
              <div className="border-b border-gray-400"></div>
            </div>
          </div>

          {/* Rodapé */}
          <div className="text-center text-[9px] sm:text-[10px] text-gray-400 mt-8 pt-4 border-t border-gray-100 uppercase tracking-wider">
            <p>Documento gerado automaticamente - VarejoSync ERP</p>
          </div>

        </div>

        {/* Botões Flutuantes (Escondidos na impressão) */}
        <div className="absolute top-4 right-4 flex gap-2 print:hidden">
          <Button onClick={() => window.print()} className="shadow-sm h-8 px-3 text-xs">
            <Printer className="w-3 h-3 mr-2" />
            Imprimir
          </Button>
          <Button variant="secondary" onClick={onClose} className="shadow-sm h-8 px-3 text-xs">
            <X className="w-3 h-3 mr-1" />
            Fechar
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
