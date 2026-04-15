export function createBase44Adapter(base44Client) {
  if (!base44Client) {
    throw new Error('P38 base44Adapter requer uma instância válida do cliente Base44.');
  }

  return {
    name: 'base44',
    legacyClient: base44Client,
    auth: base44Client.auth,
    entities: base44Client.entities,
    functions: {
      invoke(name, body) {
        return base44Client.functions.invoke(name, body);
      }
    },
    integrations: base44Client.integrations
  };
}
