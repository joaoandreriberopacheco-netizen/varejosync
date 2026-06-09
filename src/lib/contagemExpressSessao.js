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

export async function listarSessoesContagemExpress(base44, { incluirConcluidas = false } = {}) {
  const data = await base44.entities.ConferenciaEstoque.list('-created_date', 200);
  return data.filter((c) => {
    if (!isSessaoContagemExpress(c)) return false;
    if (incluirConcluidas) return true;
    return c.status === 'Em Andamento' || c.status === 'Rascunho';
  });
}

export async function listarSessoesConcluidasContagemExpress(base44) {
  const data = await base44.entities.ConferenciaEstoque.list('-created_date', 200);
  return data.filter((c) => isSessaoContagemExpress(c) && c.status === 'Concluída');
}

export async function listarMovimentosContagemExpress(base44) {
  const movs = await base44.entities.MovimentacaoEstoque.list('-created_date', 3000);
  return movs.filter((m) => m.referencia_tipo === REFERENCIA_CONTAGEM_EXPRESS);
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
