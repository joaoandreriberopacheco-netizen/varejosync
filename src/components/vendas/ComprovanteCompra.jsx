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
        
        {/* CORREÇÃO AQUI: Removidos comentários internos para evitar o erro de Unterminated Template e adicionada a vacina anti-sumiço */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { margin: 0 !important; size: 80mm auto !important; }
            
            body * { visibility: hidden !important; }
            #area-recibo-impressao, #area-recibo-impressao * { visibility: visible !important; }
            #area-recibo-impressao { 
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
            font-family: 'Inconsolata', monospace !important; 
            font-size: 11px; padding: 5px; margin: 0 auto; line-height: 1.2; 
          }
          
          .t-center { text-align: center; }
          .t-right { text-align: right; }
          .bold { font-weight: bold; }
          .uppercase { text-transform: uppercase; }
          
          .tabela-itens { 
            width: 100%; border-collapse: collapse; margin: 2px 0; table-layout: fixed; 
          }
          .tabela-itens th, .tabela-itens td { 
            padding: 2px 0; white-space: nowrap; overflow: hidden; 
          }
          
          .grid-totais { display: grid; grid-template-columns: 1
