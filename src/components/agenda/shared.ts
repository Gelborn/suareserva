// src/components/agenda/shared.ts
import { differenceInMinutes, format, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as dateFnsTz from "date-fns-tz";
import { CheckCircle2, Clock, Ban, CheckCheck, EyeOff } from "lucide-react";

/* ------------------------ date-fns-tz compat (CJS/ESM) ------------------------ */
const _tz: any = (dateFnsTz as any) || {};
const tzHas = (k: string) => _tz && typeof _tz[k] === "function";
const tzOffset = (d: Date, timeZone: string) => {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(d);
  const m: Record<string, string> = {};
  for (const p of parts) if (p.type !== "literal") m[p.type] = p.value;
  const asUTC = Date.UTC(+m.year, +m.month - 1, +m.day, +m.hour, +m.minute, +m.second);
  return asUTC - d.getTime();
};
export const utcToZonedTime = (date: Date, timeZone: string) =>
  tzHas("utcToZonedTime") ? _tz.utcToZonedTime(date, timeZone) : new Date(date.getTime() + tzOffset(date, timeZone));
export const zonedTimeToUtc = (date: Date, timeZone: string) =>
  tzHas("zonedTimeToUtc") ? _tz.zonedTimeToUtc(date, timeZone) : new Date(date.getTime() - tzOffset(date, timeZone));
export const formatInTimeZone = (date: Date, timeZone: string, fmt: string, opts?: any) =>
  tzHas("formatInTimeZone")
    ? _tz.formatInTimeZone(date, timeZone, fmt, opts)
    : format(utcToZonedTime(date, timeZone), fmt, opts);

/* ---------------------------------- helpers ---------------------------------- */
export const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const sameDay = (a: Date, b: Date) => isSameDay(startOfDay(a), startOfDay(b));
export const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
export const minToHHMM = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const parseHH = (t?: string | null) => {
  if (!t) return null;
  const [H, M] = t.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(H)) return null;
  return H * 60 + (Number.isNaN(M) ? 0 : M);
};

/* ---------------------------------- status ----------------------------------- */
export const ALL_STATUSES = ["confirmed", "pending", "cancelled", "completed", "no_show"] as const;
export type StatusKey = (typeof ALL_STATUSES)[number];

export const statusLabel = (s: StatusKey) =>
  s === "confirmed"
    ? "Confirmado"
    : s === "pending"
    ? "Pendente"
    : s === "cancelled"
    ? "Cancelado"
    : s === "completed"
    ? "Concluído"
    : "Não compareceu";

export const statusIcon = (s: StatusKey) =>
  s === "confirmed" ? CheckCircle2 : s === "pending" ? Clock : s === "cancelled" ? Ban : s === "completed" ? CheckCheck : EyeOff;

export function statusStyles(status: StatusKey) {
  switch (status) {
    case "confirmed":
      return {
        badge:
          "bg-green-100/80 dark:bg-green-900/40 text-green-950 dark:text-green-100 border-green-300/70 dark:border-green-800/60",
        dot: "bg-green-500",
      };
    case "pending":
      return {
        badge:
          "bg-amber-100/80 dark:bg-amber-900/40 text-amber-950 dark:text-amber-100 border-amber-300/70 dark:border-amber-800/60",
        dot: "bg-amber-500",
      };
    case "cancelled":
      return {
        badge:
          "bg-rose-100/80 dark:bg-rose-900/40 text-rose-950 dark:text-rose-100 border-rose-300/70 dark:border-rose-800/60",
        dot: "bg-rose-500",
      };
    case "completed":
      return {
        badge:
          "bg-indigo-100/80 dark:bg-indigo-900/40 text-indigo-950 dark:text-indigo-100 border-indigo-300/70 dark:border-indigo-800/60",
        dot: "bg-indigo-500",
      };
    case "no_show":
      return {
        badge:
          "bg-slate-100/80 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 border-slate-300/70 dark:border-slate-700",
        dot: "bg-slate-500",
      };
  }
}

/* ----------------------------------- types ----------------------------------- */
export type UiAppointment = {
  id: string;
  date: Date; // zoned
  time: string; // HH:mm
  client: string;
  service: string;
  duration: number; // min
  price: number; // BRL
  status: StatusKey;
  team_member?: string | null;
};

export function bookingToUi(b: any, tz: string): UiAppointment {
  const start = new Date(b.start_ts);
  const end = new Date(b.end_ts);
  const zonedStart = utcToZonedTime(start, tz);
  const duration = Math.max(1, differenceInMinutes(end, start) || 30);
  return {
    id: b.booking_id,
    date: zonedStart,
    time: formatInTimeZone(start, tz, "HH:mm"),
    client: b.customer_phone || "Cliente",
    service: b.service_name || "Serviço",
    duration,
    price: (b.price_cents ?? 0) / 100,
    status: b.status as StatusKey,
    team_member: b.team_member_name ?? null,
  };
}

export { ptBR };
