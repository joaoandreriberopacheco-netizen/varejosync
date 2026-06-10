import { createContagemExpressSessionId } from '@/lib/contagemExpressStorage';
import { REFERENCIA_CONTAGEM_EXPRESS, agruparItensContagem } from '@/lib/contagemExpressApply';
import { getEntryBaseQuantity, getGroupDisplayFromBase } from '@/lib/inventoryCountUnits';
import {
  boundsMesCivil,
  dataHoje,
  fimDiaSistemaISO,
  inicioDiaSistemaISO,
} from '@/components/utils/dateUtils';

export const TIPO_CONTAGEM_EXPRESS = 'Contagem Express';
const PREFIXO_NOME_CONTAGEM_EXPRESS = 'Contagem Express ';

export function extrairReferenciaSessao(sessao) {
  const nome = String(sessao?.nome_conferencia || '').trim();
  if (!nome) return sessao?.id || '';
  if (nome.startsWith(PREFIXO_NOME_CONTAGEM_EXPRESS)) {
    return nome.slice(PREFIXO_NOME_CONTAGEM_EXPRESS.length).trim();
  }
  const match = nome.match(/CE-[A-Z0-9-]+/i);
  if (match) return match[0];
  return nome;
}

/** Chaves que podem aparecer em referencia_numero / referencia_id de movimentos. */
export function referenciasSessaoContagemExpress(sessao) {
  const nome = String(sessao?.nome_conferencia || '').trim();
  const ref = extrairReferenciaSessao(sessao);
  const set = new Set([ref, nome, sessao?.id].filter(Boolean));
  if (ref) set.add(`${PREFIXO_NOME_CONTAGEM_EXPRESS}${ref}`);
  return set;
}

export function movimentoPertenceSessaoContagemExpress(mov, sessao) {
  if (!mov || !sessao) return false;
  const refs = referenciasSessaoContagemExpress(sessao);
  return refs.has(mov.referencia_numero) || refs.has(mov.referencia_id);
}

export function sessaoTemMovimentoContagemExpress(sessao, movimentos) {
  return (movimentos || []).some((mov) => movimentoPertenceSessaoContagemExpress(mov, sessao));
}

export function getPeriodoMesAtual() {
  const hoje = dataHoje();
  const year = parseInt(hoje.slice(0, 4), 10);
  const monthIndex = parseInt(hoje.slice(5, 7), 10) - 1;
  return boundsMesCivil(year, monthIndex);
}

export function filtrarPorPeriodo(registros, { dataInicio, dataFim }, campo = 'created_date') {
  if (!dataInicio || !dataFim) return registros || [];
  const inicio = inicioDiaSistemaISO(dataInicio);
  const fim = fimDiaSistemaISO(dataFim);
  return (registros || []).filter((row) => {
    const raw = row?.[campo] || row?.data_fim || row?.data_inicio;
    if (!raw) return false;
    return raw >= inicio && raw <= fim;
  });
}

export function isSessaoContagemExpress(conferencia) {
  if (!conferencia) return false;
  return (
    conferencia.tipo_conferencia === TIPO_CONTAGEM_EXPRESS ||
    String(conferencia.nome_conferencia || '').startsWith('Contagem Express')
  );
}

export function isSessaoConcluidaContagemExpress(conferencia) {
  if (!isSessaoContagemExpress(conferencia)) return false;
  return conferencia.status === 'Concluída' || conferencia.ajuste_aplicado === true;
}

export async function listarSessoesContagemExpress(base44, { incluirConcluidas = false } = {}) {
  const data = await base44.entities.ConferenciaEstoque.list('-created_date', 200);
  return data.filter((c) => {
    if (!isSessaoContagemExpress(c)) return false;
    if (c.status === 'Cancelada') return false;
    if (incluirConcluidas) return true;
    if (isSessaoConcluidaContagemExpress(c)) return false;
    return c.status === 'Em Andamento' || c.status === 'Rascunho';
  });
}

export async function listarSessoesConcluidasContagemExpress(base44) {
  const data = await base44.entities.ConferenciaEstoque.list('-created_date', 200);
  return data.filter((c) => isSessaoConcluidaContagemExpress(c));
}

export async function listarMovimentosContagemExpress(base44) {
  const movs = await base44.entities.MovimentacaoEstoque.list('-created_date', 3000);
  return movs.filter((m) => m.referencia_tipo === REFERENCIA_CONTAGEM_EXPRESS);
}

