import { base44 } from '@/api/base44Client';

export async function invokeFunction(name, body) {
  const response = await base44.functions.invoke(name, body);
  if (response && typeof response === 'object' && 'data' in response) {
    return response;
  }
  return { data: response };
}
