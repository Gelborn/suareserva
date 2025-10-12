// src/pages/stores/Stores.tsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Phone, ChevronRight } from 'lucide-react';

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

// Skeleton
const StoreSkeleton: React.FC = () => (
  <div className="p-5 min-h-[12rem] flex flex-col justify-between rounded-2xl border border-gray-200/70 dark:border-gray-700/70 bg-white dark:bg-gray-800 shadow-sm">
    <div className="flex items-start gap-3">
      <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-gray-700" />
      <div className="min-w-0 flex-1">
        <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
        <div className="h-4 w-56 rounded bg-gray-200 dark:bg-gray-700 mb-1" />
        <div className="h-4 w-36 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
    <div className="h-9 w-full sm:w-28 self-end rounded-xl bg-gray-200 dark:bg-gray-700" />
  </div>
);

/* ---------------- Page ---------------- */

const Stores: React.FC = () => {
  const navigate = useNavigate();
  const { business } = useBusiness();

  const {
    loading,
    stores,
    createStoreWithDefaults,
    getStatus,
    isActive,
  } = useStores(business?.id);

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
    const st = getStatus(s.id);
    if (!st) {
      const hasBasics = !!(s?.name && (s?.address_one_line || s?.street));
      return hasBasics ? { text: 'Checando…', tone: 'ok' } : { text: 'Checando…', tone: 'warn' };
    }
    return isActive(s.id)
      ? { text: 'Ativa', tone: 'ok' }
      : { text: 'Falta dados', tone: 'warn' };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Lojas</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Gerencie suas unidades/endereços.</p>
        </div>

        {!empty && !loading && (
          <button
            onClick={onOpenModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shrink-0 whitespace-nowrap"
          >
            + Nova loja
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StoreSkeleton key={i} />
          ))}
        </div>
      ) : empty ? (
        <Card className="p-10 text-center">
          <div className="mx-auto w-12 h-12 grid place-items-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Crie sua primeira loja</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Você vai configurar <strong>dados da loja</strong>, <strong>horários</strong>, <strong>serviços</strong> e a
            <strong> página pública</strong>.
          </p>
          <div className="mt-6">
            <button
              onClick={onOpenModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold whitespace-nowrap"
            >
              Criar minha loja
            </button>
          </div>
        </Card>
      ) : (
        // Cards clicáveis com chevron no rodapé (sempre visível)
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {stores.map((s: any) => {
            const addr = addressOneLine(s);
            const status = statusInfo(s);

            const go = () => navigate(`/stores/${s.id}`);
            const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                go();
              }
            };

            return (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={go}
                onKeyDown={onKey}
                aria-label={`Abrir loja ${s.name}`}
                className="group p-5 min-h-[12rem] flex flex-col justify-between
                           rounded-2xl border border-gray-200/70 dark:border-gray-700/70
                           bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition
                           hover:bg-gray-50 dark:hover:bg-gray-800/80 cursor-pointer
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
              >
                {/* Linha principal: avatar + conteúdo */}
                <div className="flex items-start gap-3 min-w-0">
                  <StoreAvatar name={s.name} logoUrl={s.logo_url || null} />

                  {/* Conteúdo */}
                  <div className="min-w-0 flex-1">
                    {/* Nome + status */}
                    <div className="flex items-start gap-2 flex-wrap">
                      <div
                        className="text-[15px] sm:text-lg font-semibold leading-snug break-words line-clamp-2 text-gray-900 dark:text-white"
                        title={s.name}
                      >
                        {s.name}
                      </div>
                      <StatusBadge text={status.text} tone={status.tone} />
                    </div>

                    {/* Endereço (quebra em até 2 linhas) */}
                    <div className="mt-0.5 text-[13px] sm:text-[14px] leading-snug text-gray-600 dark:text-gray-400 break-words line-clamp-2">
                      {addr || <span className="text-gray-400 dark:text-gray-500">Endereço não configurado</span>}
                    </div>

                    {/* WhatsApp */}
                    <div className="mt-1 text-[13px] sm:text-[14px] leading-snug text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Phone className="w-4 h-4 shrink-0 opacity-70" />
                      {s.whatsapp ? (
                        <span className="break-all">{s.whatsapp}</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">Sem número cadastrado</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rodapé: chevron sempre visível à direita */}
                <div className="flex items-center justify-end">
                  <ChevronRight
                    className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition"
                    aria-hidden="true"
                  />
                </div>
              </div>
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
