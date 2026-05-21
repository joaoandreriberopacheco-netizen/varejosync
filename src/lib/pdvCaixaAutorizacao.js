/**
 * Normaliza IDs de caixas PDV autorizados no usuário (jsonb, string JSON ou array).
 */
export function normalizeCaixasPdvAutorizadosIds(raw) {
  if (raw == null) return [];
  let value = raw;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      value = JSON.parse(trimmed);
    } catch {
      return [trimmed];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.map((id) => String(id)).filter(Boolean);
}

/**
 * Lista de caixas PDV que o usuário pode abrir no seletor.
 * Vazio em `caixas_pdv_autorizados_ids` = todos os caixas ativos (texto em ListaUsuariosApp).
 */
export function filtrarCaixasPdvParaUsuario(caixasPDV, user) {
  const autorizados = normalizeCaixasPdvAutorizadosIds(
    user?.caixas_pdv_autorizados_ids ?? user?.caixas_vinculados
  );
  if (autorizados.length === 0) {
    return caixasPDV;
  }
  const idSet = new Set(autorizados);
  return caixasPDV.filter((c) => idSet.has(String(c.id)));
}

/** Atualiza sessão com a linha `usuario` (caixas, perfil, etc.). */
export async function enriquecerUsuarioOperacional(base44, user) {
  if (!user?.id || !base44?.entities?.User?.get) return user;
  try {
    const fresh = await base44.entities.User.get(user.id);
    return fresh ? { ...user, ...fresh } : user;
  } catch {
    return user;
  }
}

/** Mensagem amigável quando a plataforma Base44 devolve HTTP 402. */
export function mensagemErroProcessarVenda(error) {
  const status = error?.response?.status ?? error?.status;
  if (status === 402) {
    return {
      title: 'Limite da plataforma Base44',
      description:
        'A venda não foi processada (erro 402). Isso costuma ser limite de uso ou faturamento da conta na Base44 — verifique o plano no painel Base44 ou contacte o suporte deles.',
    };
  }
  return {
    title: 'Erro',
    description: error?.message || 'Falha ao processar a venda.',
  };
}
