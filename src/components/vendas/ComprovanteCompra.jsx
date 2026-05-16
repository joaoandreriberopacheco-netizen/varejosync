import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Printer, Zap, Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { imprimirCupomTermico } from '@/functions/imprimirCupomTermico';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { renderTemplate, prepararDadosVenda, ordenarItensComprovante } from '@/lib/templateEngine';
import { getUnidadeMedidaItemPedidoVenda } from '@/lib/productUnits';
import { TIMEZONE_SISTEMA } from '@/components/utils/dateUtils';
import { shareOrDownloadBlob, shouldUseMobileDocumentExport } from '@/lib/mobilePrintAndShare';

/** Exibição de data/hora no fuso do negócio (Tabatinga — `TIMEZONE_SISTEMA`). */
const fmtDtTZ = (d) => d ? new Intl.DateTimeFormat('pt-BR', { timeZone: TIMEZONE_SISTEMA, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : '-';

// Formato brasileiro: virgula para decimais, ponto para milhares
const fmtV = (v) => {
  const num = parseFloat(v) || 0;
  const formatted = num.toFixed(2).replace('.', ','); // converte a virgula
  const parts = formatted.split(',');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // adiciona pontos nos milhares
  return parts.join(',');
};
const F = 14; // base font size px (aumentado 50%)

// ── Cupom Térmico 80mm ────────────────────────────────────────────────────────
function CupomTermico({ pedido, dadosEmpresa }) {
  const itens = ordenarItensComprovante(pedido.itens || []);
  const font = "'Barlow Condensed', 'Arial Narrow', sans-serif";
  const F = 14;

  const nomeFantasia = (dadosEmpresa?.nome_fantasia || dadosEmpresa?.razao_social || 'EMPRESA').toUpperCase();
  const razaoSocial = (dadosEmpresa?.nome_fantasia && dadosEmpresa?.razao_social)
    ? dadosEmpresa.razao_social
    : null;

  const empresa = {
    nomeFantasia,
    razaoSocial,
    cnpj: dadosEmpresa?.cnpj,
    endereco: [dadosEmpresa?.endereco, dadosEmpresa?.numero].filter(Boolean).join(', '),
    bairro_cidade: [dadosEmpresa?.bairro, dadosEmpresa?.cidade, dadosEmpresa?.estado].filter(Boolean).join(' - '),
    telefone: dadosEmpresa?.telefone,
    mensagem: (dadosEmpresa?.mensagem_rodape || 'OBRIGADO PELA PREFERÊNCIA!').toUpperCase(),
  };

  const Sep = () => (
    <div style={{ margin: '4px 0', fontSize: F - 1, fontFamily: font, color: '#999', letterSpacing: '1px' }}>
      {'- - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'}
    </div>
  );

  return (
    <div
      id="cupom-print"
      style={{
        width: '275px', background: '#fff', color: '#111',
        fontFamily: font, fontSize: F + 3,
        padding: '8px 10px 12px', margin: '0 auto', lineHeight: '1.45',
      }}
    >
      {/* ── Cabeçalho ── */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        {dadosEmpresa?.logo_url && (
          <img src={dadosEmpresa.logo_url} alt="Logo" style={{ maxWidth: '100px', maxHeight: '50px', filter: 'grayscale(100%) contrast(200%)', display: 'block', margin: '0 auto 6px' }} />
        )}
        {/* Nome Fantasia — maior */}
        <div style={{ fontSize: F + 10, fontWeight: '400', letterSpacing: '0.5px', lineHeight: 1.1, marginBottom: '3px' }}>
          {empresa.nomeFantasia}
        </div>
        {/* Razão Social */}
        {empresa.razaoSocial && (
          <div style={{ fontSize: Math.round((F + 1) * 0.75), fontWeight: '400', color: '#333', lineHeight: 1.3 }}>
            {empresa.razaoSocial}
          </div>
        )}
        {/* Dados da empresa — 25% menores */}
        <div style={{ fontSize: Math.round(F * 0.75), fontWeight: '400', color: '#444', lineHeight: 1.4, marginTop: '2px' }}>
          {empresa.cnpj && <div>CNPJ: {empresa.cnpj}</div>}
          {empresa.endereco && <div>{empresa.endereco}</div>}
          {empresa.bairro_cidade && <div>{empresa.bairro_cidade}</div>}
          {empresa.telefone && <div>Fone: {empresa.telefone}</div>}
        </div>
        <div style={{ fontSize: Math.round(F * 0.75), color: '#666', marginTop: '3px' }}>Cupom nº {pedido.numero || 'S/N'}</div>
      </div>

      <Sep />

      {/* ── Meta do pedido ── */}
      <div style={{ fontSize: F, lineHeight: 1.55 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{fmtDtTZ(pedido.created_date || new Date())}</span>
          <span>Nº {pedido.numero || 'S/N'}</span>
        </div>
        {pedido.cliente_nome && <div>Cliente: {pedido.cliente_nome.toUpperCase()}</div>}
        {pedido.vendedor_nome && <div>Vendedor: {pedido.vendedor_nome}</div>}
      </div>

      <Sep />

      {/* ── Cabeçalho colunas ── */}
      <div style={{ display: 'flex', alignItems: 'baseline', fontSize: F - 1, color: '#666', lineHeight: 1.4, whiteSpace: 'nowrap', gap: '2px' }}>
        <span style={{ width: '36px', textAlign: 'right', flexShrink: 0 }}>QUANT</span>
        <span style={{ width: '28px', textAlign: 'right', flexShrink: 0 }}>UN</span>
        <span style={{ flex: 1, minWidth: 0, paddingLeft: '2px' }}>DESCRIÇÃO</span>
        <span style={{ width: '46px', textAlign: 'right', flexShrink: 0 }}>PREÇO</span>
        <span style={{ width: '46px', textAlign: 'right', flexShrink: 0 }}>TOTAL</span>
      </div>

      <Sep />

      {itens.map((item, idx) => {
        const nome = (item.produto_nome || '').toUpperCase();
        const qtd = String(parseFloat(item.quantidade) || 0);
        const preco = fmtV(item.preco_unitario_praticado);
        const total = fmtV(item.total);
        const unidade = getUnidadeMedidaItemPedidoVenda(item).substring(0, 4);

        return (
          <div
            key={item.pedido_venda_item_id || item.produto_id || idx}
            style={{ display: 'flex', gap: '2px', fontSize: F + 2, lineHeight: 1.45, marginBottom: '3px', alignItems: 'flex-start' }}
          >
            <span style={{ width: '36px', textAlign: 'right', flexShrink: 0 }}>{qtd}</span>
            <span style={{ width: '28px', textAlign: 'right', flexShrink: 0, color: '#666' }}>{unidade}</span>
            <span style={{ flex: 1, minWidth: 0, paddingLeft: '2px', wordBreak: 'break-word' }}>{nome}</span>
            <span style={{ width: '46px', textAlign: 'right', flexShrink: 0 }}>{preco}</span>
            <span style={{ width: '46px', textAlign: 'right', flexShrink: 0 }}>{total}</span>
          </div>
        );
      })}

      <Sep />

      {/* ── Totais ── */}
      <div style={{ marginTop: '2px' }}>
        {pedido.subtotal > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: F, color: '#555' }}>
            <span>Subtotal</span><span>R$ {fmtV(pedido.subtotal)}</span>
          </div>
        )}
        {pedido.valor_desconto > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: F, color: '#555' }}>
            <span>Desconto</span><span>-R$ {fmtV(pedido.valor_desconto)}</span>
          </div>
        )}
        {pedido.valor_frete > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: F, color: '#555' }}>
            <span>Frete</span><span>R$ {fmtV(pedido.valor_frete)}</span>
          </div>
        )}
        {/* TOTAL — hierarquia só por tamanho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: F + 10, fontWeight: '400', margin: '5px 0 3px' }}>
          <span>TOTAL</span>
          <span>R$ {fmtV(pedido.valor_total || 0)}</span>
        </div>
      </div>

      {/* ── Pagamentos ── */}
      {pedido.pagamentos && pedido.pagamentos.length > 0 && (
        <div style={{ marginTop: '2px' }}>
          {pedido.pagamentos.map((pag, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: F + 5, fontWeight: '400' }}>
              <span>{(pag.forma_pagamento || '').toUpperCase()}{pag.parcelas > 1 ? ` ${pag.parcelas}x` : ''}</span>
              <span>R$ {fmtV(pag.valor)}</span>
            </div>
          ))}
        </div>
      )}

      <Sep />

      {/* ── Rodapé ── */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: F + 5, fontWeight: '400', letterSpacing: '0.5px', margin: '4px 0 3px' }}>
          {empresa.mensagem}
        </div>
        <div style={{ fontSize: F - 1, color: '#666' }}>Este documento não possui validade fiscal.</div>
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

