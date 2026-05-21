import React from 'react';
import { ordenarItensComprovante } from '@/lib/templateEngine';
import { getUnidadeMedidaItemPedidoVenda } from '@/lib/productUnits';
import { TIMEZONE_SISTEMA } from '@/components/utils/dateUtils';
import ComprovanteContextoBloco from '@/components/vendas/ComprovanteContextoBloco';
import {
  CUPOM_LARGURA_UTIL_MM,
  CUPOM_PAPEL_MM,
  CUPOM_LARGURA_UTIL_PX,
  CUPOM_PADDING_TERMICO,
  CUPOM_LINE_HEIGHT_TERMICO,
  FONT_TERMICA,
  estiloEscalaVerticalCupomTermico,
} from '@/lib/cupomTermico80';

export { CUPOM_LARGURA_UTIL_MM, CUPOM_LARGURA_UTIL_PX };
export const CUPOM_LARGURA_PAPEL_MM = CUPOM_PAPEL_MM;

const fmtDtTZ = (d) =>
  d
    ? new Intl.DateTimeFormat('pt-BR', {
        timeZone: TIMEZONE_SISTEMA,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(d))
    : '-';

const fmtV = (v) => {
  const num = parseFloat(v) || 0;
  const formatted = num.toFixed(2).replace('.', ',');
  const parts = formatted.split(',');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.join(',');
};

/** Padrão térmico referência: = - - = - - … */
function buildLinhaSepDash(len) {
  const unit = '= - - ';
  let s = '';
  while (s.length < len) s += unit;
  return s.trimEnd().slice(0, len);
}

const TOKENS = {
  termico: {
    widthPx: CUPOM_LARGURA_UTIL_PX,
    widthCss: `${CUPOM_LARGURA_UTIL_MM}mm`,
    padding: CUPOM_PADDING_TERMICO,
    font: FONT_TERMICA,
    base: 13,
    small: 11,
    header: 15,
    empresaTitulo: 18,
    total: 19,
    pagamento: 14,
    lineHeight: CUPOM_LINE_HEIGHT_TERMICO,
    sepLen: 28,
    gridCols: '26px 22px minmax(0, 1fr) 46px 50px',
  },
  a4: {
    widthPx: Math.round(CUPOM_LARGURA_UTIL_MM * 1.45 * 3.7795275591),
    widthCss: `${Math.round(CUPOM_LARGURA_UTIL_MM * 1.45)}mm`,
    padding: '4mm 0',
    font: FONT_TERMICA,
    base: 15,
    small: 13,
    header: 17,
    empresaTitulo: 20,
    total: 22,
    pagamento: 16,
    lineHeight: 1.4,
    sepLen: 36,
    gridCols: '30px 26px minmax(0, 1fr) 54px 58px',
  },
};

function LinhaSep({ t, margin }) {
  const linha = buildLinhaSepDash(t.sepLen);
  return (
    <div
      style={{
        margin: margin || '5px 0',
        fontSize: t.small,
        fontFamily: t.font,
        fontWeight: 400,
        color: '#000',
        letterSpacing: 0,
        lineHeight: 1,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      {linha}
    </div>
  );
}

function LinhaTotal({ label, valor, t, destaque }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '8px',
        fontSize: destaque ? t.total : t.base,
        fontWeight: destaque ? 700 : 400,
        color: '#000',
        margin: destaque ? '6px 0 4px' : '2px 0',
        lineHeight: t.lineHeight,
      }}
    >
      <span>{label}</span>
      <span style={{ whiteSpace: 'nowrap', fontWeight: destaque ? 700 : 500 }}>{valor}</span>
    </div>
  );
}

