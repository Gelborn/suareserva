import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Instagram } from 'lucide-react';

import { useBusiness } from '../../hooks/useBusiness';
import { useStore } from '../../hooks/useStores';

import Tabs, { TabKey } from './components/Tabs';
import OverviewTab from './tabs/OverviewTab';
import InfoTab from './tabs/InfoTab';
import HoursTab from './tabs/HoursTab';
import ThemeTab from './tabs/ThemeTab';
import ServicesTab from './tabs/ServicesTab';
import LoadingScreen from "../../components/ui/LoadingScreen";

/* ───────────────────────── Helpers ───────────────────────── */

// Gera iniciais para fallback
const getInitials = (name?: string | null) => {
  if (!name) return 'SR';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'SR';
};

// Ícone TikTok custom (leve)
const TikTokIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14" {...props}>
    <path
      d="M14 3v3.2a6.8 6.8 0 0 0 6 0V9a9.2 9.2 0 0 1-6-2v7.2a4.2 4.2 0 1 1-3.6-4.15V12a2.2 2.2 0 1 0 1.6 2.11V3h2z"
      fill="currentColor"
    />
  </svg>
);

// Chip social (Instagram/TikTok)
const SocialChip: React.FC<{
  icon: React.ReactNode;
  label: string;
  href?: string | null;
  emptyText: string;
  color?: string;
}> = ({ icon, label, href, emptyText, color }) => {
  const commonClass =
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60';

  if (href && href.trim()) {
    const handle = href.replace(/^@/, '');
    const url =
      label.toLowerCase() === 'instagram'
        ? `https://instagram.com/${handle}`
        : `https://www.tiktok.com/@${handle}`;

    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={`${commonClass} border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-white/5`}
        title={`${label}: @${handle}`}
        style={color ? { color } : undefined}
      >
        {icon}
        <span className="truncate">@{handle}</span>
      </a>
    );
  }

  return (
    <span
      className={`${commonClass} border border-dashed border-gray-200 dark:border-slate-800 text-gray-400 dark:text-slate-400 select-none`}
    >
      {icon}
      <span className="truncate">{emptyText}</span>
    </span>
  );
};

// Avatar da loja
const StoreAvatar: React.FC<{ name?: string | null; logoUrl?: string | null }> = ({
  name,
  logoUrl,
}) => {
  const initials = getInitials(name);
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name ?? 'Logo da loja'}
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover
                   ring-1 ring-black/5 dark:ring-white/5"
      />
    );
  }
  return (
    <div
      className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl grid place-items-center text-white font-semibold
                 bg-gradient-to-br from-indigo-500 to-violet-500
                 ring-1 ring-black/5 dark:ring-white/5 select-none"
    >
      {initials}
    </div>
  );
};

/* ───────────────────────── Page ───────────────────────── */

const StorePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // /stores/:id
  const { business } = useBusiness();
  const {
    loading,
    store,
    hours,
    services,
    updateStore,
    upsertHours,
    saveServices,
    completion,
  } = useStore(id, business?.id);

  const [active, setActive] = React.useState<TabKey>('overview');

  // cores da loja
  const primary = (store as any)?.primary_color || '#6366f1';
  const secondary = (store as any)?.secondary_color || '#8b5cf6';

  if (loading) {
    return <LoadingScreen message="Carregando loja…" />;
  }

  if (!store) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-sm text-amber-600">
        Loja não encontrada.
        <div className="mt-4">
          <button
            onClick={() => navigate('/stores')}
            className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar para lojas
          </button>
        </div>
      </div>
    );
  }

  // ✅ usa a coluna gerada no banco
  const addressOneLine: string | null = (store as any)?.address_one_line || null;

  return (
    <div className="pb-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5">
        {/* Voltar */}
        <button
          onClick={() => navigate('/stores')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 dark:hover:text-slate-100"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </button>

        {/* Card principal */}
        <div className="mt-2 bg-white dark:bg-slate-900/95 border border-gray-200/70 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {/* Header da loja */}
          <div className="px-4 sm:px-6 pt-5 pb-4">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <StoreAvatar name={store.name} logoUrl={(store as any).logo_url || null} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1
                    className="text-2xl sm:text-3xl font-bold tracking-tight truncate"
                    style={{ color: primary }}
                    title={store.name || 'Configurar Loja'}
                  >
                    {store.name || 'Configurar Loja'}
                  </h1>
                </div>

                <p className="mt-1 text-sm text-gray-700 dark:text-slate-300 truncate">
                  {addressOneLine || (
                    <span className="text-gray-400 dark:text-slate-500">
                      Loja sem endereço cadastrado
                    </span>
                  )}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <SocialChip
                    icon={<Instagram className="w-3.5 h-3.5 opacity-90" />}
                    label="Instagram"
                    href={(store as any).instagram_url || ''}
                    emptyText="sem Instagram"
                    color={primary}
                  />
                  <SocialChip
                    icon={<TikTokIcon className="w-3.5 h-3.5 opacity-90" />}
                    label="TikTok"
                    href={(store as any).tiktok_url || ''}
                    emptyText="sem TikTok"
                    color={primary}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-gray-200/70 dark:border-slate-800">
            <Tabs
              value={active}
              onChange={setActive}
              badges={{
                overview: completion.allGood,
                info: completion.filledInfo,
                hours: completion.filledHours,
                services: completion.filledServices,
                theme: completion.filledTheme,
              }}
              className="px-4 sm:px-6"
            />
          </div>
        </div>

        {/* Conteúdo */}
        <div className="mt-6 space-y-6">
          {active === 'overview' && (
            <OverviewTab
              storeId={store.id}
              info={{
                name: store.name,
                slug: store.slug || '',
                // 👇 agora vindo dos campos granulares
                street: (store as any).street || '',
                number: (store as any).number || '',
                district: (store as any).district || '',
                city: (store as any).city || '',
                state: (store as any).state || '',
                zip: (store as any).zip || '',
                instagram: (store as any).instagram_url || '',
                tiktok: (store as any).tiktok_url || '',
              }}
              logoUrl={(store as any).logo_url || null}
              primary={primary}
              secondary={secondary}
              completeness={completion}
              goTo={(t) => setActive(t)}
            />
          )}

          {active === 'info' && (
            <InfoTab
              value={{
                name: store.name,
                slug: store.slug || '',
                street: (store as any).street || '',
                number: (store as any).number || '',
                district: (store as any).district || '',
                city: (store as any).city || '',
                state: (store as any).state || '',
                zip: (store as any).zip || '',
                instagram: (store as any).instagram_url || '',
                tiktok: (store as any).tiktok_url || '',
              }}
              onChange={(v) =>
                updateStore({
                  name: v.name,
                  slug: v.slug || null,
                  // 👇 gravando nos campos top-level (o JSON address foi removido)
                  street: v.street || null,
                  number: v.number || null,
                  district: v.district || null,
                  city: v.city || null,
                  state: v.state || null,
                  zip: v.zip || null,
                  instagram_url: v.instagram || null,
                  tiktok_url: v.tiktok || null,
                })
              }
            />
          )}

          {active === 'hours' && (
            <HoursTab
              hours={hours}
              onChangeHours={(next) => upsertHours(next)}
              slotMin={store.slot_duration_min}
              bufferMin={store.buffer_before_min}
              onChangeSlot={(n) => updateStore({ slot_duration_min: n })}
              onChangeBuffer={(n) => updateStore({ buffer_before_min: n })}
            />
          )}

          {active === 'services' && (
            <ServicesTab
              services={services.map((s) => ({
                id: s.id,
                name: s.name,
                minutes: s.duration_min,
                price: Math.round(s.price_cents / 100),
              }))}
              onChange={(list) =>
                saveServices(
                  list.map((x) => ({
                    id: x.id,
                    name: x.name,
                    duration_min: x.minutes,
                    price_cents: Math.round((x.price ?? 0) * 100),
                    is_active: true,
                  }))
                )
              }
            />
          )}

          {active === 'theme' && (
            <ThemeTab
              info={{
                name: store.name,
                slug: store.slug || '',
                street: (store as any).street || '',
                number: (store as any).number || '',
                district: (store as any).district || '',
                city: (store as any).city || '',
                state: (store as any).state || '',
                zip: (store as any).zip || '',
                instagram: (store as any).instagram_url || '',
                tiktok: (store as any).tiktok_url || '',
              }}
              primary={primary}
              secondary={secondary}
              onPrimary={(v) => updateStore({ primary_color: v })}
              onSecondary={(v) => updateStore({ secondary_color: v })}
              logoUrl={(store as any).logo_url || null}
              coverUrl={(store as any).cover_url || null}
              onLogo={(url) => updateStore({ logo_url: url })}
              onCover={(url) => updateStore({ cover_url: url })}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StorePage;
