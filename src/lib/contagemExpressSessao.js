import { createContagemExpressSessionId } from '@/lib/contagemExpressStorage';

export const TIPO_CONTAGEM_EXPRESS = 'Contagem Express';

export function isSessaoContagemExpress(conferencia) {
  if (!conferencia) return false;
  return (
    conferencia.tipo_conferencia === TIPO_CONTAGEM_EXPRESS ||
    String(conferencia.nome_conferencia || '').startsWith('Contagem Express')
  );
}

export async function listarSessoesContagemExpress(base44, { incluirConcluidas = false } = {}) {
  const data = await base44.entities.ConferenciaEstoque.list('-created_date', 100);
  return data.filter((c) => {
    if (!isSessaoContagemExpress(c)) return false;
    if (incluirConcluidas) return true;
    return c.status === 'Em Andamento' || c.status === 'Rascunho';
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
