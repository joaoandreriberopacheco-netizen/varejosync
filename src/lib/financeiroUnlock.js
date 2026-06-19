import { FINANCEIRO_UNLOCK_TTL_MS } from '@/config/financeiroGate';

const UNLOCK_KEY = 'p38_financeiro_unlock_v1';

export function isFinanceiroUnlockValid() {
  try {
    const raw = sessionStorage.getItem(UNLOCK_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return typeof parsed?.ts === 'number' && Date.now() - parsed.ts < FINANCEIRO_UNLOCK_TTL_MS;
  } catch {
    return false;
  }
}

export function markFinanceiroUnlock() {
  try {
    sessionStorage.setItem(UNLOCK_KEY, JSON.stringify({ ts: Date.now() }));
  } catch {
    // noop
  }
}

export function clearFinanceiroUnlock() {
  try {
    sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    // noop
  }
}
