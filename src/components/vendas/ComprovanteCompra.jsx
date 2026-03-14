import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Share2, X } from 'lucide-react';
import { format } from 'date-fns';

export default function ComprovanteCompra({ pedido, open, onClose }) {
  const jaImprimiu = useRef(false);

  useEffect(() => {
    if (open && !jaImprimiu.current) {
      jaImprimiu.current = true;
      setTimeout(() => {
        window.print();
      }, 500);
    } else if (!open) {
      jaImprimiu.current = false;
    }
  }, [open]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pedido ${pedido.numero || 'Nº'}`,
          text: `Comprovante de pedido - ${pedido.cliente_nome}`,
        });
      } catch (err) {
        console.log('Compartilhamento cancelado ou não suportado');
      }
    } else {
      window.print();
    }
  };

  if (!pedido) return null;

  const formatValor = (valor) => {
    const num = parseFloat(valor) || 0;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const itensOrdenados = pedido.itens ? [...pedido.itens].sort((a, b) => {
    const nomeA = a.produto_nome || '';
    const nomeB = b.produto_nome || '';
    return nomeA.localeCompare(nomeB);
  }) : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-gray-200 flex justify-center print:bg-transparent print:shadow-none print:border-none">
        
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { margin: 0 !important; size: 80mm auto !important; }
            #root, #__next { display: none !important; }
            .area-comprovante-ativo, .area-comprovante-ativo * { display: block !important; visibility: visible !important; }
            .area-comprovante-ativo table { display: table !important; }
            .area-comprovante-ativo tr { display: table-row !important; }
            .area-comprovante-ativo th, .area-comprovante-ativo td { display: table-cell !important; }
            .area-comprovante-ativo .grid-totais { display: grid !important; }
            .area-comprovante-ativo .flex-linha { display: flex !important; }
            .area-comprovante-ativo { position: absolute !important; left: 0 !important; top: 0 !important; width: 72mm !important; margin: 0 auto !important; padding: 0 !important; background: transparent !important; }
            .no-print { display: none !important; }
          }
          .cupom-termico { width: 270px; background: #fff; color: #000; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; padding: 8px 5px; margin: 20px auto; line-height: 1.3; }
          .t-center { text-align: center; }
          .t-right { text-align: right; }
          .t-left { text-align: left; }
          .bold { font-weight: bold; }
          .linha-separadora { border-bottom: 1px dotted #000; margin: 6px 0; }
          .tabela-itens { width: 100%; border-collapse: collapse; margin: 6px 0; }
          .tabela-itens th { font-weight: bold; border-top: 1px dotted #000; border-bottom: 1px dotted #000; padding: 4px 0; text-align: right; }
          .tabela-itens td { text-align: right; vertical-align: top; padding: 4px 0; }
          .tabela-itens th:first-child, .tabela-itens td:first-child { text-align: left; width: 50%; }
          .grid-totais { display: grid; grid-template-columns: 1fr 65px; row-gap: 4px; }
          .grid-totais > div:nth-child(odd) { text-align: right; padding-right: 10px; }
          .grid-totais > div:nth-child(even) { text-align: right; }
          .flex-linha { display: flex; justify-content: space-between; margin-bottom: 3px; }
        `}} />

        <div className="w-full flex flex-col items-center max-h-[90vh] overflow-y-auto pb-8 print:max-h-none print:overflow-visible print:pb-0">
          
          <div className="flex gap-2 my-4 w-[270px] justify-end flex-wrap print:hidden">
            <Button variant="outline" onClick={handleShare} size="sm" className="h-8 border-black text-black">
              <Share2 className="w-4 h-4 mr-1" /> Partilhar
            </Button>
            <Button onClick={() => window.print()} size="sm" className="h-8 bg-black text-white hover:bg-gray-800">
              <Printer className="w-4 h-4 mr-1" /> Imprimir
            </Button>
            <Button variant="outline" onClick={onClose} size="sm" className="h-8 border-black text-black">
              <X className="w-4 h-4 mr-1" /> Fechar
            </Button>
          </div>

          <div className={`cupom-termico shadow-lg print:shadow-none ${open ? 'area-comprovante-ativo' : 'no-print'}`}>
            
            <div className="t-center">
              <h2 className="bold" style={{ fontSize: '18px', margin: '2px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>VAREJOSYNC</h2>
              <div style={{ fontSize: '11px', color: '#333' }}>
                <p>Obrigado pela sua preferência!</p>
              </div>
            </div>

            <div className="linha-separadora"></div>

            <div className="t-center bold" style={{ fontSize: '13px', margin: '6px 0' }}>
              RECIBO Nº {pedido.numero?.replace(/\D/g, '').slice(-5) || 'S/N'}
            </div>

            <div className="flex-linha">
              <div style={{ width: '45%' }}>
                <div>Data:</div>
                <div className="t-center bold">{format(new Date(pedido.created_date || new Date()), 'dd/MM/yyyy')}</div>
              </div>
              <div style={{ width: '55%' }}>
                <div style={{ paddingLeft: '5px' }}>Cliente:</div>
                <div className="t-center uppercase bold" style={{ fontSize: '10px', paddingLeft: '5px' }}>
                  {pedido.cliente_nome?.substring(0, 18) || 'AVULSO'}
                </div>
              </div>
            </div>

            <div className="flex-linha mt-1">
              <div style={{ width: '45%' }}>
                <div>Hora:</div>
                <div className="t-center bold">{format(new Date(pedido.created_date || new Date()), 'HH:mm')}</div>
              </div>
              <div style={{ width: '55%' }}>
                <div style={{ paddingLeft: '5px' }}>Vend.:</div>
                <div className="t-center uppercase bold" style={{ fontSize: '10px', paddingLeft: '5px' }}>
                  {pedido.vendedor_nome?.substring(0, 15) || 'VENDEDOR'}
                </div>
              </div>
            </div>

            <table className="tabela-itens" style={{ marginTop: '10px' }}>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Qtd</th>
                  <th>Preço</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {itensOrdenados.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                      {item.produto_nome?.substring(0, 20)}
                    </td>
                    <td>{item.quantidade}</td>
                    <td>{formatValor(item.preco_unitario_praticado)}</td>
                    <td className="bold">{formatValor(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="linha-separadora"></div>

            <div className="grid-totais">
              <div>Subtotal</div>
              <div>{formatValor(pedido.subtotal)}</div>
              
              {pedido.valor_desconto > 0 && (
                <>
                  <div>Desconto</div>
                  <div>-{formatValor(pedido.valor_desconto)}</div>
                </>
              )}

              {pedido.valor_acrescimo > 0 && (
                <>
                  <div>Acréscimo</div>
                  <div>+{formatValor(pedido.valor_acrescimo)}</div>
                </>
              )}
            </div>

            <div className="linha-separadora"></div>
            
            <div className="grid-totais bold" style={{ fontSize: '14px' }}>
              <div>TOTAL</div>
              <div>R$ {formatValor(pedido.valor_total)}</div>
            </div>

            <div className="linha-separadora"></div>

            <div className="bold" style={{ margin: '8px 0 4px 0', fontSize: '10px', textTransform: 'uppercase' }}>Método de Pagamento</div>
            {pedido.pagamentos && pedido.pagamentos.length > 0 ? (
              pedido.pagamentos.map((pag, idx) => (
                <div key={idx} className="flex-linha" style={{ fontSize: '11px', marginTop: '2px' }}>
                  <div className="uppercase">{pag.forma_pagamento}</div>
                  <div className="bold">R$ {formatValor(pag.valor)}</div>
                </div>
              ))
            ) : (
              <div className="flex-linha" style={{ fontSize: '11px', marginTop: '2px' }}>
                <div>A DEFINIR / DINHEIRO</div>
                <div className="bold">R$ {formatValor(pedido.valor_total)}</div>
              </div>
            )}

            <div className="t-center" style={{ marginTop: '20px', fontSize: '9px', color: '#555' }}>
              <p>VarejoSync ERP - Documento Auxiliar</p>
              <p>Gerado em {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
