// src/pages/stores/Stores.tsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Phone, ChevronRight, Plus, Search, Loader2 } from 'lucide-react';

import { useBusiness } from '../../hooks/useBusiness';
import { useStores } from '../../hooks/useStores';
import CreateStoreModal from './components/CreateStoreModal';

/* ---------------- UI helpers ---------------- */

const Card: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className = '', children }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/70 dark:border-gray-700/70 shadow-sm hover:shadow-md transition-shadow ${className}`}>
    {children}
  </div>
);

const StoreAvatar: React.FC<{
  name?: string | null;
  logoUrl?: string | null;
  size?: number;
  className?: string;
}> = ({ name, logoUrl, size = 48, className = '' }) => {
  const initials = (name || 'SR')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'SR';

  const style = { width: size, height: size };

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name ?? 'Logo da loja'}
        style={style}
        className={`rounded-xl object-cover ring-1 ring-black/5 dark:ring-white/5 ${className}`}
      />
    );
  }
  return (
    <div
      style={style}
      className={`rounded-xl grid place-items-center text-white font-semibold bg-gradient-to-br from-indigo-500 to-violet-500 ring-1 ring-black/5 dark:ring-white/5 ${className}`}
    >
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
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs border ${toneClass}`}>
      {text}
    </span>
  );
};

// Skeleton
const StoreSkeleton: React.FC = () => (
  <div className="p-3 sm:p-4 flex items-start gap-3 sm:gap-4 rounded-2xl border border-gray-200/70 dark:border-gray-700/70 bg-white dark:bg-gray-800 shadow-sm">
    <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700" />
    <div className="min-w-0 flex-1">
      <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
      <div className="h-3 w-64 rounded bg-gray-200 dark:bg-gray-700 mb-1" />
      <div className="h-3 w-40 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
    <div className="w-24 h-9 rounded-xl bg-gray-200 dark:bg-gray-700 hidden sm:block" />
    <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700 sm:hidden" />
  </div>
);

/* ---------------- PWA / Standalone detection ---------------- */
function useIsStandalone() {
  const [standalone, setStandalone] = React.useState(false);

  React.useEffect(() => {
    const check = () => {
      const isStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches;
      const isIOSStandalone = (navigator as any).standalone === true;
      setStandalone(Boolean(isStandalone || isIOSStandalone));
    };
    check();

    const mq = window.matchMedia?.('(display-mode: standalone)');
    mq?.addEventListener?.('change', check);
    return () => mq?.removeEventListener?.('change', check);
  }, []);

  return standalone;
}

