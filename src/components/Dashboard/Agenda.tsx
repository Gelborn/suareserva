// src/pages/Agenda.tsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Sparkles, User
} from "lucide-react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import { useBusiness } from "../../hooks/useBusiness";
import { useStore, useStores } from "../../hooks/useStores";
import {
  format, addDays, startOfWeek, endOfWeek, isWithinInterval,
  startOfDay, endOfDay, getDay,
} from "date-fns";
import { DayTimeline, WeekGrid, StatCard } from "../../components/agenda/CalendarViews";
import {
  ptBR, formatInTimeZone, utcToZonedTime, zonedTimeToUtc,
  BRL, parseHH, sameDay, timeToMinutes, bookingToUi, UiAppointment,
  ALL_STATUSES, StatusKey, statusLabel, statusIcon
} from "../../components/agenda/shared";
import { AppointmentModal } from "../../components/agenda/AppointmentModal";
import { SelectBox, Option } from "../../components/agenda/SelectBox";

/* ---------------------------- labels de período ---------------------------- */
const DAY_LABEL = (d: Date, tz?: string) =>
  tz ? formatInTimeZone(d, tz, "EEEE, d 'de' MMM yyyy", { locale: ptBR as any })
     : format(d, "EEEE, d 'de' MMM yyyy", { locale: ptBR });

const RANGE_LABEL = (start: Date, end: Date, tz?: string) =>
  tz
    ? `${formatInTimeZone(start, tz, "d MMM", { locale: ptBR as any })} – ${formatInTimeZone(end, tz, "d MMM yyyy", { locale: ptBR as any })}`
    : `${format(start, "d MMM", { locale: ptBR })} – ${format(end, "d MMM yyyy", { locale: ptBR })}`;

/* -------------------------------- data hook -------------------------------- */
function useAgendaData(storeId?: string, tz?: string) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [services, setServices] = useState<Array<{ id: string; name: string }>>([]);
  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([]);

  const refresh = useCallback(async () => {
    const sid = storeId;
    const zone = tz || "America/Sao_Paulo";
    if (!sid) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const session = sessionRes?.session;
      if (!session) {
        toast.error("Faça login para acessar a agenda");
        setRows([]);
        return;
      }

      const todayZ = utcToZonedTime(new Date(), zone);
      const fromZ = startOfDay(addDays(todayZ, -7));  // << 7 dias atrás
      const toZ = endOfDay(addDays(todayZ, 30));      // << +30 dias
      const fromUTC = zonedTimeToUtc(fromZ, zone).toISOString();
      const toUTC = zonedTimeToUtc(toZ, zone).toISOString();

      // invoke (c/ fallback)
      let data: any | null = null;
      try {
        const { data: invData, error: invErr } = await supabase.functions.invoke("app/store-schedule", {
          body: { storeId: sid, from: fromUTC, to: toUTC, statuses: ["pending","confirmed","cancelled","completed","no_show"] },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (invErr) throw invErr;
        data = invData;
      } catch {
        const supabaseUrl = (supabase as any)?._context?.url ?? (import.meta as any)?.env?.VITE_SUPABASE_URL;
        const anonKey = (supabase as any)?._context?.anonKey ?? (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY;
        const endpoint = `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/app/store-schedule`;
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ storeId: sid, from: fromUTC, to: toUTC, statuses: ["pending","confirmed","cancelled","completed","no_show"] }),
        });
        if (!resp.ok) throw new Error(`Edge fetch failed (${resp.status})`);
        data = await resp.json();
      }

      setRows((data?.bookings ?? []) as any[]);

      // listas auxiliares
      const { data: svcRows } = await supabase
        .from("services").select("id, name")
        .eq("store_id", sid).eq("is_active", true).order("name");

      const { data: tmRows } = await supabase
        .from("team_members").select("id, full_name")
        .eq("store_id", sid).eq("is_active", true).order("full_name");

      setServices((svcRows ?? []).map((s: any) => ({ id: s.id, name: s.name })));
      setProviders((tmRows ?? []).map((m: any) => ({ id: m.id, name: m.full_name })));
    } catch (e) {
      console.error("[Agenda] fetch error", e);
      toast.error("Não foi possível carregar agendamentos");
    } finally {
      setLoading(false);
    }
  }, [storeId, tz]);

  useEffect(() => { refresh(); }, [refresh]);

  return { loading, rows, services, providers, refresh };
}

/* ---------------------------------- página ---------------------------------- */

