import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Share2, X } from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';

export default function ComprovanteCompra({ pedido, open, onClose }) {
  const jaImprimiu = useRef(false);
  const [dadosEmpresa, setDadosEmpresa] = useState(null);

  useEffect(() => {
    if (open) {
      const carregarDadosEmpresa = async () => {
        try {
          const empresas = await base44.entities.DadosEmpresa.list();
          if (empresas && empresas.length > 0) {
            setDadosEmpresa(empresas[0]);
          }
        } catch (error) {
          console.error('Erro ao carregar dados da empresa:', error);
        }
      };
      carregarDadosEmpresa();

      if (!jaImprimiu.current) {
        jaImprimiu.current = true;
        setTimeout(() => {
          window.print();
        }, 800); // Um pouco mais de tempo para garantir o carregamento da fonte
      }
    } else {
      jaImprimiu.current = false;
    }
  }, [open]);

  if (!pedido) return null;

  const formatValor = (valor) => {
    const num = parseFloat(valor) || 0;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const LinhaHifens = () => (
    <div className="text-center whitespace-nowrap overflow-hidden" style={{ margin: '2px 0', letterSpacing: '1px' }}>
      --------------------------------------------------
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-gray-100 flex justify-center print:bg-white print:shadow-none border-none">
        
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { margin: 0; size: 80mm auto; }
            /* Estratégia Anti-Sumiço: Esconde tudo exceto o conteúdo do Modal */
            body * { visibility: hidden; }
            #imprimir-recibo, #imprimir-recibo * { visibility: visible; }
            #imprimir-recibo { 
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 100%; 
              display: block !important;
            }
            .no-print { display: none !important; }
          }
          
          .cupom-termico { 
            width: 275px; 
            background: #fff; 
            color: #000; 
            font-family: 'Inconsolata', monospace !important; 
            font-size: 12px; 
            padding: 8px; 
            margin: 0 auto; 
            line-height: 1.2; 
          }
          
          .tabela-itens { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .tabela-itens td { padding: 2px 0; overflow: hidden; white-space: nowrap; }
          
          .font-lg { font-size: 16px; font-weight: bold; }
          .font-sm { font-size: 10px; }
        `}} />

        <div className="w-full flex flex-col items-center max-h-[90vh] overflow-y-auto pb-8 print:max-h-none print:overflow-visible">
          
          <div className="flex gap-2 my-4 no-print">
            <Button onClick={() => window.print()} size="sm" className="bg-black text-white hover:bg-gray-800">
              <Printer className="w-4 h-4 mr-1" /> Imprimir
            </Button>
            <Button variant="outline" onClick={onClose} size="sm" className="border-black">
              <X className="w-4 h-4 mr-1" /> Fechar
            </Button>
          </div>

          <div id="imprimir-recibo" className="cupom-termico shadow-lg print:shadow-none">
            
            {/* Cabeçalho com Logo Grayscale */}
            <div className="text-center">
              {dadosEmpresa?.logo_url ? (
                <img 
                  src={dadosEmpresa.logo_url} 
                  className="mx-auto mb-2 grayscale contrast-150" 
                  style={{maxWidth: '140px'}} 
                />
              ) : (
                <h2 className="font-bold font-lg uppercase">{dadosEmpresa?.nome || 'VAREJOSYNC'}</h2>
              )}
              <div className="font-sm uppercase">{dadosEmpresa?.endereco || 'TABATINGA/AM'}</div>
              <div className="font-sm">CNPJ: {dadosEmpresa?.cnpj || '00.000.000/0000-00'}</div>
            </div>

            <LinhaHifens />

            <div className="text-center font-bold">RECIBO No: {pedido.numero?.replace(/\D/g, '').slice(-6) || '000000'}</div>

            {/* Nova Hierarquia: Data, Hora e Usuário na mesma linha */}
            <div className="flex justify-between mt-2 font-sm">
              <span>{format(new Date(pedido.created_date || new Date()), 'dd/MM/yy')}</span>
              <span>{format(new Date(pedido.created_date || new Date()), 'HH:mm')}</span>
              <span className="uppercase">OP:{pedido.vendedor_nome?.split(' ')[0] || 'ADM'}</span>
            </div>

            <div className="font-bold mt-1 font-sm uppercase">
              CLIENTE: {pedido.cliente_nome?.substring(0, 24) || 'CONSUMIDOR AVULSO'}
            </div>

            <LinhaHifens />

            <table className="tabela-itens font-sm">
              <thead>
                <tr className="font-bold">
                  <th style={{ width: '45%', textAlign: 'left' }}>ITEM</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>|QT</th>
                  <th style={{ width: '40%', textAlign: 'right' }}>|TOTAL</th>
                </tr>
              </thead>
            </table>
            
            <LinhaHifens />

            <table className="tabela-itens font-sm">
              <tbody>
                {(pedido.itens || []).map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'left' }}>{item.produto_nome?.substring(0, 16).toUpperCase()}</td>
                    <td style={{ textAlign: 'center' }}>|{item.quantidade}</td>
                    <td style={{ textAlign: 'right' }}>|{formatValor(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <LinhaHifens />

            <div className="flex justify-between font-sm">
              <span>Subtotal:</span>
              <span>{formatValor(pedido.subtotal)}</span>
            </div>

            <div className="flex justify-between mt-1 font-lg">
              <div>TOTAL:</div>
              <div>R$ {formatValor(pedido.valor_total)}</div>
            </div>

            <LinhaHifens />

            <div className="font-bold font-sm">PAGAMENTO:</div>
            {(pedido.pagamentos || []).map((pag, idx) => (
              <div key={idx} className="flex justify-between font-lg mt-1">
                <div className="uppercase">{pag.forma_pagamento}</div>
                <div>{formatValor(pag.valor)}</div>
              </div>
            ))}

            <LinhaHifens />

            <div className="text-center mt-4 font-sm">
              <div className="font-bold uppercase italic">
                {dadosEmpresa?.mensagem_rodape || 'OBRIGADO PELA PREFERÊNCIA!'}
              </div>
              <div className="mt-2 text-[8px] opacity-70">
                VAREJOSYNC ERP - {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
              </div>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
