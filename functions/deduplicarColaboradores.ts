import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Apenas admin pode executar esta operação
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Acesso negado' }, { status: 403 });
        }

        // Buscar todos os colaboradores
        const colaboradores = await base44.entities.Colaborador.list();

        // Agrupar por nome (ou outro campo identificador único)
        const porNome = {};
        colaboradores.forEach(c => {
            const chave = c.nome?.toLowerCase().trim();
            if (!chave) return;
            
            if (!porNome[chave]) {
                porNome[chave] = [];
            }
            porNome[chave].push(c);
        });

        const duplicados = [];
        const deletados = [];

        // Processar cada grupo
        for (const [nome, lista] of Object.entries(porNome)) {
            if (lista.length > 1) {
                // Ordenar por data de criação (mais antigo primeiro)
                lista.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                
                const manter = lista[0]; // Mantém o mais antigo
                const remover = lista.slice(1); // Remove os outros
                
                duplicados.push({
                    nome,
                    total: lista.length,
                    mantido: manter.id,
                    removidos: remover.length
                });

                // Deletar os duplicados
                for (const c of remover) {
                    try {
                        await base44.entities.Colaborador.delete(c.id);
                        deletados.push({
                            id: c.id,
                            nome: c.nome,
                            created_date: c.created_date
                        });
                    } catch (error) {
                        console.error(`Erro ao deletar colaborador ${c.id}:`, error);
                    }
                }
            }
        }

        return Response.json({
            success: true,
            total_colaboradores: colaboradores.length,
            nomes_duplicados: duplicados.length,
            colaboradores_removidos: deletados.length,
            detalhes: {
                duplicados,
                deletados
            }
        });

    } catch (error) {
        console.error("Erro na deduplicação:", error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});