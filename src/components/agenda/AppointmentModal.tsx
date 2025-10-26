// src/components/agenda/AppointmentModal.tsx
import React, { useEffect, useState } from "react";
import {
  CheckCircle2, Clock, Ban, CheckCheck, EyeOff, X, Phone, User
} from "lucide-react";
import {
  UiAppointment, StatusKey, ptBR, formatInTimeZone, statusLabel, statusIcon, BRL
} from "./shared";

/* Avatar util (mesma ideia dos cards) */
function initials(name?: string | null) {
  if (!name) return "P";
  const parts = (name || "").split(" ").filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[parts.length - 1]?.[0] ?? "";
  return (a + b).toUpperCase();
}
const Avatar: React.FC<{ url?: string | null; name?: string | null; size?: number }> = ({ url, name, size = 40 }) => {
  const cls = "rounded-full object-cover";
  const px = `${size}px`;
  if (url) return <img src={url} alt={name ?? "Profissional"} className={cls} style={{ width: px, height: px }} />;
  return (
    <div
      className="rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200 grid place-items-center font-semibold"
      style={{ width: px, height: px, fontSize: Math.max(10, size * 0.45) }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
};

const ActionButton: React.FC<React.PropsWithChildren<{
  onClick?: () => void;
  className?: string;
  title?: string;
  disabled?: boolean;
}>> = ({ onClick, className = "", title, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-disabled={disabled ? true : undefined}
    className={`inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 hover:bg-white/90 dark:hover:bg-gray-900/90 transition
      ${disabled ? "opacity-50 pointer-events-none" : ""} ${className}`}
    title={title}
  >
    {children}
  </button>
);

/* Chip de status com cor */
const STATUS_TONE: Record<StatusKey, { wrap: string; text: string; border: string }> = {
  pending:   { wrap: "bg-slate-50 dark:bg-slate-900/40",   text: "text-slate-700 dark:text-slate-200",   border: "border-slate-200 dark:border-slate-700" },
  confirmed: { wrap: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-200", border: "border-emerald-200 dark:border-emerald-800" },
  cancelled: { wrap: "bg-rose-50 dark:bg-rose-900/30",     text: "text-rose-700 dark:text-rose-200",     border: "border-rose-200 dark:border-rose-800" },
  completed: { wrap: "bg-indigo-50 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-200", border: "border-indigo-200 dark:border-indigo-800" },
  no_show:   { wrap: "bg-amber-50 dark:bg-amber-900/30",   text: "text-amber-800 dark:text-amber-200",   border: "border-amber-200 dark:border-amber-800" },
};

const StatusChip: React.FC<{ status: StatusKey }> = ({ status }) => {
  const t = STATUS_TONE[status];
  const Icon = statusIcon(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${t.wrap} ${t.text} ${t.border}`}>
      <Icon className="h-3.5 w-3.5" />
      {statusLabel(status)}
    </span>
  );
};

const SectionLabel: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-2">{children}</div>
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

  // Desativa todos os botões quando cancelado OU concluído
  const disabledAll = ["cancelled", "completed"].includes(appointment.status);

  // Textos do dialog
  const dialogTitle: Record<StatusKey, string> = {
    cancelled: "Cancelar agendamento?",
    confirmed: "Confirmar agendamento?",
    completed: "Concluir agendamento?",
    no_show: "Marcar como 'Não compareceu'?",
    pending: "Confirmar ação?",
  };
  const dialogDesc: Record<StatusKey, string> = {
    cancelled: "Essa ação marca o agendamento como cancelado.",
    confirmed: "O cliente ficará confirmado.",
    completed: "Marcar este agendamento como concluído.",
    no_show: "O cliente não compareceu ao horário.",
    pending: "Essa ação atualizará o status.",
  };
  const dialogCta: Record<StatusKey, string> = {
    cancelled: "Cancelar",
    confirmed: "Confirmar",
    completed: "Concluir",
    no_show: "Marcar",
    pending: "Confirmar",
  };
  const dialogTone: Record<StatusKey, "ok" | "danger"> = {
    cancelled: "danger",
    no_show: "danger",
    confirmed: "ok",
    completed: "ok",
    pending: "ok",
  };

  return (
    <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true" aria-label="Detalhes do agendamento">
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-x-0 top-10 mx-auto w-[95%] max-w-xl">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-2xl">
          {/* Header minimal */}
          <div className="flex items-start justify-between p-4 md:p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip status={appointment.status} />
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
                  <Clock className="h-3.5 w-3.5" />
                  {appointment.duration} min
                </span>
                {typeof appointment.price === "number" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
                    {BRL.format(appointment.price)}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="divide-y divide-gray-200/80 dark:divide-gray-800/80">
            {/* Bloco 1: Detalhes do agendamento */}
            <section className="p-4 md:p-6">
              <SectionLabel>Dados do agendamento</SectionLabel>
              <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Clock className="h-4 w-4 shrink-0" />
                <span className="font-semibold text-sm">
                  {formatInTimeZone(appointment.date, tz, "EEE, d 'de' MMM 'às' HH:mm", { locale: ptBR as any })}
                </span>
              </div>

              <h3 className="mt-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">{appointment.service}</h3>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                <User className="h-4 w-4" />
                <span className="font-medium">{appointment.client}</span>
                {appointment.phone && (
                  <>
                    <span className="opacity-60">·</span>
                    <Phone className="h-4 w-4" />
                    <span className="tabular-nums">{appointment.phone}</span>
                  </>
                )}
              </div>
            </section>

            {/* Bloco 2: Profissional */}
            <section className="p-4 md:p-6">
              <SectionLabel>Quem irá atender</SectionLabel>
              <div className="flex items-center gap-3">
                <Avatar url={appointment.team_member_avatar} name={appointment.team_member} size={40} />
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-white leading-tight">
                    {appointment.team_member ?? "Profissional"}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Profissional</div>
                </div>
              </div>
            </section>

            {/* Bloco 3: Ações */}
            <section className="p-4 md:p-6">
              <SectionLabel>Ações</SectionLabel>

              {/* desktop: linha; mobile: grid empilhada */}
              <div className="hidden md:flex flex-wrap items-center gap-2">
                <ActionButton
                  onClick={() => askConfirm("confirmed")}
                  disabled={disabledAll}
                  title="Confirmar Agendamento"
                >
                  <CheckCircle2 className="w-4 h-4" /> Confirmar Agendamento
                </ActionButton>

                <ActionButton
                  onClick={() => askConfirm("cancelled")}
                  disabled={disabledAll}
                  title="Cancelar este Agendamento"
                >
                  <Ban className="w-4 h-4" /> Cancelar este Agendamento
                </ActionButton>

                <ActionButton
                  onClick={() => askConfirm("completed")}
                  disabled={disabledAll}
                  title="Marcar como Concluído"
                >
                  <CheckCheck className="w-4 h-4" /> Marcar como Concluído
                </ActionButton>

                <ActionButton
                  onClick={() => askConfirm("no_show")}
                  disabled={disabledAll}
                  title="Marcar como cliente não compareceu"
                >
                  <EyeOff className="w-4 h-4" /> Marcar como cliente não compareceu
                </ActionButton>
              </div>

              {/* mobile */}
              <div className="md:hidden grid grid-cols-1 gap-2">
                <ActionButton onClick={() => askConfirm("confirmed")} disabled={disabledAll}>
                  <CheckCircle2 className="w-4 h-4" /> Confirmar Agendamento
                </ActionButton>
                <ActionButton onClick={() => askConfirm("cancelled")} disabled={disabledAll}>
                  <Ban className="w-4 h-4" /> Cancelar este Agendamento
                </ActionButton>
                <ActionButton onClick={() => askConfirm("completed")} disabled={disabledAll}>
                  <CheckCheck className="w-4 h-4" /> Marcar como Concluído
                </ActionButton>
                <ActionButton onClick={() => askConfirm("no_show")} disabled={disabledAll}>
                  <EyeOff className="w-4 h-4" /> Marcar como cliente não compareceu
                </ActionButton>
              </div>
            </section>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, next: null })}
        onConfirm={doConfirm}
        title={confirm.next ? dialogTitle[confirm.next] : "Confirmar ação?"}
        description={confirm.next ? dialogDesc[confirm.next] : "Confirma a atualização deste agendamento?"}
        confirmLabel={confirm.next ? dialogCta[confirm.next] : "Confirmar"}
        tone={confirm.next ? dialogTone[confirm.next] : "ok"}
      />
    </div>
  );
};
