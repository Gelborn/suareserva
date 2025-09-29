import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Phone } from 'lucide-react';

import { useBusiness } from '../../hooks/useBusiness';
import { useStores } from '../../hooks/useStores';
import CreateStoreModal from './components/CreateStoreModal';

/* ---------------- UI helpers ---------------- */

const Card: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className = '', children }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/70 dark:border-gray-700/70 shadow-sm hover:shadow-md transition-shadow ${className}`}>
    {children}
  </div>
);

const StoreAvatar: React.FC<{ name?: string | null; logoUrl?: string | null }> = ({ name, logoUrl }) => {
  const initials = (name || 'SR')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'SR';

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name ?? 'Logo da loja'}
        className="w-11 h-11 rounded-xl object-cover ring-1 ring-black/5 dark:ring-white/5"
      />
    );
  }
  return (
    <div className="w-11 h-11 rounded-xl grid place-items-center text-white font-semibold bg-gradient-to-br from-indigo-500 to-violet-500 ring-1 ring-black/5 dark:ring-white/5">
      {initials}
    </div>
  );
};

type BadgeTone = 'ok' | 'warn';

const StatusBadge: React.FC<{ text: string; tone: BadgeTone }> = ({ text, tone }) => {
  const toneClass =
    tone === 'ok'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800'
      : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200/70 dark:border-amber-800';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs border ${toneClass}`}>
      {text}
    </span>
  );
};

// Skeleton (mesma altura dos cards)
const StoreSkeleton: React.FC = () => (
  <Card className="p-5 h-48 flex flex-col justify-between animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-gray-700" />
      <div className="min-w-0 flex-1">
        <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
        <div className="h-4 w-56 rounded bg-gray-200 dark:bg-gray-700 mb-1" />
        <div className="h-4 w-36 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="h-6 w-16 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
    <div className="h-9 w-full sm:w-28 self-end rounded-xl bg-gray-200 dark:bg-gray-700" />
  </Card>
);

/* ---------------- Page ---------------- */

const Stores: React.FC = () => {
  const navigate = useNavigate();
  const { business } = useBusiness();
  const { loading, stores, createStoreWithDefaults } = useStores(business?.id);

  const [openModal, setOpenModal] = useState(false);
  const empty = useMemo(() => !loading && stores.length === 0, [loading, stores]);

  const onOpenModal = () => setOpenModal(true);
  const onCloseModal = () => setOpenModal(false);

  const handleCreate = async (name: string) => {
    const created = await createStoreWithDefaults({ name });
    return created ? { id: created.id, name: created.name } : null;
  };

  const addressOneLine = (s: any): string | null =>
    s?.address_one_line || [s?.street, s?.number].filter(Boolean).join(', ') || null;

  const statusInfo = (s: any): { text: string; tone: BadgeTone } => {
    const hasBasics = !!(s?.name && (s?.address_one_line || s?.street));
    return hasBasics ? { text: 'Ativa', tone: 'ok' } : { text: 'Falta dados', tone: 'warn' };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Lojas</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Gerencie suas unidades/endereços.</p>
        </div>

        {!empty && !loading && (
          <button
            onClick={onOpenModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            + Nova loja
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <StoreSkeleton key={i} />
          ))}
        </div>
      ) : empty ? (
        <Card className="p-10 text-center">
          <div className="mx-auto w-12 h-12 grid place-items-center rounded-full bg-indigo-100 text-indigo-700">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold">Crie sua primeira loja</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Você vai configurar <strong>dados da loja</strong>, <strong>horários</strong>, <strong>serviços</strong> e a
            <strong> página pública</strong>.
          </p>
          <div className="mt-6">
            <button
              onClick={onOpenModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              Criar minha loja
            </button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stores.map((s: any) => {
            const addr = addressOneLine(s);
            const status = statusInfo(s);

            return (
              <Card key={s.id} className="p-5 h-48 flex flex-col justify-between">
                {/* 1ª linha: logo + nome + status */}
                <div className="flex items-center gap-3 min-w-0">
                  <StoreAvatar name={s.name} logoUrl={s.logo_url || null} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div
                        className="text-lg font-semibold break-words line-clamp-2"
                        title={s.name}
                      >
                        {s.name}
                      </div>
                      <StatusBadge text={status.text} tone={status.tone} />
                    </div>
                    {/* 2ª linha: endereço */}
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {addr || <span className="text-gray-400 dark:text-gray-500">Endereço não configurado</span>}
                    </div>
                    {/* 3ª linha: whatsapp */}
                    <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                      <Phone className="w-4 h-4 shrink-0 opacity-70" />
                      {s.whatsapp ? (
                        <span className="break-all">{s.whatsapp}</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">Sem número cadastrado</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => navigate(`/stores/${s.id}`)}
                    className="px-4 h-9 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium w-full sm:w-auto"
                  >
                    Ver loja
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de criação */}
      <CreateStoreModal
        open={openModal}
        onClose={onCloseModal}
        onCreate={handleCreate}
        onGoToStore={(id) => { onCloseModal(); navigate(`/stores/${id}`); }}
        onGoToList={() => { onCloseModal(); }}
      />
    </div>
  );
};

export default Stores;
