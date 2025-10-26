import React, { useEffect, useState } from "react";
import {
  CheckCircle2, Clock, Ban, CheckCheck, EyeOff, RotateCcw, X, ChevronsUpDown, Check
} from "lucide-react";
import { Listbox, Transition } from "@headlessui/react";
import {
  UiAppointment, StatusKey, statusStyles,
  statusIcon, statusLabel, ptBR, formatInTimeZone
} from "./shared";

/* -------------------------------- helpers UI ------------------------------- */

const ActionButton: React.FC<React.PropsWithChildren<{ onClick?: () => void; className?: string; title?: string }>> = ({
  onClick, className = "", title, children,
}) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition ${className}`}
    title={title}
  >
    {children}
  </button>
);

const ConfirmDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "danger" | "ok";
}> = ({ open, onClose, onConfirm, title, description, confirmLabel = "Confirmar", tone = "ok" }) => {
  if (!open) return null;
  const danger =
    tone === "danger" ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white";
  return (
    <div className="fixed inset-0 z-[140]">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 top-20 mx-auto w-[92%] max-w-md">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl">
          <div className="p-5">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h4>
            {description && <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300">{description}</p>}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
              >
                Voltar
              </button>
              <button onClick={onConfirm} className={`px-3 py-2 rounded-xl ${danger}`}>
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ----------------------- Status picker (mesma UI mobile) ----------------------- */

const StatusPickerMobile: React.FC<{
  current: StatusKey;
  onChange: (next: StatusKey) => void;
}> = ({ current, onChange }) => {
  const options: StatusKey[] = ["pending", "confirmed", "cancelled", "completed", "no_show"];
  const CurrentIcon = statusIcon(current);
  return (
    <Listbox value={current} onChange={onChange}>
      <div className="relative w-full">
        <Listbox.Button
          className="relative w-full cursor-pointer rounded-xl border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 py-2 pl-3 pr-9 text-left text-sm text-gray-900 dark:text-gray-100"
          aria-label="Alterar status"
        >
          <span className="flex items-center gap-2">
            <CurrentIcon className="h-4 w-4" />
            {statusLabel(current)}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <ChevronsUpDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </span>
        </Listbox.Button>
        <Transition leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
          <Listbox.Options className="absolute z-[170] mt-1 max-h-60 w-full overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg focus:outline-none">
            {options.map((s) => {
              const Icon = statusIcon(s);
              return (
                <Listbox.Option
                  key={s}
                  value={s}
                  className={({ active }) =>
                    `cursor-pointer select-none px-3 py-2 text-sm flex items-center justify-between ${
                      active ? "bg-gray-100 dark:bg-gray-800" : ""
                    } text-gray-900 dark:text-gray-100`
                  }
                >
                  {({ selected }) => (
                    <>
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {statusLabel(s)}
                      </span>
                      {selected && <Check className="h-4 w-4" />}
                    </>
                  )}
                </Listbox.Option>
              );
            })}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
};

/* ------------------------------- AppointmentModal ------------------------------ */

export const AppointmentModal: React.FC<{
  open: boolean;
  onClose: () => void;
  appointment: UiAppointment | null;
  tz: string;
  onUpdateStatus: (id: string, next: StatusKey) => void;
}> = ({ open, onClose, appointment, tz, onUpdateStatus }) => {
  const [confirm, setConfirm] = useState<{ open: boolean; next: StatusKey | null }>({ open: false, next: null });
  const askConfirm = (next: StatusKey) => setConfirm({ open: true, next });
  const doConfirm = () => {
    if (!appointment || !confirm.next) return;
    onUpdateStatus(appointment.id, confirm.next);
    setConfirm({ open: false, next: null });
  };

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open || !appointment) return null;
  const s = statusStyles(appointment.status);

  const disabled = {
    confirm: appointment.status === "confirmed",
    cancel: appointment.status === "cancelled",
    complete: appointment.status === "completed",
    noShow: appointment.status === "no_show",
  };

  return (
    <div className="fixed inset-0 z-[120]">
      {/* overlay full (corrige faixa) */}
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-x-0 top-12 mx-auto w-[95%] max-w-lg">
        <div className={`rounded-2xl border ${s.badge} shadow-xl`}>
          <div className="p-4 md:p-5 flex items-start justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Clock className="h-4 w-4" />
                <span className="font-semibold text-sm">
                  {formatInTimeZone(appointment.date, tz, "EEE, d 'de' MMM 'às' HH:mm", { locale: ptBR as any })} · {appointment.duration} min
                </span>
              </div>
              <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{appointment.service}</h3>
              <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                {appointment.client}{appointment.team_member ? ` · ${appointment.team_member}` : ""}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/60 dark:hover:bg-gray-800/60" aria-label="Fechar">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Status + Ações */}
          <div className="px-4 md:px-5 pb-4 md:pb-5 space-y-3">
            {/* Mobile: selector (mantido) */}
            <div className="md:hidden">
              <label className="text-xs block mb-1 opacity-80">Status</label>
              <StatusPickerMobile
                current={appointment.status}
                onChange={(next) => {
                  if (next !== appointment.status) askConfirm(next);
                }}
              />
            </div>

            {/* Desktop: botões em linha */}
            <div className="hidden md:flex flex-wrap items-center gap-2">
              <ActionButton
                onClick={() => askConfirm("confirmed")}
                className={`border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/25 text-emerald-800 dark:text-emerald-200 ${disabled.confirm ? "opacity-50 pointer-events-none" : ""}`}
                title="Confirmar"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirmar
              </ActionButton>
              <ActionButton
                onClick={() => askConfirm("cancelled")}
                className={`border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/25 text-rose-800 dark:text-rose-200 ${disabled.cancel ? "opacity-50 pointer-events-none" : ""}`}
                title="Cancelar"
              >
                <Ban className="w-4 h-4" /> Cancelar
              </ActionButton>
              <ActionButton
                onClick={() => askConfirm("completed")}
                className={`border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/25 text-indigo-800 dark:text-indigo-200 ${disabled.complete ? "opacity-50 pointer-events-none" : ""}`}
                title="Concluir"
              >
                <CheckCheck className="w-4 h-4" /> Concluir
              </ActionButton>
              <ActionButton
                onClick={() => askConfirm("no_show")}
                className={`border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/25 text-slate-800 dark:text-slate-200 ${disabled.noShow ? "opacity-50 pointer-events-none" : ""}`}
                title="Marcar não compareceu"
              >
                <EyeOff className="w-4 h-4" /> Não compareceu
              </ActionButton>

              {(appointment.status === "cancelled" || appointment.status === "no_show") && (
                <ActionButton
                  onClick={() => askConfirm("pending")}
                  className="border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 hover:bg-white dark:hover:bg-gray-900"
                  title="Reabrir como pendente"
                >
                  <RotateCcw className="w-4 h-4" /> Reabrir
                </ActionButton>
              )}
            </div>

            {/* Mobile: mesmos botões empilhados */}
            <div className="md:hidden flex flex-col gap-2">
              <ActionButton
                onClick={() => askConfirm("confirmed")}
                className={`border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/25 text-emerald-800 dark:text-emerald-200 ${disabled.confirm ? "opacity-50 pointer-events-none" : ""}`}
                title="Confirmar"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirmar
              </ActionButton>
              <ActionButton
                onClick={() => askConfirm("cancelled")}
                className={`border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/25 text-rose-800 dark:text-rose-200 ${disabled.cancel ? "opacity-50 pointer-events-none" : ""}`}
                title="Cancelar"
              >
                <Ban className="w-4 h-4" /> Cancelar
              </ActionButton>
              <ActionButton
                onClick={() => askConfirm("completed")}
                className={`border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/25 text-indigo-800 dark:text-indigo-200 ${disabled.complete ? "opacity-50 pointer-events-none" : ""}`}
                title="Concluir"
              >
                <CheckCheck className="w-4 h-4" /> Concluir
              </ActionButton>
              <ActionButton
                onClick={() => askConfirm("no_show")}
                className={`border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/25 text-slate-800 dark:text-slate-200 ${disabled.noShow ? "opacity-50 pointer-events-none" : ""}`}
                title="Marcar não compareceu"
              >
                <EyeOff className="w-4 h-4" /> Não compareceu
              </ActionButton>

              {(appointment.status === "cancelled" || appointment.status === "no_show") && (
                <ActionButton
                  onClick={() => askConfirm("pending")}
                  className="border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 hover:bg-white dark:hover:bg-gray-900"
                  title="Reabrir como pendente"
                >
                  <RotateCcw className="w-4 h-4" /> Reabrir
                </ActionButton>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, next: null })}
        onConfirm={doConfirm}
        title={
          confirm.next === "cancelled" ? "Cancelar agendamento?"
            : confirm.next === "no_show" ? "Marcar como 'Não compareceu'?"
            : confirm.next === "completed" ? "Concluir agendamento?"
            : confirm.next === "confirmed" ? "Confirmar agendamento?"
            : "Reabrir como pendente?"
        }
        description={
          confirm.next === "cancelled" ? "Essa ação marca o agendamento como cancelado."
            : confirm.next === "no_show" ? "O cliente não compareceu ao horário."
            : confirm.next === "completed" ? "Marcar como concluído."
            : confirm.next === "confirmed" ? "O cliente está confirmado."
            : "Voltará ao status pendente."
        }
        confirmLabel={
          confirm.next === "cancelled" ? "Cancelar"
            : confirm.next === "no_show" ? "Marcar"
            : confirm.next === "completed" ? "Concluir"
            : confirm.next === "confirmed" ? "Confirmar"
            : "Reabrir"
        }
        tone={confirm.next === "cancelled" || confirm.next === "no_show" ? "danger" : "ok"}
      />
    </div>
  );
};
