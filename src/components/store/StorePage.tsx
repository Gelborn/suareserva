import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

import { useBusiness } from '../../hooks/useBusiness';
import { useStore } from '../../hooks/useStores';

import Tabs, { TabKey } from './components/Tabs';
import OverviewTab from './tabs/OverviewTab';
import InfoTab from './tabs/InfoTab';
import HoursTab from './tabs/HoursTab';
import ThemeTab from './tabs/ThemeTab';
import ServicesTab from './tabs/ServicesTab';

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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-sm text-gray-500">
        Carregando…
      </div>
    );
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

  return (
    <div className="pb-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5">
        {/* Voltar (link), acima do título */}
        <button
          onClick={() => navigate('/stores')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </button>

        {/* Mega-card: header + tabs */}
        <div className="mt-2 bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-700/70 rounded-2xl shadow-sm overflow-hidden">
          {/* Header da loja */}
          <div className="px-4 sm:px-6 pt-5 pb-4">
            <h1 className="text-2xl sm:text-3xl font-bold">{store.name || 'Configurar Loja'}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Organize as informações, horários, serviços e o visual da sua página pública.
            </p>
          </div>

          {/* Barra de Tabs */}
          <div className="border-t border-gray-200/70 dark:border-gray-700/70">
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

        {/* Conteúdo das abas */}
        <div className="mt-6 space-y-6">
          {active === 'overview' && (
            <OverviewTab
              info={{
                name: store.name,
                slug: store.slug || '',
                street: store.address?.street,
                number: store.address?.number,
                district: store.address?.district,
                city: store.address?.city,
                state: store.address?.state,
                zip: store.address?.zip,
                instagram: (store as any).instagram_url || '',
                tiktok: (store as any).tiktok_url || '',
              }}
              logoUrl={(store as any).logo_url || null}
              primary={(store as any).primary_color || '#6366f1'}
              secondary={(store as any).secondary_color || '#8b5cf6'}
              completeness={completion}
              goTo={(t) => setActive(t)}
            />
          )}

          {active === 'info' && (
            <InfoTab
              value={{
                name: store.name,
                slug: store.slug || '',
                street: store.address?.street,
                number: store.address?.number,
                district: store.address?.district,
                city: store.address?.city,
                state: store.address?.state,
                zip: store.address?.zip,
                instagram: (store as any).instagram_url || '',
                tiktok: (store as any).tiktok_url || '',
              }}
              onChange={(v) =>
                updateStore({
                  name: v.name,
                  slug: v.slug || null,
                  address: {
                    street: v.street,
                    number: v.number,
                    district: v.district,
                    city: v.city,
                    state: v.state,
                    zip: v.zip,
                  },
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
                street: store.address?.street,
                number: store.address?.number,
                district: store.address?.district,
                city: store.address?.city,
                state: store.address?.state,
                zip: store.address?.zip,
                instagram: (store as any).instagram_url || '',
                tiktok: (store as any).tiktok_url || '',
              }}
              primary={(store as any).primary_color || '#6366f1'}
              secondary={(store as any).secondary_color || '#8b5cf6'}
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
