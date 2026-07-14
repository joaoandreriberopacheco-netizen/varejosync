import { base44 } from '@/api/base44Client';
import { buildBypassAuthPayload } from './operacaoAuthFlags';

/** Desplugado nos callers — executa onSuccess sem modal, PIN ou foto. */
export async function runOperacaoAuthBypass(onSuccess) {
    if (typeof onSuccess !== 'function') return;
    const payload = await buildBypassAuthPayload(() => base44.auth.me());
    return onSuccess(payload);
}
