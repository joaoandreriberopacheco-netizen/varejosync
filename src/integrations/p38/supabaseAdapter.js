import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from '@/lib/supabaseBrowserClient';
import { createSupabaseEntityLayer } from './supabaseEntityLayer';
import { isSupabaseAuthEnabled } from './providers';

const STORAGE_KEYS = {
  bypassUser: 'p38_bypass_user_v1',
  legacyAccessToken: 'base44_access_token'
};

const DEFAULT_BYPASS_USER = Object.freeze({
  id: 'p38-bypass-user',
  email: 'admin@varejosync.local',
  full_name: 'Administrador (bypass)',
  role: 'admin',
  perfil_acesso_id: null,
  is_bypass: true
});

function readBypassUserFromEnv() {
  const env = import.meta.env || {};
  const raw = env.VITE_P38_BYPASS_USER_JSON;
  if (raw) {
    try {
      return { ...DEFAULT_BYPASS_USER, ...JSON.parse(raw) };
    } catch (err) {
      console.warn('[P38][supabaseAdapter] VITE_P38_BYPASS_USER_JSON inválido, usando default.', err);
    }
  }
  return {
    ...DEFAULT_BYPASS_USER,
    ...(env.VITE_P38_BYPASS_USER_ID ? { id: env.VITE_P38_BYPASS_USER_ID } : {}),
    ...(env.VITE_P38_BYPASS_USER_EMAIL ? { email: env.VITE_P38_BYPASS_USER_EMAIL } : {}),
    ...(env.VITE_P38_BYPASS_USER_NAME ? { full_name: env.VITE_P38_BYPASS_USER_NAME } : {}),
    ...(env.VITE_P38_BYPASS_USER_ROLE ? { role: env.VITE_P38_BYPASS_USER_ROLE } : {}),
    ...(env.VITE_P38_BYPASS_USER_PERFIL_ID
      ? { perfil_acesso_id: env.VITE_P38_BYPASS_USER_PERFIL_ID }
      : {})
  };
}

function readPersistedUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.bypassUser);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistUser(user) {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      window.localStorage.setItem(STORAGE_KEYS.bypassUser, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.bypassUser);
    }
  } catch {
    // noop — storage indisponível (sandbox/private mode)
  }
}

function buildAuth(supabase) {
  const useSupabaseAuth = isSupabaseAuthEnabled() && Boolean(supabase);

  async function meViaSupabase() {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      const err = new Error(error.message || 'Falha ao consultar usuário Supabase.');
      err.status = error.status || 401;
      throw err;
    }
    const u = data?.user;
    if (!u) {
      const err = new Error('Sessão Supabase ausente.');
      err.status = 401;
      throw err;
    }
    return {
      id: u.id,
      email: u.email,
      full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email,
      role: u.user_metadata?.role || u.app_metadata?.role || 'user',
      perfil_acesso_id: u.user_metadata?.perfil_acesso_id || null,
      created_date: u.created_at,
      raw: u
    };
  }

  async function meViaBypass() {
    const persisted = readPersistedUser();
    if (persisted) return persisted;
    const fromEnv = readBypassUserFromEnv();
    persistUser(fromEnv);
    return fromEnv;
  }

  return {
    async me() {
      if (useSupabaseAuth) {
        try {
          return await meViaSupabase();
        } catch (err) {
          // Em supabase-auth ligado mas sem sessão, mantém comportamento de auth_required
          throw err;
        }
      }
      return meViaBypass();
    },
    async login(payload = {}) {
      if (useSupabaseAuth) {
        const { email, password } = payload;
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
      }
      const merged = { ...readBypassUserFromEnv(), ...readPersistedUser(), ...payload };
      persistUser(merged);
      return merged;
    },
    async logout(returnUrl) {
      if (useSupabaseAuth) {
        try {
          await supabase.auth.signOut();
        } catch (err) {
          console.warn('[P38][supabaseAdapter] supabase.signOut falhou', err);
        }
      }
      persistUser(null);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(STORAGE_KEYS.legacyAccessToken);
        } catch {
          // ignore
        }
        if (returnUrl) {
          window.location.href = returnUrl;
        }
      }
    },
    redirectToLogin(returnUrl) {
      if (typeof window === 'undefined') return;
      const target = useSupabaseAuth ? '/login' : returnUrl || '/';
      window.location.href = target;
    },
    setBypassUser(user) {
      persistUser(user);
      return user;
    },
    isUsingSupabaseAuth() {
      return useSupabaseAuth;
    }
  };
}

