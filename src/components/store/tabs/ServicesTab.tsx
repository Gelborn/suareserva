import React from 'react';
import { Scissors, Plus, Trash2, Pencil, X, Check, AlertTriangle } from 'lucide-react';
import Card from '../components/Card';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';

type ServiceRow = {
  id: string;
  name: string;
  description?: string | null;
  price_cents: number;
  duration_min: number;
  is_active: boolean;
  color?: string | null;
  business_id: string;
  store_id: string;
};

type Props = {
  storeId?: string | null;
  businessId?: string | null;
  onAfterMutate?: () => void; // notifica o StorePage pra recarregar badges
};

const MINUTES_PRESETS = [15, 20, 30, 45, 60, 75, 90, 120];

const asMoney = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100);

// "123,45" -> 12345
const parsePriceToCents = (raw: string): number => {
  if (!raw) return 0;
  const s = raw.replace(/\./g, '').replace(',', '.'); // vírgula vira ponto
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

// aplica máscara: apenas dígitos e vírgula, máx 2 casas decimais
const maskPrice = (raw: string): string => {
  let s = raw.replace(/[^\d,]/g, ''); // só dígito e vírgula
  // uma vírgula só
  const parts = s.split(',');
  if (parts.length > 2) {
    s = parts[0] + ',' + parts.slice(1).join('').replace(/,/g, '');
  }
  // limita a 2 casas
  const [intPart, decPart] = s.split(',');
  if (decPart !== undefined) s = intPart + ',' + decPart.slice(0, 2);
  // remove zeros à esquerda do inteiro (mas mantém 0 quando apropriado)
  s = s.replace(/^0+(?=\d)/, '');
  return s;
};

export default function ServicesTab({ storeId, businessId, onAfterMutate }: Props) {
  const [services, setServices] = React.useState<ServiceRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');

  // Modal de criar/editar
  const [modal, setModal] = React.useState<
    | { open: false }
    | {
        open: true;
        mode: 'create' | 'edit';
        draft: Partial<ServiceRow>;
        priceStr: string;
        originalId?: string;
      }
  >({ open: false });

  // Modal de confirmação de deleção
  const [confirmDel, setConfirmDel] = React.useState<
    | { open: false }
    | { open: true; service: ServiceRow }
  >({ open: false });

  /* Fetch */
  const fetchServices = React.useCallback(async () => {
    if (!storeId || !businessId) {
      setServices([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Falha ao carregar serviços.');
    } finally {
      setLoading(false);
    }
  }, [storeId, businessId]);

  React.useEffect(() => { fetchServices(); }, [fetchServices]);

  const notifyMutate = React.useCallback(() => {
    onAfterMutate?.();
  }, [onAfterMutate]);

  /* Helpers */
  const openCreate = () => {
    if (!storeId || !businessId) {
      toast.error('Loja não encontrada.');
      return;
    }
    setModal({
      open: true,
      mode: 'create',
      draft: { name: '', duration_min: 30, price_cents: 0, is_active: true },
      priceStr: '',
    });
  };

  const openEdit = (s: ServiceRow) =>
    setModal({
      open: true,
      mode: 'edit',
      draft: { ...s },
      priceStr: (s.price_cents / 100)
        .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        .replace('.', ','),
      originalId: s.id,
    });

  const closeModal = () => setModal({ open: false });

  const upsert = async () => {
    if (!modal.open) return;
    if (!storeId || !businessId) {
      toast.error('Loja/negócio não encontrados.');
      return;
    }

    const price_cents = parsePriceToCents(modal.priceStr);
    const draft: Partial<ServiceRow> = {
      ...modal.draft,
      business_id: businessId,
      store_id: storeId,
      name: (modal.draft.name || '').trim(),
      description: (modal.draft.description ?? '') || null,
      price_cents,
      duration_min: Number(modal.draft.duration_min || 0),
      is_active: true,
      color: (modal.draft.color ?? '') || null,
    };

    if (!draft.name) return toast.error('Informe o nome do serviço.');
    if (!draft.duration_min || draft.duration_min <= 0) return toast.error('Duração inválida.');
    if (draft.price_cents == null || isNaN(draft.price_cents)) return toast.error('Preço inválido.');

    try {
      if (modal.mode === 'create') {
        const { error } = await supabase.from('services').insert(draft);
        if (error) throw error;
        toast.success('Serviço criado!');
      } else if (modal.mode === 'edit' && modal.originalId) {
        const { error } = await supabase.from('services').update(draft).eq('id', modal.originalId);
        if (error) throw error;
        toast.success('Serviço atualizado!');
      }
      closeModal();
      await fetchServices();
      notifyMutate(); // atualiza badges
    } catch (err: any) {
      console.error(err);
      if (err?.code === '42501') toast.error('Sem permissão (RLS).');
      else toast.error('Erro ao salvar serviço.');
    }
  };

  const askRemove = (s: ServiceRow) => setConfirmDel({ open: true, service: s });
  const closeRemove = () => setConfirmDel({ open: false });

  const confirmRemove = async () => {
    if (!confirmDel.open) return;
    const id = confirmDel.service.id;
    try {
      const { error } = await supabase.from('services').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      toast.success('Serviço removido.');
      closeRemove();
      await fetchServices();
      notifyMutate();
    } catch (err: any) {
      console.error(err);
      if (err?.code === '42501') toast.error('Sem permissão (RLS).');
      else toast.error('Falha ao remover.');
    }
  };

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => s.name.toLowerCase().includes(q));
  }, [services, search]);

  /* UI */
  return (
    <Card className="p-5 relative">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700">
            <Scissors className="w-5 h-5 text-gray-700 dark:text-slate-100" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Serviços</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">Cadastre os serviços oferecidos nesta loja.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <input
              className="w-56 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70
                         px-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
              placeholder="Buscar serviço…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium
                       bg-indigo-600 hover:bg-indigo-700 text-white transition"
          >
            <Plus className="w-4 h-4" />
            Novo serviço
          </button>
        </div>
      </div>

      <div className="sm:hidden mt-4">
        <input
          className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70
                     px-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500
                     focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
          placeholder="Buscar serviço…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-5">
        {!storeId || !businessId ? (
          <div className="py-10 text-center text-amber-600 text-sm">
            Loja/negócio não informados. Passe <code>storeId</code> e <code>businessId</code> para esta aba.
          </div>
        ) : loading ? (
          <div className="py-10 text-center text-gray-500 dark:text-slate-400 text-sm">Carregando serviços…</div>
        ) : services.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-slate-700 p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl grid place-items-center bg-gray-50 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700 mb-3">
              <Scissors className="w-5 h-5 text-gray-600 dark:text-slate-300" />
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-slate-100">Nenhum serviço</h4>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Adicione seu primeiro serviço para começar.</p>
            <div className="mt-4">
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium
                           bg-indigo-600 hover:bg-indigo-700 text-white transition"
              >
                <Plus className="w-4 h-4" />
                Adicionar serviço
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((s) => (
              <div key={s.id} className="group p-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 hover:shadow-sm transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-slate-100 truncate">{s.name}</div>
                    <div className="text-sm text-gray-600 dark:text-slate-400 mt-0.5">
                      {asMoney(s.price_cents)} · {s.duration_min} min
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* EDITAR — ícone visível no dark */}
                    <button
                      aria-label="Editar"
                      onClick={() => openEdit(s)}
                      className="p-2 rounded-lg border border-gray-200 dark:border-slate-700
                                 text-gray-700 dark:text-slate-100
                                 hover:bg-gray-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {/* REMOVER */}
                    <button
                      aria-label="Remover"
                      onClick={() => askRemove(s)}
                      className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-red-50/70 dark:hover:bg-rose-900/20
                                 text-rose-600 dark:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && services.length > 0 && (
              <div className="col-span-full text-sm text-gray-500 dark:text-slate-400 text-center py-6">
                Nenhum serviço encontrado para “{search}”.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Criar/Editar */}
      {modal.open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={closeModal} />
          <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center">
            <div className="relative sm:max-w-lg w-full sm:w-[520px] mx-auto sm:mx-0 sm:rounded-2xl rounded-t-2xl bg-white dark:bg-slate-900/95 border border-gray-200 dark:border-slate-800 shadow-xl p-5 sm:p-6 pb-[max(20px,env(safe-area-inset-bottom))]">
              {/* handle superior */}
              <div className="absolute left-1/2 -translate-x-1/2 top-2 sm:hidden">
                <div className="w-12 h-1.5 rounded-full bg-gray-300/80 dark:bg-slate-600" />
              </div>

              {/* botão fechar */}
              <button
                onClick={closeModal}
                className="absolute top-3 right-3 p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="pt-3 sm:pt-0">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  {modal.mode === 'create' ? 'Novo serviço' : 'Editar serviço'}
                </h4>
                <p className="text-sm text-gray-600 dark:text-slate-400">Defina nome, duração e preço.</p>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm mb-1 text-gray-700 dark:text-slate-300">Nome do serviço</label>
                  <input
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 px-3 py-2 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                    placeholder="Corte masculino"
                    value={modal.draft.name || ''}
                    onChange={(e) => setModal({ ...modal, draft: { ...modal.draft, name: e.target.value } })}
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm mb-1 text-gray-700 dark:text-slate-300">Duração (min)</label>
                    <select
                      className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 px-3 py-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                      value={modal.draft.duration_min || 30}
                      onChange={(e) => setModal({ ...modal, draft: { ...modal.draft, duration_min: parseInt(e.target.value, 10) || 0 } })}
                    >
                      {MINUTES_PRESETS.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-gray-700 dark:text-slate-300">Preço</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 px-3 py-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={modal.priceStr}
                      onChange={(e) => setModal({ ...modal, priceStr: maskPrice(e.target.value) })}
                      onKeyDown={(e) => { if (e.key === '.') e.preventDefault(); }}
                      onBlur={(e) => {
                        const cents = parsePriceToCents(e.target.value);
                        const normalized = (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('.', ',');
                        setModal({ ...modal, priceStr: cents ? normalized : '' });
                      }}
                    />
                    <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      {modal.priceStr ? asMoney(parsePriceToCents(modal.priceStr)) : 'R$ 0,00'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button onClick={closeModal} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition">
                  Cancelar
                </button>
                <button onClick={upsert} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition">
                  <Check className="w-4 h-4" />
                  {modal.mode === 'create' ? 'Adicionar' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de deleção */}
      {confirmDel.open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" onClick={closeRemove} />
          <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center">
            <div className="relative sm:max-w-md w-full sm:w-[480px] mx-auto sm:mx-0 sm:rounded-2xl rounded-t-2xl bg-white dark:bg-slate-900/95 border border-gray-200 dark:border-slate-800 shadow-xl p-5 sm:p-6">
              {/* botão fechar */}
              <button
                onClick={closeRemove}
                className="absolute top-3 right-3 p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900">
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-300" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Remover serviço?</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400 mt-0.5">
                    Esta ação desativa o serviço. Você poderá reativá-lo no banco se necessário.
                  </p>

                  <div className="mt-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-900/60 px-3 py-2 text-sm">
                    <div className="text-gray-900 dark:text-slate-100 font-medium truncate">
                      {confirmDel.service.name}
                    </div>
                    <div className="text-gray-600 dark:text-slate-400">
                      {asMoney(confirmDel.service.price_cents)} · {confirmDel.service.duration_min} min
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                      onClick={closeRemove}
                      className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmRemove}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold
                                 bg-rose-600 hover:bg-rose-700 text-white transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remover
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
