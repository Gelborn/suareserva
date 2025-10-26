// src/components/agenda/CalendarViews.tsx
import React, { useMemo } from "react";
import {
  BRL,
  statusLabel,
  statusIcon,
  statusStyles,
  timeToMinutes,
  sameDay,
  minToHHMM,
  formatInTimeZone,
  ptBR,
  UiAppointment,
  utcToZonedTime,
  formatPhoneBR,
} from "./shared";
import { Clock, User, Phone } from "lucide-react";

/* --------------------------------- Consts --------------------------------- */
const ROW_H = 80; // px por hora (base)

/* --------------------------------- Avatar --------------------------------- */
function initials(name?: string | null) {
  if (!name) return "P";
  const parts = (name || "").split(" ").filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[parts.length - 1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

const Avatar: React.FC<{ url?: string | null; name?: string | null; size?: number }> = ({
  url,
  name,
  size = 18,
}) => {
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

/* ------------------------------- Card Shell ------------------------------- */
export const CardShell: React.FC<React.PropsWithChildren<{ className?: string }>> = ({
  className = "",
  children,
}) => (
  <div className={`bg-white/95 dark:bg-gray-900/70 backdrop-blur border border-gray-200/70 dark:border-gray-800/70 rounded-2xl shadow-sm ${className}`}>
    {children}
  </div>
);

/* ------------------------------- Empty Day -------------------------------- */
export const EmptyDay: React.FC<{ label?: string }> = ({ label = "Sem agendamentos" }) => (
  <div className="text-center text-gray-500 dark:text-gray-500 py-10">
    <Clock className="h-8 w-8 mx-auto mb-2 opacity-60" />
    <p className="text-sm">{label}</p>
  </div>
);

/* ------------------------------ SkeletonLine ------------------------------ */
export const SkeletonLine: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse rounded-md bg-gray-200/70 dark:bg-gray-800/70 h-10 ${className}`} />
);

/* -------------------------------- StatCard -------------------------------- */
const toneStyles: Record<string, { bg: string; iconWrap: string; text: string }> = {
  blue: {
    bg: "from-blue-50/70 via-white to-white dark:from-blue-950/20 dark:via-gray-900 dark:to-gray-900",
    iconWrap: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    text: "text-blue-700 dark:text-blue-300",
  },
  green: {
    bg: "from-emerald-50/70 via-white to-white dark:from-emerald-950/20 dark:via-gray-900 dark:to-gray-900",
    iconWrap: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  purple: {
    bg: "from-violet-50/70 via-white to-white dark:from-violet-950/20 dark:via-gray-900 dark:to-gray-900",
    iconWrap: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
    text: "text-violet-700 dark:text-violet-300",
  },
};

export const StatCard: React.FC<{
  title: string;
  value: string;
  caption?: string;
  icon: React.ReactNode;
  tone?: keyof typeof toneStyles;
  loading?: boolean;
}> = ({ title, value, caption, icon, tone = "blue", loading }) => {
  const t = toneStyles[tone] ?? toneStyles.blue;
  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-gray-800 p-5 bg-gradient-to-b ${t.bg} shadow-sm`}>
      {loading ? (
        <div className="space-y-3">
          <SkeletonLine className="h-3 w-24" />
          <SkeletonLine className="h-7 w-20" />
          <SkeletonLine className="h-3 w-28" />
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-800 dark:text-gray-400">{title}</p>
            <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{value}</p>
            {caption && <p className={`text-sm mt-0.5 ${t.text}`}>{caption}</p>}
          </div>
          <div className={`p-3 rounded-full ${t.iconWrap}`}>{icon}</div>
        </div>
      )}
    </div>
  );
};

