import React, { useRef, useState, useEffect } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';

const fmtV = (v) => {
  const num = parseFloat(v) || 0;
  const formatted = num.toFixed(2).replace('.', ',');
  const parts = formatted.split(',');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.join(',');
};

const F = 9;
const font = "'Barlow Condensed', 'Arial Narrow', sans-serif";

function Sep() {
  return (
    <div style={{ margin: '4px 0', fontSize: F - 1, fontFamily: font, color: '#999', letterSpacing: '1px' }}>
      {'- - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'}
    </div>
  );
}

// ── Cupom Senha de Atendimento ─────────────────────────────────────────────────
function CupomSenha({ preVenda, dadosEmpresa }) {
  const senha4 = (preVenda.senha_atendimento || '').slice(-4);

  const nomeFantasia = (dadosEmpresa?.nome_fantasia || dadosEmpresa?.razao_social || 'EMPRESA').toUpperCase();
  const razaoSocial = (dadosEmpresa?.nome_fantasia && dadosEmpresa?.razao_social)
    ? dadosEmpresa.razao_social
    : null;

  const cnpj = dadosEmpresa?.cnpj;
  const endereco = [dadosEmpresa?.endereco, dadosEmpresa?.numero].filter(Boolean).join(', ');
  const bairroCidade = [dadosEmpresa?.bairro, dadosEmpresa?.cidade, dadosEmpresa?.estado].filter(Boolean).join(' - ');
  const telefone = dadosEmpresa?.telefone;

  const maxNameW = 26;

  return (
    <div
      id="cupom-print"
      style={{
        width: '275px',
        background: '#fff',
        color: '#111',
        fontFamily: font,
        fontSize: F + 1,
        padding: '16px 12px 20px',
        margin: '0 auto',
        lineHeight: '1.5',
      }}
    >
      {/* ── Cabeçalho Empresa ── */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        {dadosEmpresa?.logo_url && (
          <img src={dadosEmpresa.logo_url} alt="Logo" style={{ maxWidth: '100px', maxHeight: '50px', filter: 'grayscale(100%) contrast(200%)', display: 'block', margin: '0 auto 6px' }} />
        )}
        <div style={{ fontSize: F + 12, fontWeight: '500', letterSpacing: '0.8px', lineHeight: 1.1, marginBottom: '5px' }}>
          {nomeFantasia}
        </div>
        {razaoSocial && (
          <div style={{ fontSize: F + 1, fontWeight: '400', color: '#333', lineHeight: 1.4 }}>
            {razaoSocial}
          </div>
        )}
        <div style={{ fontSize: F, fontWeight: '400', color: '#444', lineHeight: 1.55, marginTop: '3px' }}>
          {cnpj && <div>CNPJ: {cnpj}</div>}
          {endereco && <div>{endereco}</div>}
          {bairroCidade && <div>{bairroCidade}</div>}
          {telefone && <div>Fone: {telefone}</div>}
        </div>
      </div>

      <Sep />

      {/* ── Senha em destaque ── */}
      <div style={{ textAlign: 'center', margin: '8px 0' }}>
        <div style={{ fontSize: F - 1, color: '#666', letterSpacing: '3px', marginBottom: '4px' }}>SENHA DE ATENDIMENTO</div>
        <div style={{ fontSize: '64px', fontWeight: '500', fontFamily: font, lineHeight: '1', letterSpacing: '6px' }}>
          {senha4}
        </div>
        <div style={{ fontSize: F - 1, color: '#999', marginTop: '4px' }}>
          {format(new Date(preVenda.created_date || new Date()), 'dd/MM/yyyy HH:mm')}
        </div>
      </div>

      <Sep />

      {/* ── Dados do pedido ── */}
      <div style={{ fontSize: F, lineHeight: 1.55 }}>
        {preVenda.cliente_nome && <div>Cliente: {preVenda.cliente_nome.toUpperCase()}</div>}
        {preVenda.vendedor_nome && <div>Vendedor: {preVenda.vendedor_nome}</div>}
        {preVenda.metodo_entrega && <div>Entrega: {preVenda.metodo_entrega}</div>}
      </div>

      <Sep />

      {/* ── Cabeçalho colunas ── */}
      <div style={{ fontSize: F - 1, color: '#666', lineHeight: 1.4 }}>
        <span>Nº  Descrição</span>
        <span style={{ float: 'right' }}>Qtd  Unit  Total</span>
      </div>

      <Sep />

      {/* ── Itens estilo VinCommerce ── */}
      {preVenda.itens?.map((item, idx) => {
        const nome = (item.produto_nome || '').toUpperCase();
        const qtd = String(parseFloat(item.quantidade) || 0);
        const preco = fmtV(item.preco_unitario_praticado);
        const total = fmtV(item.total);
        const num = String(idx + 1).padStart(2, '0');
        const valStr = `${qtd}  ${preco}  ${total}`;

        const palavras = nome.split(' ');
        const linhas = [];
        let atual = '';
        for (const p of palavras) {
          if ((atual + (atual ? ' ' : '') + p).length <= maxNameW) {
            atual = atual ? atual + ' ' + p : p;
          } else {
            if (atual) linhas.push(atual);
            atual = p.substring(0, maxNameW);
          }
        }
        if (atual) linhas.push(atual);

        return (
          <div key={idx} style={{ fontSize: F, marginBottom: '4px', lineHeight: 1.45 }}>
            {linhas.length > 1 && (
              <>
                <div>{num}  {linhas[0]}</div>
                {linhas.slice(1, -1).map((l, i) => (
                  <div key={i} style={{ paddingLeft: '20px' }}>{l}</div>
                ))}
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span>{linhas.length === 1 ? `${num}  ${linhas[0]}` : `    ${linhas[linhas.length - 1]}`}</span>
              <span style={{ whiteSpace: 'nowrap', marginLeft: '6px', color: '#222' }}>{valStr}</span>
            </div>
          </div>
        );
      })}

      <Sep />

      {/* ── Totais ── */}
      <div style={{ marginTop: '2px' }}>
        {preVenda.subtotal > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: F, color: '#555' }}>
            <span>Subtotal</span><span>R$ {fmtV(preVenda.subtotal)}</span>
          </div>
        )}
        {preVenda.valor_desconto > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: F, color: '#555' }}>
            <span>Desconto</span><span>-R$ {fmtV(preVenda.valor_desconto)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: F + 7, fontWeight: '500', margin: '5px 0 3px' }}>
          <span>TOTAL</span>
          <span>R$ {fmtV(preVenda.valor_total || 0)}</span>
        </div>
      </div>

      <Sep />

      {/* ── Aviso ── */}
      <div style={{ textAlign: 'center', marginTop: '4px' }}>
        <div style={{ fontSize: F + 4, fontWeight: '500', letterSpacing: '0.8px', marginBottom: '3px' }}>
          AGUARDANDO ATENDIMENTO NO CAIXA
        </div>
        <div style={{ fontSize: F - 1, color: '#666' }}>Apresente esta senha para pagamento</div>
        <div style={{ fontSize: F - 1, color: '#999', marginTop: '4px' }}>Este documento não possui validade fiscal.</div>
      </div>
    </div>
  );
}

