import React, { useMemo, useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
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
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

/* -------------------------------------------------------------------------- */
/*                                   MOCK                                     */
/* -------------------------------------------------------------------------- */
const mockAppointments = [
  {
    id: 1,
    date: new Date(),
    time: '09:00',
    client: 'João Silva',
    service: 'Corte + Barba',
    duration: 45,
    price: 60,
    status: 'confirmed' as const,
  },
  {
    id: 2,
    date: new Date(),
    time: '10:30',
    client: 'Maria Santos',
    service: 'Manicure',
    duration: 60,
    price: 35,
    status: 'pending' as const,
  },
  {
    id: 3,
    date: addDays(new Date(), 1),
    time: '14:00',
    client: 'Pedro Lima',
    service: 'Corte Simples',
    duration: 30,
    price: 25,
    status: 'confirmed' as const,
  },
];

/* -------------------------------------------------------------------------- */
/*                                 HELPERS                                    */
/* -------------------------------------------------------------------------- */
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const timeToMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

function statusStyles(status: 'confirmed' | 'pending' | 'cancelled' | string) {
  switch (status) {
    case 'confirmed':
      return {
        badge: 'bg-green-100/80 dark:bg-green-900/40 text-green-900 dark:text-green-100 border-green-300/70 dark:border-green-800/60',
        dot: 'bg-green-500',
      };
    case 'pending':
      return {
        badge: 'bg-amber-100/80 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 border-amber-300/70 dark:border-amber-800/60',
        dot: 'bg-amber-500',
      };
    case 'cancelled':
      return {
        badge: 'bg-rose-100/80 dark:bg-rose-900/40 text-rose-900 dark:text-rose-100 border-rose-300/70 dark:border-rose-800/60',
        dot: 'bg-rose-500',
      };
    default:
      return {
        badge: 'bg-gray-100/80 dark:bg-gray-800/60 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700',
        dot: 'bg-gray-400',
      };
  }
}

function sameDay(a: Date, b: Date) {
  return isSameDay(startOfDay(a), startOfDay(b));
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/* -------------------------------------------------------------------------- */
/*                                  COMPONENT                                 */
/* -------------------------------------------------------------------------- */
const DAY_LABEL = (d: Date) =>
  format(d, "EEEE, d 'de' MMM yyyy", { locale: ptBR });

const RANGE_LABEL = (start: Date, end: Date) =>
  `${format(start, 'd MMM', { locale: ptBR })} – ${format(end, "d MMM yyyy", { locale: ptBR })}`;

const ALL_STATUSES = ['confirmed', 'pending', 'cancelled'] as const;

type StatusFilter = typeof ALL_STATUSES[number] | 'all';

const Agenda: React.FC = () => {
  // view & date state
  const [view, setView] = useState<'day' | 'week'>('day'); // default DIA
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // enforce day-only on mobile (hide segmented control)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => { if (!e.matches) setView('day'); };
    if (!mq.matches) setView('day');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');

  // fake loading to demonstrate skeletons on changes
  const [loading, setLoading] = useState(false);
  const triggerLoad = useCallback(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 420);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const cancel = triggerLoad();
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, currentDate, statusFilter, serviceFilter]);

  // mobile: selected day inside the week view
  const [mobileDayIndex, setMobileDayIndex] = useState<number>(() => {
    const dow = (getDay(new Date()) + 6) % 7; // Mon=0
    return dow;
  });

  useEffect(() => {
    if (view === 'week') {
      const dow = (getDay(currentDate) + 6) % 7;
      setMobileDayIndex(dow);
    }
  }, [view, currentDate]);

  // week boundaries
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // handlers
  const goPrev = () => setCurrentDate(prev => addDays(prev, view === 'day' ? -1 : -7));
  const goNext = () => setCurrentDate(prev => addDays(prev, view === 'day' ? 1 : 7));
  const goToday = () => setCurrentDate(new Date());

  // derive services list
  const allServices = useMemo(() => {
    const set = new Set<string>();
    mockAppointments.forEach(a => set.add(a.service));
    return ['all', ...Array.from(set)];
  }, []);

  // apply filters first
  const filtered = useMemo(() => {
    return mockAppointments.filter(a => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (serviceFilter !== 'all' && a.service !== serviceFilter) return false;
      return true;
    });
  }, [statusFilter, serviceFilter]);

  // data per scope
  const dayAppointments = useMemo(() =>
    filtered
      .filter(a => sameDay(a.date, currentDate))
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
  , [filtered, currentDate]);

  const weekAppointments = useMemo(() => {
    const interval = { start: startOfDay(weekStart), end: endOfDay(weekEnd) };
    return filtered
      .filter(a => isWithinInterval(a.date, interval))
      .sort((a, b) => {
        if (!sameDay(a.date, b.date)) return a.date.getTime() - b.date.getTime();
        return timeToMinutes(a.time) - timeToMinutes(b.time);
      });
  }, [filtered, weekStart, weekEnd]);

  const visibleAppointments = view === 'day' ? dayAppointments : weekAppointments;

  // stats
  const stats = useMemo(() => {
    const total = visibleAppointments.length;
    const confirmed = visibleAppointments.filter(a => a.status === 'confirmed').length;
    const revenue = visibleAppointments.reduce((acc, a) => acc + (a.price || 0), 0);
    return {
      total,
      confirmed,
      rate: total ? Math.round((confirmed / total) * 100) : 0,
      revenue,
    };
  }, [visibleAppointments]);

  // formatting labels
  const periodTitle = view === 'day' ? DAY_LABEL(currentDate) : RANGE_LABEL(weekStart, weekEnd);
  const subCaption = view === 'day'
    ? format(currentDate, 'EEE', { locale: ptBR })
    : `${format(weekStart, 'EEE dd', { locale: ptBR })} – ${format(weekEnd, 'EEE dd', { locale: ptBR })}`;

  /* --------------------------------- UI ---------------------------------- */
  return (
    <div className="space-y-6">
      {/* Fancy Header */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/40 dark:via-gray-950 dark:to-purple-950/30 p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 mb-1">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wide font-semibold">SuaReserva · Agenda</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white truncate">
              {periodTitle}
            </h1>
            <p className="text-sm text-gray-800/80 dark:text-gray-300 mt-1">{subCaption}</p>
          </div>

          {/* Controls */}
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 w-full md:w-auto">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/70 p-1">
                {(['all', ...ALL_STATUSES] as StatusFilter[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      statusFilter === s
                        ? 'bg-gray-900/90 dark:bg-white/10 text-white dark:text-white'
                        : 'text-gray-900 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    aria-pressed={statusFilter === s}
                    title={s === 'all' ? 'Todos os status' : s}
                  >
                    {s === 'all' ? 'Todos' : s === 'confirmed' ? 'Confirmados' : s === 'pending' ? 'Pendentes' : 'Cancelados'}
                  </button>
                ))}
              </div>

              <div className="relative">
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="appearance-none pr-8 pl-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 text-sm text-gray-900 dark:text-gray-100"
                >
                  {allServices.map(s => (
                    <option key={s} value={s}>{s === 'all' ? 'Todos os serviços' : s}</option>
                  ))}
                </select>
                <Filter className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-300 pointer-events-none" />
              </div>
            </div>

            {/* Segmented (hidden on mobile) */}
            <div className="hidden md:inline-flex p-1 rounded-xl bg-gray-100/80 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setView('day')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                  view === 'day'
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-900 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white'
                }`}
                aria-pressed={view === 'day'}
              >
                Dia
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                  view === 'week'
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-900 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white'
                }`}
                aria-pressed={view === 'week'}
              >
                Semana
              </button>
            </div>

            {/* Nav */}
            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-900 transition-colors"
                aria-label={view === 'day' ? 'Dia anterior' : 'Semana anterior'}
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
                aria-label={view === 'day' ? 'Próximo dia' : 'Próxima semana'}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      {view === 'day' ? (
        <DayTimeline
          date={currentDate}
          appointments={dayAppointments}
          loading={loading}
        />
      ) : (
        <WeekGrid
          weekDays={weekDays}
          weekAppointments={weekAppointments}
          mobileDayIndex={mobileDayIndex}
          loading={loading}
        />
      )}

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <StatCard
          loading={loading}
          title={view === 'day' ? 'Agendamentos (dia)' : 'Agendamentos (semana)'}
          value={String(stats.total)}
          caption={view === 'day' ? format(currentDate, 'EEE, d MMM', { locale: ptBR }) : RANGE_LABEL(weekStart, weekEnd)}
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
          caption={view === 'day' ? 'no dia' : 'na semana'}
          icon={<DollarSign className="h-6 w-6" />}
          tone="purple"
        />
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                            SUB-COMPONENTS (UI)                              */
/* -------------------------------------------------------------------------- */
const CardShell: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className = '', children }) => (
  <div className={`bg-white/95 dark:bg-gray-900/70 backdrop-blur border border-gray-200/70 dark:border-gray-800/70 rounded-2xl shadow-sm ${className}`}>
    {children}
  </div>
);

