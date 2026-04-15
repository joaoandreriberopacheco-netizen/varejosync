import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { createBase44Adapter } from './base44Adapter';
import { createSubpayzeAdapter } from './subpayzeAdapter';
import { createRequestContext } from './requestContext';
import {
  getP38Providers,
  isP38SafeModeEnabled,
  isSubpayzeReadyForTraffic,
  isSubpayzeRolloutEnabled,
  resolveP38ProviderName
} from './providers';

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
const safeMode = isP38SafeModeEnabled();
const subpayzeRolloutEnabled = isSubpayzeRolloutEnabled();
const subpayzeReadyForTraffic = isSubpayzeReadyForTraffic();

const shouldUseSubpayze =
  providerName === providers.SUBPAYZE &&
  subpayzeRolloutEnabled &&
  subpayzeReadyForTraffic &&
  subpayzeAdapter.isConfigured;

const activeAdapter = shouldUseSubpayze ? subpayzeAdapter : base44Adapter;

function withSafeFallback(sectionName, candidateSection, fallbackSection) {
  if (!safeMode || activeAdapter.name !== providers.SUBPAYZE) {
    return candidateSection;
  }

  return new Proxy(candidateSection || {}, {
    get(target, propKey) {
      const value = target[propKey];
      if (typeof value !== 'function') {
        return value;
      }

      return async (...args) => {
        try {
          return await value(...args);
        } catch (error) {
          console.warn(`[P38] fallback para Base44 em ${sectionName}.${String(propKey)}`, error);
          const fallbackValue = fallbackSection?.[propKey];
          if (typeof fallbackValue === 'function') {
            return fallbackValue(...args);
          }
          throw error;
        }
      };
    }
  });
}

export const p38 = {
  providerName: activeAdapter.name,
  providers,
  safeMode,
  rollout: {
    subpayzeEnabled: subpayzeRolloutEnabled,
    subpayzeReadyForTraffic,
    requestedProvider: providerName,
    usingSubpayze: shouldUseSubpayze
  },
  adapter: activeAdapter,
  base44Fallback: base44Adapter,
  createRequestContext,
  // Mantemos acesso ao client legado durante a fase de compatibilidade.
  legacyClient: base44SdkClient,
  auth: withSafeFallback('auth', activeAdapter.auth, base44Adapter.auth),
  entities: withSafeFallback('entities', activeAdapter.entities, base44Adapter.entities),
  functions: withSafeFallback('functions', activeAdapter.functions, base44Adapter.functions),
  integrations: withSafeFallback(
    'integrations',
    activeAdapter.integrations,
    base44Adapter.integrations
  )
};