// ── Preview com scale automático ──────────────────────────────────────────────
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
      <div style={{ width: docWidthPx, transformOrigin: 'top center', transform: `scale(${scale})` }}>
        <div className="shadow-2xl rounded-sm overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ComprovantePreVenda({ preVenda, open, onClose }) {
  const [dadosEmpresa, setDadosEmpresa] = useState(null);

  useEffect(() => {
    if (!open) return;
    base44.entities.DadosEmpresa.list().then(r => r?.length && setDadosEmpresa(r[0])).catch(() => {});
  }, [open]);

  if (!open || !preVenda) return null;

  const handlePrint = () => {
    const el = document.getElementById('cupom-print');
    if (!el) return;

    const html = `<!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Senha ${(preVenda.senha_atendimento || '').slice(-4)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #fff; }
        @page { size: 80mm auto; margin: 0; }
      </style>
    </head><body>${el.outerHTML}</body></html>`;

    const old = document.getElementById('pre-venda-print-frame');
    if (old) old.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'pre-venda-print-frame';
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);

    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => iframe.remove(), 2000);
      }, 300);
    };
  };

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
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 font-glacial">
          Senha {(preVenda.senha_atendimento || '').slice(-4)}
        </span>
        <Button
          onClick={handlePrint}
          size="sm"
          className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 text-white h-9 text-xs gap-1.5 rounded-xl px-4"
        >
          <Printer className="w-3.5 h-3.5" />
          Imprimir
        </Button>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-y-auto">
        <PreviewScaled>
          <CupomSenha preVenda={preVenda} dadosEmpresa={dadosEmpresa} />
        </PreviewScaled>
      </div>
    </div>
  );
}