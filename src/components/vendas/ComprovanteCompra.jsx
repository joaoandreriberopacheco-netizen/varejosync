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
        }, 700);
      }
    } else {
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

  const LinhaHifens = () => (
    <div className="overflow-hidden whitespace-nowrap text-center" style={{ margin: '2px 0', letterSpacing: '1px' }}>
      --------------------------------------------------
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-gray-200 flex justify-center print:bg-transparent print:shadow-none print:border-none">
        
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { margin: 0 !important; size: 80mm auto !important; }
            
            body * { visibility: hidden !important; }
            #recibo-final-iosevka, #recibo-final-iosevka * { visibility: visible !important; }
            #recibo-final-iosevka { 
              position: absolute !important; 
              left: 0 !important; 
              top: 0 !important; 
              width: 100% !important;
            }

            body > div:first-of-type { display: none !important; }
            div[role="dialog"] { 
              position: absolute !important; left: 0 !important; top: 0 !important; 
              transform: none !important; max-height: none !important; overflow: visible !important;
            }
            .no-print { display: none !important; }
          }
          
          .cupom-termico { 
            width: 270px; background: #fff; color: #000; 
            font-family: 'Iosevka Charon Mono', monospace !important; 
            font-size: 11px; padding: 5px; margin: 0 auto; line-height: 1.1; 
          }
          
          .t-center { text-align: center; }
          .bold { font-weight: bold; }
          .uppercase { text-transform: uppercase; }
          
          .tabela-itens { 
            width: 100%; border-collapse: collapse; margin: 2px 0; table-layout: fixed; 
          }
          .tabela-itens th, .tabela-itens td { 
            padding: 2px 0; white-space: nowrap; overflow: hidden; 
          }
          
          .grid-totais { display: grid; grid-template-columns: 1fr 75px; row-gap: 2px; }
          .grid-totais > div:nth-child(odd) { text-align: right; padding-right: 5px; }
          .grid-totais > div:nth-child(even) { text-align: right; }
          .flex-linha { display: flex; justify-content: space-between; margin-bottom: 2px; }
        `}} />

        <div className="w-full flex flex-col items-center max-h-[90vh] overflow-y-auto pb-8 print:max-h-none print:overflow-visible print:pb-0">
          
          <div className="flex gap-2 my-4 w-[270px] justify-end flex-wrap no-print">
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

          <div id="recibo-final-iosevka" className="cupom-termico print:shadow-none shadow-lg">
            
            <div className="t-center">
              {dadosEmpresa?.logo_url && (
                <div style={{ margin: '4px auto 6px' }}>
                  <img 
                    src={dadosEmpresa.logo_url} 
                    alt="Logo" 
                    style={{ maxWidth: '100px', maxHeight: '60px', filter: 'grayscale(100%) contrast(200%)' }}
                  />
                </div>
              )}
              <h2 className="bold" style={{ fontSize: '14px', margin: '2px 0', textTransform: 'uppercase' }}>
                {dadosEmpresa?.razao_social || 'VAREJOSYNC'}
              </h2>
              <div style={{ fontSize: '10px' }}>
                {dadosEmpresa?.endereco && <p>{dadosEmpresa.endereco}</p>}
                {dadosEmpresa?.cnpj && <p>CNPJ: {dadosEmpresa.cnpj}</p>}
              </div>
            </div>

            <LinhaHifens />

            <div className="t-center bold" style={{ fontSize: '13px', margin: '4px 0' }}>
              RECIBO No: {pedido.numero?.replace(/\D/g, '').slice(-5) || 'S/N'}
            </div>

            <div style={{ fontSize: '10px', marginTop: '4px' }}>
              <div className="flex-linha">
                <span>DATA: {format(new Date(pedido.created_date || new Date()), 'dd/MM/yy')}</span>
                <span>HORA: {format(new Date(pedido.created_date || new Date()), 'HH:mm')}</span>
                <span className="uppercase">OP: {pedido.vendedor_nome?.split(' ')[0] || 'ADM'}</span>
              </div>
              <div style={{ marginTop: '2px' }}>
                CLIENTE: <span className="uppercase bold">{pedido.cliente_nome?.substring(0, 22) || 'AVULSO'}</span>
              </div>
            </div>

            <LinhaHifens />

            <table className="tabela-itens">
              <thead>
                <tr className="bold" style={{ fontSize: '10px' }}>
                  <th style={{ width: '45%', textAlign: 'left' }}>ITEM</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>|QT</th>
                  <th style={{ width: '40%', textAlign: 'right' }}>|TOTAL</th>
                </tr>
              </thead>
            </table>
            
            <LinhaHifens />

            <table className="tabela-itens">
              <tbody>
                {itensOrdenados.map((item, idx) => (
                  <tr key={idx} style={{ fontSize: '10px' }}>
                    <td style={{ textAlign: 'left' }}>{item.produto_nome?.substring(0, 16).toUpperCase()}</td>
                    <td style={{ textAlign: 'center' }}>|{item.quantidade}</td>
                    <td style={{ textAlign: 'right' }} className="bold">|{formatValor(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <LinhaHifens />

            <div className="grid-totais" style={{ fontSize: '11px' }}>
              <div>Subtotal:</div>
              <div>{formatValor(pedido.subtotal)}</div>
            </div>

            <div className="grid-totais bold" style={{ fontSize: '15px', margin: '4px 0' }}>
              <div>TOTAL:</div>
              <div>R$ {formatValor(pedido.valor_total)}</div>
            </div>

            <LinhaHifens />

            <div className="bold" style={{ margin: '4px 0', fontSize: '11px' }}>PAGAMENTO:</div>
            {(pedido.pagamentos || []).map((pag, idx) => (
              <div key={idx} className="flex-linha" style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '2px' }}>
                <div className="uppercase">{pag.forma_pagamento}</div>
                <div>{formatValor(pag.valor)}</div>
              </div>
            ))}

            <LinhaHifens />
            
            <div className="t-center italic bold" style={{ marginTop: '6px', fontSize: '11px' }}>
              {dadosEmpresa?.mensagem_rodape || 'OBRIGADO PELA PREFERÊNCIA!'}
            </div>

            <div className="t-center" style={{ marginTop: '15px', fontSize: '9px', opacity: 0.7 }}>
              <p>VAREJOSYNC ERP</p>
              <p>{format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
