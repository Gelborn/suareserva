// src/pages/Dashboard.tsx
import React from 'react';
import {
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { useBusiness } from '../../hooks/useBusiness';
import { useAuth } from '../../contexts/AuthContext';
import { useIsPWA } from '../../hooks/usePWA';
import { useIsSmallScreen } from '../../hooks/useMediaQuery';

const mockData = [
  { name: 'Seg', agendamentos: 8, faturamento: 480 },
  { name: 'Ter', agendamentos: 12, faturamento: 720 },
  { name: 'Qua', agendamentos: 15, faturamento: 900 },
  { name: 'Qui', agendamentos: 10, faturamento: 600 },
  { name: 'Sex', agendamentos: 18, faturamento: 1080 },
  { name: 'Sáb', agendamentos: 25, faturamento: 1500 },
  { name: 'Dom', agendamentos: 6, faturamento: 360 },
];

const upcomingAppointments = [
  { id: 1, client: 'João Silva', service: 'Corte + Barba', time: '09:00', duration: '45min', price: 60 },
  { id: 2, client: 'Maria Santos', service: 'Manicure', time: '10:30', duration: '60min', price: 35 },
  { id: 3, client: 'Pedro Lima', service: 'Corte Simples', time: '11:00', duration: '30min', price: 25 },
  { id: 4, client: 'Ana Costa', service: 'Escova + Hidratação', time: '14:00', duration: '90min', price: 80 },
];

const LS_KEY = 'sr.displayName';

/** Card base, com modo compacto para mobile/PWA */
const CardBase: React.FC<React.PropsWithChildren<{ compact?: boolean }>> = ({ compact, children }) => (
  <div
    className={[
      'group bg-white/80 dark:bg-gray-900/60 backdrop-blur-sm',
      compact ? 'rounded-xl p-3' : 'rounded-2xl p-4 md:p-6',
      'shadow-sm border border-gray-200 dark:border-gray-700',
      'transition-shadow hover:shadow-md',
    ].join(' ')}
  >
    {children}
  </div>
);

/** Cápsula de ícone (oculta no mobile para os cards de estatística) */
const IconCapsule: React.FC<React.PropsWithChildren<{ tone?: 'indigo' | 'green' | 'purple' | 'teal' | 'blue' }>> = ({ tone = 'indigo', children }) => {
  const toneMap: Record<string, string> = {
    indigo: 'from-indigo-500/15 to-fuchsia-500/15 ring-indigo-500/25 text-indigo-600 dark:text-indigo-400',
    green: 'from-emerald-500/15 to-teal-500/15 ring-emerald-500/25 text-emerald-600 dark:text-emerald-400',
    purple: 'from-purple-500/15 to-pink-500/15 ring-purple-500/25 text-purple-600 dark:text-purple-400',
    teal: 'from-teal-500/15 to-cyan-500/15 ring-teal-500/25 text-teal-600 dark:text-teal-400',
    blue: 'from-blue-500/15 to-cyan-500/15 ring-blue-500/25 text-blue-600 dark:text-blue-400',
  };
  return (
    <span
      className={[
        'inline-flex h-10 w-10 items-center justify-center rounded-lg',
        'bg-gradient-to-br ring-1 shadow-sm',
        toneMap[tone],
      ].join(' ')}
    >
      {children}
    </span>
  );
};

const Dashboard: React.FC = () => {
  const { business, loading: businessLoading } = useBusiness();
  const { user } = useAuth();

  const isPWA = useIsPWA();
  const isSmall = useIsSmallScreen(1024);
  const isMobileLike = isSmall; // mobile & PWA layout behavior
  const dockPad = isPWA && isSmall ? 'calc(96px + env(safe-area-inset-bottom, 0px))' : '0px';

  // nome estável para evitar flash
  const [displayName, setDisplayName] = React.useState<string>(() => {
    const fromLS = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
    return fromLS || user?.name || '';
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

  return (
    <div className="space-y-6 md:space-y-8" style={{ paddingBottom: dockPad }}>
      {/* Header personalizado */}
      <div className="space-y-1.5">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white">
          {displayName ? (
            <>
              Olá,{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-fuchsia-400">
                {displayName}
              </span>
            </>
          ) : businessLoading ? (
            <span className="inline-block h-6 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          ) : (
            'Dashboard'
          )}
        </h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">
          Aqui está um resumo do seu negócio hoje.
        </p>
      </div>

      {/* Stats Cards */}
      <div
        className={[
          'grid gap-4 md:gap-6',
          isMobileLike ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        ].join(' ')}
      >
        {/* Card 1 */}
        <CardBase compact={isMobileLike}>
          <div className={['flex items-center justify-between', isMobileLike ? 'gap-2' : 'gap-3'].join(' ')}>
            <div>
              <p className={isMobileLike ? 'text-[11px] font-medium text-gray-600 dark:text-gray-400' : 'text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400'}>
                Faturamento Hoje
              </p>
              <p className={isMobileLike ? 'text-lg font-bold text-gray-900 dark:text-white' : 'text-xl md:text-2xl font-bold text-gray-900 dark:text-white'}>
                R$ 480
              </p>
              <p className={isMobileLike ? 'text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center' : 'text-xs md:text-sm text-emerald-600 dark:text-emerald-400 flex items-center'}>
                <TrendingUp className="h-4 w-4 mr-1" />
                +12% vs ontem
              </p>
            </div>
            {!isMobileLike && (
              <IconCapsule tone="green">
                <DollarSign className="h-5 w-5" />
              </IconCapsule>
            )}
          </div>
        </CardBase>

        {/* Card 2 */}
        <CardBase compact={isMobileLike}>
          <div className={['flex items-center justify-between', isMobileLike ? 'gap-2' : 'gap-3'].join(' ')}>
            <div>
              <p className={isMobileLike ? 'text-[11px] font-medium text-gray-600 dark:text-gray-400' : 'text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400'}>
                Agendamentos Hoje
              </p>
              <p className={isMobileLike ? 'text-lg font-bold text-gray-900 dark:text-white' : 'text-xl md:text-2xl font-bold text-gray-900 dark:text-white'}>
                8
              </p>
              <p className={isMobileLike ? 'text-[11px] text-blue-600 dark:text-blue-400 flex items-center' : 'text-xs md:text-sm text-blue-600 dark:text-blue-400 flex items-center'}>
                <Calendar className="h-4 w-4 mr-1" />
                2 confirmados
              </p>
            </div>
            {!isMobileLike && (
              <IconCapsule tone="blue">
                <Calendar className="h-5 w-5" />
              </IconCapsule>
            )}
          </div>
        </CardBase>

        {/* Card 3 */}
        <CardBase compact={isMobileLike}>
          <div className={['flex items-center justify-between', isMobileLike ? 'gap-2' : 'gap-3'].join(' ')}>
            <div>
              <p className={isMobileLike ? 'text-[11px] font-medium text-gray-600 dark:text-gray-400' : 'text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400'}>
                Taxa de Ocupação
              </p>
              <p className={isMobileLike ? 'text-lg font-bold text-gray-900 dark:text-white' : 'text-xl md:text-2xl font-bold text-gray-900 dark:text-white'}>
                85%
              </p>
              <p className={isMobileLike ? 'text-[11px] text-purple-600 dark:text-purple-400 flex items-center' : 'text-xs md:text-sm text-purple-600 dark:text-purple-400 flex items-center'}>
                <Clock className="h-4 w-4 mr-1" />
                7h ocupadas
              </p>
            </div>
            {!isMobileLike && (
              <IconCapsule tone="purple">
                <Clock className="h-5 w-5" />
              </IconCapsule>
            )}
          </div>
        </CardBase>

        {/* Card 4 */}
        <CardBase compact={isMobileLike}>
          <div className={['flex items-center justify-between', isMobileLike ? 'gap-2' : 'gap-3'].join(' ')}>
            <div>
              <p className={isMobileLike ? 'text-[11px] font-medium text-gray-600 dark:text-gray-400' : 'text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400'}>
                Clientes Ativos
              </p>
              <p className={isMobileLike ? 'text-lg font-bold text-gray-900 dark:text-white' : 'text-xl md:text-2xl font-bold text-gray-900 dark:text-white'}>
                156
              </p>
              <p className={isMobileLike ? 'text-[11px] text-teal-600 dark:text-teal-400 flex items-center' : 'text-xs md:text-sm text-teal-600 dark:text-teal-400 flex items-center'}>
                <Users className="h-4 w-4 mr-1" />
                +8 esta semana
              </p>
            </div>
            {!isMobileLike && (
              <IconCapsule tone="teal">
                <Users className="h-5 w-5" />
              </IconCapsule>
            )}
          </div>
        </CardBase>
      </div>

      {/* Charts — escondidos no mobile & PWA */}
      {!isMobileLike && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <CardBase>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Agendamentos por Dia
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={mockData}>
                <defs>
                  <linearGradient id="colorAgendamentos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.25} />
                <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid rgba(55,65,81,0.6)',
                    borderRadius: 8,
                    color: '#F3F4F6',
                  }}
                />
                <Area type="monotone" dataKey="agendamentos" stroke="#6366F1" fillOpacity={1} fill="url(#colorAgendamentos)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardBase>

          <CardBase>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Faturamento Semanal
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.25} />
                <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid rgba(55,65,81,0.6)',
                    borderRadius: 8,
                    color: '#F3F4F6',
                  }}
                  formatter={(value) => [`R$ ${value}`, 'Faturamento']}
                />
                <Bar dataKey="faturamento" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBase>
        </div>
      )}

      {/* Próximos agendamentos */}
      <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
            Próximos Agendamentos
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Agendamentos para hoje</p>
        </div>

        <div className="p-4 md:p-6">
          <div className="space-y-3 md:space-y-4">
            {upcomingAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center justify-between p-3 md:p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center ring-1 ring-indigo-500/20">
                    <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {appointment.client}
                    </h4>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
                      {appointment.service} • {appointment.duration}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 md:gap-4">
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">{appointment.time}</p>
                    <p className="text-xs md:text-sm text-emerald-600 dark:text-emerald-400">R$ {appointment.price}</p>
                  </div>
                  <button className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 rounded-lg transition-colors">
                    <CheckCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 md:mt-6 text-center">
            <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium">
              Ver todos os agendamentos →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
