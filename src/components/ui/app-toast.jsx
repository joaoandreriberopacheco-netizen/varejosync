import React from "react";
import { toast as sonnerToast } from "sonner-original";
import { AlertCircle, Check, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/components/utils";

export const TOAST_DURATION_MS = 3000;
export const APP_TOAST_DURATION = TOAST_DURATION_MS;

const VARIANTS = {
  success: {
    shell: "bg-[#d4f5e9] text-slate-900 border border-emerald-200/80 dark:bg-emerald-950 dark:text-emerald-50 dark:border-emerald-800",
    circles: ["bg-emerald-400/30", "bg-emerald-500/22", "bg-emerald-300/28"],
    progress: "bg-emerald-500/70 dark:bg-emerald-400/80",
    Icon: Check,
    iconClass: "text-emerald-600 dark:text-emerald-500",
    bodyClass: "text-slate-700 dark:text-emerald-100/90",
  },
  error: {
    shell: "bg-[#fce4ec] text-slate-900 border border-rose-200/80 dark:bg-rose-950 dark:text-rose-50 dark:border-rose-800",
    circles: ["bg-rose-400/30", "bg-rose-500/22", "bg-rose-300/28"],
    progress: "bg-rose-500/70 dark:bg-rose-400/80",
    Icon: AlertCircle,
    iconClass: "text-rose-600 dark:text-rose-400",
    bodyClass: "text-slate-700 dark:text-rose-100/90",
  },
  warning: {
    shell: "bg-amber-50 text-amber-950 border border-amber-200/80 dark:bg-amber-950 dark:text-amber-50 dark:border-amber-800",
    circles: ["bg-amber-400/30", "bg-amber-500/22", "bg-amber-300/28"],
    progress: "bg-amber-500/70 dark:bg-amber-400/80",
    Icon: TriangleAlert,
    iconClass: "text-amber-600 dark:text-amber-400",
    bodyClass: "text-amber-900/80 dark:text-amber-100/90",
  },
  info: {
    shell: "bg-sky-50 text-slate-900 border border-sky-200/80 dark:bg-sky-950 dark:text-sky-50 dark:border-sky-800",
    circles: ["bg-sky-400/30", "bg-sky-500/22", "bg-sky-300/28"],
    progress: "bg-sky-500/70 dark:bg-sky-400/80",
    Icon: Info,
    iconClass: "text-sky-600 dark:text-sky-400",
    bodyClass: "text-slate-700 dark:text-sky-100/90",
  },
};

export function AppToastContent({
  id,
  variant = "success",
  title,
  description,
  duration = TOAST_DURATION_MS,
}) {
  const config = VARIANTS[variant] ?? VARIANTS.success;
  const { Icon, shell, circles, progress, iconClass, bodyClass } = config;
  const label = title ?? description ?? "";
  const body = title && description ? description : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "relative flex w-full min-w-[280px] max-w-[420px] items-start gap-3 overflow-hidden rounded-2xl p-4 pr-11 shadow-lg backdrop-blur-0",
        shell
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 overflow-hidden" aria-hidden>
        <span className={cn("absolute -left-5 top-1/2 h-14 w-14 -translate-y-1/2 rounded-full", circles[0])} />
        <span className={cn("absolute left-1 top-2 h-9 w-9 rounded-full", circles[1])} />
        <span className={cn("absolute bottom-2 left-7 h-7 w-7 rounded-full", circles[2])} />
      </div>
      <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm dark:bg-white/95">
        <Icon className={cn("h-5 w-5", iconClass)} strokeWidth={2.5} />
      </div>
      <div className="relative z-10 min-w-0 flex-1 pt-0.5">
        {label ? (
          <p className="text-sm font-semibold leading-snug text-slate-900 dark:text-inherit">
            {label}
          </p>
        ) : null}
        {body ? (
          <p className={cn("mt-0.5 text-xs leading-snug", bodyClass)}>
            {body}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Fechar notificação"
        onClick={() => sonnerToast.dismiss(id)}
        className="absolute right-3 top-3 z-20 rounded-full p-0.5 text-slate-400 transition-colors hover:bg-black/5 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="absolute inset-x-0 bottom-0 z-10 h-1 bg-black/5 dark:bg-white/10">
        <div
          className={cn("h-full origin-left", progress)}
          style={{
            animation: `app-toast-progress ${duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

export function showAppToast(variantOrOptions, message, options = {}) {
  let variant;
  let title;
  let description;
  let duration;

  if (typeof variantOrOptions === "object" && variantOrOptions !== null) {
    const {
      type,
      variant: variantKey,
      title: optsTitle,
      description: optsDescription,
      duration: optsDuration,
      ...sonnerOpts
    } = variantOrOptions;
    variant = type ?? variantKey ?? "success";
    title = optsTitle ?? "";
    description = optsDescription;
    duration = optsDuration ?? TOAST_DURATION_MS;
    options = sonnerOpts;
  } else {
    variant = variantOrOptions ?? "success";
    duration = options.duration ?? TOAST_DURATION_MS;
    title = typeof message === "string" ? message : options.title ?? "";
    description =
      typeof message === "string"
        ? options.description
        : options.description ?? message?.description;
  }

  return sonnerToast.custom(
    (id) => (
      <AppToastContent
        id={id}
        variant={variant}
        title={title}
        description={description}
        duration={duration}
      />
    ),
    { duration, unstyled: true, ...options }
  );
}
