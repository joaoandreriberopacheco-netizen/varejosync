import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Printer, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { imprimirCupomTermico } from '@/functions/imprimirCupomTermico';

// Formato brasileiro: virgula para decimais, ponto para milhares
const fmtV = (v) => {
  const num = parseFloat(v) || 0;
  const formatted = num.toFixed(2).replace('.', ','); // converte a virgula
  const parts = formatted.split(',');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // adiciona pontos nos milhares
  return parts.join(',');
};
const F = 9; // base font size px

// ── Cupom Térmico 80mm ────────────────────────────────────────────────────────
function CupomTermico({ pedido, dadosEmpresa }) {
  const itens = pedido.itens || [];

  const mono = "'Cousine', 'Ubuntu Sans Mono', monospace";

  const Sep = () => (
    <pre style={{ margin: '3px 0', fontSize: F, fontFamily: mono, lineHeight: 1 }}>
{'-'.repeat(48)}
    </pre>
  );

  const Row = ({ label, value, bold, large }) => (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      fontFamily: mono,
      fontSize: large ? F + 5 : F,
      fontWeight: bold ? 'bold' : 'normal',
      margin: '1px 0',
    }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );

  return (
    <div
      id="cupom-print"
      style={{
        width: '275px',
        background: '#fff',
        color: '#000',
        fontFamily: mono,
        fontSize: F,
        padding: '12px 10px 16px',
        margin: '0 auto',
        lineHeight: '1.4',
      }}
    >
      {/* ── Cabeçalho ── */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        {dadosEmpresa?.logo_url && (
          <img
            src={dadosEmpresa.logo_url}
            alt="Logo"
            style={{ maxWidth: '100px', maxHeight: '60px', filter: 'grayscale(100%) contrast(200%)', display: 'block', margin: '0 auto 6px' }}
          />
        )}
        <div style={{ fontSize: F + 6, fontWeight: 'bold', fontFamily: mono, letterSpacing: '0.5px' }}>
          {(dadosEmpresa?.razao_social || 'VAREJOSYNC').toUpperCase()}
        </div>
        <div style={{ fontSize: F - 1, marginTop: '4px', lineHeight: '1.5' }}>
          {dadosEmpresa?.endereco && (
            <div>{dadosEmpresa.endereco}{dadosEmpresa.numero ? ', ' + dadosEmpresa.numero : ''}</div>
          )}
          {(dadosEmpresa?.bairro || dadosEmpresa?.cidade) && (
            <div>
              {dadosEmpresa.bairro && `${dadosEmpresa.bairro}, `}
              {dadosEmpresa.cidade}{dadosEmpresa.estado && `/${dadosEmpresa.estado}`}
            </div>
          )}
          {dadosEmpresa?.telefone && <div>Tel: {dadosEmpresa.telefone}</div>}
          {dadosEmpresa?.cnpj && <div>CNPJ: {dadosEmpresa.cnpj}</div>}
          <div>Pedido Nº: {pedido.numero || 'S/N'}</div>
        </div>
      </div>

      <Sep />

      {/* ── Dados do pedido ── */}
      <div style={{ fontSize: F - 1, lineHeight: '1.5', fontFamily: mono }}>
        <div>DATA/HORA: {format(new Date(pedido.created_date || new Date()), 'dd/MM/yyyy HH:mm')}</div>
        <div>CLIENTE: {(pedido.cliente_nome || 'AVULSO').toUpperCase()}</div>
        {pedido.vendedor_nome && <div>VENDEDOR: {pedido.vendedor_nome.toUpperCase()}</div>}
        {pedido.created_by && <div>CAIXA: {pedido.created_by.split('@')[0].toUpperCase()}</div>}
      </div>

      <Sep />

      {/* ── Cabeçalho colunas ── */}
      <pre style={{ fontFamily: mono, fontSize: F - 1, margin: '2px 0', fontWeight: 'bold', whiteSpace: 'pre' }}>
{`NO. | ITEM NAME          | QTD | PREÇO   | TOTAL`}
      </pre>

      <Sep />

      {/* ── Itens ── */}
      {itens.map((item, idx) => {
        const nome = (item.produto_nome || '').toUpperCase();
        const num = String(idx + 1).padStart(2, ' ');
        const qtd = String(parseFloat(item.quantidade) || 0);
        const preco = fmtV(item.preco_unitario_praticado);
        const total = fmtV(item.total);

        // quebra nome em linhas de 20 chars
        const maxW = 20;
        const palavras = nome.split(' ');
        const linhasNome = [];
        let atual = '';
        for (const p of palavras) {
          if ((atual + (atual ? ' ' : '') + p).length <= maxW) {
            atual = atual ? atual + ' ' + p : p;
          } else {
            if (atual) linhasNome.push(atual);
            atual = p.substring(0, maxW);
          }
        }
        if (atual) linhasNome.push(atual);

        return (
          <div key={idx} style={{ fontFamily: mono, fontSize: F - 1, margin: '3px 0', lineHeight: '1.4' }}>
            <pre style={{ fontFamily: mono, fontSize: F - 1, margin: 0, whiteSpace: 'pre' }}>
{` ${num} | ${linhasNome[0].padEnd(maxW, ' ')} | ${qtd.padStart(3)} | ${preco.padStart(7)} | ${total.padStart(7)}`}
            </pre>
            {linhasNome.slice(1).map((l, i) => (
              <pre key={i} style={{ fontFamily: mono, fontSize: F - 1, margin: 0, whiteSpace: 'pre' }}>
{`     | ${l.padEnd(maxW, ' ')} |`}
              </pre>
            ))}
          </div>
        );
      })}

      <Sep />

      {/* ── Totais ── */}
      <div style={{ marginTop: '4px' }}>
        {pedido.subtotal > 0 && <Row label="Subtotal:" value={fmtV(pedido.subtotal)} />}
        {pedido.valor_desconto > 0 && <Row label="Desconto:" value={`-${fmtV(pedido.valor_desconto)}`} />}
        {pedido.valor_frete > 0 && <Row label="Frete:" value={fmtV(pedido.valor_frete)} />}
      </div>

      <div style={{ margin: '4px 0 2px' }}>
        <Row label="TOTAL:" value={fmtV(pedido.valor_total || 0)} bold large />
      </div>

      {/* ── Pagamentos ── */}
      {pedido.pagamentos && pedido.pagamentos.length > 0 && (
        <div style={{ marginTop: '4px', fontSize: F - 1, fontFamily: mono }}>
          {pedido.pagamentos.map((pag, idx) => (
            <Row
              key={idx}
              label={`${pag.forma_pagamento}${pag.parcelas > 1 ? ` (${pag.parcelas}x)` : ''}:`}
              value={fmtV(pag.valor)}
            />
          ))}
        </div>
      )}

      <Sep />

      {/* ── Rodapé ── */}
      <div style={{ textAlign: 'center', fontSize: F - 1, lineHeight: '1.6', fontFamily: mono }}>
        <div style={{ fontSize: F + 2, fontWeight: 'bold', letterSpacing: '1px', margin: '4px 0' }}>
          {(dadosEmpresa?.mensagem_rodape || 'OBRIGADO PELA PREFERÊNCIA!').toUpperCase()}
        </div>
        {dadosEmpresa?.telefone && <div>Tel: {dadosEmpresa.telefone}</div>}
        <div style={{ marginTop: '4px', color: '#555', fontSize: F - 2 }}>
          Este documento não possui validade fiscal
        </div>
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

      {/* Preview com scale - ocupa toda a tela */}
      <div className="flex-1 overflow-y-auto w-full">
        <div className="w-full h-full flex justify-center py-4 px-4">
          <div style={{ width: '275px', transformOrigin: 'top center', transform: 'scale(1)' }} className="shadow-2xl rounded-sm overflow-hidden">
            <CupomTermico pedido={pedido} dadosEmpresa={dadosEmpresa} />
          </div>
        </div>
      </div>
    </div>
  );
}