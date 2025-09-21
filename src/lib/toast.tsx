// src/lib/toast.tsx
import React from 'react';
import toast, { ToastOptions } from 'react-hot-toast';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

// Cartão base com tipografia limpa
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
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{leftIcon}</div>
      <div className="min-w-[220px] max-w-[460px]">
        <p className="text-sm font-semibold leading-5">{title}</p>
        {description ? (
          <p className="text-xs opacity-80 leading-5 mt-0.5">{description}</p>
        ) : null}
      </div>
      {onClose ? (
        <button
          onClick={onClose}
          className="ml-auto inline-flex items-center justify-center rounded-md p-1.5 hover:opacity-80 transition"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

const iconSuccess = <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
const iconError   = <AlertTriangle className="h-5 w-5 text-red-400" />;
const iconInfo    = <Info className="h-5 w-5 text-indigo-400" />;

const baseOpts: ToastOptions = { duration: 4200 };

export function toastSuccess(title: string, description?: string, opts?: ToastOptions) {
  const id = toast.custom((t) => (
    <Card title={title} description={description} leftIcon={iconSuccess} onClose={() => toast.dismiss(t.id)} />
  ), { ...baseOpts, ...opts });
  return id;
}

export function toastError(title: string, description?: string, opts?: ToastOptions) {
  const id = toast.custom((t) => (
    <Card title={title} description={description} leftIcon={iconError} onClose={() => toast.dismiss(t.id)} />
  ), { ...baseOpts, duration: opts?.duration ?? 6000, ...opts });
  return id;
}

export function toastInfo(title: string, description?: string, opts?: ToastOptions) {
  const id = toast.custom((t) => (
    <Card title={title} description={description} leftIcon={iconInfo} onClose={() => toast.dismiss(t.id)} />
  ), { ...baseOpts, ...opts });
  return id;
}

/** Wrap em promessas com mensagens */
export function toastPromise<T>(
  p: Promise<T>,
  msgs: { loading: string; success: string; error: string },
  opts?: ToastOptions
) {
  return toast.promise(p, msgs, { ...baseOpts, ...opts });
}
