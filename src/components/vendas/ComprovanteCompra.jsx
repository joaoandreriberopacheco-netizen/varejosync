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
    <div className="overflow-hidden whitespace-nowrap" style={{ margin: '1px 0', letterSpacing: '0' }}>
      ------------------------------------------------
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-gray-200 flex justify-center print:bg-transparent print:shadow-none print:border-none">
        
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { margin: 0 !important; size: 80mm auto !important; }
            body * { visibility: hidden !important; }
            .cupom-termico, .cupom-termico * { visibility: visible !important; }
            .cupom-termico { 
              position: absolute !important; left: 0 !important; top: 0 !important; 
            }
            .no-print { display: none !important; }
          }
          
          .cupom-termico, 
          .cupom-termico *,
          .cupom-termico pre,
          .cupom-termico div,
          .cupom-termico span { 
            font-family: 'Iosevka Charon Mono', monospace !important; 
            font-feature-settings: normal !important;
            -webkit-font-smoothing: antialiased;
          }
          
          .cupom-termico { 
            width: 270px; background: #fff; color: #000; 
            font-size: 9px; padding: 4px; margin: 0 auto; line-height: 1.3; 
            font-weight: 300;
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
                DATA: {format(new Date(pedido.created_date || new Date()), 'dd/MM/yyyy')} | HORA: {format(new Date(pedido.created_date || new Date()), 'HH:mm')}
              </div>
              <div style={{ marginTop: '2px' }}>
                CLIENTE: <span className="uppercase">{pedido.cliente_nome?.substring(0, 30) || 'AVULSO'}</span>
              </div>
            </div>

            <LinhaHifens />

            <pre style={{ fontSize: '8.5px', marginBottom: '1px', fontFamily: 'inherit' }}>
NO | DESCRIÇÃO           | QTD | UN |  PREÇO |   TOTAL
            </pre>
            
            <LinhaHifens />

            {itensOrdenados.map((item, idx) => {
              const nomeCompleto = (item.produto_nome || '').toUpperCase();
              const qtd = parseFloat(item.quantidade).toFixed(0);
              const preco = formatValor(item.preco_unitario_praticado);
              const total = formatValor(item.total);
              
              // Colunas: NO(2) | DESC(19) | QTD(3) | UN(2) | PREÇO(6) | TOTAL(7)
              const maxDescricao = 19;
              let linhasDescricao = [];
              let resto = nomeCompleto;
              
              // Quebra a descrição sem cortar palavras
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
                <pre key={idx} style={{ marginBottom: '4px', fontSize: '8.5px', fontFamily: 'inherit' }}>
{String(idx + 1).padStart(2, ' ')} | {linhasDescricao[0].padEnd(maxDescricao, ' ')}
{linhasDescricao.slice(1).map((linha) => 
`   | ${linha.padEnd(maxDescricao, ' ')}`
).join('\n')}
{linhasDescricao.length > 0 ? `   | ${' '.repeat(maxDescricao)} | ${qtd.padStart(3, ' ')} | UN | ${preco.padStart(6, ' ')} | ${total.padStart(7, ' ')}` : ''}
                </pre>
              );
            })}

            <LinhaHifens />

            <div style={{ fontSize: '9px', marginTop: '2px' }}>
              <div className="flex-linha">
                <div>Desconto:</div>
                <div>{pedido.valor_desconto > 0 ? '-' + formatValor(pedido.valor_desconto) : '0,00'}</div>
              </div>
              
              <div className="flex-linha">
                <div>Subtotal:</div>
                <div>{formatValor(pedido.subtotal)}</div>
              </div>
            </div>
            
            <div className="flex-linha" style={{ fontSize: '13px', margin: '3px 0 2px 0' }}>
              <div>TOTAL PAGAMENTO:</div>
              <div>{formatValor(pedido.valor_total)}</div>
            </div>

            {pedido.pagamentos && pedido.pagamentos.length > 0 ? (
              pedido.pagamentos.map((pag, idx) => (
                <div key={idx} className="flex-linha" style={{ fontSize: '10px' }}>
                  <div className="uppercase">{pag.forma_pagamento}:</div>
                  <div>{formatValor(pag.valor)}</div>
                </div>
              ))
            ) : (
              <div className="flex-linha" style={{ fontSize: '10px' }}>
                <div>DINHEIRO:</div>
                <div>{formatValor(pedido.valor_total)}</div>
              </div>
            )}

            <LinhaHifens />

            <div style={{ fontSize: '9px', marginTop: '3px' }}>
              <div>Vendedor: {pedido.vendedor_nome || 'N/D'}</div>
              <div>Caixa: {pedido.usuario_caixa_nome || pedido.vendedor_nome || 'N/D'}</div>
            </div>

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