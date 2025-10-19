import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  DollarSign,
  Sparkles,
  Filter,
  X,
  CheckCircle2,
  Ban,
  CheckCheck,
  EyeOff,
  RotateCcw,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import { useBusiness } from "../../hooks/useBusiness";
import { useStore } from "../../hooks/useStores";
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isWithinInterval,
  startOfDay,
  endOfDay,
  getDay,
  differenceInMinutes,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Listbox, Transition } from "@headlessui/react";

/* ----------------------- date-fns-tz compat CJS/ESM ----------------------- */
import * as dateFnsTz from "date-fns-tz";
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
const utcToZonedTime = (date: Date, timeZone: string) =>
  tzHas("utcToZonedTime") ? _tz.utcToZonedTime(date, timeZone) : new Date(date.getTime() + tzOffset(date, timeZone));
const zonedTimeToUtc = (date: Date, timeZone: string) =>
  tzHas("zonedTimeToUtc") ? _tz.zonedTimeToUtc(date, timeZone) : new Date(date.getTime() - tzOffset(date, timeZone));
const formatInTimeZone = (date: Date, timeZone: string, fmt: string, opts?: any) =>
  tzHas("formatInTimeZone")
    ? _tz.formatInTimeZone(date, timeZone, fmt, opts)
    : format(utcToZonedTime(date, timeZone), fmt, opts);

/* --------------------------------- helpers -------------------------------- */
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const sameDay = (a: Date, b: Date) => isSameDay(startOfDay(a), startOfDay(b));
const minToHHMM = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const parseHH = (t?: string | null) => {
  if (!t) return null;
  const [H, M] = t.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(H)) return null;
  return H * 60 + (Number.isNaN(M) ? 0 : M);
};

/* ---------------------------------- status -------------------------------- */
const ALL_STATUSES = ["confirmed", "pending", "cancelled", "completed", "no_show"] as const;
type StatusKey = (typeof ALL_STATUSES)[number];

const statusLabel = (s: StatusKey) =>
  s === "confirmed"
    ? "Confirmado"
    : s === "pending"
    ? "Pendente"
    : s === "cancelled"
    ? "Cancelado"
    : s === "completed"
    ? "Concluído"
    : "Não compareceu";

const statusIcon = (s: StatusKey) =>
  s === "confirmed" ? CheckCircle2 : s === "pending" ? Clock : s === "cancelled" ? Ban : s === "completed" ? CheckCheck : EyeOff;

function statusStyles(status: StatusKey) {
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

/* ---------------------------------- types --------------------------------- */
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

/* -------- adapter para o shape de app/store-schedule (RPC + enrichment) --- */
function bookingToUi(b: any, tz: string): UiAppointment {
  const start = new Date(b.start_ts);
  const end = new Date(b.end_ts);
  const zonedStart = utcToZonedTime(start, tz);
  const duration = differenceInMinutes(end, start);
  return {
    id: b.booking_id,
    date: zonedStart,
    time: formatInTimeZone(start, tz, "HH:mm"),
    client: b.customer_phone || "Cliente",
    service: b.service_name || "Serviço",
    duration: duration > 0 ? duration : 30,
    price: (b.price_cents ?? 0) / 100,
    status: b.status as StatusKey,
    team_member: b.team_member_name ?? null,
  };
}

/* --------------------------------- data hook ------------------------------- */
/** Busca TODOS os status, em um range de 30 dias para frente (a partir de hoje),
 * e deixa a filtragem apenas no client.
 */
function useAgendaData(storeId?: string, businessId?: string, tz?: string) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [services, setServices] = useState<Array<{ id: string; name: string }>>([]);
  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([]);

  const refresh = useCallback(async () => {
    if (!storeId || !tz) return;
    setLoading(true);
    try {
      const todayZ = utcToZonedTime(new Date(), tz);
      const fromZ = startOfDay(todayZ);
      const toZ = endOfDay(addDays(todayZ, 30));
      const fromUTC = zonedTimeToUtc(fromZ, tz).toISOString();
      const toUTC = zonedTimeToUtc(toZ, tz).toISOString();

      // chama a Edge Function que valida acesso e chama o RPC com service_role
      const { data, error } = await supabase.functions.invoke("app/store-schedule", {
        body: {
          storeId,
          from: fromUTC,
          to: toUTC,
          statuses: ["pending", "confirmed", "cancelled", "completed", "no_show"], // TODOS
        },
      });
      if (error) throw error;

      setRows((data?.bookings ?? []) as any[]);

      // listas auxiliares pra filtros
      const { data: svcRows } = await supabase
        .from("services")
        .select("id, name")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("name");

      const { data: tmRows } = await supabase
        .from("team_members")
        .select("id, full_name")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("full_name");

      setServices((svcRows ?? []).map((s: any) => ({ id: s.id, name: s.name })));
      setProviders((tmRows ?? []).map((m: any) => ({ id: m.id, name: m.full_name })));
    } catch (e: any) {
      console.error(e);
      toast.error("Não foi possível carregar agendamentos");
    } finally {
      setLoading(false);
    }
  }, [storeId, tz]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loading, rows, services, providers, refresh };
}

