import React from 'react';
import { Check, Star } from 'lucide-react';

interface PricingProps {
  onGetStarted: (mode?: 'login' | 'register') => void;
}

const Pricing: React.FC<PricingProps> = ({ onGetStarted }) => {
  const plans = [
    {
      name: 'Free',
      price: 'Grátis',
      period: 'para sempre',
      description: 'Perfeito para começar',
      features: [
        'Até 30 reservas/mês',
        'Página pública simples',
        'WhatsApp: 1 lembrete (2h antes)',
        'Suporte por email'
      ],
      buttonText: 'Começar Grátis',
      popular: false
    },
    {
      name: 'Pró',
      price: 'R$ 29',
      period: '/mês',
      description: 'Para negócios em crescimento',
      features: [
        'Até 2.000 reservas/mês',
        'Logo, capa e cor da sua marca',
        'WhatsApp: lembretes em 24h e 2h',
        'Controle de cancelamento e reagendamento',
        'Relatórios avançados',
        'Suporte prioritário'
      ],
      buttonText: 'Começar Teste Grátis',
      popular: true
    }
  ];

  return (
    <div className="py-24 bg-gray-50 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Planos que crescem com você
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Comece grátis e evolua conforme seu negócio cresce
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white dark:bg-gray-900 rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                plan.popular
                  ? 'border-indigo-500 ring-4 ring-indigo-100 dark:ring-indigo-900/50'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-indigo-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center space-x-1">
                    <Star className="h-4 w-4" />
                    <span>Mais Popular</span>
                  </div>
                </div>
              )}

              <div className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      {plan.price}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 ml-1">
                      {plan.period}
                    </span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <Check className="h-5 w-5 text-green-500" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => onGetStarted()}
                  className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 ${
                    plan.popular
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl'
                      : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  {plan.buttonText}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 dark:text-gray-400">
            Todos os planos incluem 14 dias de teste grátis • Cancele a qualquer momento
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;