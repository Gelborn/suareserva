import React from 'react';
import { ArrowRight, Calendar, Clock, Smartphone } from 'lucide-react';

interface HeroProps {
  onGetStarted: () => void;
}

const Hero: React.FC<HeroProps> = ({ onGetStarted }) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Agendamentos
            <span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Simplificados
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            A plataforma completa para pequenos negócios gerenciarem agendamentos, 
            confirmarem por WhatsApp e aumentarem seu faturamento.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button 
              onClick={onGetStarted}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
            >
              <span>Começar Grátis</span>
              <ArrowRight className="h-5 w-5" />
            </button>
            
            <button className="border-2 border-gray-200 dark:border-gray-600 hover:border-indigo-300 text-gray-700 dark:text-gray-200 px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800">
              Ver Demo
            </button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Agenda Inteligente
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Gerencie todos os agendamentos em um só lugar com visão por dia, semana ou mês.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-8 w-8 text-teal-600 dark:text-teal-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                WhatsApp Automático
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Confirmações e lembretes enviados automaticamente para seus clientes.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Economia de Tempo
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Reduza faltas em 70% e foque no que importa: atender bem seus clientes.
              </p>
            </div>
          </div>

          {/* Social proof */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-4xl mx-auto">
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Já usado por mais de <span className="font-bold text-indigo-600">500+ negócios</span> no Brasil
            </p>
            
            <div className="flex justify-center items-center space-x-8 opacity-60">
              <span className="font-semibold text-gray-400">Barbearias</span>
              <span className="font-semibold text-gray-400">Salões</span>
              <span className="font-semibold text-gray-400">Clínicas</span>
              <span className="font-semibold text-gray-400">Estéticas</span>
              <span className="font-semibold text-gray-400">Consultórios</span>
            </div>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
      </div>
    </div>
  );
};

export default Hero;