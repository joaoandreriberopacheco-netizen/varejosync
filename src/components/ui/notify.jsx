
/**
 * notify — helper unificado de notificações (usa sonner)
 *
 * Uso:
 *   import { notify } from '@/components/ui/notify';
 *   notify.success('Salvo!');
 *   notify.error('Erro ao salvar', 'Verifique os dados.');
 *   notify.warning('Atenção', 'Perfil em uso.');
 *   notify.info('Dica', 'Use Ctrl+K para buscar.');
 */
import { toast } from "sonner";

export const notify = {
  success: (title, description) => toast.success(title, { description }),
  error:   (title, description) => toast.error(title, { description }),
  warning: (title, description) => toast.warning(title, { description }),
  info:    (title, description) => toast.info(title, { description }),
};
