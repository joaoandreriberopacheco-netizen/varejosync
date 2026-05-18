/**
 * notify — helper unificado de notificações
 *
 * Uso:
 *   import { notify } from '@/components/ui/notify';
 *   notify.success('Salvo!');
 *   notify.error('Erro ao salvar', 'Verifique os dados.');
 */
import { toast } from "sonner";

export const notify = {
  success: (title, description, options) =>
    toast.success(title, { description, ...options }),
  error: (title, description, options) =>
    toast.error(title, { description, ...options }),
  warning: (title, description, options) =>
    toast.warning(title, { description, ...options }),
  info: (title, description, options) =>
    toast.info(title, { description, ...options }),
};