// ── Cupom A4 ─────────────────────────────────────────────────────────────────────
function CupomA4({ pedido, dadosEmpresa, dadosCliente }) {
  const itens = ordenarItensComprovante(pedido.itens || []);
  const font = "'Barlow Condensed', 'Arial Narrow', sans-serif";
  const nomeFantasia = (dadosEmpresa?.nome_fantasia || dadosEmpresa?.razao_social || 'EMPRESA').toUpperCase();
  const razaoSocial = (dadosEmpresa?.nome_fantasia && dadosEmpresa?.razao_social)
    ? dadosEmpresa.razao_social
    : null;
  const empresaEndereco = [dadosEmpresa?.endereco, dadosEmpresa?.numero].filter(Boolean).join(', ');
  const empresaCidade = [dadosEmpresa?.bairro, dadosEmpresa?.cidade, dadosEmpresa?.estado].filter(Boolean).join(' - ');

  return (
    <div
      id="cupom-print"
      style={{
        width: '210mm', minHeight: '297mm',
        fontFamily: font, fontSize: '12px', color: '#111',
        padding: '16mm 18mm 20mm', background: '#fff', lineHeight: '1.6',
      }}
    >
      {/* ── Cabeçalho empresa + título ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '6mm', borderBottom: '2px solid #111', marginBottom: '6mm', gap: '10mm' }}>
        <div style={{ maxWidth: '100mm' }}>
          {dadosEmpresa?.logo_url && (
            <img src={dadosEmpresa.logo_url} alt="Logo"
              style={{ maxWidth: '55mm', maxHeight: '18mm', filter: 'grayscale(100%) contrast(200%)', display: 'block', marginBottom: '3mm' }}
            />
          )}
          <div style={{ fontSize: '22px', fontWeight: '600', letterSpacing: '-0.5px', lineHeight: 1.1 }}>{nomeFantasia}</div>
          {razaoSocial && (
            <div style={{ fontSize: '10px', color: '#666', marginTop: '1mm' }}>{razaoSocial}</div>
          )}
          <div style={{ fontSize: '10px', color: '#777', marginTop: '2mm', lineHeight: 1.6 }}>
            {dadosEmpresa?.cnpj && <div>CNPJ: {dadosEmpresa.cnpj}</div>}
            {empresaEndereco && <div>{empresaEndereco}</div>}
            {empresaCidade && <div>{empresaCidade}{dadosEmpresa?.cep ? '  CEP: ' + dadosEmpresa.cep : ''}</div>}
            {dadosEmpresa?.telefone && <div>Tel: {dadosEmpresa.telefone}</div>}
            {dadosEmpresa?.email && <div>{dadosEmpresa.email}</div>}
          </div>
        </div>
        <div style={{ textAlign: 'right', minWidth: '60mm' }}>
          <div style={{ fontSize: '24px', fontWeight: '400', letterSpacing: '1px', lineHeight: 1 }}>PEDIDO DE VENDA</div>
          <div style={{ width: '100%', height: '1.5px', background: '#111', margin: '3mm 0' }}></div>
          <div style={{ fontSize: '12px', color: '#333', lineHeight: 1.8 }}>
            <div><b>Nº:</b> {pedido.numero || 'S/N'}</div>
            <div><b>Data:</b> {fmtDtTZ(pedido.created_date || new Date())}</div>
            {pedido.vendedor_nome && <div><b>Vendedor:</b> {pedido.vendedor_nome}</div>}
            {pedido.metodo_entrega && <div><b>Entrega:</b> {pedido.metodo_entrega}</div>}
            {pedido.status && <div><b>Status:</b> {pedido.status}</div>}
          </div>
        </div>
      </div>

      {/* ── Dados do cliente ── */}
      {(pedido.cliente_nome || dadosCliente) && (
        <div style={{ marginBottom: '6mm', padding: '4mm 5mm', background: '#f5f5f5', borderRadius: '2mm', borderLeft: '3px solid #333' }}>
          <div style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2mm', fontWeight: '600' }}>Cliente / Destinatário</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10mm' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '500', lineHeight: 1.2 }}>{pedido.cliente_nome || dadosCliente?.nome}</div>
              {dadosCliente?.cpf_cnpj && <div style={{ fontSize: '11px', color: '#555', marginTop: '1mm' }}>CPF/CNPJ: {dadosCliente.cpf_cnpj}</div>}
              {dadosCliente?.telefone && <div style={{ fontSize: '11px', color: '#555' }}>Tel: {dadosCliente.telefone}</div>}
              {dadosCliente?.email && <div style={{ fontSize: '11px', color: '#555' }}>{dadosCliente.email}</div>}
            </div>
            {(dadosCliente?.endereco || dadosCliente?.cidade) && (
              <div style={{ textAlign: 'right', fontSize: '11px', color: '#555', lineHeight: 1.6 }}>
                {dadosCliente?.endereco && <div>{dadosCliente.endereco}{dadosCliente.numero ? ', ' + dadosCliente.numero : ''}</div>}
                {dadosCliente?.bairro && <div>{dadosCliente.bairro}</div>}
                {dadosCliente?.cidade && <div>{[dadosCliente.cidade, dadosCliente.estado].filter(Boolean).join(' - ')}</div>}
                {dadosCliente?.cep && <div>CEP: {dadosCliente.cep}</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tabela de itens ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6mm' }}>
        <thead>
          <tr style={{ background: '#eeeeee' }}>
            <th style={{ textAlign: 'center', padding: '2.5mm 2mm', fontSize: '10px', color: '#555', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', width: '14mm' }}>QUANT</th>
            <th style={{ textAlign: 'center', padding: '2.5mm 2mm', fontSize: '10px', color: '#555', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', width: '12mm' }}>UN</th>
            <th style={{ textAlign: 'left', padding: '2.5mm 2mm', fontSize: '10px', color: '#555', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DESCRIÇÃO</th>
            <th style={{ textAlign: 'right', padding: '2.5mm 2mm', fontSize: '10px', color: '#555', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', width: '30mm' }}>PREÇO</th>
            <th style={{ textAlign: 'right', padding: '2.5mm 2mm', fontSize: '10px', color: '#555', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', width: '32mm' }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item, i) => (
            <tr key={item.pedido_venda_item_id || item.produto_id || i} style={{ borderBottom: '0.5px solid #e5e5e5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
              <td style={{ padding: '2.5mm 2mm', textAlign: 'center', fontSize: '12px' }}>{item.quantidade}</td>
              <td style={{ padding: '2.5mm 2mm', textAlign: 'center', fontSize: '11px', color: '#777' }}>{getUnidadeMedidaItemPedidoVenda(item)}</td>
              <td style={{ padding: '2.5mm 2mm', fontSize: '12px', textTransform: 'uppercase' }}>{item.produto_nome}</td>
              <td style={{ padding: '2.5mm 2mm', textAlign: 'right', fontSize: '12px' }}>R$ {fmtV(item.preco_unitario_praticado)}</td>
              <td style={{ padding: '2.5mm 2mm', textAlign: 'right', fontSize: '12px', fontWeight: '500' }}>R$ {fmtV(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Totais + Pagamentos lado a lado ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10mm', marginBottom: '8mm', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2mm', fontWeight: '600' }}>Dinâmica do Pedido</div>
          <div style={{ background: '#f5f5f5', borderRadius: '2mm', padding: '3mm' }}>
            <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', padding: '1.5mm 0', borderBottom: '0.5px solid #e0e0e0' }}>
              <span>Tipo</span>
              <span style={{ fontWeight: '500' }}>{pedido.tipo || 'Pedido'}</span>
            </div>
            <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', padding: '1.5mm 0', borderBottom: pedido.pagamentos?.length ? '0.5px solid #e0e0e0' : 'none' }}>
              <span>Entrega</span>
              <span style={{ fontWeight: '500' }}>{pedido.metodo_entrega || 'Não informado'}</span>
            </div>
            {pedido.pagamentos && pedido.pagamentos.map((pag, idx) => (
              <div key={idx} style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', padding: '1.5mm 0', borderBottom: idx < pedido.pagamentos.length - 1 ? '0.5px solid #e0e0e0' : 'none' }}>
                <span>{pag.forma_pagamento}{pag.parcelas > 1 ? ` (${pag.parcelas}x)` : ''}</span>
                <span style={{ fontWeight: '500' }}>R$ {fmtV(pag.valor)}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ minWidth: '90mm' }}>
          {pedido.subtotal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#555', marginBottom: '1.5mm', padding: '0 2mm' }}>
              <span>Subtotal</span><span>R$ {fmtV(pedido.subtotal)}</span>
            </div>
          )}
          {pedido.valor_desconto > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#555', marginBottom: '1.5mm', padding: '0 2mm' }}>
              <span>Desconto</span><span style={{ color: '#059669' }}>-R$ {fmtV(pedido.valor_desconto)}</span>
            </div>
          )}
          {pedido.valor_frete > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#555', marginBottom: '1.5mm', padding: '0 2mm' }}>
              <span>Frete</span><span>R$ {fmtV(pedido.valor_frete)}</span>
            </div>
          )}
          <div style={{ borderTop: '2px solid #111', paddingTop: '3mm', display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: '600', padding: '3mm 2mm 0' }}>
            <span>TOTAL</span>
            <span>R$ {fmtV(pedido.valor_total || 0)}</span>
          </div>
        </div>
      </div>

      {/* ── Observações ── */}
      {pedido.observacoes && (
        <div style={{ marginBottom: '6mm', padding: '3mm 4mm', background: '#fffbeb', borderRadius: '2mm', borderLeft: '3px solid #d97706' }}>
          <div style={{ fontSize: '9px', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '1mm', fontWeight: '600' }}>Observações</div>
          <div style={{ fontSize: '11px', color: '#555', lineHeight: 1.5 }}>{pedido.observacoes}</div>
        </div>
      )}

      {/* ── Rodapé ── */}
      <div style={{ borderTop: '0.5px solid #ddd', paddingTop: '4mm', textAlign: 'center', fontSize: '10px', color: '#777' }}>
        {dadosEmpresa?.mensagem_rodape && (
          <div style={{ marginBottom: '2mm', color: '#444', fontWeight: '500', fontSize: '12px' }}>{dadosEmpresa.mensagem_rodape.toUpperCase()}</div>
        )}
        <div>Este documento não possui validade fiscal.</div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
// ── Renderizador de Template HTML ────────────────────────────────────────────
function TemplateRenderer({ htmlContent }) {
  return (
    <div
      id="cupom-print"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      style={{ background: '#fff', color: '#000' }}
    />
  );
}

export default function ComprovanteCompra({ pedido, open, onClose }) {
  const [dadosEmpresa, setDadosEmpresa] = useState(null);
  const [dadosCliente, setDadosCliente] = useState(null);
  const [ipImpressora, setIpImpressora] = useState('');
  const [imprimindoTermica, setImprimindoTermica] = useState(false);
  const [formato, setFormato] = useState('80mm');
  const [gerando, setGerando] = useState(false);
  const [templates, setTemplates] = useState({ '80mm': null, 'a4': null });

  useEffect(() => {
    if (!open) return;
    setDadosCliente(null);
    base44.entities.DadosEmpresa.list().then(r => r?.length && setDadosEmpresa(r[0])).catch(() => {});
    if (pedido?.cliente_id) {
      base44.entities.Terceiro.get(pedido.cliente_id).then(setDadosCliente).catch(() => {});
    }
    const ip = localStorage.getItem('ip_impressora_termica');
    if (ip) setIpImpressora(ip);
    base44.entities.ComprovanteTemplate.filter({ is_default: true }).then(tpls => {
      const map = { '80mm': null, 'a4': null };
      tpls.forEach(t => {
        if (t.tipo === 'venda_80mm') map['80mm'] = t;
        if (t.tipo === 'venda_a4') map['a4'] = t;
      });
      setTemplates(map);
    }).catch(() => {});
  }, [open]);

  const handlePrint = async () => {
    const el = document.getElementById('cupom-print');
    if (!el) return;

    if (shouldUseMobileDocumentExport()) {
      setGerando(true);
      try {
        const pdf = await gerarPDF();
        if (!pdf) {
          toast.error('Não foi possível montar o PDF');
          return;
        }
        const fileName = `pedido-${pedido?.numero || 'comprovante'}.pdf`;
        const r = await shareOrDownloadBlob(pdf.output('blob'), fileName, 'application/pdf', `Pedido ${pedido?.numero || ''}`);
        if (r === 'downloaded') toast.success('PDF pronto — use Abrir em para imprimir');
      } catch (e) {
        if (e?.name !== 'AbortError') toast.error('Erro ao gerar PDF');
      } finally {
        setGerando(false);
      }
      return;
    }

    const pageSize = formato === 'a4' ? 'A4 portrait' : '80mm auto';

    const html = `<!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Pedido ${pedido?.numero || ''}</title>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #fff; }
        @page { size: ${pageSize}; margin: 0; }
      </style>
    </head><body>${el.outerHTML}</body></html>`;

    // Remove iframe anterior se existir
    const old = document.getElementById('print-frame');
    if (old) old.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'print-frame';
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);

    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();

    // Aguarda fontes/imagens carregarem, então imprime
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        // Remove após impressão
        setTimeout(() => iframe.remove(), 2000);
      }, 300);
    };
  };

  const gerarPDF = async () => {
    const el = document.getElementById('cupom-print');
    if (!el) return null;

    const isA4 = formato === 'a4';

    const canvas = await html2canvas(el, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');

    let pdf;
    if (isA4) {
      pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const pageH = 297;
      const ratio = canvas.width / canvas.height;
      const imgH = pageW / ratio;
      pdf.addImage(imgData, 'PNG', 0, 0, pageW, Math.min(imgH, pageH));
    } else {
      // 80mm cupom: largura fixa 80mm, altura proporcional
      const widthMm = 80;
      const heightMm = (canvas.height / canvas.width) * widthMm;
      pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [widthMm, heightMm] });
      pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);
    }

    return pdf;
  };

  const handleShare = async () => {
    setGerando(true);
    try {
      const pdf = await gerarPDF();
      if (!pdf) {
        toast.error('Não foi possível montar o PDF');
        return;
      }

      const fileName = `pedido-${pedido?.numero || 'comprovante'}.pdf`;
      const r = await shareOrDownloadBlob(pdf.output('blob'), fileName, 'application/pdf', `Pedido ${pedido?.numero || ''}`);
      if (r === 'downloaded') toast.success('PDF gerado com sucesso');
    } catch (e) {
      if (e.name !== 'AbortError') toast.error('Erro ao gerar PDF');
    } finally {
      setGerando(false);
    }
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
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            disabled={gerando}
            size="sm"
            variant="outline"
            className="h-9 text-xs gap-1.5 rounded-xl px-3"
            title="Imprimir"
          >
            {gerando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
          </Button>
          <Button
            onClick={handleShare}
            disabled={gerando}
            size="sm"
            className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 text-white h-9 text-xs gap-1.5 rounded-xl px-4"
          >
            {gerando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
            {gerando ? 'Gerando...' : 'PDF'}
          </Button>
        </div>
      </div>

      {/* Opções de formato e impressora térmica */}
      <div className="px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Formato:</span>
          <Button
            onClick={() => setFormato('80mm')}
            size="sm"
            variant={formato === '80mm' ? 'default' : 'outline'}
            className="h-8 text-xs"
          >
            80mm
          </Button>
          <Button
            onClick={() => setFormato('a4')}
            size="sm"
            variant={formato === 'a4' ? 'default' : 'outline'}
            className="h-8 text-xs"
          >
            A4
          </Button>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Preview com scale - ocupa toda a tela */}
      <div className="flex-1 overflow-y-auto w-full">
        {formato === '80mm' ? (
          <div className="w-full h-full flex justify-center py-4 px-4">
            <div style={{ width: '275px', transformOrigin: 'top center', transform: 'scale(1)' }} className="shadow-2xl rounded-sm overflow-hidden">
              {templates['80mm'] && dadosEmpresa !== undefined ? (
                <TemplateRenderer htmlContent={renderTemplate(templates['80mm'].html_template, prepararDadosVenda(pedido, dadosEmpresa))} />
              ) : (
                <CupomTermico pedido={pedido} dadosEmpresa={dadosEmpresa} />
              )}
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center py-4 px-4">
            <div style={{ width: `${210 * 3.7795}px`, transformOrigin: 'top center' }} className="shadow-2xl rounded-sm overflow-hidden">
              {templates['a4'] && dadosEmpresa !== undefined ? (
                <TemplateRenderer htmlContent={renderTemplate(templates['a4'].html_template, prepararDadosVenda(pedido, dadosEmpresa))} />
              ) : (
                <CupomA4 pedido={pedido} dadosEmpresa={dadosEmpresa} dadosCliente={dadosCliente} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}