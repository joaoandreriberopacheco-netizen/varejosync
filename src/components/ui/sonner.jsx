"use client";
import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      position="top-right"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: [
            "flex items-start gap-3 px-4 py-3.5",
            "!rounded-2xl !shadow-lg !border-0",
            "!min-w-[280px] !max-w-[380px]",
            "font-sans",
          ].join(" "),
          title: "!text-sm !font-semibold leading-tight",
          description: "!text-xs !mt-0.5 leading-snug opacity-80",
          icon: "!mt-0.5 !w-8 !h-8 !rounded-full !flex !items-center !justify-center !flex-shrink-0",
          closeButton: [
            "!absolute !top-2.5 !right-2.5 !bg-transparent !border-0",
            "!w-5 !h-5 !flex !items-center !justify-center !rounded-full",
            "!transition-colors hover:!bg-black/10",
          ].join(" "),
          success: [
            "!bg-green-50 dark:!bg-green-900/30",
            "!text-green-800 dark:!text-green-100",
            "[&>[data-icon]]:!bg-green-100 dark:[&>[data-icon]]:!bg-green-800/50",
            "[&>[data-icon]]:!text-green-600 dark:[&>[data-icon]]:!text-green-400",
          ].join(" "),
          error: [
            "!bg-red-50 dark:!bg-red-900/30",
            "!text-red-800 dark:!text-red-100",
            "[&>[data-icon]]:!bg-red-100 dark:[&>[data-icon]]:!bg-red-800/50",
            "[&>[data-icon]]:!text-red-600 dark:[&>[data-icon]]:!text-red-400",
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