/* ---------------- Pull to refresh (mobile) ---------------- */
function usePTR(ref: React.RefObject<HTMLDivElement>, onRefresh: () => Promise<any> | void) {
  const pulling = React.useRef(false);
  const startY = React.useRef(0);
  const [offset, setOffset] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const MAX = 96;           // px
    const THRESHOLD = 64;     // px
    const EASING = (x: number) => 1 - Math.pow(1 - x, 2);

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (el.scrollTop > 0) return;
      pulling.current = true;
      startY.current = e.touches[0].clientY;
      setOffset(0);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) return;
      e.preventDefault();
      const eased = EASING(Math.min(dy, MAX) / MAX) * MAX;
      setOffset(eased);
    };

    const end = async () => {
      if (!pulling.current) return;
      const should = offset >= THRESHOLD;
      pulling.current = false;
      if (should) {
        setRefreshing(true);
        setOffset(THRESHOLD);
        try { await onRefresh(); }
        finally {
          setTimeout(() => { setOffset(0); setRefreshing(false); }, 300);
        }
      } else {
        setOffset(0);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove as any);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  }, [ref, onRefresh, offset, refreshing]);

  return { offset, refreshing };
}

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

  const [query, setQuery] = useState('');
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

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return (stores || []).filter((s: any) => {
      const addr = (addressOneLine(s) || '').toLowerCase();
      return (s?.name || '').toLowerCase().includes(q) || addr.includes(q);
    });
  }, [stores, query]);

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

  /* ---- FAB bottom ciente de PWA + safe-area ---- */
  const isPwa = useIsStandalone();
  const fabBottom = React.useMemo(() => {
    const base = 80; // ~ bottom-20
    return isPwa
      ? `calc(${base + 24}px + env(safe-area-inset-bottom, 0px))`
      : `${base}px`;
  }, [isPwa]);

  /* ---- PTR ---- */
  const listRef = React.useRef<HTMLDivElement>(null);
  const { offset, refreshing } = usePTR(listRef, async () => {
    navigate(0);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-gray-900 dark:text-gray-100">
      {/* Header + busca */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Lojas</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Gerencie suas unidades/endereços.</p>
        </div>

        <div className="flex items-stretch gap-2">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-300" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por loja ou endereço…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700
                         bg-white dark:bg-slate-900/70 text-gray-900 dark:text-slate-100
                         placeholder-gray-400 dark:placeholder-slate-400"
            />
          </div>

          {!empty && !loading && (
            <button
              onClick={onOpenModal}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shrink-0 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Nova loja
            </button>
          )}
        </div>
      </div>

      {/* Scroll + PTR */}
      {loading ? (
        <div
          className="relative overflow-auto"
          style={{ maxHeight: 'calc(100vh - 220px)' }}
          ref={listRef}
        >
          <div
            className="flex items-center justify-center text-xs text-gray-500 dark:text-slate-400 transition-all"
            style={{ height: `${offset}px` }}
          >
            {refreshing ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Atualizando…
              </span>
            ) : offset > 0 ? 'Solte para atualizar' : null}
          </div>

          <div className="flex flex-col gap-2 sm:gap-3 px-1 sm:px-0 pb-3 sm:pb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StoreSkeleton key={i} />
            ))}
          </div>
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
              <Plus className="w-5 h-5" />
              Criar minha loja
            </button>
          </div>
        </Card>
      ) : (
        <div
          className="relative overflow-auto"
          style={{ maxHeight: 'calc(100vh - 220px)' }}
          ref={listRef}
        >
          <div
            className="flex items-center justify-center text-xs text-gray-500 dark:text-slate-400 transition-all"
            style={{ height: `${offset}px` }}
          >
            {refreshing ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Atualizando…
              </span>
            ) : offset > 0 ? 'Solte para atualizar' : null}
          </div>

          {/* LISTA estilo Time, com QUEBRA de linhas */}
          <div className="flex flex-col gap-2 sm:gap-3 px-1 sm:px-0 pb-3 sm:pb-4">
            {filtered.map((s: any) => {
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
                  className="p-3 sm:p-4 flex items-start gap-3 sm:gap-4
                             rounded-2xl border border-gray-200/70 dark:border-slate-800/60
                             bg-white dark:bg-slate-900/60
                             shadow-sm hover:shadow transition
                             hover:bg-gray-50 dark:hover:bg-slate-800/70"
                >
                  {/* Avatar */}
                  <StoreAvatar name={s.name} logoUrl={s.logo_url || null} size={48} className="sm:!w-14 sm:!h-14" />

                  {/* Conteúdo */}
                  <div className="min-w-0 flex-1">
                    {/* Nome + status (SEM truncate) */}
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                      <div
                        className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 whitespace-normal break-words"
                        title={s.name}
                      >
                        {s.name}
                      </div>
                      <StatusBadge text={status.text} tone={status.tone} />
                    </div>

                    {/* Meta info: endereço e WhatsApp (SEM truncar) */}
                    <div className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-slate-300 flex flex-wrap items-start gap-2 sm:gap-3">
                      <span className="inline-flex items-start gap-1.5">
                        <Building2 className="w-4 h-4 opacity-80 mt-[2px]" />
                        <span className="whitespace-normal break-words max-w-full">
                          {addr || <span className="text-gray-400 dark:text-gray-500">Endereço não configurado</span>}
                        </span>
                      </span>

                      <span className="inline-flex items-start gap-1.5">
                        <Phone className="w-4 h-4 opacity-80 mt-[2px]" />
                        {s.whatsapp ? (
                          <span className="break-all">{s.whatsapp}</span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">Sem número cadastrado</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="shrink-0">
                    {/* Mobile: ícone */}
                    <span
                      className="sm:hidden inline-grid place-items-center size-9 rounded-xl
                                 border border-gray-200 dark:border-slate-700
                                 bg-white dark:bg-slate-900/70
                                 text-gray-800 dark:text-slate-100"
                      aria-hidden="true"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </span>

                    {/* Desktop: botão com label */}
                    <span
                      className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl
                                 border border-gray-200 dark:border-slate-700
                                 bg-white dark:bg-slate-900/70
                                 text-gray-800 dark:text-slate-100"
                      aria-hidden="true"
                    >
                      Abrir
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="p-5 sm:p-6 text-center text-gray-500 dark:text-slate-400">
                {query ? 'Nenhuma loja corresponde à busca.' : 'Nenhuma loja encontrada.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FAB 'Nova loja' — mobile, PWA + safe-area */}
      {!loading && (
        <button
          onClick={onOpenModal}
          style={{ bottom: fabBottom }}
          className="sm:hidden fixed right-4 z-40 rounded-2xl shadow-lg
                     px-4 py-3 bg-indigo-600 text-white active:scale-[0.98]"
          title="Nova loja"
        >
          <span className="inline-flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Nova loja
          </span>
        </button>
      )}

      {/* Modal */}
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
