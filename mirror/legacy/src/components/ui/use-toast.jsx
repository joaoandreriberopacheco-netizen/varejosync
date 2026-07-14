import { toast as sonnerToast } from "sonner";
import { TOAST_DURATION_MS } from "@/components/ui/app-toast";

function resolveVariant({ variant }) {
  return variant === "destructive" ? "error" : "success";
}

function toast({ title, description, variant, duration = TOAST_DURATION_MS, className: _className, ..._rest }) {
  const type = resolveVariant({ variant });
  const id = sonnerToast[type](title, { description, duration });
  return {
    id,
    dismiss: () => sonnerToast.dismiss(id),
    update: (props) => {
      const nextType = resolveVariant(props);
      sonnerToast.dismiss(id);
      return toast({ ...props, duration: props.duration ?? duration });
    },
  };
}

function useToast() {
  return {
    toasts: [],
    toast,
    dismiss: (toastId) => sonnerToast.dismiss(toastId),
  };
}

export { useToast, toast };
