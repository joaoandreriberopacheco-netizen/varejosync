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
    return num.toFixed(2);
  };

  const itensOrdenados = pedido.itens ? [...pedido.itens].sort((a, b) => {
    const nomeA = a.produto_nome || '';
    const nomeB = b.produto_nome || '';
    return nomeA.localeCompare(nomeB);
  }) : [];

  const LinhaHifens = () => (
    <pre style={{ margin: '2px 0', fontSize: '8px', fontFamily: 'inherit' }}>
------------------------------------------------
    </pre>
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
          
          .cupom-termico, 
          .cupom-termico *,
          .cupom-termico div,
          .cupom-termico span,
          .cupom-termico pre { 
            font-family: 'Iosevka Charon Mono', 'Cousine', monospace !important; 
            font-weight: 400 !important;
            -webkit-font-smoothing: antialiased;
          }
          
          .cupom-termico { 
            width: 275px; background: #fff; color: #000; 
            font-size: 10px; padding: 8px; margin: 0 auto; line-height: 1.3; 
          }
          
          .cupom-termico pre {
            margin: 0;
            padding: 0;
            white-space: pre;
            font-family: inherit;
          }
          
          .t-center { text-align: center; }
          .uppercase { text-transform: uppercase; }
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
              <h2 className="uppercase" style={{ fontSize: '14px', margin: '2px 0', fontWeight: '400' }}>
                {dadosEmpresa?.razao_social || 'VAREJOSYNC'}
              </h2>
              {dadosEmpresa && (
                <div style={{ fontSize: '9px', lineHeight: '1.4' }}>
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

            <div className="t-center uppercase" style={{ fontSize: '12px', margin: '4px 0' }}>
              RECIBO Nº {pedido.numero?.replace(/\D/g, '').slice(-5) || 'S/N'}
            </div>

            <div style={{ fontSize: '9px', marginTop: '4px' }}>
              <pre style={{ fontFamily: 'inherit', fontSize: '9px' }}>
DATA/HORA: {format(new Date(pedido.created_date || new Date()), 'dd/MM/yy HH:mm')}
CLIENTE: {(pedido.cliente_nome || 'AVULSO').substring(0, 30).toUpperCase()}
              </pre>
            </div>

            <LinhaHifens />

            <pre style={{ fontSize: '8px', marginBottom: '1px', fontFamily: 'inherit' }}>
NO | DESCRIÇÃO        | QTD | UN | PREÇO | TOTAL
            </pre>
            
            <LinhaHifens />

            {itensOrdenados.map((item, idx) => {
              const nomeCompleto = (item.produto_nome || '').toUpperCase();
              const qtd = parseFloat(item.quantidade).toFixed(0);
              const preco = formatValor(item.preco_unitario_praticado);
              const total = formatValor(item.total);
              
              // Colunas ajustadas: NO(2) | DESC(16) | QTD(3) | UN(2) | PREÇO(5) | TOTAL(5)
              const maxDescricao = 16;
              let linhasDescricao = [];
              let resto = nomeCompleto;
              
              while (resto.length > 0) {
                if (resto.length <= maxDescricao) {
                  linhasDescricao.push(resto);
                  break;
                }
                
                let breakPoint = resto.lastIndexOf(' ', maxDescricao);
                if (breakPoint === -1 || breakPoint === 0) {
                  linhasDescricao.push(resto.substring(0, maxDescricao));
                  resto = resto.substring(maxDescricao);
                } else {
                  linhasDescricao.push(resto.substring(0, breakPoint));
                  resto = resto.substring(breakPoint + 1);
                }
              }
              
              return (
                <pre key={idx} style={{ marginBottom: '3px', fontSize: '8px', fontFamily: 'inherit' }}>
{String(idx + 1).padStart(2, ' ')} | {linhasDescricao[0].padEnd(maxDescricao, ' ')}
{linhasDescricao.slice(1).map((linha) => 
`   | ${linha.padEnd(maxDescricao, ' ')}`
).join('\n')}
{linhasDescricao.length > 0 ? `   | ${' '.repeat(maxDescricao)} | ${qtd.padStart(3, ' ')} | UN | ${preco.padStart(5, ' ')} | ${total.padStart(5, ' ')}` : ''}
                </pre>
              );
            })}

            <LinhaHifens />

            <div style={{ fontSize: '9px', marginTop: '6px' }}>
              <pre style={{ fontFamily: 'inherit', fontSize: '9px' }}>
SUBTOTAL:    R$ {formatValor(pedido.subtotal || 0)}
{pedido.valor_desconto > 0 && `DESCONTO:    R$ ${formatValor(pedido.valor_desconto)}`}
{pedido.valor_frete > 0 && `FRETE:       R$ ${formatValor(pedido.valor_frete)}`}
              </pre>
              <pre style={{ fontFamily: 'inherit', fontSize: '11px', marginTop: '4px', fontWeight: '400' }}>
TOTAL:       R$ {formatValor(pedido.valor_total || 0)}
              </pre>
            </div>

            <LinhaHifens />

            {pedido.pagamentos && pedido.pagamentos.length > 0 && (
              <>
                <div className="uppercase" style={{ fontSize: '10px', margin: '4px 0' }}>
                  FORMAS DE PAGAMENTO:
                </div>
                <div style={{ fontSize: '9px' }}>
                  {pedido.pagamentos.map((pag, idx) => (
                    <pre key={idx} style={{ fontFamily: 'inherit', fontSize: '9px' }}>
{pag.forma_pagamento}: R$ {formatValor(pag.valor)}
                    </pre>
                  ))}
                </div>
                <LinhaHifens />
              </>
            )}

            <div className="t-center" style={{ fontSize: '9px', marginTop: '8px', lineHeight: '1.4' }}>
              {dadosEmpresa?.mensagem_rodape || 'OBRIGADO PELA PREFERÊNCIA!'}
            </div>

            <div className="t-center" style={{ fontSize: '8px', marginTop: '6px', color: '#666' }}>
              Este documento não possui validade fiscal
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}