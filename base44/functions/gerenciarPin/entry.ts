import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// SHA-256 simples usando Web Crypto API
async function hashPin(pin) {
  const msgBuffer = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { operacao } = body;

    // ── Definir ou alterar PIN ──────────────────────────────────────────────
    if (operacao === 'set_pin') {
      const { pin, pin_atual } = body;

      if (!pin || pin.length < 4 || pin.length > 8 || !/^\d+$/.test(pin)) {
        return Response.json({ error: 'PIN inválido. Use 4 a 8 dígitos numéricos.' }, { status: 400 });
      }

      // Se já tem PIN definido, exige PIN atual para trocar
      if (user.pin_definido && user.pin_hash) {
        if (!pin_atual) {
          return Response.json({ error: 'Informe o PIN atual para alterá-lo.' }, { status: 400 });
        }
        const hashAtual = await hashPin(pin_atual);
        if (hashAtual !== user.pin_hash) {
          return Response.json({ error: 'PIN atual incorreto.' }, { status: 400 });
        }
      }

      const novoHash = await hashPin(pin);
      await base44.auth.updateMe({ pin_hash: novoHash, pin_definido: true });

      return Response.json({ sucesso: true, mensagem: 'PIN definido com sucesso.' });
    }

    // ── Verificar PIN ───────────────────────────────────────────────────────
    if (operacao === 'verify_pin') {
      const { pin } = body;

      if (!user.pin_definido || !user.pin_hash) {
        return Response.json({ error: 'Usuário não possui PIN cadastrado.' }, { status: 400 });
      }

      if (!pin) {
        return Response.json({ error: 'PIN não informado.' }, { status: 400 });
      }

      const hash = await hashPin(pin);
      const valido = hash === user.pin_hash;

      if (!valido) {
        return Response.json({ error: 'PIN incorreto.' }, { status: 400 });
      }

      return Response.json({ sucesso: true, mensagem: 'PIN validado.' });
    }

    // ── Resetar PIN por e-mail ──────────────────────────────────────────────
    if (operacao === 'reset_pin_email') {
      // Gera PIN temporário de 6 dígitos
      const pinTemp = String(Math.floor(100000 + Math.random() * 900000));
      const hashTemp = await hashPin(pinTemp);

      await base44.auth.updateMe({ pin_hash: hashTemp, pin_definido: true });

      // Envia e-mail
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: 'Seu novo PIN de segurança — P38 ERP',
        body: `
Olá, ${user.full_name}!

Seu PIN de segurança foi redefinido.

Novo PIN temporário: ${pinTemp}

Acesse o sistema e redefina para um PIN de sua preferência em: Perfil → Meu PIN.

Por segurança, este PIN é de uso pessoal. Não compartilhe com ninguém.

— Equipe P38 ERP
        `.trim()
      });

      return Response.json({ sucesso: true, mensagem: `PIN temporário enviado para ${user.email}.` });
    }

    return Response.json({ error: 'Operação inválida.' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});