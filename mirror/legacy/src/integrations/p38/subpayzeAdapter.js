function notConfigured(methodName) {
  throw new Error(`P38 subpayzeAdapter: método "${methodName}" ainda não configurado.`);
}

async function parseSubpayzeResponse(response, methodName, requestId) {
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'string'
        ? payload
        : payload?.error || payload?.message || `HTTP ${response.status}`;
    throw new Error(`[P38][subpayze] ${methodName} falhou (${response.status}) [${requestId}]: ${message}`);
  }

  return payload;
}

function createSubpayzeClient(config = {}) {
  const { apiUrl = null, apiKey = null, webhookSecret = null } = config;
  const normalizedApiUrl = apiUrl ? String(apiUrl).replace(/\/+$/, '') : null;

  async function request(methodName, path, { method = 'GET', body, requestContext = {} } = {}) {
    if (!normalizedApiUrl || !apiKey) {
      return notConfigured(methodName);
    }

    const requestId = requestContext.requestId || `p38-subpayze-${Date.now()}`;
    const response = await fetch(`${normalizedApiUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'x-request-id': requestId
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    return parseSubpayzeResponse(response, methodName, requestId);
  }

  return {
    apiUrl: normalizedApiUrl,
    apiKey,
    webhookSecret,
    request
  };
}

export function createSubpayzeAdapter(config = {}) {
  const client = createSubpayzeClient(config);
  const { apiUrl, apiKey, webhookSecret } = client;

  return {
    name: 'subpayze',
    isConfigured: Boolean(apiUrl && apiKey),
    config: {
      apiUrl,
      hasApiKey: Boolean(apiKey),
      hasWebhookSecret: Boolean(webhookSecret)
    },
    auth: {
      me(_payload, requestContext = {}) {
        return client.request('auth.me', '/auth/me', { requestContext });
      },
      login(payload, requestContext = {}) {
        return client.request('auth.login', '/auth/login', {
          method: 'POST',
          body: payload,
          requestContext
        });
      },
      logout(payload, requestContext = {}) {
        return client.request('auth.logout', '/auth/logout', {
          method: 'POST',
          body: payload,
          requestContext
        });
      }
    },
    entities: {
      Query: {
        // Placeholder para compatibilidade de contrato.
      }
    },
    functions: {
      invoke(name, body, requestContext = {}) {
        if (!name) {
          throw new Error('P38 subpayzeAdapter: functions.invoke requer nome da função.');
        }
        return client.request(`functions.invoke(${name})`, `/functions/${name}`, {
          method: 'POST',
          body,
          requestContext
        });
      }
    },
    integrations: {
      Core: {
        createCharge(payload, requestContext = {}) {
          return client.request('integrations.Core.createCharge', '/payments/charges', {
            method: 'POST',
            body: payload,
            requestContext
          });
        },
        getChargeStatus(payload, requestContext = {}) {
          const chargeId = payload?.chargeId || payload?.id;
          if (!chargeId) {
            throw new Error('P38 subpayzeAdapter: getChargeStatus requer chargeId.');
          }
          return client.request(
            'integrations.Core.getChargeStatus',
            `/payments/charges/${chargeId}`,
            { requestContext }
          );
        },
        verifyWebhookSignature(payload = {}) {
          if (!webhookSecret) {
            return notConfigured('integrations.Core.verifyWebhookSignature');
          }
          const signature = payload.signature || payload.headers?.['x-subpayze-signature'];
          if (!signature) {
            return { valid: false, reason: 'missing-signature' };
          }
          // TODO: trocar por HMAC real conforme especificação oficial da SubPayze.
          const valid = String(signature).trim() === String(webhookSecret).trim();
          return {
            valid,
            reason: valid ? 'ok' : 'invalid-signature',
            mode: 'placeholder-comparison'
          };
        }
      }
    }
  };
}
