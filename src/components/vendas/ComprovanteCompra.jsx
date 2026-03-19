import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Printer, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { imprimirCupomTermico } from '@/functions/imprimirCupomTermico';

const fmtV = (v) => (parseFloat(v) || 0).toFixed(2);

// ── Cupom Térmico 80mm ────────────────────────────────────────────────────────
function CupomTermico({ pedido, dadosEmpresa }) {
  const itensOrdenados = pedido.itens
    ? [...pedido.itens].sort((a, b) => (a.produto_nome || '').localeCompare(b.produto_nome || ''))
    : [];

  const LinhaHifens = () => (
    <pre style={{ margin: '2px 0', fontSize: '8px', fontFamily: 'inherit' }}>
------------------------------------------------
    </pre>
  );

  return (
    <div
      id="cupom-print"
      style={{
        width: '275px',
        background: '#fff',
        color: '#000',
        fontFamily: "'Iosevka Charon Mono', 'Cousine', monospace",
        fontSize: '10px',
        padding: '8px',
        margin: '0 auto',
        lineHeight: '1.3',
      }}
    >
      {/* Cabeçalho empresa */}
      <div style={{ textAlign: 'center' }}>
        {dadosEmpresa?.logo_url && (
          <div style={{ margin: '4px auto 6px' }}>
            <img
              src={dadosEmpresa.logo_url}
              alt="Logo"
              style={{ maxWidth: '120px', maxHeight: '70px', filter: 'grayscale(100%) contrast(200%)' }}
            />
          </div>
        )}
        <h2 style={{ fontSize: '14px', margin: '2px 0', fontWeight: '400', textTransform: 'uppercase', fontFamily: 'inherit' }}>
          {dadosEmpresa?.razao_social || 'VAREJOSYNC'}
        </h2>
        {dadosEmpresa && (
          <div style={{ fontSize: '9px', lineHeight: '1.4' }}>
            {dadosEmpresa.endereco && (
              <p style={{ margin: 0 }}>{dadosEmpresa.endereco}{dadosEmpresa.numero ? ', ' + dadosEmpresa.numero : ''}</p>
            )}
            {(dadosEmpresa.bairro || dadosEmpresa.cidade) && (
              <p style={{ margin: 0 }}>
                {dadosEmpresa.bairro && `${dadosEmpresa.bairro} - `}
                {dadosEmpresa.cidade}{dadosEmpresa.estado && `/${dadosEmpresa.estado}`}
              </p>
            )}
            {dadosEmpresa.cep && <p style={{ margin: 0 }}>CEP: {dadosEmpresa.cep}</p>}
            {dadosEmpresa.cnpj && <p style={{ margin: 0 }}>CNPJ: {dadosEmpresa.cnpj}</p>}
            {dadosEmpresa.telefone && <p style={{ margin: 0 }}>Tel: {dadosEmpresa.telefone}</p>}
          </div>
        )}
      </div>

      <LinhaHifens />

      <div style={{ textAlign: 'center', textTransform: 'uppercase', fontSize: '12px', margin: '4px 0' }}>
        PEDIDO DE VENDA Nº {pedido.numero || 'S/N'}
      </div>

      <pre style={{ fontFamily: 'inherit', fontSize: '9px', margin: '3px 0' }}>
      DATA/HORA: {format(new Date(pedido.created_date || new Date()), 'dd/MM/yy HH:mm')}
       </pre>

      {/* Cliente em linha própria com dados */}
      <div style={{ fontSize: '8px', margin: '2px 0', lineHeight: '1.3', fontFamily: 'inherit' }}>
        <div style={{ fontWeight: 'bold' }}>
          Cliente: {(pedido.cliente_nome || 'AVULSO').toUpperCase()}
        </div>
        {pedido.cliente_nome && (
          <div style={{ fontSize: '7px', color: '#555' }}>
            {[
              pedido.cliente_endereco || '',
              pedido.cliente_telefone || ''
            ].filter(Boolean).join(', ')}
          </div>
        )}
      </div>

       <LinhaHifens />

      <pre style={{ fontSize: '8px', margin: '2px 0', fontFamily: 'inherit', lineHeight: '1.2', fontWeight: 'bold' }}>
      NO | DESCRIÇÃO        | QTD | UN | PREÇO  | TOTAL
       </pre>
       <LinhaHifens />

       {itensOrdenados.map((item, idx) => {
         const nomeCompleto = (item.produto_nome || '').toUpperCase();
         const qtd = String(parseFloat(item.quantidade).toFixed(0)).padStart(3, ' ');
         const preco = fmtV(item.preco_unitario_praticado).padStart(6, ' ');
         const total = fmtV(item.total).padStart(6, ' ');
         const maxDesc = 16;
         let linhas = [];
         let resto = nomeCompleto;
         while (resto.length > 0) {
           if (resto.length <= maxDesc) { linhas.push(resto); break; }
           let bp = resto.lastIndexOf(' ', maxDesc);
           if (bp <= 0) { linhas.push(resto.substring(0, maxDesc)); resto = resto.substring(maxDesc); }
           else { linhas.push(resto.substring(0, bp)); resto = resto.substring(bp + 1); }
         }
         return (
           <pre key={idx} style={{ marginBottom: '1px', fontSize: '8px', fontFamily: 'inherit', lineHeight: '1.2' }}>
      {String(idx + 1).padStart(2, ' ')} | {linhas[0].padEnd(maxDesc, ' ')} | {qtd} | UN | {preco} | {total}
      {linhas.slice(1).map(l => `    | ${l.padEnd(maxDesc, ' ')}`).join('\n')}
           </pre>
         );
       })}

      <LinhaHifens />

      <div style={{ fontSize: '9px', margin: '6px 0 2px', fontFamily: 'inherit' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>SUBTOTAL:</span>
          <span>R$ {fmtV(pedido.subtotal || 0)}</span>
        </div>
        {pedido.valor_desconto > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>DESCONTO:</span>
            <span>R$ {fmtV(pedido.valor_desconto)}</span>
          </div>
        )}
        {pedido.valor_frete > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>FRETE:</span>
            <span>R$ {fmtV(pedido.valor_frete)}</span>
          </div>
        )}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 'bold', margin: '3px 0', fontFamily: 'inherit', display: 'flex', justifyContent: 'space-between', paddingTop: '3px' }}>
        <span>TOTAL:</span>
        <span>R$ {fmtV(pedido.valor_total || 0)}</span>
      </div>

      <LinhaHifens />

      {pedido.pagamentos && pedido.pagamentos.length > 0 && (
        <>
          <LinhaHifens />
          <div style={{ fontSize: '9px', margin: '3px 0 2px', fontWeight: 'bold' }}>FORMAS DE PAGAMENTO:</div>
          {pedido.pagamentos.map((pag, idx) => (
            <div key={idx} style={{ fontSize: '8px', margin: '1px 0' }}>
              {pag.forma_pagamento}{pag.parcelas > 1 ? ` (${pag.parcelas}x)` : ''}: R$ {fmtV(pag.valor)}
            </div>
          ))}
        </>
      )}

      <LinhaHifens />

      {/* Usuários - Vendedor e Caixa */}
      <div style={{ fontSize: '8px', margin: '2px 0', lineHeight: '1.3', fontFamily: 'inherit' }}>
        {pedido.vendedor_nome && (
          <div>VENDEDOR: {pedido.vendedor_nome.toUpperCase()}</div>
        )}
        {pedido.created_by && (
          <div>CAIXA: {pedido.created_by.toUpperCase()}</div>
        )}
      </div>

      <div style={{ textAlign: 'center', fontSize: '8px', marginTop: '6px', lineHeight: '1.4' }}>
        {dadosEmpresa?.mensagem_rodape || 'OBRIGADO PELA PREFERÊNCIA!'}
      </div>
      <div style={{ textAlign: 'center', fontSize: '7px', marginTop: '4px', color: '#666' }}>
        Este documento não possui validade fiscal
      </div>
    </div>
  );
}

