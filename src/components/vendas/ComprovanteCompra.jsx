import React, { useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Share2, X } from 'lucide-react';
import { format } from 'date-fns';

export default function ComprovanteCompra({ pedido, open, onClose }) {
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [open]);

  // Mantemos a função de partilha original (WhatsApp, etc.)
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

  // Formatação para o padrão brasileiro/vírgula
  const formatValor = (valor) => {
    const num = parseFloat(valor) || 0;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Ordenação Alfabética dos Itens
  const itensOrdenados = pedido.itens ? [...pedido.itens].sort((a, b) => {
    const nomeA = a.produto_nome || '';
    const nomeB = b.produto_nome || '';
    return nomeA.localeCompare(nomeB);
  }) : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-gray-200 flex justify-center">
        
        {/* A "VACINA" TÉRMICA: CSS ESTRITO PARA 80MM */}
        <style type="text/css">
          {`
            @media print {
              @page { margin: 0; size: auto; }
              body { margin: 0; background: transparent; }
              body * { visibility: hidden; }
              #area-comprovante, #area-comprovante * { visibility: visible; }
              /* Força a impressora a não passar dos 80mm (300px) e remove sombras/fundos */
              #area-comprovante { position: absolute; left: 0; top: 0; width: 300px; padding: 0; box-shadow: none !important; background: transparent !important; }
              .no-print { display: none !important; }
            }

            /* Estilos Globais do Cupom (Tela e Papel) */
            .cupom-termico {
              width: 300px; /* Largura estrita de 80mm */
              background: #fff;
              color: #000; /* Preto puro, nada de cinzento! */
              font-family: Arial, sans-serif;
              font-size: 12px;
              padding: 10px;
              margin: 20px auto;
              line-height: 1.2;
            }

            .t-center { text-align: center; }
            .t-right { text-align: right; }
            .t-left { text-align: left; }
            .bold { font-weight: bold; }
            
            .linha-separadora {
              border-bottom: 1px solid #000;
              margin: 5px 0;
            }

            /* Tabela de Produtos (O Segredo do Alinhamento) */
            .tabela-itens {
              width: 100%;
              border-collapse: collapse;
              margin: 5px 0;
            }
            .tabela-itens th {
              font-weight: normal;
              border-top: 1px solid #000;
              border-bottom: 1px solid #000;
              padding: 3px 0;
              text-align: right;
            }
            .tabela-itens td {
              text-align: right;
              vertical-align: top;
              padding: 3px 0;
            }
            .tabela-itens th:first-child, .tabela-itens td:first-child {
              text-align: left;
              width: 50%;
            }

            /* Grid de Totais */
            .grid-totais {
              display: grid;
              grid-template-columns: 1fr 75px; /* Mais espaço para não cortar os centavos */
              row-gap: 3px;
            }
            .grid-totais > div:nth-child(odd) {
              text-align: right;
              padding-right: 15px;
            }
            .grid-totais > div:nth-child(even) {
              text-align: right;
            }
          `}
        </style>

        <div className="w-full flex flex-col items-center max-h-[90vh] overflow-y-auto pb-8">
          
          {/* Botões de Ação (Apenas na Tela) - Mantive o teu botão "Compartilhar" */}
          <div className="flex gap-2 my-4 no-print w-[300px] justify-end flex-wrap">
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

          {/* ÁREA DE IMPRESSÃO - O LAYOUT CLÁSSICO */}
          <div id="area-comprovante" className="cupom-termico shadow-lg">
            
            {/* Cabeçalho da Empresa */}
            <div className="t-center">
              <h2 className="bold" style={{ fontSize: '18px', margin: '2px 0', textTransform: 'uppercase' }}>VAREJOSYNC</h2>
              <div style={{ fontSize: '12px' }}>
                <p>Obrigado pela sua preferência!</p>
              </div>
            </div>

            <div className="linha-separadora"></div>

            {/* Cabeçalho do Pedido */}
            <div className="t-center bold" style={{ fontSize: '14px', margin: '6px 0' }}>
              RECIBO Nº {pedido.numero?.replace(/\D/g, '').slice(-5) || 'S/N'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <div style={{ width: '45%' }}>
                <div>Data:</div>
                <div className="t-center">{format(new Date(pedido.created_date || new Date()), 'dd/MM/yyyy')}</div>
              </div>
              <div style={{ width: '55%', paddingLeft: '10px' }}>
                <div>Cliente:</div>
                <div className="t-center uppercase" style={{ fontSize: '11px' }}>
                  {pedido.cliente_nome?.substring(0, 18) || 'AVULSO'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: '45%' }}>
                <div>Hora:</div>
                <div className="t-center">{format(new Date(pedido.created_date || new Date()), 'HH:mm')}</div>
              </div>
              <div style={{ width: '55%', paddingLeft: '10px' }}>
                <div>Vend.:</div>
                <div className="t-center uppercase">{pedido.vendedor_nome?.substring(0, 15) || 'VENDEDOR'}</div>
              </div>
            </div>

            {/* Detalhes dos Itens */}
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
                      {item.produto_nome?.substring(0, 22)}
                    </td>
                    <td>{item.quantidade}</td>
                    <td>{formatValor(item.preco_unitario_praticado)}</td>
                    <td>{formatValor(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="linha-separadora"></div>

            {/* Finalmentes: Totais */}
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

            {/* Formas de Pagamento */}
            <div className="bold" style={{ marginTop: '8px', fontSize: '11px', textTransform: 'uppercase' }}>Método de Pagamento</div>
            {pedido.pagamentos && pedido.pagamentos.length > 0 ? (
              pedido.pagamentos.map((pag, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '2px' }}>
                  <div className="uppercase">{pag.forma_pagamento}</div>
                  <div>R$ {formatValor(pag.valor)}</div>
                </div>
              ))
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '2px' }}>
                <div>A DEFINIR / DINHEIRO</div>
                <div>R$ {formatValor(pedido.valor_total)}</div>
              </div>
            )}

            {/* Rodapé Auxiliar */}
            <div className="t-center" style={{ marginTop: '20px', fontSize: '10px', color: '#666' }}>
              <p>VarejoSync ERP - Documento Auxiliar</p>
              <p>Gerado em {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
