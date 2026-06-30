/**
 * Deteta erros de rate limit (Base44, Supabase Auth, PostgREST, etc.).
 * Usado para evitar toasts falsos em sync em background quando a UI já tem dados.
 */
export function isRateLimitApiError(error) {
  const status =
    error?.status ??
    error?.statusCode ??
    error?.response?.status ??
    error?.cause?.status ??
    error?.cause?.response?.status ??
    error?.originalError?.response?.status;

  if (status === 429) return true;

  const code = String(error?.code ?? error?.data?.code ?? error?.cause?.code ?? '').toLowerCase();
  if (code.includes('rate_limit') || code === 'over_request_rate_limit') return true;

  const msg = String(
    error?.message ??
      error?.data?.message ??
      error?.data?.detail ??
      error?.cause?.message ??
      ''
  ).toLowerCase();

  return (
    msg.includes('rate limit') ||
    msg.includes('rate-limit') ||
    msg.includes('data rate') ||
    msg.includes('too many requests') ||
    msg.includes('over_request_rate_limit') ||
    msg.includes('status code 429')
  );
}

export function isTransientApiError(error) {
  if (isRateLimitApiError(error)) return true;
  const status =
    error?.status ??
    error?.statusCode ??
    error?.response?.status ??
    error?.cause?.response?.status;
  if (status === 502 || status === 503 || status === 504) return true;
  const msg = String(error?.message ?? '').toLowerCase();
  return msg.includes('network') || msg.includes('timeout') || msg.includes('econnreset');
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Retry com backoff para rate limit e falhas transitórias.
 */
export async function withRateLimitRetry(fn, { maxAttempts = 3, baseDelayMs = 350 } = {}) {
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable = isTransientApiError(error);
      if (!retryable || attempt >= maxAttempts - 1) {
        throw error;
      }
      const jitter = Math.floor(Math.random() * 400);
      await sleep(baseDelayMs * (attempt + 1) + jitter);
    }
  }
  throw lastError;
}