// ── Preview com scale automático (mesma lógica do OrcamentoCupom) ─────────────
function PreviewScaled({ children }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const docWidthPx = 275;

  useEffect(() => {
    const calc = () => {
      if (!containerRef.current) return;
      const available = containerRef.current.offsetWidth - 32;
      setScale(Math.min(1, available / docWidthPx));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  return (
    <div ref={containerRef} className="w-full flex justify-center py-4 px-4">
      <div
        style={{
          width: docWidthPx,
          transformOrigin: 'top center',
          transform: `scale(${scale})`,
        }}
      >
        <div className="shadow-2xl rounded-sm overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ComprovanteCompra({ pedido, open, onClose }) {
  const [dadosEmpresa, setDadosEmpresa] = useState(null);
  const [ipImpressora, setIpImpressora] = useState('');
  const [imprimindoTermica, setImprimindoTermica] = useState(false);

  useEffect(() => {
    if (!open) return;
    base44.entities.DadosEmpresa.list().then(r => r?.length && setDadosEmpresa(r[0])).catch(() => {});
    const ip = localStorage.getItem('ip_impressora_termica');
    if (ip) setIpImpressora(ip);
  }, [open]);

  const handlePrint = () => {
    const el = document.getElementById('cupom-print');
    if (!el) return;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head>
      <title>Pedido ${pedido?.numero || ''}</title>
      <link href="https://fonts.googleapis.com/css2?family=Iosevka+Charon+Mono:wght@400;700&family=Cousine:wght@400;700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #fff; }
        @media print {
          body { margin: 0; }
          @page { size: 80mm auto; margin: 0; }
        }
      </style>
    </head><body>${el.outerHTML}</body></html>`);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 2000);
    }, 600);
  };

  const handleImprimirTermica = async () => {
    if (!ipImpressora) { toast.error('Informe o IP da impressora térmica'); return; }
    setImprimindoTermica(true);
    try {
      const response = await imprimirCupomTermico({ pedido_id: pedido.id, ip_impressora: ipImpressora });
      if (response.data.success) {
        toast.success('Cupom enviado para impressora térmica!');
        localStorage.setItem('ip_impressora_termica', ipImpressora);
      } else {
        toast.error(response.data.error || 'Erro ao imprimir');
      }
    } catch {
      toast.error('Falha na comunicação com a impressora');
    } finally {
      setImprimindoTermica(false);
    }
  };

  if (!open || !pedido) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gray-100 dark:bg-gray-950">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 font-glacial">Comprovante</span>
        <Button
          onClick={handlePrint}
          size="sm"
          className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 text-white h-9 text-xs gap-1.5 rounded-xl px-4"
        >
          <Printer className="w-3.5 h-3.5" />
          Imprimir
        </Button>
      </div>

      {/* Impressora térmica */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <Input
          placeholder="IP impressora térmica (ex: 192.168.1.100)"
          value={ipImpressora}
          onChange={(e) => setIpImpressora(e.target.value)}
          className="h-8 text-xs flex-1"
        />
        <Button
          onClick={handleImprimirTermica}
          disabled={imprimindoTermica}
          size="sm"
          className="h-8 bg-green-600 hover:bg-green-700 text-white whitespace-nowrap gap-1.5 text-xs"
        >
          <Zap className="w-3.5 h-3.5" />
          {imprimindoTermica ? 'Enviando...' : 'Térmica'}
        </Button>
      </div>

      {/* Preview com scale */}
      <div className="flex-1 overflow-y-auto">
        <PreviewScaled>
          <CupomTermico pedido={pedido} dadosEmpresa={dadosEmpresa} />
        </PreviewScaled>
      </div>
    </div>
  );
}