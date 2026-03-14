import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Share2, X } from 'lucide-react';
import { format } from 'date-fns';

export default function ComprovanteCompra({ pedido, open, onClose }) {
  const jaImprimiu = useRef(false);

  useEffect(() => {
    if (open && !jaImprimiu.current) {
      jaImprimiu.current = true;
      setTimeout(() => {
        window.print();
      }, 500);
    } else if (!open) {
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-gray-200 flex justify-center print:bg-transparent print:shadow-none print:border-none">
        
        <style type="text/css">
          {`
            @media print {
              /* A VACINA DAS MARGENS: Força a impressora a assumir o papel de 80mm e anula as margens padrão do Chrome */
              @page { 
                margin: 0 !important; 
                size: 80mm auto !important; 
              }
              
              /* Apaga o site de fundo (React Root) */
              #root, #__next { display: none !important; }
              
              /* Só imprime o que tem a classe ATIVA. Ignora os "fantasmas". */
              .area-comprovante-ativo, .area-comprovante-ativo * { 
                display: block !important; 
                visibility: visible !important