/* ---------------------------------- Agenda -------------------------------- */
const DAY_LABEL = (d: Date, tz?: string) =>
  tz
    ? formatInTimeZone(d, tz, "EEEE, d 'de' MMM yyyy", { locale: ptBR as any } as any)
    : format(d, "EEEE, d 'de' MMM yyyy", { locale: ptBR });

const RANGE_LABEL = (start: Date, end: Date, tz?: string) =>
  tz
    ? `${formatInTimeZone(start, tz, "d MMM", { locale: ptBR as any } as any)} – ${formatInTimeZone(
        end,
        tz,
        "d MMM yyyy",
        { locale: ptBR as any } as any
      )}`
    : `${format(start, "d MMM", { locale: ptBR })} – ${format(end, "d MMM yyyy", { locale: ptBR })}`;

const ROW_H = 56; // px per hour

const Agenda: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const { business } = useBusiness();
  const { store, hours } = useStore(storeId, business?.id);

  const tz = store?.timezone || "America/Sao_Paulo";
  const slotMin = store?.slot_duration_min || 30;

  // DIA default (bloqueia "semana" no mobile como antes)
  const [view, setView] = useState<"day" | "week">("day");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => {
      if (!e.matches) setView("day");
    };
    if (!mq.matches) setView("day");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const goPrev = () => setCurrentDate((prev) => addDays(prev, view === "day" ? -1 : -7));
  const goNext = () => setCurrentDate((prev) => addDays(prev, view === "day" ? 1 : 7));
  const goToday = () => setCurrentDate(utcToZonedTime(new Date(), tz));

  const weekStartZ = useMemo(
    () => startOfWeek(utcToZonedTime(currentDate, tz), { weekStartsOn: 1 }),
    [currentDate, tz]
  );
  const weekEndZ = useMemo(
    () => endOfWeek(utcToZonedTime(currentDate, tz), { weekStartsOn: 1 }),
    [currentDate, tz]
  );
  const weekDaysZ = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStartZ, i)), [weekStartZ]);

  // carrega TUDO (30 dias, todos status) uma vez e filtra local
  const { loading, rows, services, providers, refresh } = useAgendaData(storeId, business?.id, tz);

  // filtros client-side
  const [statusFilter, setStatusFilter] = useState<StatusKey | "all">("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");

  // modal
  const [modal, setModal] = useState<{ open: boolean; a: UiAppointment | null }>({ open: false, a: null });

  const adapted: UiAppointment[] = useMemo(
    () => (rows as any[]).map((b) => bookingToUi(b, tz)),
    [rows, tz]
  );

  // aplica filtros
  const filtered = useMemo(() => {
    return adapted.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (serviceFilter !== "all" && a.service !== services.find((s) => s.id === serviceFilter)?.name) return false;
      if (providerFilter !== "all" && a.team_member !== providers.find((p) => p.id === providerFilter)?.name) return false;
      return true;
    });
  }, [adapted, statusFilter, serviceFilter, providerFilter, services, providers]);

  // subset pra dia/semana
  const dayAppointments: UiAppointment[] = useMemo(
    () =>
      filtered
        .filter((a) => sameDay(a.date, utcToZonedTime(currentDate, tz)))
        .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)),
    [filtered, currentDate, tz]
  );

  const weekAppointments: UiAppointment[] = useMemo(() => {
    const interval = { start: startOfDay(weekStartZ), end: endOfDay(weekEndZ) };
    return filtered
      .filter((a) => isWithinInterval(a.date, interval))
      .sort((a, b) => a.date.getTime() - b.date.getTime() || timeToMinutes(a.time) - timeToMinutes(b.time));
  }, [filtered, weekStartZ, weekEndZ]);

  const visibleAppointments = view === "day" ? dayAppointments : weekAppointments;

  const stats = useMemo(() => {
    const total = visibleAppointments.length;
    const confirmed = visibleAppointments.filter((a) => a.status === "confirmed").length;
    const revenue = visibleAppointments.reduce((acc, a) => acc + (a.price || 0), 0);
    return { total, confirmed, rate: total ? Math.round((confirmed / total) * 100) : 0, revenue };
  }, [visibleAppointments]);

  const periodTitle = view === "day" ? DAY_LABEL(currentDate, tz) : RANGE_LABEL(weekStartZ, weekEndZ, tz);
  const subCaption =
    view === "day"
      ? formatInTimeZone(currentDate, tz, "EEE", { locale: ptBR as any } as any)
      : `${formatInTimeZone(weekStartZ, tz, "EEE dd", { locale: ptBR as any } as any)} – ${formatInTimeZone(
          weekEndZ,
          tz,
          "EEE dd",
          { locale: ptBR as any } as any
        )}`;

  // hours do dia atual
  const dayOfWeek = (getDay(utcToZonedTime(currentDate, tz)) + 0) % 7;
  const todayHours = hours.find((h) => h.day_of_week === dayOfWeek);
  const openMin = parseHH(todayHours?.open_time) ?? 8 * 60;
  const closeMin = parseHH(todayHours?.close_time) ?? 20 * 60;
  const isClosed = !!todayHours?.is_closed || openMin >= closeMin;

  /* ------------------------------- mutations ------------------------------ */
  const updateStatus = useCallback(
    async (bookingId: string, next: StatusKey) => {
      try {
        const { error } = await supabase.from("bookings").update({ status: next }).eq("id", bookingId);
        if (error) throw error;
        toast.success(
          next === "confirmed"
            ? "Agendamento confirmado"
            : next === "cancelled"
            ? "Agendamento cancelado"
            : next === "completed"
            ? "Marcado como concluído"
            : next === "no_show"
            ? "Marcado como não compareceu"
            : "Voltado para pendente"
        );
        await refresh();
      } catch (e: any) {
        console.error(e);
        toast.error("Falha ao atualizar status");
      }
    },
    [refresh]
  );

  const updateTime = useCallback(
    async (a: UiAppointment, newStartZoned: Date, durationMin: number) => {
      try {
        const startUtc = zonedTimeToUtc(newStartZoned, tz);
        const endUtc = new Date(startUtc.getTime() + durationMin * 60_000);
        const { error } = await supabase
          .from("bookings")
          .update({ start_ts: startUtc.toISOString(), end_ts: endUtc.toISOString() })
          .eq("id", a.id);
        if (error) throw error;
        toast.success(`Reagendado para ${formatInTimeZone(newStartZoned, tz, "HH:mm")}`);
        await refresh();
      } catch (e: any) {
        console.error(e);
        toast.error("Falha ao salvar horário");
      }
    },
    [tz, refresh]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative rounded-2xl border border-gray-200/60 dark:border-gray-800/60">
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/40 dark:via-gray-950 dark:to-purple-950/30" />
        </div>
        <div className="relative p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 mb-1">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wide font-semibold">Sua Agenda</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white truncate">
                {periodTitle}
              </h1>
              <p className="text-sm text-gray-800/80 dark:text-gray-300 mt-1">
                {subCaption}
                {store ? ` · ${store.name}` : ""}
              </p>
            </div>

            <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 w-full md:w-auto">
              {/* filtros */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Mobile: dropdown de status */}
                <div className="md:hidden w-full">
                  <StatusFilterDropdown value={statusFilter} onChange={(v) => setStatusFilter(v)} />
                </div>

                {/* Desktop: segmentado de status */}
                <div className="hidden md:inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/70 p-1">
                  {(["all", ...ALL_STATUSES] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        statusFilter === s
                          ? "bg-gray-900/90 dark:bg-white/10 text-white dark:text-white"
                          : "text-gray-900 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
                      }`}
                      aria-pressed={statusFilter === s}
                      title={s === "all" ? "Todos os status" : statusLabel(s as StatusKey)}
                    >
                      {s === "all" ? "Todos" : statusLabel(s as StatusKey)}
                    </button>
                  ))}
                </div>

                {services.length > 0 && (
                  <div className="relative">
                    <select
                      value={serviceFilter}
                      onChange={(e) => setServiceFilter(e.target.value)}
                      className="appearance-none pr-8 pl-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 text-sm text-gray-900 dark:text-gray-100"
                    >
                      <option value="all">Todos os serviços</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <Filter className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-300 pointer-events-none" />
                  </div>
                )}

                {providers.length > 0 && (
                  <div className="relative">
                    <select
                      value={providerFilter}
                      onChange={(e) => setProviderFilter(e.target.value)}
                      className="appearance-none pr-8 pl-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 text-sm text-gray-900 dark:text-gray-100"
                    >
                      <option value="all">Qualquer profissional</option>
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <User className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-300 pointer-events-none" />
                  </div>
                )}
              </div>

              {/* segment view (desktop) */}
              <div className="hidden md:inline-flex p-1 rounded-xl bg-gray-100/80 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setView("day")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                    view === "day"
                      ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-900 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
                  }`}
                  aria-pressed={view === "day"}
                >
                  Dia
                </button>
                <button
                  onClick={() => setView("week")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                    view === "week"
                      ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-900 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
                  }`}
                  aria-pressed={view === "week"}
                >
                  Semana
                </button>
              </div>

              {/* navegação */}
              <div className="flex items-center gap-2">
                <button
                  onClick={goPrev}
                  className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-900 transition-colors"
                  aria-label={view === "day" ? "Dia anterior" : "Semana anterior"}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={goToday}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-900 text-sm font-medium"
                >
                  Hoje
                </button>
                <button
                  onClick={goNext}
                  className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-900 transition-colors"
                  aria-label={view === "day" ? "Próximo dia" : "Próxima semana"}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      {view === "day" ? (
        <DayTimeline
          date={utcToZonedTime(currentDate, tz)}
          appointments={dayAppointments}
          loading={loading}
          tz={tz}
          openMin={openMin}
          closeMin={closeMin}
          isClosed={isClosed}
          onOpen={(a) => setModal({ open: true, a })}
        />
      ) : (
        <WeekGrid
          weekDays={weekDaysZ}
          weekAppointments={weekAppointments}
          loading={loading}
          tz={tz}
          onOpen={(a) => setModal({ open: true, a })}
        />
      )}

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <StatCard
          loading={loading}
          title={view === "day" ? "Agendamentos (dia)" : "Agendamentos (semana)"}
          value={String(stats.total)}
          caption={
            view === "day"
              ? formatInTimeZone(currentDate, tz, "EEE, d MMM", { locale: ptBR as any } as any)
              : RANGE_LABEL(weekStartZ, weekEndZ, tz)
          }
          icon={<Calendar className="h-6 w-6" />}
          tone="blue"
        />

        <StatCard
          loading={loading}
          title="Confirmados"
          value={String(stats.confirmed)}
          caption={`${stats.rate}% confirmação`}
          icon={<User className="h-6 w-6" />}
          tone="green"
        />

        <StatCard
          loading={loading}
          title="Receita estimada"
          value={BRL.format(stats.revenue)}
          caption={view === "day" ? "no dia" : "na semana"}
          icon={<DollarSign className="h-6 w-6" />}
          tone="purple"
        />
      </div>

      {/* Modal de detalhes/ações */}
      <AppointmentModal
        open={modal.open}
        onClose={() => setModal({ open: false, a: null })}
        appointment={modal.a}
        tz={tz}
        slotMin={slotMin}
        onUpdateStatus={updateStatus}
        onSaveTime={async (a, hhmm, durationMin) => {
          const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
          const base = utcToZonedTime(currentDate, tz);
          const newStartZoned = new Date(base);
          newStartZoned.setHours(h, m, 0, 0);
          await updateTime(a, newStartZoned, durationMin);
        }}
      />

      {/* PWA safe-area */}
      <div className="md:hidden" style={{ height: "calc(env(safe-area-inset-bottom, 16px) + 24px)" }} />
    </div>
  );
};

export default Agenda;

/* ----------------------------- SUB-COMPONENTES ---------------------------- */

const CardShell: React.FC<React.PropsWithChildren<{ className?: string }>> = ({
  className = "",
  children,
}) => (
  <div className={`bg-white/95 dark:bg-gray-900/70 backdrop-blur border border-gray-200/70 dark:border-gray-800/70 rounded-2xl shadow-sm ${className}`}>
    {children}
  </div>
);

const EmptyDay: React.FC<{ label?: string }> = ({ label = "Sem agendamentos" }) => (
  <div className="text-center text-gray-500 dark:text-gray-500 py-10">
    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-60" />
    <p className="text-sm">{label}</p>
  </div>
);

const AppointmentCard: React.FC<{ a: UiAppointment; onClick?: (a: UiAppointment) => void }> = ({ a, onClick }) => {
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide bg-white/50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100">
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
            <Icon className="h-3.5 w-3.5" />
            {statusLabel(a.status)}
          </span>
        </div>

        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 text-gray-900 dark:text-gray-100">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium truncate">{a.client}</span>
          </div>
          <div className="text-[11px] opacity-80 min-w-0 truncate text-gray-700 dark:text-gray-300">
            {a.service}
            {a.team_member ? ` · ${a.team_member}` : ""}
          </div>
          <div className="flex items-center justify-between mt-2 text-gray-800 dark:text-gray-200">
            <span className="text-[11px] opacity-80">{a.duration} min</span>
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="font-semibold">{BRL.format(a.price)}</span>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
};

/* -------- StatusFilterDropdown (MOBILE, header) -------- */
const StatusFilterDropdown: React.FC<{
  value: StatusKey | "all";
  onChange: (next: StatusKey | "all") => void;
}> = ({ value, onChange }) => {
  const options: Array<StatusKey | "all"> = ["all", ...ALL_STATUSES];
  const CurrentIcon = value === "all" ? Filter : statusIcon(value as StatusKey);

  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative w-full">
        <Listbox.Button
          className="relative w-full cursor-pointer rounded-xl border border-gray-300 dark:border-gray-700 bg.white/80 dark:bg-gray-900/80 py-2 pl-3 pr-9 text-left text-sm text-gray-900 dark:text-gray-100"
          aria-label="Filtrar status"
        >
          <span className="flex items-center gap-2">
            <CurrentIcon className="h-4 w-4" />
            {value === "all" ? "Todos os status" : statusLabel(value as StatusKey)}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <ChevronsUpDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </span>
        </Listbox.Button>
        <Transition leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
          <Listbox.Options className="absolute z-[70] mt-1 max-h-60 w-full overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg focus:outline-none">
            {options.map((opt) => {
              const Icon = opt === "all" ? Filter : statusIcon(opt as StatusKey);
              return (
                <Listbox.Option
                  key={opt}
                  value={opt}
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
                        {opt === "all" ? "Todos os status" : statusLabel(opt as StatusKey)}
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

/* --------------------------------- DAY VIEW -------------------------------- */
const DayTimeline: React.FC<{
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
  const rangeStartMin = Math.floor((Math.min(defaultStart, mins.length ? Math.min(...mins) : defaultStart) - 60) / 60) * 60;
  const rangeEndMin = Math.ceil((Math.max(defaultEnd, ends.length ? Math.max(...ends) : defaultEnd) + 60) / 60) * 60;

  const hoursList: number[] = useMemo(() => {
    const arr: number[] = [];
    for (let m = Math.max(0, rangeStartMin); m <= Math.min(24 * 60, rangeEndMin); m += 60) arr.push(m);
    return arr;
  }, [rangeStartMin, rangeEndMin]);

  const totalMinutes = Math.max(60, rangeEndMin - rangeStartMin);
  const totalHeight = hoursList.length * ROW_H;
  const pxPerMin = totalHeight / totalMinutes;

  const nowZ = utcToZonedTime(new Date(), tz);
  const isToday = sameDay(nowZ, date);
  const nowMin = nowZ.getHours() * 60 + nowZ.getMinutes();
  const nowPct = ((nowMin - rangeStartMin) / totalMinutes) * 100;
  const showNow = isToday && nowMin >= rangeStartMin && nowMin <= rangeEndMin;

  return (
    <CardShell>
      <div className="p-0">
        <div className="flex items-center justify-between px-4 md:px-5 pt-4 pb-3">
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-300 uppercase tracking-wide">
            {formatInTimeZone(date, tz, "EEEE", { locale: ptBR as any } as any)}
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {formatInTimeZone(date, tz, "d MMM", { locale: ptBR as any } as any)}
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
          <div className="grid grid-cols-[56px_1fr]">
            <div className="border-t border-gray-200 dark:border-gray-800">
              {hoursList.map((m) => (
                <div key={m} className="h-14 flex items-start justify-end pr-2 text-xs text-gray-500 dark:text-gray-400 relative">
                  <span className="translate-y-[-8px] tabular-nums">{minToHHMM(m)}</span>
                </div>
              ))}
            </div>

            <div className="relative border-t border-l border-gray-200 dark:border-gray-800 overflow-hidden">
              {hoursList.map((m, idx) => (
                <div key={m} className={`h-14 border-b border-gray-200/70 dark:border-gray-800/70 ${idx === 0 ? "" : ""}`} />
              ))}

              {showNow && (
                <div className="absolute left-0 right-0 flex items-center" style={{ top: `${Math.max(0, Math.min(100, nowPct))}%` }}>
                  <div className="w-2 h-2 rounded-full bg-rose-500 translate-y-[-1px]" />
                  <div className="h-[2px] flex-1 bg-rose-500/80" />
                </div>
              )}

              <div className="absolute inset-0">
                {appointments.map((a) => {
                  const start = timeToMinutes(a.time);
                  const topPx = (start - rangeStartMin) * pxPerMin;
                  const heightPx = Math.max(40, (a.duration / totalMinutes) * totalHeight);
                  return (
                    <div key={a.id} className="absolute left-2 right-2 md:left-3 md:right-3" style={{ top: topPx, height: heightPx }}>
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

/* -------------------------------- WEEK GRID ------------------------------- */
const WeekGrid: React.FC<{
  weekDays: Date[];
  weekAppointments: UiAppointment[];
  loading?: boolean;
  tz: string;
  onOpen: (a: UiAppointment) => void;
}> = ({ weekDays, weekAppointments, loading, tz, onOpen }) => {
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
                  {formatInTimeZone(day, tz, "EEE", { locale: ptBR as any } as any)}
                </div>
                <div
                  className={`text-2xl font-extrabold mt-0.5 ${
                    isSameDay(day, utcToZonedTime(new Date(), tz))
                      ? "text-indigo-500 dark:text-indigo-300"
                      : "text-gray-900 dark:text-white"
                  }`}
                >
                  {formatInTimeZone(day, tz, "d", { locale: ptBR as any } as any)}
                </div>
                {isSameDay(day, utcToZonedTime(new Date(), tz)) && (
                  <div className="mx-auto mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500/80" />
                )}
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
            <div className="grid grid-cols-7">
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
                      items.map((a) => <AppointmentCard key={a.id} a={a} onClick={onOpen} />)
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

/* ------------------------------ STAT CARDS ------------------------------ */
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

const StatCard: React.FC<{
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

/* ------------------------------ SKELETONS ------------------------------ */
const SkeletonLine: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse rounded-md bg-gray-200/70 dark:bg-gray-800/70 h-10 ${className}`} />
);

