import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, User, DollarSign } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const mockAppointments = [
  {
    id: 1,
    date: new Date(),
    time: '09:00',
    client: 'João Silva',
    service: 'Corte + Barba',
    duration: 45,
    price: 60,
    status: 'confirmed'
  },
  {
    id: 2,
    date: new Date(),
    time: '10:30',
    client: 'Maria Santos',
    service: 'Manicure',
    duration: 60,
    price: 35,
    status: 'pending'
  },
  {
    id: 3,
    date: addDays(new Date(), 1),
    time: '14:00',
    client: 'Pedro Lima',
    service: 'Corte Simples',
    duration: 30,
    price: 25,
    status: 'confirmed'
  }
];

const Agenda: React.FC = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [view, setView] = useState<'week' | 'day'>('week');
  
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getAppointmentsForDay = (date: Date) => {
    return mockAppointments.filter(apt => isSameDay(apt.date, date));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Agenda</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gerencie todos os seus agendamentos
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setView('day')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                view === 'day'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Dia
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                view === 'week'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Semana
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="font-medium text-gray-900 dark:text-white min-w-[200px] text-center">
              {format(weekStart, 'dd MMM', { locale: ptBR })} - {format(addDays(weekStart, 6), 'dd MMM yyyy', { locale: ptBR })}
            </span>
            <button
              onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {weekDays.map((day) => (
            <div 
              key={day.toISOString()}
              className="p-4 text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0"
            >
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">
                {format(day, 'EEE', { locale: ptBR })}
              </div>
              <div className={`text-2xl font-bold mt-1 ${
                isSameDay(day, new Date()) 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : 'text-gray-900 dark:text-white'
              }`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Appointments */}
        <div className="grid grid-cols-7 min-h-[400px]">
          {weekDays.map((day) => {
            const dayAppointments = getAppointmentsForDay(day);
            
            return (
              <div 
                key={day.toISOString()}
                className="border-r border-gray-200 dark:border-gray-700 last:border-r-0 p-2 space-y-2"
              >
                {dayAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className={`p-3 rounded-lg border text-xs cursor-pointer hover:shadow-md transition-all ${getStatusColor(appointment.status)}`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="h-3 w-3" />
                      <span className="font-medium">{appointment.time}</span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span className="font-medium">{appointment.client}</span>
                      </div>
                      
                      <div className="text-xs opacity-80">
                        {appointment.service}
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs">{appointment.duration}min</span>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3" />
                          <span className="font-medium">R$ {appointment.price}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {dayAppointments.length === 0 && (
                  <div className="text-center text-gray-400 dark:text-gray-500 py-8">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Sem agendamentos</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Esta Semana</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">24</p>
              <p className="text-sm text-blue-600 dark:text-blue-400">agendamentos</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Confirmados</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">18</p>
              <p className="text-sm text-green-600 dark:text-green-400">75% confirmação</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
              <User className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Receita Estimada</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">R$ 1.440</p>
              <p className="text-sm text-purple-600 dark:text-purple-400">esta semana</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full">
              <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Agenda;