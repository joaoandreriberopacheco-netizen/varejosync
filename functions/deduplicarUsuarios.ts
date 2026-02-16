import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Apenas admin pode executar esta operação
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Acesso negado' }, { status: 403 });
        }

        // Buscar todos os usuários usando service role
        const usuarios = await base44.asServiceRole.entities.User.list();

        // Agrupar por email
        const porEmail = {};
        usuarios.forEach(u => {
            if (!porEmail[u.email]) {
                porEmail[u.email] = [];
            }
            porEmail[u.email].push(u);
        });

        const duplicados = [];
        const deletados = [];

        // Processar cada grupo de emails
        for (const [email, lista] of Object.entries(porEmail)) {
            if (lista.length > 1) {
                // Ordenar por data de criação (mais antigo primeiro)
                lista.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                
                const manter = lista[0]; // Mantém o mais antigo
                const remover = lista.slice(1); // Remove os outros
                
                duplicados.push({
                    email,
                    total: lista.length,
                    mantido: manter.id,
                    removidos: remover.length
                });

                // Deletar os duplicados
                for (const u of remover) {
                    try {
                        await base44.asServiceRole.entities.User.delete(u.id);
                        deletados.push({
                            id: u.id,
                            email: u.email,
                            created_date: u.created_date
                        });
                    } catch (error) {
                        console.error(`Erro ao deletar usuário ${u.id}:`, error);
                    }
                }
            }
        }

        return Response.json({
            success: true,
            total_usuarios: usuarios.length,
            emails_duplicados: duplicados.length,
            usuarios_removidos: deletados.length,
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