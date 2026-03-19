import React, { useRef, useEffect, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

const fmtR = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtData = () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ── Cupom 80mm ──────────────────────────────────────────────────────────────
function Cupom80mm({ itens, total, nomeTabela, clienteNome, empresa }) {
  return (
    <div
      id="cupom-print"
      style={{
        width: '80mm',
        fontFamily: "'Ubuntu Sans Mono', 'Courier New', monospace",
        fontSize: '11px',
        color: '#111',
        padding: '6mm 4mm',
        background: '#fff',
        lineHeight: '1.5',
        boxSizing: 'border-box',
      }}
    >
      {empresa?.nome && (
        <div style={{ textAlign: 'center', marginBottom: '4mm', borderBottom: '1px dashed #999', paddingBottom: '4mm' }}>
          <div style={{ fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.5px' }}>{empresa.nome}</div>
          {empresa.cnpj && <div style={{ fontSize: '10px', color: '#555' }}>CNPJ: {empresa.cnpj}</div>}
          {empresa.telefone && <div style={{ fontSize: '10px', color: '#555' }}>{empresa.telefone}</div>}
          {empresa.cidade && <div style={{ fontSize: '10px', color: '#555' }}>{empresa.cidade} - {empresa.estado}</div>}
        </div>
      )}

      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12px', letterSpacing: '1px', marginBottom: '2mm' }}>
        ORÇAMENTO
      </div>
      {nomeTabela && <div style={{ textAlign: 'center', fontSize: '10px', color: '#555', marginBottom: '1mm' }}>Tabela: {nomeTabela}</div>}
      <div style={{ textAlign: 'center', fontSize: '10px', color: '#555', marginBottom: '2mm' }}>{fmtData()}</div>
      {clienteNome && <div style={{ textAlign: 'center', fontSize: '10px', marginBottom: '4mm' }}>Cliente: <strong>{clienteNome}</strong></div>}

      <div style={{ borderTop: '1px dashed #999', borderBottom: '1px dashed #999', paddingTop: '3mm', paddingBottom: '3mm', marginBottom: '3mm' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#555', marginBottom: '1.5mm' }}>
          <span style={{ flex: 3 }}>ITEM</span>
          <span style={{ flex: 1, textAlign: 'center' }}>QTD</span>
          <span style={{ flex: 1, textAlign: 'right' }}>UNIT</span>
          <span style={{ flex: 1.5, textAlign: 'right' }}>TOTAL</span>
        </div>
        {itens.map((item, i) => (
          <div key={i} style={{ marginBottom: '2mm' }}>
            <div style={{ fontWeight: '500', fontSize: '11px', wordBreak: 'break-word' }}>{item.nome}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ flex: 3 }}>{item.unidade}</span>
              <span style={{ flex: 1, textAlign: 'center' }}>{item.qtd}</span>
              <span style={{ flex: 1, textAlign: 'right' }}>{fmtR(item.preco_unit)}</span>
              <span style={{ flex: 1.5, textAlign: 'right', fontWeight: 'bold' }}>{fmtR(item.preco_unit * item.qtd)}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', marginBottom: '4mm' }}>
        <span>TOTAL</span>
        <span>R$ {fmtR(total)}</span>
      </div>

      <div style={{ textAlign: 'center', fontSize: '9px', color: '#777', borderTop: '1px dashed #ccc', paddingTop: '3mm' }}>
        Este documento não tem validade fiscal.
      </div>
    </div>
  );
}

// ── Cupom A4 ────────────────────────────────────────────────────────────────
function CupomA4({ itens, total, nomeTabela, clienteNome, empresa }) {
  return (
    <div
      id="cupom-print"
      style={{
        width: '210mm',
        minHeight: '297mm',
        fontFamily: "'Inter', Arial, sans-serif",
        fontSize: '12px',
        color: '#111',
        padding: '20mm 18mm',
        background: '#fff',
        lineHeight: '1.6',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10mm', borderBottom: '2px solid #111', paddingBottom: '6mm' }}>
        <div>
          {empresa?.nome && <div style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.5px' }}>{empresa.nome}</div>}
          {empresa?.cnpj && <div style={{ fontSize: '11px', color: '#555', marginTop: '1mm' }}>CNPJ: {empresa.cnpj}</div>}
          {empresa?.telefone && <div style={{ fontSize: '11px', color: '#555' }}>{empresa.telefone}</div>}
          {empresa?.cidade && <div style={{ fontSize: '11px', color: '#555' }}>{empresa.cidade} - {empresa.estado}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '1px', color: '#333' }}>ORÇAMENTO</div>
          <div style={{ fontSize: '11px', color: '#555', marginTop: '1mm' }}>{fmtData()}</div>
          {nomeTabela && <div style={{ fontSize: '11px', color: '#555' }}>Tabela: {nomeTabela}</div>}
        </div>
      </div>

      {clienteNome && (
        <div style={{ marginBottom: '8mm', padding: '4mm 6mm', background: '#f5f5f5', borderRadius: '4px' }}>
          <div style={{ fontSize: '10px', color: '#777', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cliente</div>
          <div style={{ fontSize: '13px', fontWeight: '600' }}>{clienteNome}</div>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8mm' }}>
        <thead>
          <tr style={{ borderBottom: '1.5px solid #ddd' }}>
            <th style={{ textAlign: 'left', padding: '3mm 2mm', fontSize: '11px', color: '#555', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Produto</th>
            <th style={{ textAlign: 'center', padding: '3mm 2mm', fontSize: '11px', color: '#555', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', width: '15mm' }}>Qtd</th>
            <th style={{ textAlign: 'center', padding: '3mm 2mm', fontSize: '11px', color: '#555', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', width: '15mm' }}>Un</th>
            <th style={{ textAlign: 'right', padding: '3mm 2mm', fontSize: '11px', color: '#555', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', width: '28mm' }}>Unit. (R$)</th>
            <th style={{ textAlign: 'right', padding: '3mm 2mm', fontSize: '11px', color: '#555', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', width: '30mm' }}>Total (R$)</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item, i) => (
            <tr key={i} style={{ borderBottom: '0.5px solid #eee' }}>
              <td style={{ padding: '3mm 2mm', fontSize: '12px' }}>{item.nome}</td>
              <td style={{ padding: '3mm 2mm', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>{item.qtd}</td>
              <td style={{ padding: '3mm 2mm', textAlign: 'center', fontSize: '12px', color: '#555' }}>{item.unidade}</td>
              <td style={{ padding: '3mm 2mm', textAlign: 'right', fontSize: '12px' }}>{fmtR(item.preco_unit)}</td>
              <td style={{ padding: '3mm 2mm', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>{fmtR(item.preco_unit * item.qtd)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12mm' }}>
        <div style={{ borderTop: '2px solid #111', paddingTop: '4mm', minWidth: '80mm', textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Geral</div>
          <div style={{ fontSize: '22px', fontWeight: '700' }}>R$ {fmtR(total)}</div>
          <div style={{ fontSize: '10px', color: '#999', marginTop: '1mm' }}>{itens.reduce((s, i) => s + i.qtd, 0)} itens</div>
        </div>
      </div>

      <div style={{ borderTop: '0.5px solid #ddd', paddingTop: '5mm', textAlign: 'center', fontSize: '10px', color: '#999' }}>
        Este documento não tem validade fiscal. Orçamento gerado em {fmtData()}.
      </div>
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────────────
export default function OrcamentoCupom({ itens, total, formato, nomeTabela, clienteNome, empresa, onVoltar, onClose }) {
  const previewRef = useRef(null);
  const [scale, setScale] = useState(1);

  // Calcula scale para caber na tela
  useEffect(() => {
    const calcScale = () => {
      if (!previewRef.current) return;
      const container = previewRef.current.parentElement;
      if (!container) return;
      const containerW = container.clientWidth - 32; // padding lateral
      // largura do documento em px (96dpi): 80mm≈302px, 210mm≈794px
      const docPx = formato === '80mm' ? 302 : 794;
      const s = Math.min(1, containerW / docPx);
      setScale(s);
    };
    calcScale();
    window.addEventListener('resize', calcScale);
    return () => window.removeEventListener('resize', calcScale);
  }, [formato]);

  const handlePrint = () => {
    const el = document.getElementById('cupom-print');
    if (!el) return;

    const pageSize = formato === '80mm'
      ? '@page { size: 80mm auto; margin: 0; }'
      : '@page { size: A4; margin: 10mm 15mm; }';

    const fonts = `<link href="https://fonts.googleapis.com/css2?family=Ubuntu+Sans+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`;

    const html = `<!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      ${fonts}
      <style>
        ${pageSize}
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #fff; }
        @media print {
          html, body { width: 100%; height: auto; }
        }
      </style>
    </head><body>${el.outerHTML}</body></html>`;

    // Tenta abrir popup; se bloqueado, usa iframe oculto
    const popup = window.open('', '_blank');
    if (popup && !popup.closed) {
      popup.document.open();
      popup.document.write(html);
      popup.document.close();
      popup.addEventListener('load', () => {
        popup.focus();
        popup.print();
      });
    } else {
      // Fallback: iframe oculto para não bloquear
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:0;';
      document.body.appendChild(iframe);
      iframe.contentDocument.open();
      iframe.contentDocument.write(html);
      iframe.contentDocument.close();
      iframe.contentWindow.addEventListener('load', () => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      });
    }
  };

  return (
    <>
      {/* Estilos de impressão injetados na página atual */}
      <style>{`
        @media print {
          body > *:not(#orcamento-print-root) { display: none !important; }
          #orcamento-print-root { position: fixed; inset: 0; display: block !important; }
        }
      `}</style>

      <div id="orcamento-print-root" className="fixed inset-0 z-[60] flex flex-col bg-gray-100 dark:bg-gray-950">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button
            onClick={onVoltar}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 active:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 font-glacial">Prévia</span>
          <Button
            onClick={handlePrint}
            size="sm"
            className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 text-white h-9 text-sm gap-1.5 rounded-2xl px-4"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
        </div>

        {/* Preview escalado */}
        <div className="flex-1 overflow-auto flex justify-center py-6 px-4">
          <div
            style={{
              transformOrigin: 'top center',
              transform: `scale(${scale})`,
              // Para não ocupar mais espaço que o escalado
              marginBottom: `calc((${scale} - 1) * 100%)`,
            }}
          >
            <div
              ref={previewRef}
              className="shadow-2xl rounded-sm overflow-hidden"
            >
              {formato === '80mm'
                ? <Cupom80mm itens={itens} total={total} nomeTabela={nomeTabela} clienteNome={clienteNome} empresa={empresa} />
                : <CupomA4 itens={itens} total={total} nomeTabela={nomeTabela} clienteNome={clienteNome} empresa={empresa} />
              }
            </div>
          </div>
        </div>
      </div>
    </>
  );
}