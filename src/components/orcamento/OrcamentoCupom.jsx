import React, { useRef } from 'react';
import { ArrowLeft, Printer, Share2 } from 'lucide-react';
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
      }}
    >
      {/* Cabeçalho */}
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
        {/* Cabeçalho tabela */}
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
      }}
    >
      {/* Cabeçalho */}
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

      {/* Tabela de itens */}
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

      {/* Total */}
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
  const handlePrint = () => {
    const el = document.getElementById('cupom-print');
    if (!el) return;
    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(`
      <html><head>
        <title>Orçamento</title>
        <link href="https://fonts.googleapis.com/css2?family=Ubuntu+Sans+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @media print { body { margin:0; } }
          body { margin:0; background:#f5f5f5; display:flex; justify-content:center; padding: 20px; }
        </style>
      </head><body>
        ${el.outerHTML}
        <script>window.onload=()=>{window.print();}<\/script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-100 dark:bg-gray-950">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <button onClick={onVoltar} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 font-glacial">Prévia do Orçamento</span>
        <Button onClick={handlePrint} size="sm" className="bg-gray-800 hover:bg-gray-900 dark:bg-gray-200 dark:hover:bg-gray-300 dark:text-gray-900 text-white h-8 text-xs gap-1.5 rounded-lg px-3">
          <Printer className="w-3.5 h-3.5" />
          Imprimir
        </Button>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-auto flex justify-center py-6 px-4">
        <div className="shadow-xl rounded-sm overflow-hidden">
          {formato === '80mm'
            ? <Cupom80mm itens={itens} total={total} nomeTabela={nomeTabela} clienteNome={clienteNome} empresa={empresa} />
            : <CupomA4 itens={itens} total={total} nomeTabela={nomeTabela} clienteNome={clienteNome} empresa={empresa} />
          }
        </div>
      </div>
    </div>
  );
}