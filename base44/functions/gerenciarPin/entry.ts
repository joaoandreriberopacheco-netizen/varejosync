import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function hashPin(pin) {
  const msgBuffer = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Valida JWT do Google (tokeninfo) e devolve e-mail verificado em minúsculas. */
async function verifyGoogleIdToken(idToken: string, expectedClientId: string): Promise<string> {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description || err.error || 'Token Google inválido ou expirado');
  }
  const data = await res.json();
  const aud = String(data.aud ?? '');
  const audIds = aud.includes(',') ? aud.split(',').map((s: string) => s.trim()) : [aud];
  if (!audIds.includes(expectedClientId)) {
    throw new Error('Token Google não pertence a este aplicativo');
  }
  if (String(data.email_verified) !== 'true') {
    throw new Error('Conta Google sem e-mail verificado');
  }
  const email = String(data.email ?? '')
    .toLowerCase()
    .trim();
  if (!email) throw new Error('Token Google sem e-mail');
  return email;
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

    if (operacao === 'set_pin') {
      const { pin, pin_atual } = body;

      if (!pin || pin.length !== 6 || !/^\d+$/.test(pin)) {
        return Response.json({ error: 'PIN inválido. Use exatamente 6 dígitos numéricos.' }, { status: 400 });
      }

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
      await base44.asServiceRole.entities.User.update(user.id, {
        pin_hash: novoHash,
        pin_definido: true,
      });

      return Response.json({ sucesso: true, mensagem: 'PIN definido com sucesso.' });
    }

    if (operacao === 'verify_pin') {
      const { pin } = body;

      if (!user.pin_definido || !user.pin_hash) {
        return Response.json({ error: 'Usuário não possui PIN cadastrado.' }, { status: 400 });
      }

      if (!pin) {
        return Response.json({ error: 'PIN não informado.' }, { status: 400 });
      }

      const hash = await hashPin(pin);
      if (hash !== user.pin_hash) {
        return Response.json({ error: 'PIN incorreto.' }, { status: 400 });
      }

      return Response.json({ sucesso: true, mensagem: 'PIN validado.' });
    }

    if (operacao === 'reset_pin_email') {
      const pinTemp = String(Math.floor(100000 + Math.random() * 900000));
      const hashTemp = await hashPin(pinTemp);

      await base44.asServiceRole.entities.User.update(user.id, {
        pin_hash: hashTemp,
        pin_definido: true,
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: 'Seu novo PIN de segurança — P38 ERP',
        body: `Olá, ${user.full_name}!\n\nSeu PIN de segurança foi redefinido.\n\nNovo PIN temporário: ${pinTemp}\n\nAcesse o sistema e redefina para um PIN de sua preferência em: Perfil → Meu PIN.\n\nPor segurança, este PIN é de uso pessoal. Não compartilhe com ninguém.\n\n— Equipe P38 ERP`,
      });

      return Response.json({ sucesso: true, mensagem: `PIN temporário enviado para ${user.email}.` });
    }

    if (operacao === 'reset_pin_google') {
      const { id_token } = body;
      const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') ?? Deno.env.get('GOOGLE_CLIENT_ID');
      if (!clientId) {
        return Response.json({ error: 'Redefinição por Google não está configurada no servidor.' }, { status: 503 });
      }
      if (!id_token || typeof id_token !== 'string') {
        return Response.json({ error: 'Token Google não informado.' }, { status: 400 });
      }

      let googleEmail: string;
      try {
        googleEmail = await verifyGoogleIdToken(id_token, clientId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Falha ao validar conta Google.';
        return Response.json({ error: msg }, { status: 400 });
      }

      const userEmail = String(user.email ?? '')
        .toLowerCase()
        .trim();
      if (googleEmail !== userEmail) {
        return Response.json({
          error:
            'A conta Google usada não corresponde ao e-mail deste usuário. Use a mesma conta do login ou redefina por e-mail.',
        }, { status: 403 });
      }

      const pinTemp = String(Math.floor(100000 + Math.random() * 900000));
      const hashTemp = await hashPin(pinTemp);

      await base44.asServiceRole.entities.User.update(user.id, {
        pin_hash: hashTemp,
        pin_definido: true,
      });

      return Response.json({
        sucesso: true,
        mensagem:
          'PIN temporário redefinido. Use-o agora ou cadastre um novo em Perfil → Meu PIN.',
        pin_temporario: pinTemp,
      });
    }

    if (operacao === 'admin_reset_pin') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
      }

      const { target_user_id, target_email } = body;

      if (!target_user_id && !target_email) {
        return Response.json({ error: 'Informe target_user_id ou target_email.' }, { status: 400 });
      }

      let targetUsers = [];
      if (target_user_id) {
        targetUsers = await base44.asServiceRole.entities.User.filter({ id: target_user_id });
      } else {
        targetUsers = await base44.asServiceRole.entities.User.filter({ email: target_email });
      }

      if (!targetUsers.length) {
        return Response.json({ error: 'Usuário não encontrado.' }, { status: 404 });
      }

      const targetUser = targetUsers[0];
      const pinTemp = String(Math.floor(100000 + Math.random() * 900000));
      const hashTemp = await hashPin(pinTemp);

      await base44.asServiceRole.entities.User.update(targetUser.id, {
        pin_hash: hashTemp,
        pin_definido: true,
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: targetUser.email,
        subject: 'Seu PIN foi redefinido pelo administrador — P38 ERP',
        body: `Olá, ${targetUser.full_name}!\n\nSeu PIN de segurança foi redefinido pelo administrador.\n\nNovo PIN temporário: ${pinTemp}\n\nAcesse o sistema e redefina para um PIN de sua preferência em: Perfil → Meu PIN.\n\nPor segurança, este PIN é de uso pessoal. Não compartilhe com ninguém.\n\n— Equipe P38 ERP`,
      });

      return Response.json({ sucesso: true, mensagem: `PIN temporário enviado para ${targetUser.email}.` });
    }

    return Response.json({ error: 'Operação inválida.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});