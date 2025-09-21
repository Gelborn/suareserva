import React from 'react';
import { 
  DollarSign, 
  Calendar, 
  Users, 
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const mockData = [
  { name: 'Seg', agendamentos: 8, faturamento: 480 },
  { name: 'Ter', agendamentos: 12, faturamento: 720 },
  { name: 'Qua', agendamentos: 15, faturamento: 900 },
  { name: 'Qui', agendamentos: 10, faturamento: 600 },
  { name: 'Sex', agendamentos: 18, faturamento: 1080 },
  { name: 'Sáb', agendamentos: 25, faturamento: 1500 },
  { name: 'Dom', agendamentos: 6, faturamento: 360 }
];

const upcomingAppointments = [
  { id: 1, client: 'João Silva', service: 'Corte + Barba', time: '09:00', duration: '45min', price: 60 },
  { id: 2, client: 'Maria Santos', service: 'Manicure', time: '10:30', duration: '60min', price: 35 },
  { id: 3, client: 'Pedro Lima', service: 'Corte Simples', time: '11:00', duration: '30min', price: 25 },
  { id: 4, client: 'Ana Costa', service: 'Escova + Hidratação', time: '14:00', duration: '90min', price: 80 },
];

const CardBase = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
    {children}
  </div>
);

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">
          Bem-vindo de volta! Aqui está um resumo do seu negócio hoje.
        </p>
      </div>

      {/* Stats Cards - mobile: 2 cards lado a lado / md+: 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Card 1 */}
        <CardBase>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Faturamento Hoje</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">R$ 480</p>
              <p className="text-xs md:text-sm text-green-600 dark:text-green-400 flex items-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                +12% vs ontem
              </p>
            </div>
            <div className="p-2.5 md:p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
              <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </CardBase>

        {/* Card 2 */}
        <CardBase>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Agendamentos Hoje</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">8</p>
              <p className="text-xs md:text-sm text-blue-600 dark:text-blue-400 flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                2 confirmados
              </p>
            </div>
            <div className="p-2.5 md:p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
              <Calendar className="h-5 w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </CardBase>

        {/* Card 3 - hidden no mobile */}
        <div className="hidden md:block">
          <CardBase>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Taxa de Ocupação</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">85%</p>
                <p className="text-sm text-purple-600 dark:text-purple-400 flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  7h ocupadas
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardBase>
        </div>

        {/* Card 4 - hidden no mobile */}
        <div className="hidden md:block">
          <CardBase>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Clientes Ativos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">156</p>
                <p className="text-sm text-teal-600 dark:text-teal-400 flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  +8 esta semana
                </p>
              </div>
              <div className="p-3 bg-teal-100 dark:bg-teal-900/50 rounded-full">
                <Users className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              </div>
            </div>
          </CardBase>
        </div>
      </div>

      {/* Charts - escondidos no mobile */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CardBase>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Agendamentos por Dia
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={mockData}>
              <defs>
                <linearGradient id="colorAgendamentos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: 8, color: '#F3F4F6' }}
              />
              <Area type="monotone" dataKey="agendamentos" stroke="#6366F1" fillOpacity={1} fill="url(#colorAgendamentos)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </CardBase>

        <CardBase>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Faturamento Semanal
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: 8, color: '#F3F4F6' }}
                formatter={(value) => [`R$ ${value}`, 'Faturamento']}
              />
              <Bar dataKey="faturamento" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardBase>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
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
                className="flex items-center justify-between p-3 md:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <div className="w-9 h-9 md:w-10 md:h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
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
                    <p className="text-xs md:text-sm text-green-600 dark:text-green-400">R$ {appointment.price}</p>
                  </div>
                  <button className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/50 rounded-lg transition-colors">
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
