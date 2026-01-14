import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar se é admin
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado: apenas administradores' }, { status: 403 });
    }

    // Convidar usuários
    const usuarios = [
      { email: 'caixa1.ci@gmail.com', role: 'user' },
      { email: 'joaoandreriberopacheco@gmail.com', role: 'user' }
    ];

    const resultados = [];
    
    for (const usuario of usuarios) {
      try {
        await base44.users.inviteUser(usuario.email, usuario.role);
        resultados.push({ email: usuario.email, status: 'convidado' });
      } catch (error) {
        resultados.push({ email: usuario.email, status: 'erro', erro: error.message });
      }
    }

    return Response.json({ 
      sucesso: true, 
      resultados,
      mensagem: 'Convites enviados. Os usuários receberão email para configurar senha.' 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});