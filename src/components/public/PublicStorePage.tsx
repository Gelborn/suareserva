import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Instagram,
  Loader2,
  MapPin,
  Phone,
  Sparkles,
} from 'lucide-react';

import LoadingScreen from '../ui/LoadingScreen';
import { usePublicStore } from '../../hooks/usePublicStore';
import { useAvailability } from '../../hooks/useAvailability';
import type { PublicService, PublicTeamMember } from '../../hooks/usePublicStore';

type Step = 1 | 2 | 3 | 4;

const STEP_CONTENT: Record<Step, { headline: string; description: string; cta: string }> = {
  1: {
    headline: 'Gostaria de reservar um serviço?',
    description: 'Escolha uma das especialidades disponíveis abaixo para começar sua reserva.',
    cta: 'Escolher profissional',
  },
  2: {
    headline: 'Quem vai te atender?',
    description: 'Selecione o profissional ideal para realizar o serviço escolhido.',
    cta: 'Escolher horário',
  },
  3: {
    headline: 'Quando você quer vir?',
    description: 'Veja os dias e horários disponíveis e escolha o melhor para você.',
    cta: 'Avançar para dados',
  },
  4: {
    headline: 'Quase lá!',
    description: 'Informe seus dados para receber a confirmação do agendamento.',
    cta: 'Confirmar agendamento',
  },
};

const RESERVED_SLUGS = new Set([
  '',
  'dashboard',
  'agenda',
  'team',
  'stores',
  'store',
  'login',
  'register',
  'auth',
  'perfil',
  'admin',
  'api',
  'favicon.ico',
  'robots.txt',
  'manifest.json',
  'sitemap.xml',
]);

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const onlyDigits = (s: string) => s.replace(/\D+/g, '');

const formatPrice = (cents?: number | null) => {
  if (cents === undefined || cents === null) return 'Sob consulta';
  return BRL.format(cents / 100);
};

