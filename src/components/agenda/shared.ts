// src/components/agenda/shared.ts
import { CheckCircle2, Clock, Ban, CheckCheck, EyeOff } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { ptBR as _ptBR } from "date-fns/locale";

/* ------------------------------ date-fns-tz shim ------------------------------ */
import * as dateFnsTz from "date-fns-tz";
const _tz: any = (dateFnsTz as any) || {};
const tzHas = (k: string) => _tz && typeof _tz[k] === "function";

const tzOffset = (d: Date, timeZone: string) => {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
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

/* -------------------------------- locale & BRL -------------------------------- */
export const ptBR = _ptBR;
export const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/* ----------------------------------- STATUS ----------------------------------- */
export const ALL_STATUSES = ["confirmed", "pending", "cancelled", "completed", "no_show"] as const;
export type StatusKey = (typeof ALL_STATUSES)[number];

export const statusLabel = (s: StatusKey) =>
  s === "confirmed" ? "Confirmado"
  : s === "pending" ? "Pendente"
  : s === "cancelled" ? "Cancelado"
  : s === "completed" ? "Concluído"
  : "Não compareceu";

export const statusIcon = (s: StatusKey) =>
  s === "confirmed" ? CheckCircle2
  : s === "pending" ? Clock
  : s === "cancelled" ? Ban
  : s === "completed" ? CheckCheck
  : EyeOff;

export function statusStyles(status: StatusKey) {
  switch (status) {
    case "confirmed": return { badge: "bg-green-100/80 dark:bg-green-900/40 text-green-950 dark:text-green-100 border-green-300/70 dark:border-green-800/60", dot: "bg-green-500" };
    case "pending":   return { badge: "bg-amber-100/80 dark:bg-amber-900/40 text-amber-950 dark:text-amber-100 border-amber-300/70 dark:border-amber-800/60", dot: "bg-amber-500" };
    case "cancelled": return { badge: "bg-rose-100/80  dark:bg-rose-900/40  text-rose-950  dark:text-rose-100  border-rose-300/70  dark:border-rose-800/60", dot: "bg-rose-500" };
    case "completed": return { badge: "bg-indigo-100/80 dark:bg-indigo-900/40 text-indigo-950 dark:text-indigo-100 border-indigo-300/70 dark:border-indigo-800/60", dot: "bg-indigo-500" };
    case "no_show":   return { badge: "bg-slate-100/80  dark:bg-slate-800/60  text-slate-900  dark:text-slate-100  border-slate-300/70  dark:border-slate-700", dot: "bg-slate-500" };
  }
}

/* ------------------------------------ TYPES ------------------------------------ */
export type UiAppointment = {
  id: string;
  date: Date;                 // zoned (client TZ)
  time: string;               // HH:mm
  client: string;
  phone?: string | null;      // <- adicionamos telefone
  service: string;
  duration: number;           // minutos
  price: number;              // em BRL
  status: StatusKey;
  team_member?: string | null;
  team_member_id?: string | null;
  team_member_avatar?: string | null; // profile_pic
};

/* ----------------------------------- helpers ----------------------------------- */
export const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map((n) => parseInt(n, 10));
  return (Number.isNaN(h) ? 0 : h) * 60 + (Number.isNaN(m) ? 0 : m);
};

export const minToHHMM = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export const sameDay = (a: Date, b: Date) =>
  new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime() ===
  new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();

/** Parse "HH:mm" (ou "HH:mm:ss") para minutos; retorna null se inválido. */
export const parseHH = (t?: string | null): number | null => {
  if (!t) return null;
  const parts = t.split(":");
  const H = parseInt(parts[0] ?? "", 10);
  const M = parseInt(parts[1] ?? "0", 10);
  if (Number.isNaN(H)) return null;
  return H * 60 + (Number.isNaN(M) ? 0 : M);
};

/** Máscara simples para números BR (10/11 dígitos). */
export const formatPhoneBR = (raw?: string | null) => {
  const d = (raw || "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  if (d.length > 2)   return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return d;
};

/* -------------------------------- bookingToUi ---------------------------------- */
export function bookingToUi(b: any, tz: string): UiAppointment {
  const start = new Date(b.start_ts);
  const end = new Date(b.end_ts);
  const zonedStart = utcToZonedTime(start, tz);

  const rawDur = differenceInMinutes(end, start);
  const duration = Math.max(1, Number.isFinite(rawDur) ? rawDur : 30);

  const client =
    (typeof b.customer_name === "string" && b.customer_name.trim()) ||
    (typeof b.customer_phone === "string" && b.customer_phone.trim()) ||
    "Cliente";

  return {
    id: b.booking_id,
    date: zonedStart,
    time: formatInTimeZone(start, tz, "HH:mm"),
    client,
    phone: b.customer_phone ?? null,
    service: b.service_name || "Serviço",
    duration,
    price: (b.price_cents ?? 0) / 100,
    status: b.status as any,
    team_member: b.team_member_name ?? null,
    team_member_id: b.team_member_id ?? null,
    team_member_avatar: b.team_member_avatar ?? null,
  };
}
