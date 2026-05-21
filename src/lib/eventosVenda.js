/**
 * Eventos estruturados da venda (substituição, pagamento, cancelamento, detalhes).
 * Persistem em `eventos_venda` (JSONB / dados) + linha legível em `historico`.
 */

export const TIPO_EVENTO = {
  SUBSTITUICAO: 'substituicao',
  PAGAMENTO_ALTERADO: 'pagamento_alterado',
  CANCELAMENTO: 'cancelamento',
  DETALHE_ALTERADO: 'detalhe_alterado',
};

const RE_PAGAMENTO = /\[Alteração de pagamento\s*\|([^\]]+)\]/gi;
const RE_CANCELAMENTO = /\[Cancelamento\s*\|([^\]]+)\]/gi;
const RE_DETALHE = /\[Detalhe alterado\s*\|([^\]]+)\]/gi;

function parseMetaLinha(metaStr) {
  const parts = String(metaStr || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
  const data = parts[0] && !Number.isNaN(new Date(parts[0]).getTime()) ? parts[0] : null;
  const porIdx = parts.findIndex((p) => /^Por:/i.test(p));
  const operador_nome = porIdx >= 0 ? parts[porIdx].replace(/^Por:\s*/i, '').trim() : null;
  return { data: data || new Date().toISOString(), operador_nome };
}

function extrairJsonApos(label, texto) {
  const idx = texto.indexOf(label);
  if (idx < 0) return null;
  const rest = texto.slice(idx + label.length).trim();
  const start = rest.indexOf('[') >= 0 ? rest.indexOf('[') : rest.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < rest.length; i++) {
    const ch = rest[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(rest.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** Lê array estruturado do pedido (coluna ou dados JSONB). */
export function lerEventosVendaArray(pedido) {
  const raw = pedido?.eventos_venda ?? pedido?.dados?.eventos_venda;
  return Array.isArray(raw) ? raw : [];
}

/** Converte blocos legados do campo `historico` em eventos. */
export function parseEventosLegadoHistorico(historico) {
  if (!historico || typeof historico !== 'string') return [];
  const eventos = [];
  const texto = historico;

  let m;
  RE_PAGAMENTO.lastIndex = 0;
  while ((m = RE_PAGAMENTO.exec(texto)) !== null) {
    const bloco = texto.slice(m.index, m.index + 800);
    const meta = parseMetaLinha(m[1]);
    eventos.push({
      tipo: TIPO_EVENTO.PAGAMENTO_ALTERADO,
      data: meta.data,
      operador_nome: meta.operador_nome,
      payload: {
        antes: extrairJsonApos('Antes:', bloco),
        depois: extrairJsonApos('Depois:', bloco),
      },
      fonte: 'historico_legado',
    });
  }

  RE_CANCELAMENTO.lastIndex = 0;
  while ((m = RE_CANCELAMENTO.exec(texto)) !== null) {
    const meta = parseMetaLinha(m[1]);
    eventos.push({
      tipo: TIPO_EVENTO.CANCELAMENTO,
      data: meta.data,
      operador_nome: meta.operador_nome,
      payload: {},
      fonte: 'historico_legado',
    });
  }

  RE_DETALHE.lastIndex = 0;
  while ((m = RE_DETALHE.exec(texto)) !== null) {
    const bloco = texto.slice(m.index, m.index + 600);
    const meta = parseMetaLinha(m[1]);
    eventos.push({
      tipo: TIPO_EVENTO.DETALHE_ALTERADO,
      data: meta.data,
      operador_nome: meta.operador_nome,
      payload: { resumo: bloco.split('\n')[1]?.trim() || 'Alteração registrada' },
      fonte: 'historico_legado',
    });
  }

  return eventos;
}

/** Eventos estruturados + legado, ordenados por data. */
export function lerEventosVenda(pedido) {
  const estruturados = lerEventosVendaArray(pedido);
  const legado = parseEventosLegadoHistorico(pedido?.historico);
  const seen = new Set();
  const merged = [];

  for (const ev of [...estruturados, ...legado]) {
    const key = `${ev.tipo}|${ev.data}|${JSON.stringify(ev.payload || {})}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(ev);
  }

  return merged.sort((a, b) => new Date(a.data || 0) - new Date(b.data || 0));
}

function formatLinhaHistorico(evento) {
  const por = evento.operador_nome ? ` | Por: ${evento.operador_nome}` : '';
  const quando = evento.data || new Date().toISOString();

  if (evento.tipo === TIPO_EVENTO.PAGAMENTO_ALTERADO) {
    const antes = JSON.stringify(evento.payload?.antes ?? []);
    const depois = JSON.stringify(evento.payload?.depois ?? []);
    return `\n[Alteração de pagamento | ${quando}${por}]\nAntes: ${antes}\nDepois: ${depois}`;
  }
  if (evento.tipo === TIPO_EVENTO.CANCELAMENTO) {
    const motivo = evento.payload?.motivo ? ` | Motivo: ${evento.payload.motivo}` : '';
    return `\n[Cancelamento | ${quando}${por}${motivo}]`;
  }
  if (evento.tipo === TIPO_EVENTO.DETALHE_ALTERADO) {
    const resumo = evento.payload?.resumo || 'Campos do pedido alterados';
    return `\n[Detalhe alterado | ${quando}${por}]\n${resumo}`;
  }
  if (evento.tipo === TIPO_EVENTO.SUBSTITUICAO) {
    const origem = evento.payload?.pedido_origem_numero || evento.payload?.pedido_origem_id || '';
    return `\n[Substituição | ${quando}${por} | Substitui ${origem}]`;
  }
  return `\n[Evento ${evento.tipo} | ${quando}${por}]`;
}

/** Monta payload de update com novo evento (mantém legado em historico). */
export function prepararUpdateComEvento(pedido, evento) {
  const eventos = [...lerEventosVendaArray(pedido), { ...evento, data: evento.data || new Date().toISOString() }];
  const linha = formatLinhaHistorico(evento);
  return {
    eventos_venda: eventos,
    historico: (pedido?.historico || '') + linha,
  };
}

export function criarEventoPagamentoAlterado({ antes, depois, operador_nome }) {
  return {
    tipo: TIPO_EVENTO.PAGAMENTO_ALTERADO,
    data: new Date().toISOString(),
    operador_nome: operador_nome || null,
    payload: { antes: antes || [], depois: depois || [] },
  };
}

export function criarEventoCancelamento({ motivo, operador_nome, turno_id }) {
  return {
    tipo: TIPO_EVENTO.CANCELAMENTO,
    data: new Date().toISOString(),
    operador_nome: operador_nome || null,
    payload: { motivo: motivo || '', turno_id: turno_id || null },
  };
}

export function criarEventoDetalheAlterado({ resumo, campos, operador_nome }) {
  return {
    tipo: TIPO_EVENTO.DETALHE_ALTERADO,
    data: new Date().toISOString(),
    operador_nome: operador_nome || null,
    payload: { resumo: resumo || 'Alteração no pedido', campos: campos || [] },
  };
}

export function criarEventoSubstituicao({ pedido_origem_id, pedido_origem_numero, operador_nome }) {
  return {
    tipo: TIPO_EVENTO.SUBSTITUICAO,
    data: new Date().toISOString(),
    operador_nome: operador_nome || null,
    payload: { pedido_origem_id, pedido_origem_numero },
  };
}

const CAMPOS_DETALHE = [
  'cliente_id',
  'cliente_nome',
  'vendedor_id',
  'vendedor_nome',
  'status',
  'metodo_entrega',
  'observacoes',
  'valor_desconto',
  'valor_frete',
  'valor_total',
  'itens',
];

function resumoDiffCampo(campo, antes, depois) {
  if (campo === 'itens') {
    const qAnt = Array.isArray(antes) ? antes.length : 0;
    const qDep = Array.isArray(depois) ? depois.length : 0;
    if (qAnt !== qDep) return `Itens: ${qAnt} → ${qDep} linha(s)`;
    return 'Itens do pedido alterados';
  }
  if (campo === 'valor_total' || campo === 'valor_desconto' || campo === 'valor_frete') {
    return `${campo}: ${antes} → ${depois}`;
  }
  return `${campo} alterado`;
}

/** Detecta mudanças relevantes entre versão anterior e nova do pedido. */
export function detectarAlteracoesPedido(pedidoAntes, pedidoDepois) {
  const eventos = [];
  if (!pedidoAntes?.id) return eventos;

  const camposAlterados = [];
  for (const campo of CAMPOS_DETALHE) {
    const a = pedidoAntes[campo];
    const b = pedidoDepois[campo];
    const sa = campo === 'itens' ? JSON.stringify(a || []) : String(a ?? '');
    const sb = campo === 'itens' ? JSON.stringify(b || []) : String(b ?? '');
    if (sa !== sb) camposAlterados.push(campo);
  }

  if (
    pedidoDepois.status === 'Cancelado' &&
    pedidoAntes.status !== 'Cancelado'
  ) {
    eventos.push(criarEventoCancelamento({ motivo: 'Status alterado para Cancelado' }));
  } else if (camposAlterados.length > 0 && pedidoDepois.status !== 'Cancelado') {
    const resumos = camposAlterados.map((c) =>
      resumoDiffCampo(c, pedidoAntes[c], pedidoDepois[c])
    );
    eventos.push(
      criarEventoDetalheAlterado({
        campos: camposAlterados,
        resumo: resumos.join('; '),
      })
    );
  }

  return eventos;
}

export function aplicarEventosAoPayload(pedido, novosEventos) {
  if (!novosEventos?.length) return {};
  let historico = pedido?.historico || '';
  let eventos = [...lerEventosVendaArray(pedido)];
  for (const ev of novosEventos) {
    eventos.push({ ...ev, data: ev.data || new Date().toISOString() });
    historico += formatLinhaHistorico(ev);
  }
  return { eventos_venda: eventos, historico };
}

/** Rótulos curtos para UI e comprovante. */
export function rotuloEvento(evento) {
  switch (evento?.tipo) {
    case TIPO_EVENTO.SUBSTITUICAO:
      return `Substitui ${evento.payload?.pedido_origem_numero || 'pedido anterior'}`;
    case TIPO_EVENTO.PAGAMENTO_ALTERADO:
      return 'Pagamento alterado';
    case TIPO_EVENTO.CANCELAMENTO:
      return 'Venda cancelada';
    case TIPO_EVENTO.DETALHE_ALTERADO:
      return evento.payload?.resumo || 'Detalhes alterados';
    default:
      return 'Alteração';
  }
}