const Agenda: React.FC = () => {
  const { storeId: routeStoreId } = useParams<{ storeId: string }>();
  const { business } = useBusiness();

  // lojas do business + store selecionada
  const { stores, isActive, loading: loadingStores } = useStores(business?.id);
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>(routeStoreId);

  useEffect(() => {
    if (routeStoreId) {
      setSelectedStoreId(routeStoreId);
      try { localStorage.setItem("agenda:lastStoreId", routeStoreId); } catch {}
      return;
    }
    if (loadingStores) return;

    const last = (() => { try { return localStorage.getItem("agenda:lastStoreId") || undefined; } catch { return undefined; } })();
    const lastExists = last && stores.find(s => s.id === last);
    const active = stores.find(s => isActive(s.id));
    const fallback = lastExists?.id || active?.id || stores[0]?.id;
    setSelectedStoreId(fallback);
    try { if (fallback) localStorage.setItem("agenda:lastStoreId", fallback); } catch {}
  }, [routeStoreId, loadingStores, stores, isActive]);

  const { store, hours } = useStore(selectedStoreId, business?.id);
  const tz = store?.timezone || "America/Sao_Paulo";
  const slotMin = store?.slot_duration_min || 30;

  // dados
  const { loading, rows, services, providers, refresh } = useAgendaData(selectedStoreId, tz);

  // realtime bookings (atualiza ao vivo)
  useEffect(() => {
    if (!selectedStoreId) return;
    const ch = supabase
      .channel(`bookings:${selectedStoreId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `store_id=eq.${selectedStoreId}` },
        () => refresh()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedStoreId, refresh]);

  // refresh ao voltar p/ aba
  useEffect(() => {
    const onVis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refresh]);

  // view & navegação
  const [view, setView] = useState<"day" | "week">("day");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => { if (!e.matches) setView("day"); };
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

  // filtros (um profissional obrigatório)
  const [statusFilter, setStatusFilter] = useState<StatusKey | "all">("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");

  // modal
  const [modal, setModal] = useState<{ open: boolean; a: UiAppointment | null }>({ open: false, a: null });

  // adapta rows
  const adapted: UiAppointment[] = useMemo(() => (rows as any[]).map((b) => bookingToUi(b, tz)), [rows, tz]);

  // escolhe profissional padrão (mais próximo a partir de agora)
  useEffect(() => {
    if (!providers.length) return;
    if (providerFilter !== "all") return;

    const nameToId = new Map(providers.map((p) => [p.name, p.id] as const));
    const now = new Date().getTime();
    let bestId: string | undefined;
    let bestTs = Number.POSITIVE_INFINITY;

    for (const a of adapted) {
      const pid = a.team_member ? nameToId.get(a.team_member) : undefined;
      if (!pid) continue;
      const ts = a.date.getTime();
      if (ts >= now && ts < bestTs) {
        bestTs = ts;
        bestId = pid;
      }
    }

    const fallback = bestId ?? providers[0]?.id;
    if (fallback) setProviderFilter(fallback);
  }, [providers, adapted, providerFilter]);

  const filtered = useMemo(() => {
    return adapted.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (serviceFilter !== "all" && a.service !== services.find((s) => s.id === serviceFilter)?.name) return false;
      if (providerFilter !== "all" && a.team_member !== providers.find((p) => p.id === providerFilter)?.name) return false;
      return true;
    });
  }, [adapted, statusFilter, serviceFilter, providerFilter, services, providers]);

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
      ? formatInTimeZone(currentDate, tz, "EEE", { locale: ptBR as any })
      : `${formatInTimeZone(weekStartZ, tz, "EEE dd", { locale: ptBR as any })} – ${formatInTimeZone(weekEndZ, tz, "EEE dd", { locale: ptBR as any })}`;

  // hours do dia selecionado
  const dayOfWeek = (getDay(utcToZonedTime(currentDate, tz)) + 0) % 7;
  const todayHours = (hours || []).find((h) => h.day_of_week === dayOfWeek);
  const openMin = parseHH(todayHours?.open_time) ?? 8 * 60;
  const closeMin = parseHH(todayHours?.close_time) ?? 20 * 60;
  const isClosed = !!todayHours?.is_closed || openMin >= closeMin;

  /* ------------------------------ mutations ------------------------------ */
  const updateStatus = useCallback(
    async (bookingId: string, next: StatusKey) => {
      try {
        const { error } = await supabase.from("bookings").update({ status: next }).eq("id", bookingId);
        if (error) throw error;
        toast.success(
          next === "confirmed" ? "Agendamento confirmado"
            : next === "cancelled" ? "Agendamento cancelado"
            : next === "completed" ? "Marcado como concluído"
            : next === "no_show" ? "Marcado como não compareceu"
            : "Voltado para pendente"
        );
        await refresh();
      } catch (e) {
        console.error(e);
        toast.error("Falha ao atualizar status");
      }
    },
    [refresh]
  );

  /* -------------------------------- options UI -------------------------------- */
  const storeOptions: Option[] = stores.map((s) => ({ value: s.id, label: `${s.name}${isActive(s.id) ? "" : " (inativa)"}` }));
  const serviceOptions: Option[] = [{ value: "all", label: "Todos os serviços" }, ...services.map((s) => ({ value: s.id, label: s.name }))];
  const providerOptions: Option[] = providers.map((p) => ({ value: p.id, label: p.name }));

  const statusFilterOptions: Option<(StatusKey | "all")>[] = ["all", ...ALL_STATUSES].map((s) => ({
    value: s,
    label: s === "all" ? "Todos os status" : statusLabel(s as StatusKey),
    icon: s === "all" ? null : React.createElement(statusIcon(s as StatusKey), { className: "h-4 w-4" }),
  }));

  /* -------------------------------- render -------------------------------- */
  if (!loadingStores && stores.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-6 bg-white/95 dark:bg-gray-900/70">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nenhuma loja encontrada</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">Crie uma loja para começar a usar a agenda.</p>
        </div>
      </div>
    );
  }

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
                {subCaption}{store ? ` · ${store.name}` : ""}
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 w-full md:w-auto">
              <div className="flex flex-wrap items-center gap-2 w/full md:w-auto">
                {/* seletor de loja */}
                {stores.length > 0 && (
                  <SelectBox
                    aria-label="Selecionar loja"
                    value={(selectedStoreId ?? "") as string}
                    onChange={(id) => {
                      const next = id || undefined;
                      setSelectedStoreId(next);
                      try { if (next) localStorage.setItem("agenda:lastStoreId", next); } catch {}
                    }}
                    options={storeOptions}
                    className="min-w-[220px]"
                  />
                )}

                {/* Mobile: dropdown de status */}
                <div className="md:hidden w-full">
                  <SelectBox
                    aria-label="Filtrar status"
                    value={statusFilter}
                    onChange={(v) => setStatusFilter(v)}
                    options={statusFilterOptions}
                  />
                </div>

                {/* Desktop: segmentado de status (mantido) */}
                <div className="hidden md:inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/70 p-1">
                  {(["all", ...ALL_STATUSES] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        statusFilter === s
                          ? "bg-gray-900/90 dark:bg-white/10 text-white"
                          : "text-gray-900 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
                      }`}
                      aria-pressed={statusFilter === s}
                      title={s === "all" ? "Todos os status" : statusLabel(s as StatusKey)}
                    >
                      {s === "all" ? "Todos" : statusLabel(s as StatusKey)}
                    </button>
                  ))}
                </div>

                {/* serviço */}
                {services.length > 0 && (
                  <SelectBox
                    aria-label="Filtrar serviço"
                    value={serviceFilter}
                    onChange={(v) => setServiceFilter(v)}
                    options={serviceOptions}
                    className="min-w-[200px]"
                  />
                )}

                {/* profissional (obrigatório) */}
                {providers.length > 0 && (
                  <SelectBox
                    aria-label="Selecionar profissional"
                    value={providerFilter === "all" ? (providers[0]?.id ?? "") : providerFilter}
                    onChange={(v) => setProviderFilter(v || "all")}
                    options={providerOptions}
                    className="min-w-[220px]"
                  />
                )}
              </div>

              {/* segmented view (desktop) */}
              <div className="hidden md:inline-flex p-1 rounded-xl bg-gray-100/80 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setView("day")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    view === "day" ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-900 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
                  }`}
                  aria-pressed={view === "day"}
                >
                  Dia
                </button>
                <button
                  onClick={() => setView("week")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    view === "week" ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-900 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
                  }`}
                  aria-pressed={view === "week"}
                >
                  Semana
                </button>
              </div>

              {/* navegação */}
              <div className="flex items-center gap-2">
                <button onClick={goPrev} className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-900 transition-colors" aria-label={view === "day" ? "Dia anterior" : "Semana anterior"}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={goToday} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-900 text-sm font-medium">
                  Hoje
                </button>
                <button onClick={goNext} className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-900 transition-colors" aria-label={view === "day" ? "Próximo dia" : "Próxima semana"}>
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
          caption={view === "day" ? formatInTimeZone(currentDate, tz, "EEE, d MMM", { locale: ptBR as any }) : RANGE_LABEL(weekStartZ, weekEndZ, tz)}
          icon={<CalendarIcon className="h-6 w-6" />}
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
          icon={<Clock className="h-6 w-6" />}
          tone="purple"
        />
      </div>

      {/* Modal */}
      <AppointmentModal
        open={modal.open}
        onClose={() => setModal({ open: false, a: null })}
        appointment={modal.a}
        tz={tz}
        onUpdateStatus={updateStatus}
      />

      {/* PWA safe-area */}
      <div className="md:hidden" style={{ height: "calc(env(safe-area-inset-bottom, 16px) + 24px)" }} />
    </div>
  );
};

export default Agenda;
