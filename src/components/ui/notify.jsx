/**
 * notify — helper unificado de notificações (usa sonner)
 * 
 * Uso:
 *   import { notify } from '@/components/ui/notify';
 *   notify.success('Salvo com sucesso!');
 *   notify.error('Erro ao salvar', 'Verifique os dados e tente novamente.');
 *   notify.warning('Atenção', 'Perfil em uso por usuários.');
 *   notify.info('Dica', 'Use Ctrl+K para buscar.');
 */
import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import React from "react";

function ToastContent({ icon: Icon, iconColor, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconColor}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{description}</p>}
      </div>
    </div>
  );
}

export const notify = {
  success: (title, description) => toast.custom(() => (
    <div className="bg-green-50 dark:bg-green-900/30 rounded-2xl shadow-lg px-4 py-3.5 min-w-[280px] max-w-[380px]">
      <ToastContent
        icon={CheckCircle2}
        iconColor="bg-green-100 dark:bg-green-800/50 text-green-600 dark:text-green-400"
        title={title}
        description={description}
      />
    </div>
  )),

  error: (title, description) => toast.custom(() => (
    <div className="bg-red-50 dark:bg-red-900/30 rounded-2xl shadow-lg px-4 py-3.5 min-w-[280px] max-w-[380px]">
      <ToastContent
        icon={XCircle}
        iconColor="bg-red-100 dark:bg-red-800/50 text-red-600 dark:text-red-400"
        title={title}
        description={description}
      />
    </div>
  )),

  warning: (title, description) => toast.custom(() => (
    <div className="bg-amber-50 dark:bg-amber-900/30 rounded-2xl shadow-lg px-4 py-3.5 min-w-[280px] max-w-[380px]">
      <ToastContent
        icon={AlertTriangle}
        iconColor="bg-amber-100 dark:bg-amber-800/50 text-amber-600 dark:text-amber-400"
        title={title}
        description={description}
      />
    </div>
  )),

  info: (title, description) => toast.custom(() => (
    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-2xl shadow-lg px-4 py-3.5 min-w-[280px] max-w-[380px]">
      <ToastContent
        icon={Info}
        iconColor="bg-blue-100 dark:bg-blue-800/50 text-blue-600 dark:text-blue-400"
        title={title}
        description={description}
      />
    </div>
  )),
};