/* ----------------------------- AppointmentCard ---------------------------- */
export const AppointmentCard: React.FC<{
  a: UiAppointment;
  onClick?: (a: UiAppointment) => void;
  hideStatus?: boolean;
}> = ({ a, onClick, hideStatus = false }) => {
  const s = statusStyles(a.status);
  const Icon = statusIcon(a.status);
  return (
    <div className="group w-full h-full">
      <button
        onClick={() => onClick?.(a)}
        className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${s.badge} hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer`}
      >
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{a.time}</span>
          </div>
          {!hideStatus && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide bg-white/50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100">
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              <Icon className="h-3.5 w-3.5" />
              {statusLabel(a.status)}
            </span>
          )}
        </div>

        {/* Nome completo + telefone (com máscara) */}
        <div className="flex items-center flex-wrap gap-1.5 text-gray-900 dark:text-gray-100">
          <User className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium">{a.client}</span>
          {a.client && a.phone ? <span className="opacity-60">·</span> : null}
          {a.phone ? (
            <>
              <Phone className="h-3 w-3 shrink-0" />
              <span className="tabular-nums">{formatPhoneBR(a.phone)}</span>
            </>
          ) : null}
        </div>

        <div className="text-[11px] opacity-80 min-w-0 truncate text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mt-1">
          <span className="truncate">
            {a.service}
            {a.team_member ? ` · ${a.team_member}` : ""}
          </span>
          <Avatar url={a.team_member_avatar} name={a.team_member} size={16} />
        </div>

        <div className="flex items-center justify-between mt-2 text-gray-800 dark:text-gray-200">
          <span className="text-[11px] opacity-80">{a.duration} min</span>
          <span className="font-semibold">{BRL.format(a.price)}</span>
        </div>
      </button>
    </div>
  );
};

/* -------------------------------- DayTimeline ------------------------------ */
export const DayTimeline: React.FC<{
  date: Date; // zoned
  appointments: UiAppointment[];
  loading?: boolean;
  tz: string;
  openMin: number;
  closeMin: number;
  isClosed: boolean;
  onOpen: (a: UiAppointment) => void;
}> = ({ date, appointments, loading, tz, openMin, closeMin, isClosed, onOpen }) => {
  const defaultStart = openMin ?? 8 * 60;
  const defaultEnd = closeMin ?? 20 * 60;
  const mins = appointments.map((a) => timeToMinutes(a.time));
  const ends = appointments.map((a) => timeToMinutes(a.time) + (a.duration || 30));
  const rangeStartMin = Math.floor(
    (Math.min(defaultStart, mins.length ? Math.min(...mins) : defaultStart) - 60) / 60
  ) * 60;
  const rangeEndMin = Math.ceil(
    (Math.max(defaultEnd, ends.length ? Math.max(...ends) : defaultEnd) + 60) / 60
  ) * 60;

  // escala por densidade (leve)
  const densityScale = React.useMemo(() => {
    if (appointments.length < 2) return 1;
    const starts = appointments.map((a) => timeToMinutes(a.time)).sort((a, b) => a - b);
    let minGap = Infinity;
    for (let i = 1; i < starts.length; i++) minGap = Math.min(minGap, starts[i] - starts[i - 1]);
    if (!isFinite(minGap) || minGap >= 20) return 1;
    const scale = 20 / Math.max(5, minGap);
    return Math.min(1.6, Math.max(1, scale));
  }, [appointments]);

  const rowH = ROW_H * densityScale;

  const hoursList: number[] = React.useMemo(() => {
    const arr: number[] = [];
    for (let m = Math.max(0, rangeStartMin); m <= Math.min(24 * 60, rangeEndMin); m += 60) arr.push(m);
    return arr;
  }, [rangeStartMin, rangeEndMin]);

  const totalMinutes = Math.max(60, rangeEndMin - rangeStartMin);
  const baseTotalHeight = hoursList.length * rowH;
  const pxPerMin = baseTotalHeight / totalMinutes;

  // anti-overlap robusto
  type Placement = { id: string; top: number; height: number; baseTop: number; end: number };
  const GAP = 8;            // px de respiro maior
  const MIN_CARD_H = 56;    // altura mínima maior

  const placements: Placement[] = React.useMemo(() => {
    const base = appointments.map((a) => {
      const startMin = timeToMinutes(a.time);
      const baseTop = (startMin - rangeStartMin) * pxPerMin;
      const height = Math.max(MIN_CARD_H, (a.duration || 30) * pxPerMin);
      return { id: a.id, baseTop, height };
    }).sort((x, y) => x.baseTop - y.baseTop || x.height - y.height);

    const active: Placement[] = [];
    const out: Placement[] = [];

    for (const e of base) {
      for (let i = active.length - 1; i >= 0; i--) {
        if (active[i].end + GAP <= e.baseTop) active.splice(i, 1);
      }
      let top = e.baseTop;
      if (active.length) {
        const maxEnd = Math.max(...active.map((p) => p.end));
        if (top < maxEnd + GAP) top = maxEnd + GAP;
      }
      const placed: Placement = { id: e.id, baseTop: e.baseTop, top, height: e.height, end: top + e.height };
      out.push(placed);
      active.push(placed);
    }
    return out;
  }, [appointments, pxPerMin, rangeStartMin]);

  // estende última linha se precisar
  const maxBottom = placements.length ? Math.max(...placements.map((p) => p.end)) : 0;
  const extraBottom = Math.max(0, maxBottom - baseTotalHeight);

  // linha de "agora" em px
  const nowZ = utcToZonedTime(new Date(), tz);
  const isToday = sameDay(nowZ, date);
  const nowMin = nowZ.getHours() * 60 + nowZ.getMinutes();
  const nowPx = (nowMin - rangeStartMin) * pxPerMin;
  const showNow = isToday && nowMin >= rangeStartMin && nowMin <= rangeEndMin;

  return (
    <CardShell>
      <div className="p-0">
        {/* Header do dia */}
        <div className="flex items-center justify-between px-4 md:px-5 pt-4 pb-3">
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-300 uppercase tracking-wide">
            {formatInTimeZone(date, tz, "EEEE", { locale: ptBR as any })}
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {formatInTimeZone(date, tz, "d MMM", { locale: ptBR as any })}
          </div>
        </div>

        {isClosed && appointments.length === 0 ? (
          <EmptyDay label="Loja fechada" />
        ) : loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonLine key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-[64px_1fr]">{/* 64px pra coluna de horas respirar junto */}
            {/* Coluna: horários */}
            <div className="border-t border-gray-200 dark:border-gray-800">
              {hoursList.map((m, idx) => {
                const isLast = idx === hoursList.length - 1;
                return (
                  <div
                    key={m}
                    className="flex items-start justify-end pr-3 text-xs text-gray-500 dark:text-gray-400 relative"
                    style={{ height: `${rowH + (isLast ? extraBottom : 0)}px` }}
                  >
                    <span className="translate-y-[-8px] tabular-nums">{minToHHMM(m)}</span>
                  </div>
                );
              })}
            </div>

            {/* Coluna: canvas */}
            <div className="relative border-t border-l border-gray-200 dark:border-gray-800 overflow-hidden">
              {/* linhas da grade */}
              {hoursList.map((m, idx) => {
                const isLast = idx === hoursList.length - 1;
                return (
                  <div
                    key={m}
                    className="border-b border-gray-200/70 dark:border-gray-800/70"
                    style={{ height: `${rowH + (isLast ? extraBottom : 0)}px` }}
                  />
                );
              })}

              {/* agora */}
              {showNow && (
                <div
                  className="absolute left-0 right-0 flex items-center pointer-events-none"
                  style={{ top: `${Math.max(0, Math.min(baseTotalHeight + extraBottom, nowPx))}px` }}
                >
                  <div className="w-2 h-2 rounded-full bg-rose-500 translate-y-[-1px]" />
                  <div className="h-[2px] flex-1 bg-rose-500/80" />
                </div>
              )}

              {/* cards */}
              <div className="absolute inset-0">
                {appointments.map((a) => {
                  const p = placements.find((x) => x.id === a.id);
                  if (!p) return null;
                  return (
                    <div
                      key={a.id}
                      className="absolute left-2 right-2 md:left-3 md:right-3"
                      style={{ top: p.top, height: p.height }}
                    >
                      <AppointmentCard a={a} onClick={onOpen} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </CardShell>
  );
};

/* --------------------------------- WeekGrid -------------------------------- */
export const WeekGrid: React.FC<{
  weekDays: Date[];
  weekAppointments: UiAppointment[];
  loading?: boolean;
  tz: string;
  onOpen: (a: UiAppointment) => void;
}> = ({ weekDays, weekAppointments, loading, tz, onOpen }) => {
  const todayZ = utcToZonedTime(new Date(), tz);

  return (
    <>
      <div className="hidden md:block">
        <CardShell className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className="p-3.5 text-center border-r border-gray-200/70 dark:border-gray-800/70 last:border-r-0"
              >
                <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  {formatInTimeZone(day, tz, "EEE", { locale: ptBR as any })}
                </div>
                <div
                  className={`text-2xl font-extrabold mt-0.5 ${
                    sameDay(day, todayZ) ? "text-indigo-500 dark:text-indigo-300" : "text-gray-900 dark:text-white"
                  }`}
                >
                  {formatInTimeZone(day, tz, "d", { locale: ptBR as any })}
                </div>
                {sameDay(day, todayZ) && <div className="mx-auto mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500/80" />}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="p-4 grid grid-cols-7 gap-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  {Array.from({ length: 3 }).map((__, j) => (
                    <SkeletonLine key={j} />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 max-h-[70vh] overflow-y-auto">
              {weekDays.map((day) => {
                const items = weekAppointments.filter((a) => sameDay(a.date, day));
                return (
                  <div
                    key={day.toISOString()}
                    className="p-2.5 border-r border-gray-200/70 dark:border-gray-800/70 last:border-r-0 min-h-[280px] space-y-2"
                  >
                    {items.length === 0 ? (
                      <EmptyDay label="—" />
                    ) : (
                      items.map((a) => <AppointmentCard key={a.id} a={a} onClick={onOpen} hideStatus />)
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardShell>
      </div>

      {/* Mobile: semana escondida */}
      <div className="md:hidden">
        {loading ? (
          <CardShell>
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonLine key={i} />
              ))}
            </div>
          </CardShell>
        ) : (
          <CardShell>
            <div className="p-4 text-center text-sm text-gray-600 dark:text-gray-300">
              Altere para “Dia” para ver detalhes
            </div>
          </CardShell>
        )}
      </div>
    </>
  );
};