/* ------------------------------- DIALOGS/MODAL --------------------------- */
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
    tone === "danger"
      ? "bg-rose-600 hover:bg-rose-700 text-white"
      : "bg-indigo-600 hover:bg-indigo-700 text-white";
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 top-20 mx-auto w-[92%] max-w-md">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg.white dark:bg-gray-900 shadow-xl">
          <div className="p-5">
            <h4 className="text-lg font.bold text-gray-900 dark:text-white">{title}</h4>
            {description && (
              <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300">{description}</p>
            )}
            <div className="mt-5 flex items-center justify.end gap-2">
              <button
                onClick={onClose}
                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg.white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
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

const ActionButton: React.FC<React.PropsWithChildren<{ onClick?: () => void; className?: string; title?: string }>> = ({
  onClick,
  className = "",
  title,
  children,
}) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition ${className}`}
    title={title}
  >
    {children}
  </button>
);

// Mobile dropdown de status (no modal)
const StatusPickerMobile: React.FC<{
  current: StatusKey;
  onChange: (next: StatusKey) => void;
}> = ({ current, onChange }) => {
  const options: StatusKey[] = ["pending", "confirmed", "cancelled", "completed", "no_show"];
  const CurrentIcon = statusIcon(current);
  return (
    <Listbox value={current} onChange={(v) => onChange(v)}>
      <div className="relative w.full">
        <Listbox.Button
          className="relative w.full cursor-pointer rounded-xl border border-gray-300 dark:border-gray-700 bg.white/80 dark:bg-gray-900/80 py-2 pl-3 pr-9 text-left text-sm text-gray-900 dark:text-gray-100"
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
          <Listbox.Options className="absolute z-[70] mt-1 max-h-60 w.full overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg.white dark:bg-gray-900 py-1 shadow-lg focus:outline-none">
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

const AppointmentModal: React.FC<{
  open: boolean;
  onClose: () => void;
  appointment: UiAppointment | null;
  tz: string;
  slotMin: number;
  onUpdateStatus: (id: string, next: StatusKey) => void;
  onSaveTime: (a: UiAppointment, hhmm: string, durationMin: number) => void;
}> = ({ open, onClose, appointment, tz, slotMin, onUpdateStatus, onSaveTime }) => {
  const [hhmm, setHhmm] = useState<string>(() => (appointment ? appointment.time : "09:00"));
  const [dur, setDur] = useState<number>(() => appointment?.duration ?? slotMin);

  useEffect(() => {
    setHhmm(appointment?.time ?? "09:00");
    setDur(appointment?.duration ?? slotMin);
  }, [appointment, slotMin]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const [confirm, setConfirm] = useState<{ open: boolean; next: StatusKey | null }>({ open: false, next: null });
  const askConfirm = (next: StatusKey) => setConfirm({ open: true, next });
  const doConfirm = () => {
    if (!appointment || !confirm.next) return;
    onUpdateStatus(appointment.id, confirm.next);
    setConfirm({ open: false, next: null });
  };

  if (!open || !appointment) return null;
  const s = statusStyles(appointment.status);

  const disabled = {
    confirm: appointment.status === "confirmed",
    cancel: appointment.status === "cancelled",
    complete: appointment.status === "completed",
    noShow: appointment.status === "no_show",
  };

  const durationOptions = Array.from({ length: 8 }, (_, i) => (i + 1) * slotMin);

  const confirmCopy = (next: StatusKey) =>
    next === "cancelled"
      ? { title: "Cancelar agendamento?", desc: "Essa ação marca o agendamento como cancelado.", tone: "danger" as const, cta: "Cancelar" }
      : next === "no_show"
      ? { title: "Marcar como 'Não compareceu'?", desc: "O cliente não compareceu ao horário.", tone: "danger" as const, cta: "Marcar" }
      : next === "completed"
      ? { title: "Concluir agendamento?", desc: "Marcar como concluído.", tone: "ok" as const, cta: "Concluir" }
      : next === "confirmed"
      ? { title: "Confirmar agendamento?", desc: "O cliente está confirmado.", tone: "ok" as const, cta: "Confirmar" }
      : { title: "Reabrir como pendente?", desc: "Voltará ao status pendente.", tone: "ok" as const, cta: "Reabrir" };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 top-12 mx-auto w-[95%] max-w-lg">
        <div className={`rounded-2xl border ${s.badge} shadow-xl`}>
          <div className="p-4 md:p-5 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Clock className="h-4 w-4" />
                <span className="font-semibold text-sm">
                  {appointment.time} · {appointment.duration} min
                </span>
              </div>
              <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text.white">{appointment.service}</h3>
              <p className="text-sm text-gray-800 dark:text-gray-200">
                {appointment.client}
                {appointment.team_member ? ` · ${appointment.team_member}` : ""}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/60 dark:hover:bg-gray-800/60"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* edição rápida */}
          <div className="px-4 md:px-5 pb-4 md:pb-5 space-y-3 text-gray-900 dark:text-gray-100">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs block mb-1 opacity-80">Horário</label>
                <input
                  type="time"
                  value={hhmm}
                  onChange={(e) => setHhmm(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg.white/80 dark:bg-gray-900/80"
                />
              </div>
              <div>
                <label className="text-xs block mb-1 opacity-80">Duração</label>
                <select
                  value={dur}
                  onChange={(e) => setDur(parseInt(e.target.value, 10))}
                  className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg.white/80 dark:bg-gray-900/80"
                >
                  {durationOptions.map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </div>
              <ActionButton
                onClick={() => onSaveTime(appointment, hhmm, dur)}
                className="border-gray-300 dark:border-gray-700 bg.white/80 dark:bg-gray-900/80 hover:bg.white dark:hover:bg-gray-900"
                title="Salvar horário"
              >
                Salvar
              </ActionButton>
            </div>

            {/* Status — mobile: dropdown; desktop: botões */}
            <div className="flex flex-col gap-2 pt-2">
              <div className="md:hidden">
                <label className="text-xs block mb-1 opacity-80">Status</label>
                <StatusPickerMobile
                  current={appointment.status}
                  onChange={(next) => {
                    if (next !== appointment.status) {
                      askConfirm(next);
                    }
                  }}
                />
              </div>

              <div className="hidden md:flex flex-wrap items-center gap-2">
                <ActionButton
                  onClick={() => askConfirm("confirmed")}
                  className={`border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/25 text-emerald-800 dark:text-emerald-200 ${
                    disabled.confirm ? "opacity-50 pointer-events-none" : ""
                  }`}
                  title="Confirmar"
                >
                  <CheckCircle2 className="w-4 h-4" /> Confirmar
                </ActionButton>

                <ActionButton
                  onClick={() => askConfirm("cancelled")}
                  className={`border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/25 text-rose-800 dark:text-rose-200 ${
                    disabled.cancel ? "opacity-50 pointer-events-none" : ""
                  }`}
                  title="Cancelar"
                >
                  <Ban className="w-4 h-4" /> Cancelar
                </ActionButton>

                <ActionButton
                  onClick={() => askConfirm("completed")}
                  className={`border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/25 text-indigo-800 dark:text-indigo-200 ${
                    disabled.complete ? "opacity-50 pointer-events-none" : ""
                  }`}
                  title="Concluir"
                >
                  <CheckCheck className="w-4 h-4" /> Concluir
                </ActionButton>

                <ActionButton
                  onClick={() => askConfirm("no_show")}
                  className={`border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/25 text-slate-800 dark:text-slate-200 ${
                    disabled.noShow ? "opacity-50 pointer-events-none" : ""
                  }`}
                  title="Marcar não compareceu"
                >
                  <EyeOff className="w-4 h-4" /> Não compareceu
                </ActionButton>

                {(appointment.status === "cancelled" || appointment.status === "no_show") && (
                  <ActionButton
                    onClick={() => askConfirm("pending")}
                    className="border-gray-300 dark:border-gray-700 bg.white/80 dark:bg-gray-900/80 hover:bg.white dark:hover:bg-gray-900"
                    title="Reabrir como pendente"
                  >
                    <RotateCcw className="w-4 h-4" /> Reabrir
                  </ActionButton>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, next: null })}
        onConfirm={doConfirm}
        title={confirm.next ? confirmCopy(confirm.next).title : "Confirmar?"}
        description={confirm.next ? confirmCopy(confirm.next).desc : undefined}
        confirmLabel={confirm.next ? confirmCopy(confirm.next).cta : "Confirmar"}
        tone={confirm.next ? confirmCopy(confirm.next).tone : "ok"}
      />
    </div>
  );
};
