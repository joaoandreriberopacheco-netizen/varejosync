/**
 * Atualizações em DadosEmpresa sem apagar outros campos no JSONB `dados`
 * (ex.: centros de custo não podem apagar agefin_series_modelo).
 */

export function stripEmpresaMeta(empresa) {
  if (!empresa) return {};
  const {
    id: _id,
    created_date: _cd,
    updated_date: _ud,
    created_at: _ca,
    updated_at: _ua,
    created_by: _cb,
    dados: _dados,
    ...resto
  } = empresa;
  return resto;
}

export async function obterRegistroDadosEmpresa(base44) {
  const dados = await base44.entities.DadosEmpresa.list();
  return dados?.[0] || null;
}

/** Lê empresa, funde campos e grava — preserva chaves não enviadas no partial. */
export async function atualizarDadosEmpresa(base44, partial) {
  if (!partial || typeof partial !== 'object') {
    throw new Error('Payload inválido para DadosEmpresa.');
  }

  const empresa = await obterRegistroDadosEmpresa(base44);
  const payload = {
    ...stripEmpresaMeta(empresa),
    ...partial,
  };

  if (empresa?.id) {
    return base44.entities.DadosEmpresa.update(empresa.id, payload);
  }

  return base44.entities.DadosEmpresa.create({
    razao_social: 'Empresa',
    nome_fantasia: 'Configuração ERP',
    ...payload,
  });
}
