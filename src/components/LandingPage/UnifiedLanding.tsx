import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  Calendar,
  Smartphone,
  Clock,
  ChevronDown,
  ChevronUp,
  Check,
  Star,
  Zap,
  Heart,
  BarChart3,
  Users,
  Globe,
  Shield,
  CreditCard,
  QrCode,
} from "lucide-react";

/** Props */
type Props = {
  onGetStarted: (mode?: "login" | "register") => void;
  onContactClick?: () => void; // opcional
};

/** Helpers */
type Period = "monthly" | "semiannual" | "annual";
const periodLabels: Record<Period, string> = {
  monthly: "Mensal",
  semiannual: "6 meses (-10%)",
  annual: "Anual (-20%)",
};

function brlCentsToString(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

/** Preços base por mês (centavos) para exibição */
const BASE_PRICES = {
  pro: 3990,
  team: 7990,
} as const;

/** Converte período em preço “por mês” com desconto aplicado */
function pricePerMonthFor(period: Period, baseMonthlyCents: number) {
  if (period === "monthly") return baseMonthlyCents;
  if (period === "semiannual") return Math.round(baseMonthlyCents * 0.9); // -10%
  return Math.round(baseMonthlyCents * 0.8); // -20% anual
}

/** Texto de cobrança por período (exibição abaixo do preço) */
function billingHint(period: Period) {
  if (period === "monthly") return "Cobrança mensal";
  if (period === "semiannual") return "Cobrança a cada 6 meses";
  return "Cobrança anual";
}

/** Conteúdo */
const faqs = [
  {
    q: "Como funciona o período de teste?",
    a: "Você tem 14 dias para testar o plano Pro gratuitamente. Não cobramos nada durante este período e você pode cancelar a qualquer momento.",
  },
  {
    q: "Posso mudar de plano a qualquer momento?",
    a: "Sim! Você pode fazer upgrade ou downgrade quando quiser. Mudanças são aplicadas imediatamente e o valor é ajustado proporcionalmente.",
  },
  {
    q: "Como funciona a integração com WhatsApp?",
    a: "Usamos a API oficial do WhatsApp Business para enviar confirmações e lembretes automáticos.",
  },
  {
    q: "Meus dados ficam seguros?",
    a: "Sim. Aplicamos criptografia e boas práticas modernas de segurança.",
  },
  {
    q: "Preciso de conhecimento técnico para usar?",
    a: "Não. Em poucos minutos você configura e começa a receber agendamentos.",
  },
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Pode. Sem multas. O acesso segue até o final do período pago.",
  },
];

const features = [
  { icon: Calendar,  title: "Agenda completa",       desc: "Visões Dia • Semana • Mês com filtros por profissional e serviço." },
  { icon: Smartphone,title: "WhatsApp automático",   desc: "Confirmações e lembretes enviados no momento ideal." },
  { icon: BarChart3, title: "Relatórios",            desc: "Faturamento, serviços mais vendidos e performance do time." },
  { icon: Users,     title: "Time e serviços",       desc: "Profissionais, horários e especialidades sob controle." },
  { icon: Globe,     title: "Página pública",        desc: "Seus clientes agendam online 24/7 com sua identidade visual." },
  { icon: Shield,    title: "Segurança",             desc: "Criptografia e práticas modernas de proteção de dados." },
];

const benefits = [
  { icon: Zap,   title: "Reduz faltas em até 70%", desc: "Lembretes inteligentes diminuem no-show" },
  { icon: Heart, title: "Clientes mais satisfeitos", desc: "Agendamento simples + comunicação clara" },
  { icon: BarChart3, title: "Mais receita", desc: "Menos horários vagos, mais recorrência" },
];

