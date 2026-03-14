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
    <div className="overflow-hidden whitespace-nowrap text-center" style={{ margin: '3px 0', letterSpacing: '0px' }}>
      --------------------------------------------------
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-md p-0 bg-gray-200 flex justify-center print:bg-transparent print:shadow-none print:border-none"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { margin: 0 !important; size: 80mm auto !important; }
            body * { visibility: hidden !important; }
            .cupom-termico, .cupom-termico * { visibility: visible !important; }
            .cupom-termico { 
              position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important;
            }
            .no-print { display: none !important; }
          }
          
          /* IOSEVKA APLICADA E NEGRITO ABSOLUTAMENTE BANIDO */
          .cupom-termico, 
          .cupom-termico *,
          .cupom-termico div,
          .cupom-termico span,
          .cupom-termico th,
          .cupom-termico td { 
            font-family: 'Iosevka Charon Mono', monospace !important; 
            font-feature-settings: normal !important;
            -webkit-font-smoothing: antialiased;
            font-weight: 400 !important; /* Força tudo a ser normal, sem negrito */
          }
          
          .cupom-termico { 
            width: 275px; background: #fff; color: #000; 
            font-size: 11px; padding: 5px; margin: 0 auto; line-height: 1.25; 
          }
          
          .t-center { text-align: center; }
          .uppercase { text-transform: uppercase; }
          
          /* TABELA DE FERRO (Fixa as colunas para não haver "desabamento") */
          .tabela-itens { 
            width: 100%; border-collapse: collapse; margin: 3px 0; table-layout: fixed; 
          }
          .tabela-itens th, .tabela-itens td { 
            padding: 1px 0; 
            vertical-align: top;
            word-wrap: break-word; 
          }
          
          .flex-linha { display: flex; justify-content: space-between; margin-bottom: 2px; }
        `}} />

        <div className="w-full flex flex-col items-center max-h-[90vh] overflow-y-auto pb-8 print:max-h-none print:overflow-visible print:pb-0">
          
          <div className="flex gap-2 my-4 w-[275px] justify-end flex-wrap no-print">
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
                    style={{ maxWidth: '120px', maxHeight: '70px', filter: 'grayscale(100%) contrast(200%)' }}
                  />
                </div>
              )}
              <h2 className="uppercase" style={{ fontSize: '16px', margin: '2px 0' }}>
                {dadosEmpresa?.razao_social || 'VAREJOSYNC'}
              </h2>
              {dadosEmpresa && (
                <div style={{ fontSize: '10px', lineHeight: '1.4' }}>
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

            <div className="t-center uppercase" style={{ fontSize: '13px', margin: '4px 0' }}>
              RECIBO Nº {pedido.numero?.replace(/\D/g, '').slice(-5) || 'S/N'}
            </div>

            <div style={{ fontSize: '10px', marginTop: '4px' }}>
              <div className="flex-linha uppercase">
                <span>DATA/HORA: {format(new Date(pedido.created_date || new Date()), 'dd/MM/yy HH:mm')}</span>
              </div>
              <div className="uppercase" style={{ marginTop: '2px' }}>
                CLIENTE: {pedido.cliente_nome?.substring(0, 30) || 'AVULSO'}
              </div>
            </div>

            <LinhaHifens />

            <table className="tabela-itens" style={{ fontSize: '11px' }}>
              <thead>
                <tr className="uppercase">
                  <th style={{ width: '8%', textAlign: 'left' }}>NO.</th>
                  <th style={{ width: '38%', textAlign: 'left' }}>| DESCRIÇÃO</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>| QTD</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>| UN</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>| PREÇO</th>
                  <th style={{ width: '17%', textAlign: 'right' }}>| TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {itensOrdenados.map((item, idx) => {
                  const nomeCompleto = (item.produto_nome || '').toUpperCase();
                  const num = idx + 1;
                  const qtd = parseFloat(item.quantidade).toFixed(0);
                  const preco = formatValor(item.preco_unitario_praticado);
                  const total = formatValor(item.total);
                  
                  const MAX_DESC = 18;
                  let pedacos = [];
                  let resto = nomeCompleto;
                  
                  while (resto.length > 0) {
                    if (resto.length <= MAX_DESC) {
                      pedacos.push(resto);
                      break;
                    }
                    let breakPoint = resto.lastIndexOf(' ', MAX_DESC);
                    if (breakPoint === -1 || breakPoint === 0) breakPoint = MAX_DESC;
                    pedacos.push(resto.substring(0, breakPoint));
                    resto = resto.substring(breakPoint + 1).trim();
                  }

                  return (
                    <React.Fragment key={idx}>
                      {pedacos.length === 1 ? (
                        <tr>
                          <td style={{ textAlign: 'left' }}>{num}</td>
                          <td style={{ textAlign: 'left' }} className="uppercase">| {pedacos[0]}</td>
                          <td style={{ textAlign: 'center' }}>| {qtd}</td>
                          <td style={{ textAlign: 'center' }}>| UN</td>
                          <td style={{ textAlign: 'right' }}>| {preco}</td>
                          <td style={{ textAlign: 'right' }}>| {total}</td>
                        </tr>
                      ) : (
                        <>
                          <tr>
                            <td style={{ textAlign: 'left' }}>{num}</td>
                            <td style={{ textAlign: 'left' }} className="uppercase">| {pedacos[0]}</td>
                            <td style={{ textAlign: 'center' }}></td>
                            <td style={{ textAlign: 'center' }}></td>
                            <td style={{ textAlign: 'right' }}></td>
                            <td style={{ textAlign: 'right' }}></td>
                          </tr>
                          {pedacos.slice(1).map((pedaco, i) => {
                            const isLast = i === pedacos.length - 2;
                            return (
                              <tr key={i}>
                                <td style={{ textAlign: 'left' }}></td>
                                <td style={{ textAlign: 'left' }} className="uppercase">| {pedaco}</td>
                                <td style={{ textAlign: 'center' }}>{isLast ? `| ${qtd}` : ''}</td>
                                <td style={{ textAlign: 'center' }}>{isLast ? '| UN' : ''}</td>
                                <td style={{ textAlign: 'right' }}>{isLast ? `| ${preco}` : ''}</td>
                                <td style={{ textAlign: 'right' }}>{isLast ? `| ${total}` : ''}</td>
                              </tr>
                            );
                          })}
                        </>
                      )}
                      <tr><td colSpan="6" style={{ height: '6px' }}></td></tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            <LinhaHifens />

            <div style={{ fontSize: '11px', marginTop: '4px' }}>
              {pedido.valor_desconto > 0 && (
                <div className="flex-linha uppercase">
                  <span>DESCONTO:</span>
                  <span>-{formatValor(pedido.valor_desconto)}</span>
                </div>
              )}
              
              <div className="flex-linha uppercase">
                <span>SUBTOTAL:</span>
                <span>{formatValor(pedido.subtotal)}</span>
              </div>
            </div>
            
            {/* TOTAL GIGANTE - HIERARQUIA VINCOMMERCE */}
            <div className="flex-linha uppercase" style={{ fontSize: '18px', margin: '8px 0 6px 0' }}>
              <span>TOTAL PAGAMENTO:</span>
              <span>{formatValor(pedido.valor_total)}</span>
            </div>

            {(pedido.pagamentos || []).map((pag, idx) => (
              <div key={idx} className="flex-linha uppercase" style={{ fontSize: '14px', marginTop: '2px' }}>
                <span>{pag.forma_pagamento}:</span>
                <span>{formatValor(pag.valor)}</span>
              </div>
            ))}
            {(!pedido.pagamentos || pedido.pagamentos.length === 0) && (
              <div className="flex-linha uppercase" style={{ fontSize: '14px', marginTop: '2px' }}>
                <span>DINHEIRO:</span>
                <span>{formatValor(pedido.valor_total)}</span>
              </div>
            )}

            <LinhaHifens />

            <div style={{ fontSize: '10px', marginTop: '4px' }}>
              <div className="uppercase">VEND: {pedido.vendedor_nome || 'N/D'}</div>
              <div className="uppercase">CAIXA: {pedido.usuario_caixa_nome || pedido.vendedor_nome || 'N/D'}</div>
            </div>

            <LinhaHifens />

            {dadosEmpresa?.mensagem_rodape && (
              <div className="t-center uppercase" style={{ marginTop: '8px', fontSize: '13px' }}>
                {dadosEmpresa.mensagem_rodape}
              </div>
            )}
            <div className="t-center" style={{ marginTop: '15px', fontSize: '9px', opacity: 0.8 }}>
              <p>VAREJOSYNC ERP</p>
              <p>{format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
