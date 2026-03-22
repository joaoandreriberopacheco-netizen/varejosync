import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { event, data, old_data } = await req.json();

        // Só processar eventos de update
        if (event.type !== 'update') {
            return Response.json({ message: 'Evento não é update, ignorado' });
        }

        const pedidoId = event.entity_id;
        const statusAtual = data.status;
        const statusAnterior = old_data?.status;
        const statusFinanceiroAtual = data.status_aprovacao_financeira;
        const manifestoVinculado = data.manifesto_entrada_id;

        let atualizacoes = {};
        let registroHistorico = '';

        // REGRA 1: Status mudou para "Aprovado" -> Aprovar financeiramente automaticamente
        if (statusAtual === 'Aprovado' && statusAnterior !== 'Aprovado' && statusFinanceiroAtual !== 'Aprovado') {
            atualizacoes.status_aprovacao_financeira = 'Aprovado';
            atualizacoes.data_aprovacao_financeira = new Date().toISOString();
            registroHistorico = `[AUTOMÁTICO] Status financeiro aprovado automaticamente em ${new Date().toLocaleString('pt-BR')} devido à aprovação do pedido.`;
        }

        // REGRA 2: Solicitação de edição pendente -> Financeiro pode aprovar reabertura
        if (statusFinanceiroAtual === 'Solicitação de Edição Pendente' && 
            data.aprovacao_reabertura_financeiro === true && 
            old_data?.aprovacao_reabertura_financeiro !== true) {
            
            // Validar se não há manifesto vinculado
            if (manifestoVinculado) {
                return Response.json({ 
                    error: 'Não é possível reabrir o pedido. Ele está vinculado a um manifesto. Desvincule primeiro.' 
                }, { status: 400 });
            }

            // Reabrir pedido para edição
            atualizacoes.status = 'Rascunho';
            atualizacoes.status_aprovacao_financeira = 'Aguardando Aprovação';
            atualizacoes.aprovacao_reabertura_financeiro = false; // Reset
            registroHistorico = `[AUTOMÁTICO] Pedido reaberto para edição em ${new Date().toLocaleString('pt-BR')} após aprovação do financeiro.`;
        }

        // REGRA 3: Status mudou para "Rejeitado" ou "Cancelado" -> Rejeitar financeiramente
        if ((statusAtual === 'Rejeitado' || statusAtual === 'Cancelado') && 
            (statusAnterior !== 'Rejeitado' && statusAnterior !== 'Cancelado') &&
            statusFinanceiroAtual !== 'Rejeitado') {
            
            atualizacoes.status_aprovacao_financeira = 'Rejeitado';
            atualizacoes.data_rejeicao_financeira = new Date().toISOString();
            registroHistorico = `[AUTOMÁTICO] Status financeiro rejeitado automaticamente em ${new Date().toLocaleString('pt-BR')} devido ao cancelamento/rejeição do pedido.`;
        }

        // Se há atualizações, aplicar
        if (Object.keys(atualizacoes).length > 0) {
            // Adicionar ao histórico
            const historicoAtual = data.historico || '';
            atualizacoes.historico = historicoAtual + '\n' + registroHistorico;

            // Atualizar pedido usando service role
            await base44.asServiceRole.entities.PedidoCompra.update(pedidoId, atualizacoes);

            return Response.json({ 
                success: true, 
                message: 'Automação executada com sucesso',
                atualizacoes 
            });
        }

        return Response.json({ message: 'Nenhuma ação necessária' });

    } catch (error) {
        console.error('Erro na automação de aprovação financeira:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});