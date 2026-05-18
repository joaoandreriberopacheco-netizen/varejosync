import { Toaster as Sonner } from "sonner-original";
import { TOAST_DURATION_MS } from "@/components/ui/app-toast";

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      position="top-right"
      expand={false}
      visibleToasts={4}
      closeButton={false}
      duration={TOAST_DURATION_MS}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "!p-0 !bg-transparent !border-0 !shadow-none",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
