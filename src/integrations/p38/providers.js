const PROVIDERS = {
  BASE44: 'base44',
  SUBPAYZE: 'subpayze'
};

function parseBooleanEnv(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return String(value).toLowerCase().trim() === 'true';
}

export function resolveP38ProviderName() {
  const rawProvider = import.meta.env.VITE_P38_PROVIDER || PROVIDERS.BASE44;
  const provider = String(rawProvider).toLowerCase().trim();

  if (provider === PROVIDERS.SUBPAYZE) {
    return PROVIDERS.SUBPAYZE;
  }

  return PROVIDERS.BASE44;
}

export function getP38Providers() {
  return PROVIDERS;
}

export function isP38SafeModeEnabled() {
  return parseBooleanEnv(import.meta.env.VITE_P38_SAFE_MODE, true);
}

export function isSubpayzeRolloutEnabled() {
  return parseBooleanEnv(import.meta.env.VITE_P38_ENABLE_SUBPAYZE, false);
}

export function isSubpayzeReadyForTraffic() {
  return parseBooleanEnv(import.meta.env.VITE_P38_SUBPAYZE_READY, false);
}
