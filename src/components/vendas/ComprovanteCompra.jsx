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
        }, 500);
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
      ----------------------------------------------------------------------------------
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-gray-200 flex justify-center print:bg-transparent print:shadow-none print:border-none">
        
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { margin: 0 !important; size: 80mm auto !important; }
            body > div:first-of-type { display: none !important; }
            div[role="dialog"] { 
              position: absolute !important; left: 0 !important; top: 0 !important; 
              transform: none !important; max-height: none !important; overflow: visible !important;
            }
            .no-print { display: none !important; }
          }
          
          .cupom-termico { 
            width: 270px; background: #fff; color: #000; 
            font-family: 'Iosevka Charon Mono', 'Courier New', 'Consolas', monospace; 
            font-size: 11px; padding: 5px; margin: 0 auto; line-height: 1.2; 
          }
          
          .t-center { text-align: center; }
          .t-right { text-align: right; }
          .uppercase { text-transform: uppercase; }
          
          /* O SEGREDO DA GRELHA: table-layout fixed impede que as colunas se esmaguem */
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

          <div className="cupom-termico print:shadow-none shadow-lg">
            
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
              <h2 style={{ fontSize: '14px', margin: '2px 0', textTransform: 'uppercase' }}>
                {dadosEmpresa?.razao_social || 'VAREJOSYNC'}
              </h2>
              {dadosEmpresa && (
                <div style={{ fontSize: '10px', lineHeight: '1.3' }}>
                  {dadosEmpresa.endereco && (
                    <p>{dadosEmpresa.endereco}{dadosEmpresa.numero ? ', ' + dadosEmpresa.numero : ''}</p>
                  )}
                  {(dadosEmpresa.bairro || dadosEmpresa.cidade) && (
                    <p>
                      {dadosEmpresa.bairro && `${dadosEmpresa.bairro} - `}
                      {dadosEmpresa.cidade && dadosEmpresa.cidade}
                      {dadosEmpresa.estado && `/${dadosEmpresa.estado}`}
                    </p>
                  )}
                  {dadosEmpresa.cep && <p>CEP: {dadosEmpresa.cep}</p>}
                  {dadosEmpresa.cnpj && <p>CNPJ: {dadosEmpresa.cnpj}</p>}
                  {dadosEmpresa.telefone && <p>Tel: {dadosEmpresa.telefone}</p>}
                </div>
              )}
            </div>

            <LinhaHifens />

            <div className="t-center" style={{ fontSize: '13px', margin: '4px 0' }}>
              RECIBO Nº {pedido.numero?.replace(/\D/g, '').slice(-5) || 'S/N'}
            </div>

            <div style={{ fontSize: '10px', marginTop: '4px' }}>
              <div>
                DATA: {format(new Date(pedido.created_date || new Date()), 'dd/MM/yyyy')} | 
                HORA: {format(new Date(pedido.created_date || new Date()), 'HH:mm')} | 
                VEND: {pedido.vendedor_nome?.substring(0, 8) || 'N/D'}
              </div>
              <div style={{ marginTop: '2px' }}>
                CLIENTE: <span className="uppercase">{pedido.cliente_nome?.substring(0, 22) || 'AVULSO'}</span>
              </div>
            </div>

            <LinhaHifens />

            {/* A TABELA DE FERRO (Larguras exatas e Paredes "|") */}
            <table className="tabela-itens">
              <thead>
                <tr>
                  <th style={{ width: '8%', textAlign: 'left' }}>NO.</th>
                  <th style={{ width: '30%', textAlign: 'left' }}>|ITEM NAME</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>|QTY</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>|UOM</th>
                  <th style={{ width: '20%', textAlign: 'right' }}>|UNIT PRICE</th>
                  <th style={{ width: '22%', textAlign: 'right' }}>|AMOUNT</th>
                </tr>
              </thead>
            </table>
            
            <LinhaHifens />

            <table className="tabela-itens">
              <tbody>
                {itensOrdenados.map((item, idx) => {
                  const nomeCompleto = item.produto_nome || '';
                  const linha1 = nomeCompleto.substring(0, 20).toUpperCase();
                  const resto = nomeCompleto.substring(20);
                  
                  return (
                    <React.Fragment key={idx}>
                      <tr>
                        <td style={{ width: '8%', textAlign: 'left' }}>{idx + 1}</td>
                        <td style={{ width: '30%', textAlign: 'left' }}>| {linha1}</td>
                        <td style={{ width: '10%', textAlign: 'center' }}>| {parseFloat(item.quantidade).toFixed(0)}</td>
                        <td style={{ width: '10%', textAlign: 'center' }}>| UN</td>
                        <td style={{ width: '20%', textAlign: 'right' }}>| {formatValor(item.preco_unitario_praticado)}</td>
                        <td style={{ width: '22%', textAlign: 'right' }}>| {formatValor(item.total)}</td>
                      </tr>
                      {resto && (
                        <tr>
                          <td style={{ width: '8%' }}></td>
                          <td colSpan="5" style={{ textAlign: 'left', paddingLeft: '2px', lineHeight: '1.1' }}>| {resto.toUpperCase()}</td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            <LinhaHifens />

            <div className="grid-totais" style={{ fontSize: '10px' }}>
              {pedido.valor_desconto > 0 && (
                <>
                  <div>Desconto:</div>
                  <div>-{formatValor(pedido.valor_desconto)}</div>
                </>
              )}

              {pedido.valor_acrescimo > 0 && (
                <>
                  <div>Acréscimo:</div>
                  <div>+{formatValor(pedido.valor_acrescimo)}</div>
                </>
              )}

              <div>Subtotal:</div>
              <div>{formatValor(pedido.subtotal)}</div>
            </div>
            
            <div className="grid-totais" style={{ fontSize: '14px', margin: '4px 0' }}>
              <div>TOTAL PAYMENT:</div>
              <div>{formatValor(pedido.valor_total)}</div>
            </div>

            {pedido.pagamentos && pedido.pagamentos.length > 0 ? (
              pedido.pagamentos.map((pag, idx) => (
                <div key={idx} className="flex-linha" style={{ fontSize: '11px' }}>
                  <div className="uppercase">{pag.forma_pagamento}:</div>
                  <div>{formatValor(pag.valor)}</div>
                </div>
              ))
            ) : (
              <div className="flex-linha" style={{ fontSize: '11px' }}>
                <div>DINHEIRO:</div>
                <div>{formatValor(pedido.valor_total)}</div>
              </div>
            )}

            <LinhaHifens />

            {dadosEmpresa?.mensagem_rodape && (
              <div className="t-center" style={{ marginTop: '6px', fontSize: '11px' }}>
                {dadosEmpresa.mensagem_rodape}
              </div>
            )}
            <div className="t-center" style={{ marginTop: '15px', fontSize: '9px' }}>
              <p>VAREJOSYNC ERP</p>
              <p>{format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}