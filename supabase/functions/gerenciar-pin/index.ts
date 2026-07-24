// supabase/functions/gerenciar-pin/index.ts
// Port de base44/functions/gerenciarPin para Supabase Edge Function.
// PIN armazenado como hash SHA-256 (hex) em public.usuario.dados.pin_hash.
// Operações:
//   set_pin / verify_pin  — puras de DB (sem dependência externa)
//   reset_pin_email / admin_reset_pin — enviam email via Resend (RESEND_API_KEY)
//
// Env esperado: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
//   RESEND_FROM (opcional, default "P38 ERP <no-reply@p38.app>").
import { createClient } from 'npm:@supabase/supabase-js@2';

const env = (k: string): string => Deno.env.get(k) ?? '';

async function hashPin(pin: string): Promise<string> {
  const buf = new TextEncoder().encode(pin);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface UsuarioRow {
  id: string;
  dados: Record<string, any>;
}

async function findUsuario(supabase: ReturnType<typeof createClient>, authUserId: string, email: string): Promise<UsuarioRow | null> {
  // Tenta por id (uuid/base44 id); fallback por email (dados->>email).
  const { data: byId } = await supabase
    .from('usuario')
    .select('id, dados')
    .eq('id', authUserId)
    .maybeSingle();
  if (byId) return byId as UsuarioRow;

  const { data: all } = await supabase.from('usuario').select('id, dados');
  const match = (all as UsuarioRow[] | null)?.find(
    (u) => String(u.dados?.email || '').toLowerCase() === String(email || '').toLowerCase()
  );
  return match ?? null;
}

async function patchUsuario(supabase: ReturnType<typeof createClient>, id: string, patch: Record<string, any>) {
  const { data: row } = await supabase.from('usuario').select('dados').eq('id', id).maybeSingle();
  const novosDados = { ...((row as any)?.dados || {}), ...patch };
  const { error } = await supabase.from('usuario').update({ dados: novosDados }).eq('id', id);
  if (error) throw new Error(error.message);
}

async function sendEmail(to: string, subject: string, body: string) {
  const key = env('RESEND_API_KEY');
  if (!key) throw new Error('RESEND_API_KEY não configurado — não é possível enviar email.');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env('RESEND_FROM') || 'P38 ERP <no-reply@p38.app>',
      to,
      subject,
      text: body,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Email falhou (${res.status}): ${txt}`);
  }
}

function randomTempPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false },
    });

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    const { data: authData, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !authData.user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const authUser = authData.user;

    const body = await req.json();
    const { operacao } = body;

    // ── set_pin ──────────────────────────────────────────────────────
    if (operacao === 'set_pin') {
      const { pin, pin_atual } = body;
      if (!pin || pin.length !== 6 || !/^\d+$/.test(pin)) {
        return Response.json({ error: 'PIN inválido. Use exatamente 6 dígitos numéricos.' }, { status: 400 });
      }

      const usuario = await findUsuario(supabase, authUser.id, authUser.email || '');
      if (!usuario) return Response.json({ error: 'Usuário não encontrado.' }, { status: 404 });

      if (usuario.dados.pin_definido && usuario.dados.pin_hash) {
        if (!pin_atual) {
          return Response.json({ error: 'Informe o PIN atual para alterá-lo.' }, { status: 400 });
        }
        const hashAtual = await hashPin(pin_atual);
        if (hashAtual !== usuario.dados.pin_hash) {
          return Response.json({ error: 'PIN atual incorreto.' }, { status: 400 });
        }
      }

      const novoHash = await hashPin(pin);
      await patchUsuario(supabase, usuario.id, { pin_hash: novoHash, pin_definido: true });
      return Response.json({ sucesso: true, mensagem: 'PIN definido com sucesso.' });
    }

    // ── verify_pin ──────────────────────────────────────────────────
    if (operacao === 'verify_pin') {
      const { pin } = body;
      const usuario = await findUsuario(supabase, authUser.id, authUser.email || '');
      if (!usuario) return Response.json({ error: 'Usuário não encontrado.' }, { status: 404 });

      if (!usuario.dados.pin_definido || !usuario.dados.pin_hash) {
        return Response.json({ error: 'Usuário não possui PIN cadastrado.' }, { status: 400 });
      }
      if (!pin) return Response.json({ error: 'PIN não informado.' }, { status: 400 });

      const hash = await hashPin(pin);
      if (hash !== usuario.dados.pin_hash) {
        // Compat legado: PIN salvo sem hash → migra para hash seguro.
        if (usuario.dados.pin_hash === pin) {
          await patchUsuario(supabase, usuario.id, { pin_hash: hash, pin_definido: true });
          return Response.json({ sucesso: true, mensagem: 'PIN validado.' });
        }
        return Response.json({ error: 'PIN incorreto.' }, { status: 400 });
      }
      return Response.json({ sucesso: true, mensagem: 'PIN validado.' });
    }

    // ── reset_pin_email ──────────────────────────────────────────────
    if (operacao === 'reset_pin_email') {
      const usuario = await findUsuario(supabase, authUser.id, authUser.email || '');
      if (!usuario) return Response.json({ error: 'Usuário não encontrado.' }, { status: 404 });

      const pinTemp = randomTempPin();
      const hashTemp = await hashPin(pinTemp);
      await patchUsuario(supabase, usuario.id, { pin_hash: hashTemp, pin_definido: true });

      try {
        await sendEmail(
          authUser.email || usuario.dados.email || '',
          'Seu novo PIN de segurança — P38 ERP',
          `Olá, ${usuario.dados.full_name || ''}!\n\nSeu PIN de segurança foi redefinido.\n\nNovo PIN temporário: ${pinTemp}\n\nAcesse o sistema e redefina para um PIN de sua preferência em: Perfil → Meu PIN.\n\nPor segurança, este PIN é de uso pessoal. Não compartilhe com ninguém.\n\n— Equipe P38 ERP`
        );
      } catch (e) {
        return Response.json({ error: (e as Error).message }, { status: 502 });
      }
      return Response.json({ sucesso: true, mensagem: `PIN temporário enviado para ${authUser.email || usuario.dados.email || ''}.` });
    }

    // ── admin_reset_pin ──────────────────────────────────────────────
    if (operacao === 'admin_reset_pin') {
      const usuario = await findUsuario(supabase, authUser.id, authUser.email || '');
      if (!usuario) return Response.json({ error: 'Usuário não encontrado.' }, { status: 404 });
      if (usuario.dados.role !== 'admin') {
        return Response.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
      }

      const { target_user_id, target_email } = body;
      if (!target_user_id && !target_email) {
        return Response.json({ error: 'Informe target_user_id ou target_email.' }, { status: 400 });
      }

      let target: UsuarioRow | null = null;
      if (target_user_id) {
        const { data } = await supabase.from('usuario').select('id, dados').eq('id', target_user_id).maybeSingle();
        target = data as UsuarioRow | null;
      }
      if (!target && target_email) {
        const { data: all } = await supabase.from('usuario').select('id, dados');
        target = (all as UsuarioRow[] | null)?.find(
          (u) => String(u.dados?.email || '').toLowerCase() === String(target_email).toLowerCase()
        ) ?? null;
      }
      if (!target) return Response.json({ error: 'Usuário não encontrado.' }, { status: 404 });

      const pinTemp = randomTempPin();
      const hashTemp = await hashPin(pinTemp);
      await patchUsuario(supabase, target.id, { pin_hash: hashTemp, pin_definido: true });

      try {
        await sendEmail(
          target.dados.email || '',
          'Seu PIN foi redefinido pelo administrador — P38 ERP',
          `Olá, ${target.dados.full_name || ''}!\n\nSeu PIN de segurança foi redefinido pelo administrador.\n\nNovo PIN temporário: ${pinTemp}\n\nAcesse o sistema e redefina para um PIN de sua preferência em: Perfil → Meu PIN.\n\nPor segurança, este PIN é de uso pessoal. Não compartilhe com ninguém.\n\n— Equipe P38 ERP`
        );
      } catch (e) {
        return Response.json({ error: (e as Error).message }, { status: 502 });
      }
      return Response.json({ sucesso: true, mensagem: `PIN temporário enviado para ${target.dados.email || ''}.` });
    }

    return Response.json({ error: 'Operação inválida.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});