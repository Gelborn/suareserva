import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import {
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
  if (!cents && cents !== 0) return 'Sob consulta';
  return BRL.format(cents / 100);
};

const formatDuration = (minutes?: number | null) => {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts = [];
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

const ServiceCard: React.FC<{
  service: PublicService;
  active: boolean;
  onSelect: () => void;
  accent: string;
}> = ({ service, active, onSelect, accent }) => (
  <button
    onClick={onSelect}
    className={clsx(
      'group relative w-full rounded-2xl border bg-white/90 backdrop-blur transition-all text-left p-5',
      active
        ? 'border-transparent ring-2 ring-offset-2 ring-offset-white'
        : 'border-gray-200 hover:border-gray-300 hover:-translate-y-0.5'
    )}
    style={active ? { background: `linear-gradient(135deg, ${accent}20, ${accent}05)` } : {}}
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ backgroundColor: `${accent}15`, color: accent }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Serviço
          </span>
          <span className="text-sm text-gray-500">{formatDuration(service.duration_min)}</span>
        </div>
        <h3 className="mt-2 text-lg font-semibold text-gray-900">{service.name}</h3>
        {service.description && (
          <p className="mt-1 text-sm text-gray-600 line-clamp-3">{service.description}</p>
        )}
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-500">a partir de</p>
        <p className="text-xl font-bold text-gray-900">{formatPrice(service.price_cents)}</p>
      </div>
    </div>
    <div
      className={clsx(
        'mt-4 inline-flex items-center gap-2 text-sm font-semibold transition',
        active ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'
      )}
    >
      <span>Selecionar</span>
      <ArrowRight className="h-4 w-4" />
    </div>
  </button>
);

const ProviderChip: React.FC<{
  provider: PublicTeamMember;
  active: boolean;
  onSelect: () => void;
  accent: string;
}> = ({ provider, active, onSelect, accent }) => (
  <button
    onClick={onSelect}
    className={clsx(
      'flex items-center gap-3 rounded-2xl border px-4 py-3 transition bg-white/80 backdrop-blur',
      active ? 'border-transparent shadow ring-2 ring-offset-1' : 'border-gray-200 hover:border-gray-300'
    )}
    style={active ? { boxShadow: `0 10px 30px -15px ${accent}80`, ringColor: accent } : {}}
  >
    {provider.profile_pic ? (
      <img
        src={provider.profile_pic}
        alt={provider.full_name}
        className="h-12 w-12 rounded-2xl object-cover ring-1 ring-black/5"
      />
    ) : (
      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white grid place-items-center font-semibold">
        {initials(provider.full_name)}
      </div>
    )}
    <div className="flex-1 text-left">
      <p className="font-semibold text-gray-900">{provider.full_name}</p>
      <p className="text-xs text-gray-500">Profissional</p>
    </div>
    {active && (
      <Check className="h-5 w-5" style={{ color: accent }} />
    )}
  </button>
);

const EmptyState: React.FC<{ title: string; message: string }> = ({ title, message }) => (
  <div className="rounded-2xl border border-dashed border-gray-200 bg-white/70 p-8 text-center">
    <Sparkles className="mx-auto h-6 w-6 text-gray-400" />
    <h3 className="mt-3 text-base font-semibold text-gray-900">{title}</h3>
    <p className="mt-1 text-sm text-gray-600">{message}</p>
  </div>
);

