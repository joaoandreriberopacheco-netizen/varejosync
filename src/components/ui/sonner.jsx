"use client";
import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      position="top-left"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        duration: 5000,
        classNames: {
          toast: [
            "flex items-start gap-3 px-4 py-3.5",
            "!rounded-[28px] !shadow-2xl !border-0",
            "!min-w-[280px] !max-w-[420px]",
            "font-sans overflow-hidden relative",
            "before:absolute before:left-0 before:top-0 before:h-full before:w-28 before:rounded-l-[28px] before:opacity-80",
          ].join(" "),
          title: "!text-sm !font-semibold leading-tight",
          description: "!text-xs !mt-0.5 leading-snug opacity-80",
          icon: "!mt-0.5 !w-8 !h-8 !rounded-full !flex !items-center !justify-center !flex-shrink-0",
          closeButton: [
            "!absolute !top-3 !right-3 !bg-transparent !border-0",
            "!w-6 !h-6 !flex !items-center !justify-center !rounded-full",
            "!text-black/35 dark:!text-white/50 !transition-colors hover:!bg-black/10 hover:!text-black/60",
          ].join(" "),
          success: [
            "!bg-[#cfeecf] dark:!bg-green-900/40",
            "!text-[#0f172a] dark:!text-green-50",
            "before:!bg-[#9dd9b0] dark:before:!bg-green-800/60",
            "[&>[data-icon]]:!bg-white [&>[data-icon]]:!text-green-600",
          ].join(" "),
          error: [
            "!bg-[#f4c7cf] dark:!bg-red-900/40",
            "!text-[#0f172a] dark:!text-red-50",
            "before:!bg-[#e79aa8] dark:before:!bg-red-800/60",
            "[&>[data-icon]]:!bg-white [&>[data-icon]]:!text-red-600",
          ].join(" "),
          warning: [
            "!bg-amber-50 dark:!bg-amber-900/30",
            "!text-amber-800 dark:!text-amber-100",
            "[&>[data-icon]]:!bg-amber-100 dark:[&>[data-icon]]:!bg-amber-800/50",
            "[&>[data-icon]]:!text-amber-600 dark:[&>[data-icon]]:!text-amber-400",
          ].join(" "),
          info: [
            "!bg-blue-50 dark:!bg-blue-900/30",
            "!text-blue-800 dark:!text-blue-100",
            "[&>[data-icon]]:!bg-blue-100 dark:[&>[data-icon]]:!bg-blue-800/50",
            "[&>[data-icon]]:!text-blue-600 dark:[&>[data-icon]]:!text-blue-400",
          ].join(" "),
        },
      }}
      {...props}
    />
  );
};

export { Toaster };