const EmptyDay: React.FC<{ label?: string }> = ({ label = 'Sem agendamentos' }) => (
  <div className="text-center text-gray-500 dark:text-gray-500 py-10">
    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-60" />
    <p className="text-sm">{label}</p>
  </div>
);

const AppointmentCard: React.FC<{
  a: typeof mockAppointments[number];
  onClick?: (a: typeof mockAppointments[number]) => void;
}> = ({ a, onClick }) => {
  const s = statusStyles(a.status);
  return (
    <button
      onClick={() => onClick?.(a)}
      className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${s.badge} hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30`}
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{a.time}</span>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide bg-white/50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
          {a.status === 'confirmed' && 'Confirmado'}
          {a.status === 'pending' && 'Pendente'}
          {a.status === 'cancelled' && 'Cancelado'}
          {!(a.status === 'confirmed' || a.status === 'pending' || a.status === 'cancelled') && '—'}
        </span>
      </div>

      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 text-gray-900 dark:text-gray-100">
          <User className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium truncate">{a.client}</span>
        </div>
        <div className="text-[11px] opacity-80 min-w-0 truncate text-gray-700 dark:text-gray-300">
          {a.service}
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
  );
};

/* ------------------------------ DAY TIMELINE ------------------------------ */
const ROW_H = 56; // px per hour

const DayTimeline: React.FC<{
  date: Date;
  appointments: typeof mockAppointments;
  loading?: boolean;
}> = ({ date, appointments, loading }) => {
  // derive time range dynamically around appointments, fallback 08–20
  const defaultStart = 8 * 60; // 08:00
  const defaultEnd = 20 * 60;  // 20:00

  const mins = appointments.map(a => timeToMinutes(a.time));
  const ends = appointments.map(a => timeToMinutes(a.time) + (a.duration || 30));
  const rangeStartMin = Math.floor(((mins.length ? Math.min(...mins) : defaultStart) - 60) / 60) * 60; // pad 1h
  const rangeEndMin = Math.ceil(((ends.length ? Math.max(...ends) : defaultEnd) + 60) / 60) * 60; // pad 1h

  const hours: number[] = useMemo(() => {
    const arr: number[] = [];
    for (let m = Math.max(0, rangeStartMin); m <= Math.min(24*60, rangeEndMin); m += 60) arr.push(m);
    return arr;
  }, [rangeStartMin, rangeEndMin]);

  const totalMinutes = Math.max(60, rangeEndMin - rangeStartMin);
  const totalHeight = hours.length * ROW_H;

  // modal state
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<typeof mockAppointments[number] | null>(null);
  const openModal = (a: typeof mockAppointments[number]) => { setSelected(a); setOpen(true); };

  // now indicator
  const now = new Date();
  const isToday = sameDay(now, date);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowPct = ((nowMin - rangeStartMin) / totalMinutes) * 100;
  const showNow = isToday && nowMin >= rangeStartMin && nowMin <= rangeEndMin;

  return (
    <CardShell>
      <div className="p-0 md:p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-5 pt-4 pb-3">
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-300 uppercase tracking-wide">
            {format(date, 'EEEE', { locale: ptBR })}
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {format(date, 'd MMM', { locale: ptBR })}
          </div>
        </div>

        {/* Skeleton */}
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonLine key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-[56px_1fr]">{/* left labels + right canvas */}
            {/* Hour labels */}
            <div className="border-t border-gray-200 dark:border-gray-800">
              {hours.map((m) => (
                <div key={m} className="h-14 flex items-start justify-end pr-2 text-xs text-gray-500 dark:text-gray-400 relative">
                  <span className="translate-y-[-8px] tabular-nums">{String(Math.floor(m/60)).padStart(2,'0')}:00</span>
                </div>
              ))}
            </div>

            {/* Canvas */}
            <div className="relative border-t border-l border-gray-200 dark:border-gray-800 overflow-hidden">
              {/* hour grid lines */}
              {hours.map((m, idx) => (
                <div key={m} className={`h-14 border-b border-gray-200/70 dark:border-gray-800/70 ${idx === 0 ? '' : ''}`}></div>
              ))}

              {/* now indicator */}
              {showNow && (
                <div
                  className="absolute left-0 right-0 flex items-center"
                  style={{ top: `${clamp(nowPct, 0, 100)}%` }}
                >
                  <div className="w-2 h-2 rounded-full bg-rose-500 translate-y-[-1px]" />
                  <div className="h-[2px] flex-1 bg-rose-500/80" />
                </div>
              )}

              {/* appointments as absolute blocks */}
              <div className="absolute inset-0">
                {appointments.map((a) => {
                  const start = timeToMinutes(a.time);
                  const topPx = ((start - rangeStartMin) / totalMinutes) * totalHeight;
                  const heightPx = Math.max(32, (a.duration / totalMinutes) * totalHeight);

                  return (
                    <div
                      key={a.id}
                      className="absolute left-2 right-2 md:left-3 md:right-3"
                      style={{ top: topPx, height: heightPx }}
                    >
                      <AppointmentCard a={a} onClick={openModal} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <AppointmentModal open={open} onClose={() => setOpen(false)} appointment={selected} />
    </CardShell>
  );
};

/* -------------------------------- WEEK GRID ------------------------------- */
const WeekGrid: React.FC<{
  weekDays: Date[];
  weekAppointments: typeof mockAppointments;
  mobileDayIndex: number;
  loading?: boolean;
}> = ({ weekDays, weekAppointments, mobileDayIndex, loading }) => {
  return (
    <>
      {/* Desktop / md+ */}
      <div className="hidden md:block">
        <CardShell className="overflow-hidden">
          {/* Days Header */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="p-3.5 text-center border-r border-gray-200/70 dark:border-gray-800/70 last:border-r-0">
                <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  {format(day, 'EEE', { locale: ptBR })}
                </div>
                <div className={`text-2xl font-extrabold mt-0.5 ${
                  isSameDay(day, new Date()) ? 'text-indigo-500 dark:text-indigo-300' : 'text-gray-900 dark:text-white'
                }`}>
                  {format(day, 'd')}
                </div>
                {isSameDay(day, new Date()) && (
                  <div className="mx-auto mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500/80" />
                )}
              </div>
            ))}
          </div>

          {/* Appointments Grid */}
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
                  <div key={day.toISOString()} className="p-2.5 border-r border-gray-200/70 dark:border-gray-800/70 last:border-r-0 min-h-[280px] space-y-2">
                    {items.length === 0 ? (
                      <EmptyDay label="—" />
                    ) : (
                      items.map((a) => <AppointmentCard key={a.id} a={a} />)
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardShell>
      </div>

      {/* Mobile / <md */}
      <div className="md:hidden">
        {loading ? (
          <CardShell><div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <SkeletonLine key={i} />)}</div></CardShell>
        ) : (
          <DayTimeline
            date={weekDays[mobileDayIndex]}
            appointments={weekAppointments.filter(a => sameDay(a.date, weekDays[mobileDayIndex]))}
          />
        )}
      </div>
    </>
  );
};

/* ------------------------------ STAT CARDS ------------------------------ */
const toneStyles: Record<string, { bg: string; iconWrap: string; text: string }> = {
  blue: {
    bg: 'from-blue-50/70 via-white to-white dark:from-blue-950/20 dark:via-gray-900 dark:to-gray-900',
    iconWrap: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    text: 'text-blue-700 dark:text-blue-300',
  },
  green: {
    bg: 'from-emerald-50/70 via-white to-white dark:from-emerald-950/20 dark:via-gray-900 dark:to-gray-900',
    iconWrap: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  purple: {
    bg: 'from-violet-50/70 via-white to-white dark:from-violet-950/20 dark:via-gray-900 dark:to-gray-900',
    iconWrap: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
    text: 'text-violet-700 dark:text-violet-300',
  },
};

const StatCard: React.FC<{
  title: string;
  value: string;
  caption?: string;
  icon: React.ReactNode;
  tone?: keyof typeof toneStyles;
  loading?: boolean;
}> = ({ title, value, caption, icon, tone = 'blue', loading }) => {
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
            {caption && (
              <p className={`text-sm mt-0.5 ${t.text}`}>{caption}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${t.iconWrap}`}>
            {icon}
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------ SKELETONS ------------------------------ */
const SkeletonLine: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-md bg-gray-200/70 dark:bg-gray-800/70 h-10 ${className}`} />
);

/* ------------------------------- MODAL -------------------------------- */
const AppointmentModal: React.FC<{
  open: boolean;
  onClose: () => void;
  appointment: typeof mockAppointments[number] | null;
}> = ({ open, onClose, appointment }) => {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open || !appointment) return null;
  const s = statusStyles(appointment.status);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 top-12 mx-auto w-[95%] max-w-lg">
        <div className={`rounded-2xl border ${s.badge} shadow-xl overflow-hidden`}> 
          <div className="p-4 md:p-5 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Clock className="h-4 w-4" />
                <span className="font-semibold text-sm">{appointment.time} · {appointment.duration} min</span>
              </div>
              <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{appointment.service}</h3>
              <p className="text-sm text-gray-800 dark:text-gray-200">{appointment.client}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/60 dark:hover:bg-gray-800/60">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-4 md:px-5 pb-4 md:pb-5 flex items-center justify-between text-gray-900 dark:text-gray-100">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              <span className="font-semibold">{BRL.format(appointment.price)}</span>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-2 rounded-xl text-sm font-semibold border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 hover:bg-white dark:hover:bg-gray-900">Editar</button>
              <button className="px-3 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">Marcar como confirmado</button>
              <button className="px-3 py-2 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white">Cancelar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Agenda;