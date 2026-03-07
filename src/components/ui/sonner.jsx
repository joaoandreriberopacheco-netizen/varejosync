"use client";
import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      position="top-right"
      expand={false}
      richColors={false}
      closeButton
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: [
            "flex items-start gap-3 px-4 py-3.5",
            "rounded-2xl shadow-lg border-0",
            "bg-white dark:bg-gray-800",
            "text-gray-800 dark:text-gray-100",
            "min-w-[280px] max-w-[380px]",
          ].join(" "),
          title: "text-sm font-semibold leading-tight",
          description: "text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug",
          icon: "mt-0.5 flex-shrink-0",
          closeButton: [
            "absolute top-2.5 right-2.5",
            "bg-transparent border-0 text-gray-400 hover:text-gray-600",
            "dark:text-gray-500 dark:hover:text-gray-300",
            "w-5 h-5 flex items-center justify-center rounded-full",
            "hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
          ].join(" "),
          success: "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 [&>[data-icon]]:text-green-500",
          error: "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 [&>[data-icon]]:text-red-500",
          warning: "bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 [&>[data-icon]]:text-amber-500",
          info: "bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 [&>[data-icon]]:text-blue-500",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };