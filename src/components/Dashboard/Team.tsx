import React from 'react';
import { Plus, Search, Loader2, Mail, Phone, Store, Users, CheckCircle2, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import Card from '../store/components/Card';
import { useBusiness } from '../../hooks/useBusiness';
import { useStores } from '../../hooks/useStores';
import { useNavigate } from 'react-router-dom';
import MemberModal, { TeamMemberRow } from '../team/MemberModal';

/* -------------------- Utils -------------------- */
const onlyDigits = (s?: string | null) => String(s ?? '').replace(/\D+/g, '');
const fmtPhoneBr = (raw?: string | null) => {
  const d = onlyDigits(raw).slice(0, 11);
  if (!d) return '';
  if (d.length <= 10) return d.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*$/, (_, a, b, c) =>
    `${a ? `(${a}${a.length === 2 ? ')' : ''}` : ''}${a && a.length === 2 ? ' ' : ''}${b}${c ? `-${c}` : ''}`.trim()
  );
  return d.replace(/^(\d{0,2})(\d{0,5})(\d{0,4}).*$/, (_, a, b, c) =>
    `${a ? `(${a}) ` : ''}${b}${c ? `-${c}` : ''}`.trim()
  );
};

const initialsOf = (name?: string | null) => {
  const parts = String(name ?? '').trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || 'TM';
};

const Avatar: React.FC<{ name?: string | null; src?: string | null; size?: number; className?: string }> = ({ name, src, size = 56, className = '' }) => {
  const cls = `rounded-xl object-cover ring-1 ring-black/5 dark:ring-white/5 ${className}`;
  if (src) return <img src={src} alt={name ?? 'Membro'} style={{ width: size, height: size }} className={cls} />;
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-xl grid place-items-center text-white font-semibold bg-gradient-to-br from-indigo-500 to-violet-500 ring-1 ring-black/5 dark:ring-white/5 select-none ${className}`}
    >
      {initialsOf(name)}
    </div>
  );
};

type MemberWithStore = TeamMemberRow & { store_name?: string | null; service_count?: number };

/* -------------------- PWA / Standalone detection -------------------- */
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

/* -------------------- Pull to refresh (mobile) -------------------- */
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

/* -------------------- Component -------------------- */
const Team: React.FC = () => {
  const { business } = useBusiness();
  const navigate = useNavigate();

  const businessId = business?.id;
  const { stores, loading: storesLoading } = useStores(businessId);

  const [loading, setLoading] = React.useState(true);
  const [members, setMembers] = React.useState<MemberWithStore[]>([]);
  const [query, setQuery] = React.useState('');
  const [hasActiveStore, setHasActiveStore] = React.useState<boolean | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<'create' | 'edit'>('create');
  const [editing, setEditing] = React.useState<MemberWithStore | null>(null);

  const refresh = React.useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const { data: has, error: herr } = await supabase.rpc('business_has_active_store', { p_business_id: businessId });
      if (herr) throw herr;
      setHasActiveStore(!!has);

      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          stores!team_members_store_id_fkey(name)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const ids = (data ?? []).map((m: any) => m.id);
      let counts: Record<string, number> = {};
      if (ids.length) {
        const { data: links } = await supabase
          .from('service_providers')
          .select('team_member_id')
          .in('team_member_id', ids);
        (links ?? []).forEach((l: any) => {
          counts[l.team_member_id] = (counts[l.team_member_id] || 0) + 1;
        });
      }

      const mapped: MemberWithStore[] = (data ?? []).map((m: any) => ({
        ...m,
        store_name: m.stores?.name ?? null,
        service_count: counts[m.id] || 0,
      }));

      setMembers(mapped);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar equipe');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  React.useEffect(() => { refresh(); }, [refresh]);

  const filtered = React.useMemo(
    () =>
      members.filter((m) =>
        m.full_name.toLowerCase().includes(query.toLowerCase()) ||
        (m.store_name || '').toLowerCase().includes(query.toLowerCase())
      ),
    [members, query]
  );

  const storeOptions = stores.map(s => ({ id: s.id, name: s.name }));

  const openCreate = () => { setModalMode('create'); setEditing(null); setModalOpen(true); };
  const openEdit = (m: MemberWithStore) => { setModalMode('edit'); setEditing(m); setModalOpen(true); };

  /* ---- PTR hook attached to the scrollable list ---- */
  const listRef = React.useRef<HTMLDivElement>(null);
  const { offset, refreshing } = usePTR(listRef, async () => { await refresh(); });

  /* ---- PWA-aware FAB bottom ---- */
  const isPwa = useIsStandalone();
  const fabBottom = React.useMemo(() => {
    // base = 80px (equivale a bottom-20)
    // +24px para subir um pouco no PWA
    // + env(safe-area-inset-bottom) para iOS
    const base = 80;
    return isPwa
      ? `calc(${base + 24}px + env(safe-area-inset-bottom, 0px))`
      : `${base}px`;
  }, [isPwa]);

  /* -------------------- Empty states -------------------- */
  if (!loading && members.length === 0) {
    if (hasActiveStore === false) {
      return (
        <div className="space-y-5 sm:space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Time</h1>
          </div>
          <Card className="p-6 sm:p-8 text-center">
            <Store className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400 mx-auto" />
            <h3 className="mt-3 text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100">Você precisa ativar uma loja primeiro</h3>
            <p className="mt-1 text-sm sm:text-base text-gray-600 dark:text-slate-400">
              Cadastre os dados essenciais, horários e ao menos um serviço para ativar uma loja. Depois, volte para criar membros do time.
            </p>
            <div className="mt-5">
              <button
                onClick={() => navigate('/stores')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Ir para Lojas
              </button>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-5 sm:space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Time</h1>
        </div>
        <Card className="p-6 sm:p-8 text-center">
          <Users className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400 mx-auto" />
          <h3 className="mt-3 text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100">Nenhum membro cadastrado</h3>
          <p className="mt-1 text-sm sm:text-base text-gray-600 dark:text-slate-400">
            Crie o primeiro membro da sua equipe e selecione os serviços que ele executa.
          </p>
          <div className="mt-5">
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={storesLoading || !storeOptions.length}
            >
              <Plus className="w-4 h-4" />
              Novo membro
            </button>
          </div>
        </Card>

        <MemberModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          mode={modalMode}
          businessId={businessId!}
          stores={storeOptions}
          member={editing}
          onSaved={refresh}
        />
      </div>
    );
  }

  /* -------------------- List (sem Card por trás) -------------------- */
  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header + busca */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Time</h1>

        <div className="flex items-stretch gap-2">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-300" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou loja…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700
                         bg-white dark:bg-slate-900/70 text-gray-900 dark:text-slate-100
                         placeholder-gray-400 dark:placeholder-slate-400"
            />
          </div>

          {/* Botão Novo (desktop) */}
          <button
            onClick={openCreate}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={hasActiveStore === false}
            title={hasActiveStore === false ? 'É necessário ter uma loja ativa' : 'Novo membro'}
          >
            <Plus className="w-4 h-4" />
            Novo
          </button>
        </div>
      </div>

      {/* Contêiner scrollável sem fundo */}
      <div
        className="relative overflow-auto"
        style={{ maxHeight: 'calc(100vh - 220px)' }}
        ref={listRef}
      >
        {/* PTR header (deslize para atualizar) */}
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

        {loading ? (
          <div className="p-5 sm:p-6 text-center text-gray-500 dark:text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
            Carregando equipe…
          </div>
        ) : (
          /* Lista em coluna com gaps e somente os mini-cards */
          <div className="flex flex-col gap-2 sm:gap-3 px-1 sm:px-0 pb-3 sm:pb-4">
            {filtered.map((m) => (
              <div
                key={m.id}
                className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4
                           rounded-2xl border border-gray-200/70 dark:border-slate-800/60
                           bg-white dark:bg-slate-900/60
                           shadow-sm hover:shadow transition
                           hover:bg-gray-50 dark:hover:bg-slate-800/70"
              >
                {/* Avatar */}
                <Avatar
                  name={m.full_name}
                  src={m.profile_pic || null}
                  size={48}
                  className="sm:!w-14 sm:!h-14"
                />

                {/* Conteúdo */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                    <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 truncate">
                      {m.full_name}
                    </div>

                    {m.is_active ? (
                      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 rounded-full
                                       bg-emerald-50 text-emerald-700 border border-emerald-200
                                       dark:bg-emerald-900/25 dark:text-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 rounded-full
                                       bg-gray-50 text-gray-600 border border-gray-200
                                       dark:bg-white/5 dark:text-slate-300 dark:border-slate-700">
                        Inativo
                      </span>
                    )}
                  </div>

                  {/* Linha de meta info */}
                  <div className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-slate-300 flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="inline-flex items-center gap-1.5">
                      <Store className="w-4 h-4 opacity-80" />
                      <span className="truncate max-w-[10rem] sm:max-w-none">{m.store_name || '—'}</span>
                    </span>

                    {m.email && (
                      <a className="inline-flex items-center gap-1.5 hover:underline" href={`mailto:${m.email}`}>
                        <Mail className="w-4 h-4 opacity-80" />
                        <span className="truncate max-w-[9rem] sm:max-w-none">{m.email}</span>
                      </a>
                    )}

                    {m.phone && (
                      <a className="inline-flex items-center gap-1.5 hover:underline" href={`tel:${onlyDigits(m.phone)}`}>
                        <Phone className="w-4 h-4 opacity-80" />
                        {fmtPhoneBr(m.phone)}
                      </a>
                    )}

                    <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-500 dark:text-slate-400">
                      {m.service_count || 0} serviço(s)
                    </span>
                  </div>
                </div>

                {/* Ações */}
                <div className="shrink-0">
                  {/* Mobile: ícone */}
                  <button
                    onClick={() => openEdit(m)}
                    className="sm:hidden inline-grid place-items-center size-9 rounded-xl
                               border border-gray-200 dark:border-slate-700
                               bg-white dark:bg-slate-900/70
                               text-gray-800 dark:text-slate-100
                               hover:bg-gray-50 dark:hover:bg-slate-800"
                    aria-label="Editar membro"
                    title="Editar membro"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {/* Desktop: botão com label */}
                  <button
                    onClick={() => openEdit(m)}
                    className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl
                               border border-gray-200 dark:border-slate-700
                               bg-white dark:bg-slate-900/70
                               text-gray-800 dark:text-slate-100
                               hover:bg-gray-50 dark:hover:bg-slate-800"
                    title="Editar membro"
                  >
                    <Pencil className="w-4 h-4" />
                    Editar
                  </button>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="p-5 sm:p-6 text-center text-gray-500 dark:text-slate-400">
                Nenhum membro corresponde à busca.
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB 'Novo' apenas no mobile */}
      <button
        onClick={openCreate}
        disabled={hasActiveStore === false}
        style={{ bottom: fabBottom }}
        className="sm:hidden fixed right-4 z-40 rounded-2xl shadow-lg
                   px-4 py-3 bg-indigo-600 text-white active:scale-[0.98]"
        title={hasActiveStore === false ? 'É necessário ter uma loja ativa' : 'Novo membro'}
      >
        <span className="inline-flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Novo
        </span>
      </button>

      <MemberModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        businessId={businessId!}
        stores={storeOptions}
        member={editing}
        onSaved={refresh}
      />
    </div>
  );
};

export default Team;
