import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const faqs = [
  {
    question: 'Como funciona o período de teste?',
    answer: 'Você tem 14 dias para testar todas as funcionalidades do plano Pró gratuitamente. Não cobramos nada durante este período e você pode cancelar a qualquer momento.'
  },
  {
    question: 'Posso mudar de plano a qualquer momento?',
    answer: 'Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. As mudanças são aplicadas imediatamente e o valor é ajustado proporcionalmente.'
  },
  {
    question: 'Como funciona a integração com WhatsApp?',
    answer: 'Conectamos com a API oficial do WhatsApp Business para enviar lembretes automáticos aos seus clientes. É seguro, confiável e segue todas as diretrizes da Meta.'
  },
  {
    question: 'Meus dados ficam seguros?',
    answer: 'Absolutamente. Utilizamos criptografia de ponta e seguimos as melhores práticas de segurança. Seus dados e de seus clientes estão protegidos com a mesma tecnologia usada por bancos.'
  },
  {
    question: 'Preciso de conhecimento técnico para usar?',
    answer: 'Não! Nossa plataforma foi desenvolvida para ser super intuitiva. Em poucos minutos você consegue configurar tudo e começar a receber agendamentos.'
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer: 'Sim, você pode cancelar sua assinatura a qualquer momento. Não há multas ou taxas de cancelamento. Seu acesso continua até o final do período pago.'
  }
];

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="py-24 bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Tire suas dúvidas sobre a plataforma
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-6 text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {faq.question}
                </span>
                {openIndex === index ? (
                  <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                )}
              </button>
              
              {openIndex === index && (
                <div className="px-6 pb-6">
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Ainda tem dúvidas?
          </p>
          <a
            href="mailto:suporte@suareserva.online"
            className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold"
          >
            Entre em contato conosco →
          </a>
        </div>
      </div>
    </div>
  );
};

export default FAQ;