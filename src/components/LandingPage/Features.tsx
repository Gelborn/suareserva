import React from 'react';
import { 
  Calendar, 
  MessageSquare, 
  BarChart3, 
  Users, 
  Globe, 
  Shield,
  Zap,
  Heart
} from 'lucide-react';

const features = [
  {
    icon: Calendar,
    title: 'Agenda Completa',
    description: 'Visualize todos os agendamentos em calendário intuitivo com filtros por profissional e serviço.',
    color: 'indigo'
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp Integrado',
    description: 'Envie confirmações, lembretes e cobranças automaticamente via WhatsApp.',
    color: 'green'
  },
  {
    icon: BarChart3,
    title: 'Relatórios Inteligentes',
    description: 'Acompanhe faturamento, serviços mais vendidos e performance da equipe.',
    color: 'blue'
  },
  {
    icon: Users,
    title: 'Gestão de Equipe',
    description: 'Cadastre profissionais, defina horários e gerencie especialidades de cada um.',
    color: 'purple'
  },
  {
    icon: Globe,
    title: 'Página Pública',
    description: 'Seus clientes agendam online 24/7 através de uma página personalizada.',
    color: 'teal'
  },
  {
    icon: Shield,
    title: 'Dados Seguros',
    description: 'Seus dados e de seus clientes protegidos com criptografia de ponta.',
    color: 'red'
  }
];

const benefits = [
  {
    icon: Zap,
    title: 'Reduz Faltas em 70%',
    description: 'Lembretes automáticos diminuem drasticamente o no-show'
  },
  {
    icon: Heart,
    title: 'Clientes Mais Satisfeitos',
    description: 'Processo de agendamento simples e comunicação clara'
  },
  {
    icon: BarChart3,
    title: 'Aumento de 40% na Receita',
    description: 'Otimização da agenda e redução de horários vagos'
  }
];

const Features: React.FC = () => {
  const getColorClasses = (color: string) => {
    const colors = {
      indigo: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400',
      green: 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400',
      blue: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400',
      purple: 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400',
      teal: 'bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400',
      red: 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
    };
    return colors[color as keyof typeof colors] || colors.indigo;
  };

  return (
    <div className="py-24 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Features */}
        <div className="text-center mb-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Tudo que você precisa para crescer
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Uma plataforma completa com todas as ferramentas necessárias para 
            transformar seu negócio
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-6 ${getColorClasses(feature.color)}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Benefits */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-12 text-white">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Resultados Comprovados
            </h2>
            <p className="text-xl text-indigo-100">
              Veja o impacto real na sua operação
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-indigo-100">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Features;