const plans = [
  {
    key: "free",
    name: "Free",
    price: "R$ 0,00",
    periodNote: "para sempre",
    highlight: "Para começar já",
    cta: "Começar grátis",
    popular: false,
    bullets: [
      "Até 20 agendamentos/mês",
      "10 notificações WhatsApp/mês",
      "1 pessoa • 1 loja",
      "Página pública",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "", // calculado
    periodNote: "", // calculado
    highlight: "Para crescer com consistência",
    cta: "Testar 14 dias",
    popular: true,
    bullets: [
      "Agendamentos ilimitados",
      "150 notificações WhatsApp incluídas",
      "Depois R$ 0,13 por extra",
      "1 pessoa • 1 loja",
      "Marca (logo/capa/cor) + relatórios",
    ],
  },
  {
    key: "team",
    name: "Team",
    price: "", // calculado
    periodNote: "", // calculado
    highlight: "Para equipes",
    cta: "Começar agora",
    popular: false,
    bullets: [
      "Agendamentos ilimitados",
      "300 notificações WhatsApp incluídas",
      "Depois R$ 0,12 por extra",
      "Até 5 pessoas • 1 loja",
      "Relatórios avançados",
    ],
  },
] as const;

/** LP */
const UnifiedLanding: React.FC<Props> = ({ onGetStarted, onContactClick }) => {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [period, setPeriod] = useState<Period>("monthly");

  const proPrice = useMemo(
    () => brlCentsToString(pricePerMonthFor(period, BASE_PRICES.pro)),
    [period]
  );
  const teamPrice = useMemo(
    () => brlCentsToString(pricePerMonthFor(period, BASE_PRICES.team)),
    [period]
  );

  const computedPlans = useMemo(() => {
    return plans.map((p) => {
      if (p.key === "pro") {
        return { ...p, price: proPrice, periodNote: "/mês", billing: billingHint(period) };
      }
      if (p.key === "team") {
        return { ...p, price: teamPrice, periodNote: "/mês", billing: billingHint(period) };
      }
      return p;
    });
  }, [proPrice, teamPrice, period]);

  return (
    <div className="bg-white dark:bg-gray-950">
      {/* HERO */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Agendamentos, do seu jeito —
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                simples e sob controle.
              </span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              A plataforma para pequenos negócios confirmarem por WhatsApp, reduzirem faltas
              e lotarem a agenda com menos esforço.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => onGetStarted("register")}
                className="inline-flex items-center justify-center px-7 py-4 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-950 font-medium hover:opacity-90 transition"
              >
                Começar grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
              <button
                onClick={() => onGetStarted("login")}
                className="inline-flex items-center justify-center px-7 py-4 rounded-xl border border-gray-300 dark:border-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900/40 transition"
              >
                Já tenho conta
              </button>
            </div>

            {/* quick props */}
            <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[{ icon: Calendar, title: "Agenda inteligente", desc: "Dia • Semana • Mês • Filtros por profissional e serviço" },
                { icon: Smartphone, title: "WhatsApp automático", desc: "Confirmações e lembretes no tempo ideal" },
                { icon: Clock, title: "Menos no-show", desc: "Até 70% de redução em faltas" }].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-800 p-6 text-left hover:border-gray-300 dark:hover:border-gray-700 transition">
                    <div className="w-10 h-10 rounded-lg bg-gray-900/5 dark:bg-white/10 flex items-center justify-center mb-4">
                      <Icon className="h-5 w-5 text-gray-900 dark:text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                    <p className="mt-1 text-gray-600 dark:text-gray-300">{item.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 text-gray-500 dark:text-gray-400 text-sm">
              Usado por barbearias, salões, clínicas e consultórios no Brasil.
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Tudo o que você precisa para crescer
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Ferramentas essenciais — sem complicação
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {features.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div key={idx} className="rounded-2xl border border-gray-200 dark:border-gray-800 p-7 hover:-translate-y-0.5 hover:shadow-sm transition">
                  <div className="w-11 h-11 rounded-lg bg-gray-900/5 dark:bg-white/10 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-gray-900 dark:text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{f.title}</h3>
                  <p className="mt-1.5 text-gray-600 dark:text-gray-300">{f.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-16 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-10">
            <div className="text-center mb-10">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Resultados comprovados</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">Veja o impacto direto na sua operação</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {benefits.map((b, i) => {
                const Icon = b.icon;
                return (
                  <div key={i} className="text-center">
                    <div className="w-14 h-14 rounded-full bg-gray-900/5 dark:bg-white/10 flex items-center justify-center mx-auto mb-3">
                      <Icon className="h-6 w-6 text-gray-900 dark:text-white" />
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{b.title}</div>
                    <div className="mt-1 text-gray-600 dark:text-gray-300">{b.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Planos que crescem com você
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Comece no Free e evolua quando fizer sentido
            </p>
          </div>

          {/* Toggle de período */}
          <div className="flex items-center justify-center mb-10">
            <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-800 p-1 bg-white dark:bg-gray-950">
              {(["monthly","semiannual","annual"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    period === p
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-950"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900/40"
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-7 max-w-6xl mx-auto">
            {computedPlans.map((p) => (
              <div
                key={p.key}
                className={`relative rounded-2xl border p-8 transition ${
                  p.popular
                    ? "border-gray-900 dark:border-white shadow-sm"
                    : "border-gray-200 dark:border-gray-800"
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-950 text-xs font-medium">
                      <Star className="h-4 w-4 mr-1" />
                      Mais popular
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white">{p.name}</div>
                  <div className="mt-1 text-gray-600 dark:text-gray-400">{p.highlight}</div>
                </div>

                <div className="flex items-baseline gap-1 mb-1">
                  <div className="text-4xl font-semibold text-gray-900 dark:text-white">{p.price || "R$ 0,00"}</div>
                  <div className="text-gray-600 dark:text-gray-400">{p.periodNote || " "}</div>
                </div>
                {"billing" in p && p.billing && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-6">{p.billing}</div>
                )}

                <ul className="space-y-3 mb-8">
                  {p.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                      <Check className="h-5 w-5 text-emerald-500 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => onGetStarted(p.key === "free" ? "register" : "register")}
                  className={`w-full rounded-xl px-6 py-4 font-medium transition ${
                    p.popular
                      ? "bg-gray-900 text-white hover:opacity-90 dark:bg-white dark:text-gray-950"
                      : "border border-gray-300 dark:border-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900/40"
                  }`}
                >
                  {p.cta}
                </button>

                {/* Métodos de pagamento: visual */}
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-300 dark:border-gray-800">
                    <CreditCard className="h-3.5 w-3.5" /> Cartão
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-300 dark:border-gray-800">
                    <QrCode className="h-3.5 w-3.5" /> PIX
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Contato p/ mais */}
          <div className="mt-8 max-w-3xl mx-auto text-center">
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 p-7">
              <div className="text-gray-900 dark:text-white font-medium">Precisa de mais?</div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Fale com a gente para planos sob medida.
              </div>
              <div className="mt-4">
                <a
                  href="mailto:contato@tapi.digital?subject=Planos%20Sob%20Medida"
                  className="inline-flex items-center justify-center px-5 py-3 rounded-xl border border-gray-300 dark:border-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900/40 transition"
                >
                  Entrar em contato
                </a>
              </div>
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Semestral: -10% • Anual: -20%
              </div>
            </div>
          </div>

          <div className="text-center mt-10 text-sm text-gray-600 dark:text-gray-400">
            14 dias de teste grátis no Pro • Cancele a qualquer momento
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Perguntas frequentes
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => {
              const open = openFAQ === i;
              return (
                <div key={i} className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                  <button
                    className="w-full flex items-center justify-between text-left px-5 py-5 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition"
                    onClick={() => setOpenFAQ(open ? null : i)}
                  >
                    <span className="text-base font-medium text-gray-900 dark:text-white">{f.q}</span>
                    {open ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                  </button>
                  {open && <div className="px-5 pb-5 text-gray-600 dark:text-gray-300">{f.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER — usa o mesmo logo do header (dark/light) */}
      <footer className="border-t border-gray-200 dark:border-gray-900/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-2">
              <div className="flex items-center">
                {/* Mostra o mesmo logo do header (sem depender do hook) */}
                <img src="/logo.png" alt="SuaReserva" className="h-6 w-auto block dark:hidden" />
                <img src="/logo-white.png" alt="SuaReserva" className="h-6 w-auto hidden dark:block" />
              </div>
              <p className="mt-3 text-gray-600 dark:text-gray-300 max-w-md">
                A forma mais simples de organizar seus agendamentos e crescer com previsibilidade.
              </p>
              <div className="mt-5 space-y-2 text-sm">
                <div className="text-gray-600 dark:text-gray-300">contato@tapi.digital</div>
                <div className="text-gray-600 dark:text-gray-300">São Paulo, Brasil</div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">Produto</div>
              <ul className="space-y-2 text-sm">
                <li><a className="text-gray-600 dark:text-gray-300 hover:underline" href="#features">Funcionalidades</a></li>
                <li><a className="text-gray-600 dark:text-gray-300 hover:underline" href="#pricing">Planos</a></li>
                <li><a className="text-gray-600 dark:text-gray-300 hover:underline" href="#faq">Perguntas frequentes</a></li>
              </ul>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">Legal</div>
              <ul className="space-y-2 text-sm">
                <li><a className="text-gray-600 dark:text-gray-300 hover:underline" href="#">Termos de uso</a></li>
                <li><a className="text-gray-600 dark:text-gray-300 hover:underline" href="#">Privacidade</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 text-xs text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} suareserva.digital — Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default UnifiedLanding;
