import { p38 } from '@/api/base44Client';

export async function invokeFunction(name, body) {
  const response = await p38.functions.invoke(name, body);
  if (response && typeof response === 'object' && 'data' in response) {
    return response;
  }
  return { data: response };
}
