// Port automático de base44/functions/sincronizarStatusFinanceiro/entry.ts
import type { createP38Client } from '../p38Client.ts';

export async function handle(req: Request, base44: Awaited<ReturnType<typeof createP38Client>>): Promise<Response> {
    try {
        // base44 injetado por servePorted
        
        // Autenticação: apenas admin pode executar
        const user = await base44.auth.me();
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Buscar todos os pedidos com status "Aprovado" mas status_aprovacao_financeira não "Aprovado"
        const pedidos = await base44.asServiceRole.entities.PedidoCompra.filter({
            status: 'Aprovado'
        });

        let atualizados = 0;
        let erros = [];

        for (const pedido of pedidos) {
            // Se já está aprovado financeiramente, pular
            if (pedido.status_aprovacao_financeira === 'Aprovado') {
                continue;
            }

            try {
                // Atualizar status financeiro para "Aprovado"
                await base44.asServiceRole.entities.PedidoCompra.update(pedido.id, {
                    status_aprovacao_financeira: 'Aprovado',
                    data_aprovacao_financeira: new Date().toISOString(),
                    historico: (pedido.historico || '') + 
                        `\n[SINCRONIZAÇÃO] Status financeiro atualizado para Aprovado em ${new Date().toLocaleString('pt-BR')} via sincronização manual.`
                });
                atualizados++;
            } catch (error) {
                erros.push({ pedido_id: pedido.id, error: error.message });
            }
        }

        return Response.json({
            success: true,
            message: `Sincronização concluída. ${atualizados} pedidos atualizados.`,
            total_pedidos: pedidos.length,
            atualizados,
            erros: erros.length > 0 ? erros : undefined
        });

    } catch (error) {
        console.error('Erro na sincronização:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