function CelulaGrid({ children, align = 'left', style }) {
  return (
    <span
      style={{
        textAlign: align,
        minWidth: 0,
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/**
 * Layout único de cupom — térmico 72mm ou A4 (mesma estrutura, escala maior).
 */
export default function CupomVendaLayout({
  pedido,
  dadosEmpresa,
  indiceContexto,
  variant = 'termico',
  cupomId = 'cupom-print',
}) {
  const t = TOKENS[variant] || TOKENS.termico;
  const itens = ordenarItensComprovante(pedido?.itens || []);
  const numeroPedido = pedido?.numero || 'S/N';

  const nomeFantasia = (
    dadosEmpresa?.nome_fantasia ||
    dadosEmpresa?.razao_social ||
    'EMPRESA'
  ).toUpperCase();
  const razaoSocial =
    dadosEmpresa?.nome_fantasia && dadosEmpresa?.razao_social
      ? dadosEmpresa.razao_social
      : null;
  const mensagem = (
    dadosEmpresa?.mensagem_rodape || 'OBRIGADO PELA PREFERENCIA!'
  ).toUpperCase();

  const estiloGrid = {
    display: 'grid',
    gridTemplateColumns: t.gridCols,
    columnGap: '3px',
    alignItems: 'start',
  };

  const estiloRoot = {
    width: t.widthCss,
    maxWidth: '100%',
    background: '#fff',
    color: '#000',
    fontFamily: t.font,
    fontSize: t.base,
    fontWeight: 400,
    padding: t.padding,
    margin: '0 auto',
    lineHeight: t.lineHeight,
    WebkitFontSmoothing: 'auto',
    MozOsxFontSmoothing: 'auto',
    printColorAdjust: 'exact',
    WebkitPrintColorAdjust: 'exact',
    ...(variant === 'termico' ? estiloEscalaVerticalCupomTermico : {}),
  };

  return (
    <div id={cupomId} style={estiloRoot}>
      {/* Cabeçalho empresa */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        {dadosEmpresa?.logo_url && (
          <img
            src={dadosEmpresa.logo_url}
            alt=""
            style={{
              display: 'block',
              margin: '0 auto 6px',
              maxWidth: variant === 'termico' ? '58mm' : '70mm',
              maxHeight: variant === 'termico' ? '14mm' : '18mm',
              filter: 'grayscale(100%) contrast(200%)',
              imageRendering: 'crisp-edges',
            }}
          />
        )}
        <div
          style={{
            fontSize: t.empresaTitulo,
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: '0.02em',
          }}
        >
          {nomeFantasia}
        </div>
        {razaoSocial && (
          <div style={{ fontSize: t.small, fontWeight: 400, marginTop: '2px' }}>
            {razaoSocial}
          </div>
        )}
        <div style={{ fontSize: t.small, fontWeight: 400, marginTop: '3px', lineHeight: 1.28 }}>
          {dadosEmpresa?.cnpj && <div>CNPJ: {dadosEmpresa.cnpj}</div>}
          {[dadosEmpresa?.endereco, dadosEmpresa?.numero].filter(Boolean).join(', ') && (
            <div>
              {[dadosEmpresa?.endereco, dadosEmpresa?.numero].filter(Boolean).join(', ')}
            </div>
          )}
          {[dadosEmpresa?.bairro, dadosEmpresa?.cidade, dadosEmpresa?.estado]
            .filter(Boolean)
            .join(' - ') && (
            <div>
              {[dadosEmpresa?.bairro, dadosEmpresa?.cidade, dadosEmpresa?.estado]
                .filter(Boolean)
                .join(' - ')}
            </div>
          )}
          {dadosEmpresa?.telefone && <div>Fone: {dadosEmpresa.telefone}</div>}
        </div>
        <div style={{ fontSize: t.base, fontWeight: 600, marginTop: '5px' }}>
          Cupom nº {numeroPedido}
        </div>
      </div>

      <LinhaSep t={t} />

      {/* Meta pedido */}
      <div style={{ fontSize: t.base, fontWeight: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
          <span>{fmtDtTZ(pedido?.created_date || new Date())}</span>
          <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Nº {numeroPedido}</span>
        </div>
        {pedido?.cliente_nome && (
          <div style={{ marginTop: '3px', fontWeight: 400 }}>
            Cliente: {pedido.cliente_nome}
          </div>
        )}
        {pedido?.vendedor_nome && (
          <div style={{ marginTop: '2px', fontWeight: 400 }}>Vendedor: {pedido.vendedor_nome}</div>
        )}
      </div>

      <ComprovanteContextoBloco
        pedido={pedido}
        indiceContexto={indiceContexto}
        fontSize={t.small}
        variant={variant}
      />

      <LinhaSep t={t} />

      {/* Cabeçalho colunas */}
      <div
        style={{
          ...estiloGrid,
          fontSize: t.small,
          fontWeight: 600,
          marginBottom: '2px',
          textTransform: 'uppercase',
        }}
      >
        <CelulaGrid align="right">QUANT</CelulaGrid>
        <CelulaGrid>UN</CelulaGrid>
        <CelulaGrid>DESCRIÇÃO</CelulaGrid>
        <CelulaGrid align="right">PREÇO</CelulaGrid>
        <CelulaGrid align="right">TOTAL</CelulaGrid>
      </div>

      <LinhaSep t={t} margin="3px 0 5px" />

      {/* Itens — grelha 5 colunas */}
      {itens.map((item, idx) => {
        const nome = item.produto_nome || '';
        const qtd = String(parseFloat(item.quantidade) || 0);
        const un = getUnidadeMedidaItemPedidoVenda(item).substring(0, 4);
        const preco = fmtV(item.preco_unitario_praticado);
        const total = fmtV(item.total);
        return (
          <div
            key={item.pedido_venda_item_id || item.produto_id || idx}
            style={{
              ...estiloGrid,
              fontSize: t.small,
              fontWeight: 400,
              lineHeight: 1.22,
              paddingBottom: '4px',
              marginBottom: '4px',
              borderBottom: idx < itens.length - 1 ? '1px solid #000' : 'none',
            }}
          >
            <CelulaGrid align="right" style={{ fontWeight: 500 }}>
              {qtd}
            </CelulaGrid>
            <CelulaGrid style={{ fontWeight: 400 }}>{un}</CelulaGrid>
            <CelulaGrid style={{ wordBreak: 'break-word', lineHeight: 1.2 }}>
              {nome}
            </CelulaGrid>
            <CelulaGrid align="right" style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
              {preco}
            </CelulaGrid>
            <CelulaGrid align="right" style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
              {total}
            </CelulaGrid>
          </div>
        );
      })}

      <LinhaSep t={t} />

      {/* Totais */}
      {pedido?.subtotal > 0 && (
        <LinhaTotal label="Subtotal" valor={`R$ ${fmtV(pedido.subtotal)}`} t={t} />
      )}
      {pedido?.valor_desconto > 0 && (
        <LinhaTotal label="Desconto" valor={`-R$ ${fmtV(pedido.valor_desconto)}`} t={t} />
      )}
      {pedido?.valor_frete > 0 && (
        <LinhaTotal label="Frete" valor={`R$ ${fmtV(pedido.valor_frete)}`} t={t} />
      )}
      <LinhaTotal
        label="TOTAL"
        valor={`R$ ${fmtV(pedido?.valor_total || 0)}`}
        t={t}
        destaque
      />

      {pedido?.pagamentos?.length > 0 &&
        pedido.pagamentos.map((pag, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '6px',
              fontSize: t.pagamento,
              fontWeight: 500,
              marginTop: i === 0 ? '4px' : '2px',
            }}
          >
            <span>
              {(pag.forma_pagamento || '').toUpperCase()}
              {pag.parcelas > 1 ? ` ${pag.parcelas}x` : ''}
            </span>
            <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>R$ {fmtV(pag.valor)}</span>
          </div>
        ))}

      <LinhaSep t={t} />

      <div style={{ textAlign: 'center', fontWeight: 400 }}>
        <div style={{ fontSize: t.header, fontWeight: 700, margin: '4px 0' }}>{mensagem}</div>
        <div style={{ fontSize: t.small, fontWeight: 400 }}>
          Documento sem validade fiscal
        </div>
      </div>
    </div>
  );
}

export { CUPOM_LARGURA_UTIL_PX as docWidthPxPreview };
