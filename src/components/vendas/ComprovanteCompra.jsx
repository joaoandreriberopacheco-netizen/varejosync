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

  const LinhaTracejada = () => (
    <div style={{ borderTop: '1px dashed #000', margin: '4px 0', width: '100%' }}></div>
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
          .cupom-termico th,
          .cupom-termico td { 
            font-family: 'Iosevka Charon Mono', monospace !important; 
            font-feature-settings: normal !important;
            -webkit-font-smoothing: antialiased;
            font-weight: 400 !important; 
          }
          
          .cupom-termico { 
            width: 275px; background: #fff; color: #000; 
            font-size: 11px; padding: 5px; margin: 0 auto; 
            padding-bottom: 25px;
          }
