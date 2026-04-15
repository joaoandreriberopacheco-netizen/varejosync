import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { createBase44Adapter } from './base44Adapter';
import { createSubpayzeAdapter } from './subpayzeAdapter';
import { getP38Providers, resolveP38ProviderName } from './providers';

const { appId, serverUrl, token, functionsVersion } = appParams;

const base44SdkClient = createClient({
  appId,
  serverUrl,
  token,
  functionsVersion,
  requiresAuth: false
});

const base44Adapter = createBase44Adapter(base44SdkClient);
const subpayzeAdapter = createSubpayzeAdapter({
  apiUrl: import.meta.env.VITE_SUBPAYZE_API_URL,
  apiKey: import.meta.env.VITE_SUBPAYZE_API_KEY,
  webhookSecret: import.meta.env.VITE_SUBPAYZE_WEBHOOK_SECRET
});

const providers = getP38Providers();
const providerName = resolveP38ProviderName();
const activeAdapter = providerName === providers.SUBPAYZE ? subpayzeAdapter : base44Adapter;

export const p38 = {
  providerName: activeAdapter.name,
  providers,
  adapter: activeAdapter,
  base44Fallback: base44Adapter,
  // Mantemos acesso ao client legado durante a fase de compatibilidade.
  legacyClient: base44SdkClient,
  auth: activeAdapter.auth,
  entities: activeAdapter.entities,
  functions: activeAdapter.functions,
  integrations: activeAdapter.integrations
};