function buildFunctions(supabase) {
  return {
    async invoke(name, body, _requestContext = {}) {
      if (!name) {
        throw new Error('P38 supabaseAdapter: functions.invoke requer nome da função.');
      }
      if (!supabase) {
        const err = new Error(
          `Função "${name}" indisponível: Supabase não configurado (defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).`
        );
        err.code = 'P38_SUPABASE_NOT_CONFIGURED';
        throw err;
      }
      const { data, error } = await supabase.functions.invoke(name, { body });
      if (error) {
        const message = error.message || `Falha ao invocar Edge Function "${name}".`;
        const enhanced = new Error(
          /not.found|404/i.test(message)
            ? `Função "${name}" ainda não foi migrada para Supabase Edge Functions.`
            : `[P38][supabase] functions.invoke(${name}) falhou: ${message}`
        );
        enhanced.code = 'P38_SUPABASE_FUNCTION_ERROR';
        enhanced.cause = error;
        throw enhanced;
      }
      return data;
    }
  };
}

function buildIntegrations() {
  const stub = (label) => async () => {
    throw new Error(
      `[P38][supabase] Integração "${label}" ainda não foi migrada do Base44. ` +
        'Implemente uma Edge Function ou um adapter dedicado.'
    );
  };

  return {
    Core: {
      InvokeLLM: stub('Core.InvokeLLM'),
      SendEmail: stub('Core.SendEmail'),
      UploadFile: stub('Core.UploadFile'),
      UploadPrivateFile: stub('Core.UploadPrivateFile'),
      CreateFileSignedUrl: stub('Core.CreateFileSignedUrl'),
      GenerateImage: stub('Core.GenerateImage'),
      ExtractDataFromUploadedFile: stub('Core.ExtractDataFromUploadedFile')
    }
  };
}

function buildAppLogs() {
  return {
    async logUserInApp() {
      // No-op: telemetria do Base44 desligada.
    }
  };
}

/**
 * Pseudo-cliente compatível com o shape do `@base44/sdk` consumido em todo o app.
 * Substitui `p38.legacyClient` quando provider === 'supabase'.
 */
export function createSupabaseLegacyClient() {
  if (!isSupabaseBrowserConfigured()) {
    throw new Error(
      '[P38][supabaseAdapter] VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes — ' +
        'não é possível inicializar o provider supabase.'
    );
  }
  const supabase = getSupabaseBrowserClient();
  const entities = createSupabaseEntityLayer(null, supabase);
  const auth = buildAuth(supabase);
  const functions = buildFunctions(supabase);
  const integrations = buildIntegrations();
  const appLogs = buildAppLogs();

  return {
    name: 'p38-supabase-legacy-client',
    supabase,
    auth,
    entities,
    functions,
    integrations,
    appLogs
  };
}

export function createSupabaseAdapter() {
  const configured = isSupabaseBrowserConfigured();
  const supabase = configured ? getSupabaseBrowserClient() : null;

  return {
    name: 'supabase',
    isConfigured: Boolean(supabase),
    legacyClient: supabase ? createSupabaseLegacyClient() : null,
    auth: supabase ? buildAuth(supabase) : null,
    entities: supabase ? createSupabaseEntityLayer(null, supabase) : null,
    functions: buildFunctions(supabase),
    integrations: buildIntegrations()
  };
}