/**
 * Sessões com movimento gravado mas conferência ainda em aberto (bug legado).
 * Marca como Concluída para alinhar com o estoque.
 */
export async function repararSessoesOrfasContagemExpress(base44) {
  const [conferencias, movimentos] = await Promise.all([
    base44.entities.ConferenciaEstoque.list('-created_date', 200),
    listarMovimentosContagemExpress(base44),
  ]);

  const orfas = conferencias.filter(
    (c) => isSessaoContagemExpress(c)
      && c.status !== 'Cancelada'
      && !isSessaoConcluidaContagemExpress(c)
      && sessaoTemMovimentoContagemExpress(c, movimentos),
  );

  await Promise.all(
    orfas.map((sessao) => {
      const movsSessao = movimentos.filter((m) => movimentoPertenceSessaoContagemExpress(m, sessao));
      const dataFim = movsSessao[0]?.created_date || sessao.data_fim || new Date().toISOString();
      return base44.entities.ConferenciaEstoque.update(sessao.id, {
        status: 'Concluída',
        data_fim: dataFim,
        ajuste_aplicado: true,
        itens_conferidos: sessao.itens_conferidos || [],
      });
    }),
  );

  return orfas.length;
}

export async function cancelarSessaoContagemExpress(base44, conferenciaId) {
  if (!conferenciaId) return;
  await base44.entities.ConferenciaEstoque.update(conferenciaId, {
    status: 'Cancelada',
    data_fim: new Date().toISOString(),
  });
}

export async function criarSessaoContagemExpress(base44, usuario, nome) {
  const referencia = createContagemExpressSessionId();
  const responsavel = usuario?.full_name || usuario?.nome || usuario?.email || 'Operador';
  return base44.entities.ConferenciaEstoque.create({
    nome_conferencia: nome?.trim() || `Contagem Express ${referencia}`,
    tipo_conferencia: TIPO_CONTAGEM_EXPRESS,
    status: 'Em Andamento',
    data_inicio: new Date().toISOString(),
    itens_conferidos: [],
    responsavel_id: usuario?.email || usuario?.id || '',
    responsavel_nome: responsavel,
  });
}

export async function sincronizarSessaoContagemExpress(base44, conferenciaId, itens) {
  if (!conferenciaId) return;
  await base44.entities.ConferenciaEstoque.update(conferenciaId, {
    itens_conferidos: itens,
    status: 'Em Andamento',
  });
}

export function contarProdutosSessao(conferencia) {
  const itens = conferencia?.itens_conferidos || [];
  const ids = new Set(itens.map((i) => i.produto_id).filter(Boolean));
  return { itens: itens.length, produtos: ids.size };
}

export function agregarContagensPorProduto(sessoes, produtos) {
  const mapaProdutos = Object.fromEntries((produtos || []).map((p) => [p.id, p]));
  const map = new Map();

  for (const sessao of sessoes || []) {
    for (const item of sessao.itens_conferidos || []) {
      if (!item?.produto_id) continue;
      const produto = mapaProdutos[item.produto_id];
      const base = getEntryBaseQuantity(item, produto);
      const key = item.produto_id;
      const prev = map.get(key) || {
        key,
        produto_id: key,
        nome: item.produto_nome || produto?.nome || 'Produto',
        quantidadeBase: 0,
        entradas: 0,
      };
      prev.quantidadeBase += base;
      prev.entradas += 1;
      map.set(key, prev);
    }
  }

  return [...map.values()]
    .map((row) => {
      const produto = mapaProdutos[row.produto_id];
      const display = getGroupDisplayFromBase(produto, row.quantidadeBase);
      return {
        ...row,
        unidade: display.unidade,
        quantidade: display.quantidade,
      };
    })
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
}

export function resumoSessaoConcluida(sessao, produtos) {
  const itens = sessao?.itens_conferidos || [];
  const grupos = agruparItensContagem(itens, produtos);
  const mapaProdutos = Object.fromEntries((produtos || []).map((p) => [p.id, p]));
  const linhas = grupos.map((grupo) => {
    const produto = mapaProdutos[grupo.produto_id];
    const display = getGroupDisplayFromBase(produto, grupo.totalBase);
    return {
      ...grupo,
      unidade: display.unidade,
      quantidade: display.quantidade,
    };
  });
  return { ...contarProdutosSessao(sessao), linhas };
}
