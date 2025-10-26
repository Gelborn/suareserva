// src/pages/Dashboard.tsx
import React from "react";
import { Link } from "react-router-dom";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useBusiness } from "../../hooks/useBusiness";
import { useAuth } from "../../contexts/AuthContext";
import { useIsPWA } from "../../hooks/usePWA";
import { useIsSmallScreen } from "../../hooks/useMediaQuery";
import { supabase } from "../../lib/supabase";
import {
  addDays,
  addMonths,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  subMonths,
  subDays,
  isSameDay,
  format as formatDate,
} from "date-fns";
import { utcToZonedTime, zonedTimeToUtc, ptBR } from "../../components/agenda/shared";

/* -------------------------------- helpers -------------------------------- */
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatPhoneBR(phone?: string | null) {
  if (!phone) return "";
  const p = phone.replace(/\D/g, "");
  if (p.length === 11) return `(${p.slice(0, 2)}) ${p.slice(2, 7)}-${p.slice(7)}`;
  if (p.length === 10) return `(${p.slice(0, 2)}) ${p.slice(2, 6)}-${p.slice(6)}`;
  return phone;
}
function parseTimeToMinutes(t?: string | null) {
  if (!t) return 0;
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type NextAppt = {
  id: string;
  start_ts: string;
  end_ts: string;
  price_cents: number;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  services?: { name: string; duration_min: number | null };
  team_members?: { full_name: string; profile_pic: string | null };
  customers?: { full_name: string | null; phone: string | null };
};
type Series6M = { label: string; monthKey: string; agendamentos: number; faturamento: number };

/** Card base, com modo compacto para mobile/PWA */
const CardBase: React.FC<React.PropsWithChildren<{ compact?: boolean }>> = ({ compact, children }) => (
  <div
    className={[
      "group bg-white/80 dark:bg-gray-900/60 backdrop-blur-sm",
      compact ? "rounded-xl p-3" : "rounded-2xl p-4 md:p-6",
      "shadow-sm border border-gray-200 dark:border-gray-700",
      "transition-shadow hover:shadow-md",
    ].join(" ")}
  >
    {children}
  </div>
);

const LS_KEY = "sr.displayName";

const Dashboard: React.FC = () => {
  const { business, loading: businessLoading } = useBusiness();
  const { user } = useAuth();

  const isPWA = useIsPWA();
  const isSmall = useIsSmallScreen(1024);
  const isMobileLike = isSmall; // mobile & PWA
  const dockPad = isPWA && isSmall ? "calc(96px + env(safe-area-inset-bottom, 0px))" : "0px";

  const tz = business?.timezone || "America/Sao_Paulo";

  // nome estável p/ header
  const [displayName, setDisplayName] = React.useState<string>(() => {
    const fromLS = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    return fromLS || user?.name || "";
  });
  React.useEffect(() => {
    if (business?.name) {
      setDisplayName(business.name);
      try { localStorage.setItem(LS_KEY, business.name); } catch {}
      return;
    }
    if (!businessLoading && !business?.name && user?.name && !displayName) {
      setDisplayName(user.name);
      try { localStorage.setItem(LS_KEY, user.name); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.name, businessLoading, user?.name]);

  /* --------------------------- onboarding check --------------------------- */
  const [hasActiveStore, setHasActiveStore] = React.useState<boolean>(true);
  const [hasActiveTeam, setHasActiveTeam] = React.useState<boolean>(true);
  const [metaLoading, setMetaLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    const run = async () => {
      if (!business?.id) return;
      setMetaLoading(true);
      try {
        const { data: stores } = await supabase.from("stores").select("id").eq("business_id", business.id);
        setHasActiveStore((stores?.length || 0) > 0);

        const { data: team } = await supabase
          .from("team_members")
          .select("id")
          .eq("business_id", business.id)
          .eq("is_active", true);
        setHasActiveTeam((team?.length || 0) > 0);
      } catch (e) {
        console.error("[dashboard meta] ", e);
      } finally {
        setMetaLoading(false);
      }
    };
    run();
  }, [business?.id]);

  /* --------------------------------- metrics --------------------------------- */
  const [loading, setLoading] = React.useState<boolean>(true);

  // cards
  const [mtdRevenue, setMtdRevenue] = React.useState<number>(0);
  const [mtdAppointments, setMtdAppointments] = React.useState<number>(0);
  const [todayAppointments, setTodayAppointments] = React.useState<number>(0);
  const [todayConfirmed, setTodayConfirmed] = React.useState<number>(0);
  const [occupancyRate, setOccupancyRate] = React.useState<number>(0);
  const [activeClientsMonth, setActiveClientsMonth] = React.useState<number>(0);
  const [activeClientsPrevMonth, setActiveClientsPrevMonth] = React.useState<number>(0);

  // séries (6 meses) e próximos
  const [series6M, setSeries6M] = React.useState<Series6M[]>([]);
  const [upcoming, setUpcoming] = React.useState<NextAppt[]>([]);

  React.useEffect(() => {
    const run = async () => {
      if (!business?.id) return;
      setLoading(true);
      try {
        const now = new Date();
        const nowZ = utcToZonedTime(now, tz);

        const todayStartZ = startOfDay(nowZ);
        const todayEndZ = endOfDay(nowZ);

        const monthStartZ = startOfMonth(nowZ);
        const prevMonthStartZ = startOfMonth(subMonths(nowZ, 1));
        const prevMonthEndZ = endOfMonth(subMonths(nowZ, 1));

        // para gráficos (6 meses)
        const sixStartZ = startOfMonth(subMonths(nowZ, 5));
        const sixEndZ = endOfMonth(nowZ);

        // últimos 7 dias (para lista a gente já fazia filtros; mantemos série somente para charts 6M agora)
        const future30EndZ = endOfDay(addDays(nowZ, 30));

        const todayStartUTC = zonedTimeToUtc(todayStartZ, tz).toISOString();
        const todayEndUTC = zonedTimeToUtc(todayEndZ, tz).toISOString();

        const monthStartUTC = zonedTimeToUtc(monthStartZ, tz).toISOString();
        const prevMonthStartUTC = zonedTimeToUtc(prevMonthStartZ, tz).toISOString();
        const prevMonthEndUTC = zonedTimeToUtc(prevMonthEndZ, tz).toISOString();

        const sixStartUTC = zonedTimeToUtc(sixStartZ, tz).toISOString();
        const sixEndUTC = zonedTimeToUtc(sixEndZ, tz).toISOString();

        const future30EndUTC = zonedTimeToUtc(future30EndZ, tz).toISOString();

        const allowed = ["pending", "confirmed", "completed"]; // exclui cancelados/no_show

        // Hoje
        const { data: todayRows, error: todayErr } = await supabase
          .from("bookings")
          .select("id,status,price_cents,start_ts")
          .eq("business_id", business.id)
          .gte("start_ts", todayStartUTC)
          .lte("start_ts", todayEndUTC)
          .in("status", allowed);
        if (todayErr) throw todayErr;

        const totalToday = todayRows?.length || 0;
        const confirmedToday = (todayRows || []).filter((r) => r.status === "confirmed").length;

        // MTD (cards)
        const { data: monthRows, error: monthErr } = await supabase
          .from("bookings")
          .select("start_ts,end_ts,status,price_cents,customer_id")
          .eq("business_id", business.id)
          .gte("start_ts", monthStartUTC)
          .lte("start_ts", todayEndUTC)
          .in("status", allowed);
        if (monthErr) throw monthErr;

        const mtdAppts = (monthRows || []).length;
        const mtdRev = (monthRows || []).reduce((acc, r) => acc + (r.price_cents || 0), 0) / 100;

        // Clientes ativos: mês atual e mês anterior (distintos)
        const customersThisMonth = new Set((monthRows || []).map((r) => r.customer_id));
        const { data: prevRows, error: prevErr } = await supabase
          .from("bookings")
          .select("customer_id,status,start_ts")
          .eq("business_id", business.id)
          .gte("start_ts", prevMonthStartUTC)
          .lte("start_ts", prevMonthEndUTC)
          .in("status", allowed);
        if (prevErr) throw prevErr;
        const customersPrevMonth = new Set((prevRows || []).map((r) => r.customer_id));

        // Ocupação (média mês): minutos agendados / minutos abertos
        const bookedMin = (monthRows || []).reduce((acc, r) => {
          const start = new Date(r.start_ts).getTime();
          const end = new Date(r.end_ts).getTime();
          const mins = Math.max(0, Math.round((end - start) / 60000));
          return acc + mins;
        }, 0);
        const { data: stores, error: storesErr } = await supabase
          .from("stores")
          .select("id")
          .eq("business_id", business.id);
        if (storesErr) throw storesErr;
        const storeIds = (stores || []).map((s) => s.id);
        let openMinutesMTD = 0;
        if (storeIds.length > 0) {
          const { data: hours, error: hoursErr } = await supabase
            .from("store_hours")
            .select("store_id,day_of_week,open_time,close_time,is_closed")
            .in("store_id", storeIds);
          if (hoursErr) throw hoursErr;

          const daysInRange = eachDayOfInterval({ start: monthStartZ, end: todayEndZ });
          const hoursByStore = new Map<string, any[]>();
          for (const h of hours || []) {
            const arr = hoursByStore.get(h.store_id) || [];
            arr.push(h);
            hoursByStore.set(h.store_id, arr);
          }
          for (const day of daysInRange) {
            const dow = day.getDay(); // 0..6
            for (const sid of storeIds) {
              const rows = (hoursByStore.get(sid) || []).filter((h) => h.day_of_week === dow);
              if (!rows.length) continue;
              for (const r of rows) {
                if (r.is_closed) continue;
                const openMin = parseTimeToMinutes(r.open_time);
                const closeMin = parseTimeToMinutes(r.close_time);
                const diff = Math.max(0, closeMin - openMin);
                openMinutesMTD += diff;
              }
            }
          }
        }
        const occ = openMinutesMTD > 0 ? Math.round((bookedMin / openMinutesMTD) * 100) : 0;

        // Série 6 meses (agendamentos + faturamento por mês)
        const { data: sixRows, error: sixErr } = await supabase
          .from("bookings")
          .select("id,status,price_cents,start_ts")
          .eq("business_id", business.id)
          .gte("start_ts", sixStartUTC)
          .lte("start_ts", sixEndUTC)
          .in("status", allowed);
        if (sixErr) throw sixErr;

        const months: Date[] = Array.from({ length: 6 }, (_, i) => addMonths(sixStartZ, i));
        const s6: Series6M[] = months.map((m) => {
          const monthKey = formatDate(m, "yyyy-MM");
          const labelRaw = formatDate(m, "LLL/yy", { locale: ptBR }); // ex: set/25
          const label = capitalize(labelRaw);
          const filtered = (sixRows || []).filter((r) => {
            const z = utcToZonedTime(new Date(r.start_ts), tz);
            return formatDate(z, "yyyy-MM") === monthKey;
          });
          const ag = filtered.length;
          const fat = filtered.reduce((acc, r) => acc + (r.price_cents || 0), 0) / 100;
          return { label, monthKey, agendamentos: ag, faturamento: fat };
        });

        // Próximos 7 (até +30 dias)
        const { data: nextRows, error: nextErr } = await supabase
          .from("bookings")
          .select(
            `
            id,
            start_ts,
            end_ts,
            price_cents,
            status,
            services ( name, duration_min ),
            team_members ( full_name, profile_pic ),
            customers ( full_name, phone )
          `
          )
          .eq("business_id", business.id)
          .gte("start_ts", new Date().toISOString())
          .lte("start_ts", future30EndUTC)
          .in("status", allowed)
          .order("start_ts", { ascending: true })
          .limit(30);
        if (nextErr) throw nextErr;

        const next7 = (nextRows || []).slice(0, 7);

        // set states
        setTodayAppointments(totalToday);
        setTodayConfirmed(confirmedToday);
        setMtdAppointments(mtdAppts);
        setMtdRevenue(mtdRev);
        setActiveClientsMonth(customersThisMonth.size);
        setActiveClientsPrevMonth(customersPrevMonth.size);
        setOccupancyRate(occ);
        setSeries6M(s6);
        setUpcoming(next7 as any);
      } catch (e) {
        console.error("[dashboard load] ", e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [business?.id, tz]);

  /* --------------------------------- UI --------------------------------- */
  const skeleton = <span className="inline-block h-5 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />;
  const showOnboarding = !metaLoading && (!hasActiveStore || !hasActiveTeam);

  // Texto amigável para “Hoje / Amanhã / Dia da semana, dia N às HH:mm”
  const fmtApptWhen = (zDate: Date) => {
    const nowZ = utcToZonedTime(new Date(), tz);
    const time = formatDate(zDate, "HH:mm");
    if (isSameDay(zDate, nowZ)) return `Hoje às ${time}`;
    if (isSameDay(zDate, addDays(nowZ, 1))) return `Amanhã às ${time}`;
    const week = capitalize(formatDate(zDate, "EEEE", { locale: ptBR })); // Quarta
    const dayN = formatDate(zDate, "d"); // 7
    return `${week}, dia ${dayN} às ${time}`;
  };

  return (
    <div className="space-y-6 md:space-y-8" style={{ paddingBottom: dockPad }}>
      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white">
          {displayName ? (
            <>
              Olá,{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-fuchsia-400">
                {displayName}
              </span>
            </>
          ) : businessLoading ? (
            <span className="inline-block h-6 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          ) : (
            "Dashboard"
          )}
        </h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">
          {showOnboarding ? "Bem-vindo! Vamos colocar sua operação no ar." : "Aqui está um resumo do seu negócio hoje."}
        </p>
      </div>

      {/* Empty state guiado */}
      {showOnboarding ? (
        <CardBase>
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
                Comece em 2 passos
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Para liberar a agenda e os relatórios, você precisa:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Passo 1
                </div>
                <h3 className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {hasActiveStore ? "Loja ativa" : "Crie/ative sua loja"}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Defina endereço, horários e preferências de atendimento.
                </p>
                {!hasActiveStore && (
                  <Link
                    to="/lojas"
                    className="mt-3 inline-flex items-center justify-center px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium hover:bg-white/70 dark:hover:bg-gray-900/70"
                  >
                    Ir para Lojas
                  </Link>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Passo 2
                </div>
                <h3 className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {hasActiveTeam ? "Time configurado" : "Adicione alguém do time"}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Cadastre pelo menos um profissional que realizará os serviços.
                </p>
                {!hasActiveTeam && (
                  <Link
                    to="/equipe"
                    className="mt-3 inline-flex items-center justify-center px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium hover:bg-white/70 dark:hover/bg-gray-900/70"
                  >
                    Ir para Equipe
                  </Link>
                )}
              </div>
            </div>
          </div>
        </CardBase>
      ) : null}

      {/* Stats Cards */}
      {!showOnboarding && (
        <div
          className={[
            "grid gap-4 md:gap-6",
            isMobileLike ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
          ].join(" ")}
        >
          {/* Faturamento estimado (mês atual) */}
          <CardBase compact={isMobileLike}>
            <div className="flex flex-col gap-1">
              <p className="text-[11px] md:text-xs font-medium text-gray-600 dark:text-gray-400">
                Faturamento estimado
              </p>
              <p className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {loading ? skeleton : BRL.format(mtdRevenue)}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Mês atual</p>
            </div>
          </CardBase>

          {/* Agendamentos no mês */}
          <CardBase compact={isMobileLike}>
            <div className="flex flex-col gap-1">
              <p className="text-[11px] md:text-xs font-medium text-gray-600 dark:text-gray-400">
                Agendamentos no mês
              </p>
            <p className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {loading ? skeleton : mtdAppointments}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {loading ? "" : `${todayAppointments} agendamentos hoje (${todayConfirmed} confirmados)`}
              </p>
            </div>
          </CardBase>

          {/* Taxa de Ocupação */}
          <CardBase compact={isMobileLike}>
            <div className="flex flex-col gap-1">
              <p className="text-[11px] md:text-xs font-medium text-gray-600 dark:text-gray-400">
                Taxa de Ocupação
              </p>
              <p className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {loading ? skeleton : `${occupancyRate}%`}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Média do mês
              </p>
            </div>
          </CardBase>

          {/* Clientes ativos este mês */}
          <CardBase compact={isMobileLike}>
            <div className="flex flex-col gap-1">
              <p className="text-[11px] md:text-xs font-medium text-gray-600 dark:text-gray-400">
                Clientes ativos este mês
              </p>
              <p className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {loading ? skeleton : activeClientsMonth}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {loading ? "" : `vs ${activeClientsPrevMonth} clientes no último mês`}
              </p>
            </div>
          </CardBase>
        </div>
      )}

      {/* Charts — escondidos no mobile & PWA e no empty state */}
      {!isMobileLike && !showOnboarding && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <CardBase>
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Agendamentos (6 meses)</h3>
              <div className="text-xs text-gray-500 dark:text-gray-400">Últimos 6 meses</div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={series6M}>
                <CartesianGrid strokeDasharray="3 3" stroke="#64748B" opacity={0.18} />
                <XAxis dataKey="label" stroke="#94A3B8" fontSize={12} tickMargin={8} />
                <YAxis stroke="#94A3B8" fontSize={12} tickMargin={8} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(2,6,23,0.9)",
                    border: "1px solid rgba(148,163,184,0.35)",
                    borderRadius: 10,
                    color: "#F8FAFC",
                  }}
                  formatter={(val) => [val as number, "Agendamentos"]}
                />
                <Bar dataKey="agendamentos" fill="#6366F1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBase>

          <CardBase>
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Faturamento (6 meses)</h3>
              <div className="text-xs text-gray-500 dark:text-gray-400">Últimos 6 meses</div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={series6M}>
                <CartesianGrid strokeDasharray="3 3" stroke="#64748B" opacity={0.18} />
                <XAxis dataKey="label" stroke="#94A3B8" fontSize={12} tickMargin={8} />
                <YAxis stroke="#94A3B8" fontSize={12} tickMargin={8} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(2,6,23,0.9)",
                    border: "1px solid rgba(148,163,184,0.35)",
                    borderRadius: 10,
                    color: "#F8FAFC",
                  }}
                  formatter={(val) => [BRL.format(Number(val)), "Faturamento"]}
                />
                <Bar dataKey="faturamento" fill="#10B981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBase>
        </div>
      )}

      {/* Próximos agendamentos */}
      {!showOnboarding && (
        <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
              Próximos Agendamentos
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Até 30 dias à frente • mostrando os próximos 7</p>
          </div>

          <div className="p-4 md:p-6">
            {loading ? (
              <div className="space-y-3 md:space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-60" />
                Nenhum agendamento futuro encontrado.
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {/* Cabeçalho (desktop) */}
                <div className="hidden md:grid grid-cols-[220px_1fr_1fr_240px] gap-4 px-2 text-xs font-semibold text-gray-500">
                  <div>Data e hora</div>
                  <div>Dados do cliente</div>
                  <div>Serviço e valor</div>
                  <div>Atendente</div>
                </div>

                {upcoming.map((a) => {
                  const zStart = utcToZonedTime(new Date(a.start_ts), tz);
                  const when = fmtApptWhen(zStart);
                  const provName = a.team_members?.full_name || "Profissional";
                  const provPic = a.team_members?.profile_pic || null;
                  const custName = a.customers?.full_name || "Cliente";
                  const custPhone = formatPhoneBR(a.customers?.phone || "");
                  const service = a.services?.name || "Serviço";
                  const price = BRL.format((a.price_cents || 0) / 100);

                  return (
                    <div key={a.id} className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 md:p-4">
                      {/* Mobile layout */}
                      <div className="md:hidden space-y-2">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {when}
                        </div>

                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {custName}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {custPhone}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-800 dark:text-gray-200 truncate">
                            {service}
                          </div>
                          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {price}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          {provPic ? (
                            <img src={provPic} alt={provName} className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50" />
                          )}
                          <div className="text-xs text-gray-700 dark:text-gray-300">{provName}</div>
                        </div>
                      </div>

                      {/* Desktop layout */}
                      <div className="hidden md:grid grid-cols-[220px_1fr_1fr_240px] gap-4 items-center">
                        {/* Data e hora */}
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {when}
                        </div>

                        {/* Dados do cliente */}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{custName}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{custPhone}</div>
                        </div>

                        {/* Serviço e valor (juntos) */}
                        <div className="min-w-0">
                          <div className="text-sm text-gray-800 dark:text-gray-200 truncate">
                            <span className="truncate">{service}</span>
                            <span className="mx-1.5 opacity-60">·</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{price}</span>
                          </div>
                        </div>

                        {/* Atendente */}
                        <div className="flex items-center gap-3 justify-end md:justify-start">
                          {provPic ? (
                            <img src={provPic} alt={provName} className="h-9 w-9 rounded-full object-cover" />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50" />
                          )}
                          <div className="text-sm text-gray-800 dark:text-gray-200">{provName}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 md:mt-6 text-center">
              <Link
                to="/agenda"
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
              >
                Ver todos os agendamentos →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
