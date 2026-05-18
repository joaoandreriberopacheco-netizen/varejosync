import * as Sonner from "sonner-original";
import { showAppToast, APP_TOAST_DURATION } from "@/components/ui/app-toast";

const { toast: baseToast } = Sonner;

function appToast(type, message, options = {}) {
  const { description, duration, ...rest } = options;
  return showAppToast({
    type,
    title: message,
    description,
    duration: duration ?? APP_TOAST_DURATION,
    ...rest,
  });
}

export const toast = Object.assign(
  (message, options) => appToast("info", message, options),
  {
    ...baseToast,
    success: (message, options) => appToast("success", message, options),
    error: (message, options) => appToast("error", message, options),
    warning: (message, options) => appToast("warning", message, options),
    info: (message, options) => appToast("info", message, options),
    message: (message, options) => appToast("info", message, options),
    dismiss: baseToast.dismiss,
    promise: baseToast.promise,
    loading: baseToast.loading,
    custom: baseToast.custom,
  }
);

export { Toaster, useSonner } from "sonner-original";
export { toast as default };
