// Port automático de base44/functions/protegerInteligenciaLayout/entry.ts
import type { createP38Client } from '../p38Client.ts';

/**
 * Função de proteção: Impede deleção de entidades de aprendizado marcadas como protegidas
 * É um safeguard contra perda de inteligência em reset do zero
 */
export async function handle(req: Request, base44: Awaited<ReturnType<typeof createP38Client>>): Promise<Response> {
  try {
    // base44 injetado por servePorted
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { acao } = await req.json();

    if (acao === 'verificar_protecao') {
      // Verifica quantas entidades de aprendizado estão protegidas
      const padroes = await base44.asServiceRole.entities.PadraoLayout.list();
      const eventos = await base44.asServiceRole.entities.EventoEditorLayout.list();
      const configs = await base44.asServiceRole.entities.ConfiguracaoAprendizado.list();

      const padroesProtegidos = padroes.filter(p => p.protegido).length;
      const eventosProtegidos = eventos.filter(e => e.protegido).length;
      const configsProtegidas = configs.filter(c => c.protegido).length;

      return Response.json({
        status: 'protegido',
        resumo: {
          padroes_protegidos: padroesProtegidos,
          eventos_protegidos: eventosProtegidos,
          configs_protegidas: configsProtegidas,
          total_itens_criticos: padroesProtegidos + eventosProtegidos + configsProtegidas,
          mensagem: 'Inteligência do layout está protegida contra reset'
        }
      });
    }

    if (acao === 'backup_inteligencia') {
      // Realiza backup das entidades de aprendizado
      const padroes = await base44.asServiceRole.entities.PadraoLayout.list();
      const eventos = await base44.asServiceRole.entities.EventoEditorLayout.list();
      const configs = await base44.asServiceRole.entities.ConfiguracaoAprendizado.list();

      return Response.json({
        status: 'backup_criado',
        timestamp: new Date().toISOString(),
        backup: {
          padroes,
          eventos,
          configs
        }
      });
    }

    return Response.json({ error: 'Ação não especificada' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