const PublicStorePage: React.FC = () => {
  const params = useParams<{ slug: string }>();
  const rawSlug = params.slug ?? '';
  const slug = rawSlug.toLowerCase();

  const reserved = RESERVED_SLUGS.has(slug);
  const { loading, store, services, hours, error, notFound } = usePublicStore(
    reserved ? null : slug
  );

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
      toast.success('Pré-visualização criada. Ajuste o backend para confirmar reservas.');
      resetForm();
      setCreatedBookingId(selectedSlot.isoStart);
    } catch (err: any) {
      console.error(err);
      toast.error('Não foi possível criar a reserva agora.');
    } finally {
      setCreating(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900">
      <header className="relative overflow-hidden">
        {store.cover_url && (
          <div className="absolute inset-0">
            <img
              src={store.cover_url}
              alt={store.name ?? 'Foto de capa'}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/55 to-black/40" />
          </div>
        )}
        {!store.cover_url && (
          <div
            className="absolute inset-0 bg-gradient-to-br"
            style={{ backgroundImage: `linear-gradient(135deg, ${accent}, ${accentSecondary})` }}
          />
        )}
        <div className="relative z-10 mx-auto max-w-5xl px-6 pt-16 pb-14 text-white">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt={store.name ?? 'Logo'}
                  className="h-20 w-20 rounded-3xl border border-white/30 object-cover shadow-lg"
                />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-3xl border border-white/20 bg-white/10 text-2xl font-semibold">
                  {initials(store.name)}
                </div>
              )}
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-wide">
                  suareserva.online/{store.slug}
                </div>
                <h1 className="mt-3 text-3xl font-black sm:text-4xl">{store.name}</h1>
                {store.address_one_line && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-white/80">
                    <MapPin className="h-4 w-4 text-white/70" />
                    <span>{store.address_one_line}</span>
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
              {store.whatsapp && (
                <a
                  href={`https://wa.me/${onlyDigits(store.whatsapp)}`}
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
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {error}
          </div>
        )}

        <section className="mt-10 space-y-6">
          <div>
            <h2 className="text-2xl font-bold">1. Escolha um serviço</h2>
            <p className="mt-1 text-sm text-gray-600">
              Comece selecionando o serviço desejado. Você verá profissionais e horários disponíveis logo em seguida.
            </p>
          </div>

          {services.length === 0 ? (
            <EmptyState
              title="Nenhum serviço disponível"
              message="A loja ainda não publicou serviços para agendamento online."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
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
        </section>

        <section className="mt-14 space-y-6">
          <div>
            <h2 className="text-2xl font-bold">2. Escolha um profissional</h2>
            <p className="mt-1 text-sm text-gray-600">
              Mostramos quem está apto a executar o serviço escolhido.
            </p>
          </div>

          {!selectedService ? (
            <EmptyState
              title="Selecione um serviço primeiro"
              message="Para ver os profissionais disponíveis, selecione o serviço desejado."
            />
          ) : selectedService.providers.length === 0 ? (
            <EmptyState
              title="Sem profissionais vinculados"
              message="Esse serviço ainda não possui profissionais disponíveis. Escolha outro ou tente mais tarde."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {selectedService.providers.map((provider) => (
                <ProviderChip
                  key={provider.id}
                  provider={provider}
                  active={provider.id === selectedProviderId}
                  onSelect={() => setSelectedProviderId(provider.id)}
                  accent={accent}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-14 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">3. Escolha um horário</h2>
              <p className="mt-1 text-sm text-gray-600">
                Veja os próximos dias com horários disponíveis e escolha o que preferir.
              </p>
            </div>
            <div className="text-sm text-gray-500">
              <Clock className="mr-1 inline h-4 w-4 align-middle text-gray-400" />
              {store.slot_duration_min ?? 30} min por intervalo
            </div>
          </div>

          {!selectedProvider ? (
            <EmptyState
              title="Selecione um profissional"
              message="Escolha primeiro um profissional para ver os horários disponíveis."
            />
          ) : availability.loading ? (
            <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/70">
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
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  {availability.error}
                </div>
              )}
              <div className="flex gap-3 overflow-x-auto pb-1">
                {availability.days.map((day) => {
                  const hasSlots = availability.slotsByDay[day.key]?.length;
                  return (
                    <button
                      key={day.key}
                      onClick={() => {
                        setSelectedDayKey(day.key);
                        const firstSlot = availability.slotsByDay[day.key]?.[0]?.isoStart ?? null;
                        setSelectedSlotIso(firstSlot);
                      }}
                      disabled={!hasSlots}
                      className={clsx(
                        'min-w-[130px] rounded-2xl border px-4 py-3 text-left transition',
                        day.key === selectedDayKey && hasSlots
                          ? 'border-transparent bg-black text-white shadow'
                          : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300',
                        !hasSlots && 'cursor-not-allowed opacity-60'
                      )}
                    >
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {day.weekday}
                      </div>
                      <div className="mt-1 text-2xl font-semibold">{day.dayNumber}</div>
                      <p className="mt-1 text-xs text-gray-500">{day.fullLabel}</p>
                      {!hasSlots && <p className="mt-2 text-xs text-gray-400">Sem horários</p>}
                    </button>
                  );
                })}
              </div>

              {selectedDayKey && availability.slotsByDay[selectedDayKey]?.length ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  {availability.slotsByDay[selectedDayKey].map((slot) => (
                    <button
                      key={slot.isoStart}
                      onClick={() => setSelectedSlotIso(slot.isoStart)}
                      className={clsx(
                        'rounded-xl px-4 py-2 text-sm font-semibold transition',
                        slot.isoStart === selectedSlotIso
                          ? 'bg-black text-white shadow-lg'
                          : 'bg-white text-gray-900 border border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white/70 p-6 text-center text-sm text-gray-500">
                  Escolha um dia com horários disponíveis.
                </div>
              )}
            </>
          )}
        </section>

        <section className="mt-14 space-y-6">
          <div>
            <h2 className="text-2xl font-bold">4. Finalize o agendamento</h2>
            <p className="mt-1 text-sm text-gray-600">
              Informe seus dados e confirme o agendamento. Você receberá a confirmação pelo canal da loja.
            </p>
          </div>

          {!selectedSlot ? (
            <EmptyState
              title="Escolha um horário para continuar"
              message="Selecione um horário disponível para preencher seus dados e finalizar."
            />
          ) : (
            <div className="grid gap-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700" htmlFor="customerName">
                    Nome completo
                  </label>
                  <input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Como devemos te chamar?"
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10"
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
                      'mt-1 w-full rounded-2xl border px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2',
                      phoneValid
                        ? 'border-gray-200 focus:ring-black/10'
                        : 'border-amber-300 focus:border-amber-400 focus:ring-amber-200'
                    )}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Vamos usar esse contato para confirmar o agendamento.
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
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10"
                    type="email"
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
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
              </div>

              <aside className="flex h-full flex-col justify-between rounded-2xl border border-gray-200 bg-gray-50/60 p-5">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Resumo</h3>
                  <dl className="mt-4 space-y-3 text-sm text-gray-700">
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-gray-500">Serviço</dt>
                      <dd className="text-right font-semibold text-gray-900">{selectedService.name}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-gray-500">Profissional</dt>
                      <dd className="text-right text-gray-900">{selectedProvider?.full_name}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-gray-500">Horário</dt>
                      <dd className="text-right text-gray-900">
                        {selectedSlot.label}{' '}
                        <span className="text-gray-500">
                          · {availability.days.find((d) => d.key === selectedDayKey)?.fullLabel}
                        </span>
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-gray-500">Duração</dt>
                      <dd className="text-right text-gray-900">{formatDuration(selectedService.duration_min)}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-gray-500">Valor</dt>
                      <dd className="text-right text-gray-900">{formatPrice(selectedService.price_cents)}</dd>
                    </div>
                  </dl>
                </div>
                <div className="mt-6">
                  <button
                    onClick={handleCreateBooking}
                    disabled={!canSubmit}
                    className={clsx(
                      'inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                      canSubmit
                        ? 'hover:opacity-95'
                        : 'cursor-not-allowed opacity-60'
                    )}
                    style={{ background: `linear-gradient(135deg, ${accent}, ${accentSecondary})` }}
                  >
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Confirmar agendamento
                  </button>
                  <p className="mt-2 text-center text-xs text-gray-500">
                    Ao confirmar, você concorda com o contato do estabelecimento para finalizar detalhes.
                  </p>
                  {createdBookingId && (
                    <p className="mt-3 text-center text-sm text-emerald-600">
                      Pedido registrado! Ajuste o backend para salvar definitivamente.
                    </p>
                  )}
                </div>
              </aside>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default PublicStorePage;
