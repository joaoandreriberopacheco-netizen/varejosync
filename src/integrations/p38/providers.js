const PROVIDERS = {
  BASE44: 'base44',
  SUBPAYZE: 'subpayze'
};

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
