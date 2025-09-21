// src/lib/toast.ts
import toast, { ToastOptions } from 'react-hot-toast';
import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

function Card({
  title,
  description,
  leftIcon,
  onClose,
}: {
  title: string;
  description?: string;
  leftIcon?: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div className="min-w-[260px] max-w-[460px] rounded-2xl border border-gray-200/80 dark:border-gray-700/70 bg-white dark:bg-gray-900 shadow-xl">
      <div className="flex items-start gap-3 p-3">
        <div className="mt-0.5 shrink-0">{leftIcon}</div>
        <div className="flex-1">
          <p className="text-sm font-semibold leading-5 text-gray-900 dark:text-white">{title}</p>
          {description ? (
            <p className="text-xs leading-5 mt-0.5 text-gray-700 dark:text-gray-300">{description}</p>
          ) : null}
        </div>
        {onClose ? (
          <button
            onClick={onClose}
            className="ml-auto inline-flex items-center justify-center rounded-md p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            aria-label="Fechar"
          >
            <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
        ) : null}
      </div>
      <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 rounded-b-2xl" />
    </div>
  );
}

const iconSuccess = <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
const iconError   = <AlertTriangle className="h-5 w-5 text-rose-500" />;
const iconInfo    = <Info className="h-5 w-5 text-sky-500" />;

const baseOpts: ToastOptions = {
  duration: 4200,
  // animação vinda do tailwind-animate (opcional; se não tiver, remova as classes)
};

export function toastSuccess(title: string, description?: string, opts?: ToastOptions) {
  return toast.custom(
    (t) => (
      <div className={t.visible ? 'animate-in fade-in slide-in-from-top-1' : 'animate-out fade-out'}>
        <Card title={title} description={description} leftIcon={iconSuccess} onClose={() => toast.dismiss(t.id)} />
      </div>
    ),
    { ...baseOpts, ...opts }
  );
}

export function toastError(title: string, description?: string, opts?: ToastOptions) {
  return toast.custom(
    (t) => (
      <div className={t.visible ? 'animate-in fade-in slide-in-from-top-1' : 'animate-out fade-out'}>
        <Card title={title} description={description} leftIcon={iconError} onClose={() => toast.dismiss(t.id)} />
      </div>
    ),
    { ...baseOpts, duration: opts?.duration ?? 6000, ...opts }
  );
}

export function toastInfo(title: string, description?: string, opts?: ToastOptions) {
  return toast.custom(
    (t) => (
      <div className={t.visible ? 'animate-in fade-in slide-in-from-top-1' : 'animate-out fade-out'}>
        <Card title={title} description={description} leftIcon={iconInfo} onClose={() => toast.dismiss(t.id)} />
      </div>
    ),
    { ...baseOpts, ...opts }
  );
}

export function toastPromise<T>(
  p: Promise<T>,
  msgs: { loading: string; success: string; error: string },
  opts?: ToastOptions
) {
  return toast.promise(p, msgs, { ...baseOpts, ...opts });
}
