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
    <div className="overflow-hidden whitespace-nowrap text-center" style={{ margin: '2px 0', letterSpacing: '0.5px' }}>
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
          
          /* 1. MUDANÇA DA FONTE: Ubuntu Sans Mono */
          .cupom-termico, 
          .cupom-termico *,
          .cupom-termico div,
          .cupom-termico span,
          .cupom-termico th,
          .cupom-termico td { 
            font-family: 'Ubuntu Sans Mono', monospace !important; 
            font-feature-settings: normal !important;
            -webkit-font-smoothing: antialiased;
          }
          
          .cupom-termico { 
            width: 275px; background: #fff; color: #000; 
            font-size: 11px; padding: 5px; margin: 0 auto; line-height: 1.2; 
          }
          
          .t-center { text-align: center; }
          .t-left { text-align: left; }
          .t-right { text-align: right; }
          .uppercase { text-transform: uppercase; }
          .bold { font-weight: bold; }
          
          /* 2. PAGINAÇÃO ESTILO GRINGO: Tabela Fixa */
          .tabela-itens { 
            width: 100%; border-collapse: collapse; margin: 2px 0; table-layout: fixed; 
          }
          .tabela-itens th, .tabela-itens td { 
            padding: 2px 0; 
            vertical-align: top;
            word-wrap: break-word; /* Se o nome for grande, quebra a linha só na coluna dele */
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
                    style={{ maxWidth: '100px', maxHeight: '60px', filter: 'grayscale(100%) contrast(200%)' }}
                  />
                </div>
              )}
              <h2 className="bold uppercase" style={{ fontSize: '15px', margin: '2px 0' }}>
                {dadosEmpresa?.razao_social || 'VAREJOSYNC'}
              </h2>
              {dadosEmpresa && (
                <div style={{ fontSize: '11px', lineHeight: '1.3' }}>
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

            <div className="t-center bold" style={{ fontSize: '13px', margin: '4px 0' }}>
              RECIBO Nº {pedido.numero?.replace(/\D/g, '').slice(-5) || 'S/N'}
            </div>

            <div style={{ fontSize: '11px', marginTop: '4px' }}>
              <div className="flex-linha">
                <span>DATA: {format(new Date(pedido.created_date || new Date()), 'dd/MM/yy')}</span>
                <span>HORA: {format(new Date(pedido.created_date || new Date()), 'HH:mm')}</span>
              </div>
              <div style={{ marginTop: '2px' }}>
                CLIENTE: <span className="uppercase bold">{pedido.cliente_nome?.substring(0, 30) || 'AVULSO'}</span>
              </div>
            </div>

            <LinhaHifens />

            {/* A TABELA DE FERRO (Padrão VinCommerce Autêntico) */}
            <table className="tabela-itens" style={{ fontSize: '11px' }}>
              <thead>
                <tr className="uppercase bold">
                  <th style={{ width: '8%', textAlign: 'left' }}>NO.</th>
                  <th style={{ width: '36%', textAlign: 'left' }}>|DESCRIÇÃO</th>
                  <th style={{ width: '13%', textAlign: 'center' }}>|QTD</th>
                  <th style={{ width: '11%', textAlign: 'center' }}>|UN</th>
                  <th style={{ width: '16%', textAlign: 'right' }}>|PREÇO</th>
                  <th style={{ width: '16%', textAlign: 'right' }}>|TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {itensOrdenados.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'left' }}>{idx + 1}</td>
                    <td style={{ textAlign: 'left' }} className="uppercase">|{item.produto_nome}</td>
                    <td style={{ textAlign: 'center' }}>|{parseFloat(item.quantidade).toFixed(0)}</td>
                    <td style={{ textAlign: 'center' }}>|UN</td>
                    <td style={{ textAlign: 'right' }}>|{formatValor(item.preco_unitario_praticado)}</td>
                    <td style={{ textAlign: 'right' }} className="bold">|{formatValor(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <LinhaHifens />

            <div style={{ fontSize: '11px', marginTop: '4px' }}>
              {pedido.valor_desconto > 0 && (
                <div className="flex-linha">
                  <div>Desconto:</div>
                  <div>-{formatValor(pedido.valor_desconto)}</div>
                </div>
              )}
              
              <div className="flex-linha">
                <div>Subtotal:</div>
                <div>{formatValor(pedido.subtotal)}</div>
              </div>
            </div>
            
            {/* 3. HIERARQUIA DE TAMANHO AGRESSIVA NO TOTAL */}
            <div className="flex-linha bold uppercase" style={{ fontSize: '16px', margin: '6px 0 4px 0' }}>
              <div>TOTAL:</div>
              <div>R$ {formatValor(pedido.valor_total)}</div>
            </div>

            <LinhaHifens />

            {/* HIERARQUIA DE TAMANHO NAS FORMAS DE PAGAMENTO */}
            <div className="bold" style={{ fontSize: '12px', marginBottom: '4px' }}>PAGAMENTO:</div>
            {pedido.pagamentos && pedido.pagamentos.length > 0 ? (
              pedido.pagamentos.map((pag, idx) => (
                <div key={idx} className="flex-linha bold uppercase" style={{ fontSize: '14px', marginTop: '2px' }}>
                  <div>{pag.forma_pagamento}:</div>
                  <div>R$ {formatValor(pag.valor)}</div>
                </div>
              ))
            ) : (
              <div className="flex-linha bold uppercase" style={{ fontSize: '14px', marginTop: '2px' }}>
                <div>DINHEIRO:</div>
                <div>R$ {formatValor(pedido.valor_total)}</div>
              </div>
            )}

            <LinhaHifens />

            <div style={{ fontSize: '10px', marginTop: '4px' }}>
              <div>Vendedor: {pedido.vendedor_nome || 'N/D'}</div>
              <div>Caixa: {pedido.usuario_caixa_nome || pedido.vendedor_nome || 'N/D'}</div>
            </div>

            <LinhaHifens />

            {dadosEmpresa?.mensagem_rodape && (
              <div className="t-center bold uppercase" style={{ marginTop: '8px', fontSize: '12px' }}>
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
