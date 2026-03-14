import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Share2, X } from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';

export default function ComprovanteCompra({ pedido, open, onClose }) {
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
    }
  }, [open]);

  // FUNÇÃO MÁGICA DE IMPRESSÃO ISOLADA
  const dispararImpressao = () => {
    const conteudo = document.getElementById('area-recibo-termico').innerHTML;
    const janelaImpressao = window.open('', '_blank', 'width=300,height=600');
    
    janelaImpressao.document.write(`
      <html>
        <head>
          <title>Impressão de Recibo</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;700&display=swap');
            
            body { 
              margin: 0; 
              padding: 0; 
              background: #fff; 
              font-family: 'Inconsolata', monospace !important;
            }
            @page { margin: 0; size: 80mm auto; }
            
            .cupom-termico { 
              width: 72mm; 
              padding: 5px; 
              font-size: 11px; 
              line-height: 1.2;
            }
            .t-center { text-align: center; }
            .t-right { text-align: right; }
            .bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .flex-linha { display: flex; justify-content: space-between; margin-bottom: 2px; }
            .tabela-itens { width: 100%; border-collapse: collapse; table-layout: fixed; }
            .tabela-itens th, .tabela-itens td { padding: 2px 0; overflow: hidden; white-space: nowrap; }
            .grid-totais { display: grid; grid-template-columns: 1fr 75px; row-gap: 2px; }
            .grid-totais > div:nth-child(odd) { text-align: right; padding-right: 5px; }
            img { filter: grayscale(100%) contrast(200%); }
          </style>
        </head>
        <body>
          <div class="cupom-termico">${conteudo}</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          <\/script>
        </body>
      </html>
    `);
    janelaImpressao.document.close();
  };

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        dispararImpressao();
      }, 1000);
    }
  }, [open]);

  if (!pedido) return null;

  const formatValor = (valor) => {
    const num = parseFloat(valor) || 0;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const LinhaHifens = () => (
    <div className="text-center" style={{ margin: '2px 0', letterSpacing: '1px' }}>
      --------------------------------------------------
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-gray-200 flex justify-center border-none">
        
        <div className="w-full flex flex-col items-center max-h-[90vh] overflow-y-auto pb-8">
          
          <div className="flex gap-2 my-4 w-[270px] justify-end flex-wrap no-print">
            <Button onClick={dispararImpressao} size="sm" className="h-8 bg-black text-white hover:bg-gray-800">
              <Printer className="w-4 h-4 mr-1" /> Imprimir
            </Button>
            <Button variant="outline" onClick={onClose} size="sm" className="h-8 border-black text-black">
              <X className="w-4 h-4 mr-1" /> Fechar
            </Button>
          </div>

          <div 
            id="area-recibo-termico" 
            className="bg-white p-2 shadow-lg" 
            style={{ width: '270px', fontFamily: "'Inconsolata', monospace", fontSize: '11px', color: '#000' }}
          >
            <div className="t-center">
              {dadosEmpresa?.logo_url && (
                <img src={dadosEmpresa.logo_url} alt="Logo" style={{ maxWidth: '100px', maxHeight: '60px', margin: '0 auto' }} />
              )}
              <h2 className="bold" style={{ fontSize: '14px', margin: '2px 0' }}>
                {dadosEmpresa?.razao_social || 'VAREJOSYNC'}
              </h2>
              <div style={{ fontSize: '10px' }}>
                <p>{dadosEmpresa?.endereco}</p>
                <p>CNPJ: {dadosEmpresa?.cnpj}</p>
              </div>
            </div>

            <LinhaHifens />

            <div className="t-center bold" style={{ fontSize: '12px' }}>RECIBO No: {pedido.numero?.replace(/\D/g, '').slice(-5)}</div>

            <div className="t-center" style={{ fontSize: '10px', marginTop: '2px' }}>
              {format(new Date(pedido.created_date), 'dd/MM/yyyy HH:mm')}
            </div>

            <LinhaHifens />

            {/* Itens */}
            <div style={{ marginTop: '4px' }}>
              <table className="tabela-itens">
                <thead>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <th style={{ textAlign: 'left', width: '55%' }}>ITEM</th>
                    <th style={{ textAlign: 'center', width: '15%' }}>QTD</th>
                    <th style={{ textAlign: 'right', width: '15%' }}>UNIT</th>
                    <th style={{ textAlign: 'right', width: '15%' }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido.itens?.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px dotted #ccc' }}>
                      <td style={{ paddingRight: '2px', textOverflow: 'ellipsis' }}>{item.produto_nome}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantidade}</td>
                      <td style={{ textAlign: 'right' }}>{formatValor(item.preco_unitario_praticado)}</td>
                      <td style={{ textAlign: 'right' }}>{formatValor(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <LinhaHifens />

            {/* Totais */}
            <div className="grid-totais" style={{ marginTop: '4px' }}>
              <div className="bold">SUBTOTAL:</div>
              <div className="t-right bold">R$ {formatValor(pedido.subtotal)}</div>

              {pedido.valor_desconto > 0 && (
                <>
                  <div>Desconto:</div>
                  <div className="t-right">-R$ {formatValor(pedido.valor_desconto)}</div>
                </>
              )}

              {pedido.valor_frete > 0 && (
                <>
                  <div>Frete:</div>
                  <div className="t-right">R$ {formatValor(pedido.valor_frete)}</div>
                </>
              )}

              <div className="bold" style={{ fontSize: '13px', marginTop: '2px' }}>TOTAL:</div>
              <div className="t-right bold" style={{ fontSize: '13px', marginTop: '2px' }}>R$ {formatValor(pedido.valor_total)}</div>
            </div>

            <LinhaHifens />

            {/* Pagamentos */}
            {pedido.pagamentos && pedido.pagamentos.length > 0 && (
              <>
                <div className="bold t-center" style={{ fontSize: '11px', marginTop: '4px' }}>FORMA DE PAGAMENTO</div>
                <div style={{ marginTop: '2px' }}>
                  {pedido.pagamentos.map((pag, idx) => (
                    <div key={idx} className="flex-linha">
                      <span>{pag.forma_pagamento} {pag.parcelas > 1 ? `(${pag.parcelas}x)` : ''}</span>
                      <span className="bold">R$ {formatValor(pag.valor)}</span>
                    </div>
                  ))}
                </div>
                <LinhaHifens />
              </>
            )}

            {/* Cliente */}
            {pedido.cliente_nome && (
              <div className="t-center" style={{ fontSize: '10px', marginTop: '4px' }}>
                <div className="bold">CLIENTE</div>
                <div>{pedido.cliente_nome}</div>
              </div>
            )}

            {/* Rodapé */}
            <div className="t-center" style={{ fontSize: '9px', marginTop: '8px', color: '#666' }}>
              {dadosEmpresa?.mensagem_rodape || 'Obrigado pela preferência!'}
            </div>
            <div className="t-center" style={{ fontSize: '9px', marginTop: '2px', color: '#666' }}>
              VarejoSync - Sistema ERP
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}