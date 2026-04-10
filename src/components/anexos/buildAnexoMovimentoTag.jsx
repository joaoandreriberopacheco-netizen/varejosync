export function buildAnexoMovimentoTag({ referenciaNumero, interveniente, destinacao, observacoes, usuarioNome, createdAt }) {
  const data = createdAt ? new Date(createdAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
  const linhas = [
    referenciaNumero ? `Movimento: ${referenciaNumero}` : null,
    interveniente ? `Interveniente: ${interveniente}` : null,
    destinacao ? `Destinação: ${destinacao}` : null,
    usuarioNome ? `Responsável: ${usuarioNome}` : null,
    observacoes ? `Obs: ${observacoes}` : null,
    `Data: ${data}`,
  ].filter(Boolean);

  return {
    texto: linhas.join(' • '),
    linhas,
  };
}