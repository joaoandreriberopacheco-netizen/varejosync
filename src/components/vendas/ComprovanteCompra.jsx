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
        }, 700); // Tempo extra para garantir que a Inconsolata carregou
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
            
            /* CORREÇÃO DO BUG DE IMPRESSÃO (O FANTASMA) */
            body * { visibility: hidden !important; }
            #area-recibo-termico, #area-recibo-termico * { visibility: visible !important; }
            #area-recibo-termico { 
              position: absolute !important; 
              left: 0 !important; 
              top: 0 !important; 
              width: 100% !important;
            }
            .no-print { display: none !important; }
          }
          
          .cupom-termico { 
            width: 270px; 
            background: #fff; 
            color: #000; 
            /* APLICAÇÃO DA FONTE INCONSOLATA */
            font-family: 'Inconsolata', monospace !important; 
            font-size: 11px; 
            padding: 5px; 
            margin: 0 auto; 
            line-height: 1.2; 
          }
          
          .t-center { text-align: center; }
          .t-right { text-align: right; }
          .bold { font-weight: bold; }
          .uppercase { text-transform: uppercase; }
          
          .flex-linha { display: flex; justify-content: space-between; margin-bottom: 2px; }
          
          .tabela-itens { width: 100%; border-collapse: collapse; margin: 2px 0; }
          .tabela-itens th { border-bottom: none; padding: 2px 0; }
          .tabela-itens td { padding: 2px 0; }
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

          <div id="area-recibo-termico" className="cupom-termico print:shadow-none shadow-lg">
            
            <div className="t-center">
              {dadosEmpresa?.logo_url ? (
                <img 
                  src={dadosEmpresa.logo_url} 
                  alt="Logo" 
                  className="mx-auto mb-2 grayscale contrast-150" 
                  style={{ maxWidth: '150px', maxHeight: '80px' }} 
                />
              ) : (
                <h2 className="bold" style={{ fontSize: '18px', margin: '2px 0' }}>{dadosEmpresa?.nome || 'VAREJOSYNC'}</h2>
              )}
              
              <div style={{ fontSize: '10px' }}>
                {dadosEmpresa?.endereco && <p>{dadosEmpresa.endereco}</p>}
                {dadosEmpresa?.telefone && <p>TEL: {dadosEmpresa.telefone}</p>}
                {dadosEmpresa?.cnpj && <p>CNPJ: {dadosEmpresa.cnpj}</p>}
              </div>
            </div>

            <LinhaHifens />

            <div className="t-center bold" style={{ fontSize: '13px', margin: '4px 0' }}>
              RECIBO Nº {pedido.numero?.replace(/\D/g, '').slice(-5) || 'S/N'}
            </div>

            <div className="flex-linha mt-2">
              <div style={{ width: '45%' }}>
                <div>DATA:</div>
                <div className="t-center bold">{format(new Date(pedido.created_date || new Date()), 'dd/MM/yyyy')}</div>
              </div>
              <div style={{ width: '55%' }}>
                <div style={{ paddingLeft: '5px' }}>CLIENTE:</div>
                <div className="t-center uppercase bold" style={{ paddingLeft: '5px' }}>
                  {pedido.cliente_nome?.substring(0, 16) || 'AVULSO'}
                </div>
              </div>
            </div>

            <div className="flex-linha mt-1 mb-2">
              <div style={{ width: '45%' }}>
                <div>HORA:</div>
                <div className="t-center bold">{format(new Date(pedido.created_date || new Date()), 'HH:mm')}</div>
              </div>
              <div style={{ width: '55%' }}>
                <div style={{ paddingLeft: '5px' }}>VEND.:</div>
                <div className="t-center uppercase bold" style={{ paddingLeft: '5px' }}>
                  {pedido.vendedor_nome?.substring(0, 14) || 'VENDEDOR'}
                </div>
              </div>
            </div>

            <LinhaHifens />

            <table className="tabela-itens">
              <thead>
                <tr style={{ fontSize: '10px' }}>
                  <th className="uppercase" style={{ textAlign: 'left', width: '45%' }}>Item</th>
                  <th className="uppercase" style={{ textAlign: 'center', width: '15%' }}>Qtd</th>
                  <th className="uppercase" style={{ textAlign: 'right', width: '40%' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(pedido.itens || []).map((item, idx) => (
                  <tr key={idx} style={{ fontSize: '10px' }}>
                    <td className="uppercase">{item.produto_nome?.substring(0, 18)}</td>
                    <td className="t-center">{item.quantidade}</td>
                    <td className="t-right bold">{formatValor(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <LinhaHifens />

            <div className="flex-linha">
              <div>SUBTOTAL:</div>
              <div className="bold">R$ {formatValor(pedido.subtotal)}</div>
            </div>
            
            <div className="flex-linha bold" style={{ fontSize: '13px', margin: '4px 0' }}>
              <div>TOTAL:</div>
              <div>R$ {formatValor(pedido.valor_total)}</div>
            </div>

            <LinhaHifens />

            <div className="bold" style={{ margin: '6px 0 4px 0', fontSize: '12px' }}>PAGAMENTO:</div>
            {(pedido.pagamentos || []).map((pag, idx) => (
              <div key={idx} className="flex-linha" style={{ fontSize: '11px' }}>
                <div className="uppercase">{pag.forma_pagamento}</div>
                <div className="bold">R$ {formatValor(pag.valor)}</div>
              </div>
            ))}

            {dadosEmpresa?.mensagem_rodape && (
              <>
                <LinhaHifens />
                <div className="t-center bold uppercase" style={{ marginTop: '6px', fontSize: '10px' }}>
                  {dadosEmpresa.mensagem_rodape}
                </div>
              </>
            )}

            <div className="t-center" style={{ marginTop: '15px', fontSize: '9px' }}>
              <p>VAREJOSYNC ERP</p>
              <p>{format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
            </div>

          </div>
        </div>
      </DialogContent>
