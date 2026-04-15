function notConfigured(methodName) {
  throw new Error(`P38 subpayzeAdapter: método "${methodName}" ainda não configurado.`);
}

export function createSubpayzeAdapter(config = {}) {
  const { apiUrl = null, apiKey = null, webhookSecret = null } = config;

  return {
    name: 'subpayze',
    isConfigured: Boolean(apiUrl && apiKey),
    config: {
      apiUrl,
      hasApiKey: Boolean(apiKey),
      hasWebhookSecret: Boolean(webhookSecret)
    },
    auth: {
      me() {
        return notConfigured('auth.me');
      },
      login() {
        return notConfigured('auth.login');
      },
      logout() {
        return notConfigured('auth.logout');
      }
    },
    entities: {
      Query: {
        // Placeholder para compatibilidade de contrato.
      }
    },
    functions: {
      invoke() {
        return notConfigured('functions.invoke');
      }
    },
    integrations: {
      Core: {
        createCharge() {
          return notConfigured('integrations.Core.createCharge');
        },
        getChargeStatus() {
          return notConfigured('integrations.Core.getChargeStatus');
        },
        verifyWebhookSignature() {
          return notConfigured('integrations.Core.verifyWebhookSignature');
        }
      }
    }
  };
}