const formatDuration = (minutes?: number | null) => {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}min`);
  return parts.join(' ') || '0min';
};

const maskPhone = (input: string) => {
  const digits = onlyDigits(input).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const initials = (name?: string | null) => {
  if (!name) return 'SR';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || 'SR';
};

const TikTokIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" {...props}>
    <path
      d="M14 3v3.2a6.8 6.8 0 0 0 6 0V9a9.2 9.2 0 0 1-6-2v7.2a4.2 4.2 0 1 1-3.6-4.15V12a2.2 2.2 0 1 0 1.6 2.11V3h2z"
      fill="currentColor"
    />
  </svg>
);

const ServiceCard: React.FC<{
  service: PublicService;
  active: boolean;
  onSelect: () => void;
  accent: string;
}> = ({ service, active, onSelect, accent }) => (
  <button
    type="button"
    onClick={onSelect}
    className={clsx(
      'group relative flex w-full flex-col gap-4 rounded-3xl border bg-white/85 p-5 text-left shadow-sm transition-all backdrop-blur',
      active
        ? 'border-transparent ring-2 ring-offset-2 ring-offset-white'
        : 'border-gray-200/70 hover:-translate-y-0.5 hover:border-gray-300'
    )}
    style={
      active
        ? { background: `linear-gradient(135deg, ${accent}1A, ${accent}05)` }
        : undefined
    }
  >
    <div className="flex items-start gap-4">
      {service.service_pic ? (
        <img
          src={service.service_pic}
          alt={service.name}
          className="h-16 w-16 flex-shrink-0 rounded-2xl object-cover ring-1 ring-black/5"
        />
      ) : (
        <div className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-semibold">
          <Sparkles className="h-6 w-6" />
        </div>
      )}
      <div className="min-w-0 space-y-1.5">
        <p
          className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500 shadow-sm"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Serviço
        </p>
        <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
        {service.description && (
          <p className="text-sm text-gray-600 line-clamp-3">{service.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <span>{formatDuration(service.duration_min)}</span>
          <span>•</span>
          <span>{formatPrice(service.price_cents)}</span>
        </div>
      </div>
    </div>
    <div
      className={clsx(
        'inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        active
          ? 'border-transparent bg-gray-900 text-white'
          : 'border-gray-200 text-gray-600 group-hover:border-gray-300 group-hover:text-gray-900'
      )}
    >
      Selecionar
      <ArrowRight className="h-4 w-4" />
    </div>
  </button>
);

const ProviderCard: React.FC<{
  provider: PublicTeamMember;
  active: boolean;
  onSelect: () => void;
  accent: string;
}> = ({ provider, active, onSelect, accent }) => (
  <button
    type="button"
    onClick={onSelect}
    className={clsx(
      'flex w-full items-center gap-4 rounded-3xl border bg-white/85 px-4 py-3 text-left shadow-sm transition-all backdrop-blur',
      active
        ? 'border-transparent ring-2 ring-offset-2 ring-offset-white'
        : 'border-gray-200/70 hover:-translate-y-0.5 hover:border-gray-300'
    )}
    style={active ? { boxShadow: `0 25px 50px -25px ${accent}80` } : undefined}
  >
    {provider.profile_pic ? (
      <img
        src={provider.profile_pic}
        alt={provider.full_name}
        className="h-14 w-14 flex-shrink-0 rounded-2xl object-cover ring-1 ring-black/5"
      />
    ) : (
      <div className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-semibold">
        {initials(provider.full_name)}
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-base font-semibold text-gray-900">{provider.full_name}</p>
      <p className="text-xs text-gray-500">Profissional</p>
    </div>
    {active && <Check className="h-5 w-5 flex-shrink-0" style={{ color: accent }} />}
  </button>
);

const EmptyState: React.FC<{ title: string; message: string }> = ({ title, message }) => (
  <div className="rounded-3xl border border-dashed border-gray-200 bg-white/60 p-8 text-center">
    <Sparkles className="mx-auto h-6 w-6 text-gray-400" />
    <h3 className="mt-4 text-base font-semibold text-gray-900">{title}</h3>
    <p className="mt-2 text-sm text-gray-600">{message}</p>
  </div>
);

const ProgressBar: React.FC<{ step: Step }> = ({ step }) => (
  <div className="flex items-center gap-2">
    {[1, 2, 3, 4].map((current) => {
      const status =
        current < step ? 'done' : current === step ? 'current' : 'upcoming';
      return (
        <div key={current} className="flex-1">
          <div
            className={clsx(
              'h-1.5 rounded-full transition-all',
              status === 'done' && 'bg-gray-900',
              status === 'current' && 'bg-gray-900/80',
              status === 'upcoming' && 'bg-gray-200'
            )}
          />
        </div>
      );
    })}
  </div>
);

const SummaryCard: React.FC<{
  storeName: string;
  service?: PublicService | null;
  provider?: PublicTeamMember | null;
  slotLabel?: string | null;
  slotDate?: string | null;
  priceLabel?: string;
  durationLabel?: string;
  accent: string;
}> = ({ storeName, service, provider, slotLabel, slotDate, priceLabel, durationLabel, accent }) => (
  <aside className="rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur">
    <p className="text-xs uppercase tracking-wide text-gray-500">Resumo</p>
    <h3 className="mt-1 text-lg font-semibold text-gray-900">{storeName}</h3>
    <div className="mt-6 space-y-4 text-sm text-gray-700">
      <div className="flex items-start justify-between gap-4">
        <span className="text-gray-500">Serviço</span>
        <span className="text-right font-semibold text-gray-900">
          {service?.name ?? 'Selecione um serviço'}
        </span>
      </div>
      <div className="flex items-start justify-between gap-4">
        <span className="text-gray-500">Profissional</span>
        <span className="text-right text-gray-900">
          {provider?.full_name ?? 'Selecione um profissional'}
        </span>
      </div>
      <div className="flex items-start justify-between gap-4">
        <span className="text-gray-500">Horário</span>
        <span className="text-right text-gray-900">
          {slotLabel ? (
            <>
              {slotLabel}
              {slotDate ? <span className="block text-xs text-gray-500">{slotDate}</span> : null}
            </>
          ) : (
            'Escolha um horário'
          )}
        </span>
      </div>
      <div className="flex items-start justify-between gap-4">
        <span className="text-gray-500">Duração</span>
        <span className="text-right text-gray-900">{durationLabel || '—'}</span>
      </div>
      <div className="flex items-start justify-between gap-4">
        <span className="text-gray-500">Valor estimado</span>
        <span className="text-right text-gray-900">{priceLabel || '—'}</span>
      </div>
    </div>
    <div
      className="mt-6 rounded-2xl bg-gradient-to-br px-4 py-3 text-xs font-medium text-white shadow-sm"
      style={{ background: `linear-gradient(135deg, ${accent}, ${accent}CC)` }}
    >
      Finalizaremos sua reserva entrando em contato pelos dados informados.
    </div>
  </aside>
);

const PublicStorePage: React.FC = () => {
  const params = useParams<{ slug: string }>();
  const rawSlug = params.slug ?? '';
  const slug = rawSlug.toLowerCase();
  const reserved = RESERVED_SLUGS.has(slug);

  const { loading, store, services, hours, error, notFound } = usePublicStore(reserved ? null : slug);

  const [step, setStep] = React.useState<Step>(1);
  const [selectedServiceId, setSelectedServiceId] = React.useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = React.useState<string | null>(null);
  const [selectedDayKey, setSelectedDayKey] = React.useState<string | null>(null);
  const [selectedSlotIso, setSelectedSlotIso] = React.useState<string | null>(null);

  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [createdBookingId, setCreatedBookingId] = React.useState<string | null>(null);

  const selectedService = React.useMemo(
    () => services.find((svc) => svc.id === selectedServiceId) ?? null,
    [services, selectedServiceId]
  );
  const selectedProvider = React.useMemo(() => {
    if (!selectedService) return null;
    return selectedService.providers.find((p) => p.id === selectedProviderId) ?? null;
  }, [selectedService, selectedProviderId]);

  const availability = useAvailability({
    store,
    hours,
    service: selectedService,
    provider: selectedProvider,
    horizonDays: 14,
  });

  const accent = store?.primary_color || '#6366f1';
  const accentSecondary = store?.secondary_color || '#8b5cf6';

  React.useEffect(() => {
    setSelectedProviderId(null);
    setSelectedDayKey(null);
    setSelectedSlotIso(null);
  }, [selectedServiceId]);

  React.useEffect(() => {
    setSelectedDayKey(null);
    setSelectedSlotIso(null);
  }, [selectedProviderId]);

  React.useEffect(() => {
    if (!selectedService || !selectedProvider) return;
    if (!availability.days.length) {
      setSelectedDayKey(null);
      setSelectedSlotIso(null);
      return;
    }

    const currentDayHasSlots =
      selectedDayKey && availability.slotsByDay[selectedDayKey]?.length;
    if (currentDayHasSlots) {
      const hasSlotSelected = availability.slotsByDay[selectedDayKey].some(
        (slot) => slot.isoStart === selectedSlotIso
      );
      if (!hasSlotSelected) {
        const first = availability.slotsByDay[selectedDayKey][0];
        setSelectedSlotIso(first?.isoStart ?? null);
      }
      return;
    }

    const firstDay = availability.days.find(
      (day) => availability.slotsByDay[day.key]?.length
    );
    if (firstDay) {
      setSelectedDayKey(firstDay.key);
      const firstSlot = availability.slotsByDay[firstDay.key]?.[0]?.isoStart ?? null;
      setSelectedSlotIso(firstSlot);
    } else {
      setSelectedDayKey(null);
      setSelectedSlotIso(null);
    }
  }, [
    availability.days,
    availability.slotsByDay,
    selectedService,
    selectedProvider,
    selectedDayKey,
    selectedSlotIso,
  ]);

  const selectedSlot = React.useMemo(() => {
    if (!selectedDayKey || !selectedSlotIso) return null;
    const list = availability.slotsByDay[selectedDayKey] ?? [];
    return list.find((slot) => slot.isoStart === selectedSlotIso) ?? null;
  }, [selectedDayKey, selectedSlotIso, availability.slotsByDay]);

  React.useEffect(() => {
    if (!selectedServiceId && step > 1) setStep(1);
  }, [selectedServiceId, step]);

  React.useEffect(() => {
    if (!selectedProviderId && step > 2) setStep(2);
  }, [selectedProviderId, step]);

  React.useEffect(() => {
    if (!selectedSlotIso && step > 3) setStep(3);
  }, [selectedSlotIso, step]);

  const digitsPhone = onlyDigits(customerPhone);
  const phoneValid = digitsPhone.length >= 10;
  const canSubmit =
    !!store &&
    !!selectedService &&
    !!selectedProvider &&
    !!selectedSlot &&
    customerName.trim().length >= 2 &&
    phoneValid &&
    !creating;

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setNotes('');
  };

  const handleCreateBooking = async () => {
    if (!canSubmit || !store || !selectedService || !selectedProvider || !selectedSlot) return;

    try {
      setCreating(true);

      const payload = {
        store_id: store.id,
        service_id: selectedService.id,
        team_member_id: selectedProvider.id,
        start_ts: selectedSlot.isoStart,
        end_ts: selectedSlot.isoEnd,
        price_cents: selectedService.price_cents,
        customer_name: customerName.trim(),
        customer_phone: digitsPhone,
        customer_email: customerEmail.trim() || null,
        notes: notes.trim() || null,
      };

      // TODO: substituir por chamada a função Edge com service role
      console.info('Booking payload (preview):', payload);
      toast.success('Pedido recebido! A loja entrará em contato para confirmar sua reserva.');
      resetForm();
      setCreatedBookingId(selectedSlot.isoStart);
    } catch (err: any) {
      console.error(err);
      toast.error('Não foi possível criar a reserva agora.');
    } finally {
      setCreating(false);
    }
  };

  const nextStep = () => setStep((prev) => Math.min(4, (prev + 1) as Step));
  const prevStep = () => setStep((prev) => Math.max(1, (prev - 1) as Step));

  const dayLabel = availability.days.find((day) => day.key === selectedDayKey)?.fullLabel ?? null;
  const slotLabel = selectedSlot?.label ?? null;

  if (reserved) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return <LoadingScreen message="Buscando informações da loja…" />;
  }

  if (notFound || !store) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
          <Sparkles className="h-8 w-8 text-indigo-300" />
          <h1 className="mt-5 text-3xl font-semibold">Loja não encontrada</h1>
          <p className="mt-3 text-sm text-slate-300">
            Não conseguimos localizar uma loja com o endereço solicitado. Verifique o link ou
            fale com o estabelecimento.
          </p>
        </div>
      </div>
    );
  }

  const addressOneLine = (store as any).address_one_line || null;
  const whatsapp = (store as any).whatsapp || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900">
      <header className="relative overflow-hidden text-white">
        <div className="absolute inset-0">
          {store.cover_url ? (
            <>
              <img
                src={store.cover_url}
                alt={store.name ?? 'Foto de capa'}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/65 to-black/50" />
            </>
          ) : (
            <div
              className="h-full w-full"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accentSecondary})` }}
            />
          )}
        </div>
        <div className="relative z-10 mx-auto flex min-h-[360px] max-w-5xl flex-col justify-end px-6 pb-20 pt-24">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt={store.name ?? 'Logo'}
                  className="h-24 w-24 rounded-3xl border border-white/30 object-cover shadow-lg"
                />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-3xl border border-white/20 bg-white/10 text-3xl font-semibold">
                  {initials(store.name)}
                </div>
              )}
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs uppercase tracking-wide">
                  {store.slug ? (
                    <>suareserva.online/{store.slug}</>
                  ) : (
                    <>link público em breve</>
                  )}
                </div>
                <h1 className="mt-3 text-4xl font-black sm:text-5xl">{store.name}</h1>
                {addressOneLine && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-white/80">
                    <MapPin className="h-4 w-4 text-white/70" />
                    <span>{addressOneLine}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {store.instagram_url && (
                <a
                  href={store.instagram_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20"
                >
                  <Instagram className="h-4 w-4" />
                  Instagram
                </a>
              )}
              {store.tiktok_url && (
                <a
                  href={store.tiktok_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20"
                >
                  <TikTokIcon className="h-4 w-4" />
                  TikTok
                </a>
              )}
              {whatsapp && (
                <a
                  href={`https://wa.me/${onlyDigits(whatsapp)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20"
                >
                  <Phone className="h-4 w-4" />
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        {error && (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {error}
          </div>
        )}

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-8">
            <div className="space-y-5 rounded-3xl border border-gray-200 bg-white/85 p-6 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wide text-gray-500">
                    Passo {step} de 4
                  </span>
                  <h2 className="mt-2 text-2xl font-semibold text-gray-900">
                    {STEP_CONTENT[step].headline}
                  </h2>
                  <p className="mt-2 text-sm text-gray-600">{STEP_CONTENT[step].description}</p>
                </div>
                <div className="sm:w-48">
                  <ProgressBar step={step} />
                </div>
              </div>

              {/* Step content */}
              {step === 1 && (
                <div className="space-y-6">
                  {services.length === 0 ? (
                    <EmptyState
                      title="Nenhum serviço disponível"
                      message="A loja ainda não publicou serviços para agendamento online."
                    />
                  ) : (
                    <div className="space-y-4">
                      {services.map((svc) => (
                        <ServiceCard
                          key={svc.id}
                          service={svc}
                          active={svc.id === selectedServiceId}
                          onSelect={() => setSelectedServiceId(svc.id)}
                          accent={accent}
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={!selectedServiceId}
                      className={clsx(
                        'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                        selectedServiceId
                          ? 'bg-gray-900 hover:bg-gray-800'
                          : 'cursor-not-allowed bg-gray-300'
                      )}
                    >
                      {STEP_CONTENT[step].cta}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  {selectedService?.providers.length === 0 ? (
                    <EmptyState
                      title="Sem profissionais vinculados"
                      message="Esse serviço ainda não possui profissionais disponíveis. Volte e escolha outro serviço ou tente mais tarde."
                    />
                  ) : (
                    <div className="space-y-4">
                      {selectedService?.providers.map((provider) => (
                        <ProviderCard
                          key={provider.id}
                          provider={provider}
                          active={provider.id === selectedProviderId}
                          onSelect={() => setSelectedProviderId(provider.id)}
                          accent={accent}
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <button
                      type="button"
                      onClick={prevStep}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-400"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={!selectedProviderId}
                      className={clsx(
                        'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                        selectedProviderId
                          ? 'bg-gray-900 hover:bg-gray-800'
                          : 'cursor-not-allowed bg-gray-300'
                      )}
                    >
                      {STEP_CONTENT[step].cta}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  {availability.loading ? (
                    <div className="flex h-32 items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white/70">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                    </div>
                  ) : !availability.hasAnySlot ? (
                    <EmptyState
                      title="Sem horários nesses próximos dias"
                      message="Não encontramos horários disponíveis nesse período. Tente um profissional diferente ou volte mais tarde."
                    />
                  ) : (
                    <>
                      {availability.error && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                          {availability.error}
                        </div>
                      )}
                      <div className="flex gap-3 overflow-x-auto pb-1">
                        {availability.days.map((day) => {
                          const hasSlots = availability.slotsByDay[day.key]?.length;
                          const isActive = day.key === selectedDayKey && Boolean(hasSlots);
                          const labelMuted = isActive ? 'text-white/70' : 'text-gray-500';
                          return (
                            <button
                              key={day.key}
                              type="button"
                              onClick={() => {
                                setSelectedDayKey(day.key);
                                const firstSlot =
                                  availability.slotsByDay[day.key]?.[0]?.isoStart ?? null;
                                setSelectedSlotIso(firstSlot);
                              }}
                              disabled={!hasSlots}
                              className={clsx(
                                'min-w-[140px] rounded-2xl border px-4 py-3 text-left transition',
                                isActive
                                  ? 'border-transparent bg-gray-900 text-white shadow-lg'
                                  : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300',
                                !hasSlots && 'cursor-not-allowed opacity-60'
                              )}
                            >
                              <div
                                className={clsx(
                                  'flex items-center gap-2 text-xs uppercase tracking-wide',
                                  labelMuted
                                )}
                              >
                                <Calendar className="h-3.5 w-3.5" />
                                {day.weekday}
                              </div>
                              <div className="mt-2 text-2xl font-semibold">{day.dayNumber}</div>
                              <p className={clsx('mt-1 text-xs', labelMuted)}>{day.fullLabel}</p>
                              {!hasSlots && (
                                <p className={clsx('mt-2 text-xs', labelMuted)}>Sem horários</p>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {selectedDayKey && availability.slotsByDay[selectedDayKey]?.length ? (
                        <div className="mt-4 flex flex-wrap gap-3">
                          {availability.slotsByDay[selectedDayKey].map((slot) => (
                            <button
                              key={slot.isoStart}
                              type="button"
                              onClick={() => setSelectedSlotIso(slot.isoStart)}
                              className={clsx(
                                'rounded-2xl px-4 py-2 text-sm font-semibold transition',
                                slot.isoStart === selectedSlotIso
                                  ? 'bg-gray-900 text-white shadow-lg'
                                  : 'bg-white text-gray-900 border border-gray-200 hover:border-gray-300'
                              )}
                            >
                              {slot.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-3xl border border-dashed border-gray-200 bg-white/70 p-6 text-center text-sm text-gray-500">
                          Escolha um dia com horários disponíveis.
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <button
                      type="button"
                      onClick={prevStep}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-400"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={!selectedSlot}
                      className={clsx(
                        'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                        selectedSlot
                          ? 'bg-gray-900 hover:bg-gray-800'
                          : 'cursor-not-allowed bg-gray-300'
                      )}
                    >
                      {STEP_CONTENT[step].cta}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <div className="grid gap-6">
                    <div>
                      <label className="text-sm font-semibold text-gray-700" htmlFor="customerName">
                        Nome completo
                      </label>
                      <input
                        id="customerName"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Como devemos te chamar?"
                        className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700" htmlFor="customerPhone">
                        Telefone / WhatsApp
                      </label>
                      <input
                        id="customerPhone"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(maskPhone(e.target.value))}
                        placeholder="(11) 91234-5678"
                        className={clsx(
                          'mt-2 w-full rounded-2xl border px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2',
                          phoneValid
                            ? 'border-gray-200 focus:ring-gray-900/10'
                            : 'border-amber-300 focus:border-amber-400 focus:ring-amber-200'
                        )}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Usaremos esse contato para confirmar o agendamento.
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700" htmlFor="customerEmail">
                        E-mail (opcional)
                      </label>
                      <input
                        id="customerEmail"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="voce@email.com"
                        type="email"
                        className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700" htmlFor="notes">
                        Observações (opcional)
                      </label>
                      <textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Algo que o profissional precisa saber?"
                        className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <button
                      type="button"
                      onClick={prevStep}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-400"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateBooking}
                      disabled={!canSubmit}
                      className={clsx(
                        'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                        canSubmit
                          ? undefined
                          : 'cursor-not-allowed opacity-60'
                      )}
                      style={
                        canSubmit
                          ? { background: `linear-gradient(135deg, ${accent}, ${accentSecondary})` }
                          : { background: 'linear-gradient(135deg, #cbd5f5, #e2e8f0)' }
                      }
                    >
                      {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {STEP_CONTENT[step].cta}
                    </button>
                  </div>
                  {createdBookingId && (
                    <div className="text-sm font-semibold text-emerald-600">
                      Pedido enviado! Em breve a loja entrará em contato para confirmar os detalhes.
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <SummaryCard
            storeName={store.name}
            service={selectedService}
            provider={selectedProvider}
            slotLabel={slotLabel}
            slotDate={dayLabel}
            priceLabel={formatPrice(selectedService?.price_cents)}
            durationLabel={formatDuration(selectedService?.duration_min)}
            accent={accent}
          />
        </div>
      </main>
    </div>
  );
};

export default PublicStorePage;
