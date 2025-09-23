import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

/** ---------- Tipos do DB ---------- */
export type StoreRow = {
  id: string;
  business_id: string;
  name: string;
  slug: string | null;
  address: any | null;
  timezone: string;
  slot_duration_min: number;
  buffer_before_min: number;
  buffer_after_min: number;
  max_parallel: number;
  // Branding / social (opcionais — ver migração abaixo)
  instagram_url?: string | null;
  tiktok_url?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type StoreHourRow = {
  store_id: string;
  day_of_week: number; // 0..6
  open_time: string | null; // "09:00:00"
  close_time: string | null; // "18:00:00"
  is_closed: boolean;
};

export type ServiceRow = {
  id: string;
  business_id: string;
  store_id: string | null;
  name: string;
  description?: string | null;
  price_cents: number;
  duration_min: number;
  is_active: boolean;
  color?: string | null;
  created_at?: string;
  updated_at?: string;
};

/** ---------- Utils ---------- */
const defaultHoursRows = (storeId: string): StoreHourRow[] =>
  Array.from({ length: 7 }, (_, i) => ({
    store_id: storeId,
    day_of_week: i,
    is_closed: i === 0, // dom fechado
    open_time: i === 0 ? null : '09:00:00',
    close_time: i === 0 ? null : '18:00:00',
  }));

/** ======================================================================
 * useStores — lista lojas do business e cria uma nova com horas default
 * =====================================================================*/
export function useStores(businessId?: string) {
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<StoreRow[]>([]);

  const fetchStores = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setStores((data ?? []) as StoreRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao carregar lojas');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const createStoreWithDefaults = useCallback(
    async (payload: Partial<StoreRow> = {}) => {
      if (!businessId) return null;

      // 1) cria a store
      const { data: store, error } = await supabase
        .from('stores')
        .insert({
          business_id: businessId,
          name: payload.name ?? 'Minha Loja',
          slug: payload.slug ?? null,
          address: payload.address ?? null,
          timezone: payload.timezone ?? 'America/Sao_Paulo',
          slot_duration_min: payload.slot_duration_min ?? 30,
          buffer_before_min: payload.buffer_before_min ?? 0,
          buffer_after_min: payload.buffer_after_min ?? 0,
          max_parallel: payload.max_parallel ?? 1,
          instagram_url: (payload as any).instagram_url ?? null,
          tiktok_url: (payload as any).tiktok_url ?? null,
          logo_url: (payload as any).logo_url ?? null,
          cover_url: (payload as any).cover_url ?? null,
          primary_color: (payload as any).primary_color ?? null,
          secondary_color: (payload as any).secondary_color ?? null,
        })
        .select('*')
        .single();

      if (error) {
        toast.error('Não foi possível criar a loja');
        throw error;
      }

      // 2) cria horas padrão
      const rows = defaultHoursRows(store.id);
      const { error: hErr } = await supabase
        .from('store_hours')
        .upsert(rows, { onConflict: 'store_id,day_of_week' });
      if (hErr) {
        toast.error('Loja criada, mas houve erro ao definir horários');
        throw hErr;
      }

      toast.success('Loja criada!');
      await fetchStores();
      return store as StoreRow;
    },
    [businessId, fetchStores]
  );

  return { loading, stores, fetchStores, createStoreWithDefaults };
}

/** ======================================================================
 * useStore — detalhe: store + hours + services, com mutações
 * =====================================================================*/
export function useStore(storeId?: string, businessId?: string) {
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<StoreRow | null>(null);
  const [hours, setHours] = useState<StoreHourRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);

  const refetch = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [{ data: s }, { data: hrs }, { data: svcs }] = await Promise.all([
        supabase.from('stores').select('*').eq('id', storeId).single(),
        supabase.from('store_hours').select('*').eq('store_id', storeId).order('day_of_week'),
        supabase.from('services').select('*').eq('store_id', storeId).order('name'),
      ]);
      setStore((s ?? null) as StoreRow | null);
      setHours((hrs ?? []) as StoreHourRow[]);
      setServices((svcs ?? []) as ServiceRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao carregar a loja');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  /** --------- Mutations --------- */
  const updateStore = useCallback(
    async (patch: Partial<StoreRow>) => {
      if (!storeId) return;
      const { error } = await supabase.from('stores').update(patch).eq('id', storeId);
      if (error) {
        toast.error('Erro ao salvar dados da loja');
        throw error;
      }
      toast.success('Dados salvos');
      await refetch();
    },
    [storeId, refetch]
  );

  const upsertHours = useCallback(
    async (rows: StoreHourRow[]) => {
      if (!storeId) return;
      const normalized = rows.map((r) => ({
        ...r,
        store_id: storeId,
        open_time: r.is_closed ? null : r.open_time,
        close_time: r.is_closed ? null : r.close_time,
      }));
      const { error } = await supabase
        .from('store_hours')
        .upsert(normalized, { onConflict: 'store_id,day_of_week' });
      if (error) {
        toast.error('Erro ao salvar horários');
        throw error;
      }
      toast.success('Horários salvos');
      await refetch();
    },
    [storeId, refetch]
  );

  // ✅ Novo saveServices com diff (upsert/insert/update + delete apenas dos removidos)
  const saveServices = useCallback(
    async (list: Array<Partial<ServiceRow> & {
      id?: string;            // pode vir undefined para novos
      name: string;
      duration_min: number;
      price_cents: number;
      is_active?: boolean;
      color?: string | null;
    }>) => {
      if (!storeId || !businessId) return;

      // 1) ids atuais
      const { data: current, error: curErr } = await supabase
        .from('services')
        .select('id')
        .eq('store_id', storeId);
      if (curErr) { toast.error('Erro ao carregar serviços'); throw curErr; }

      const currentIds = new Set((current ?? []).map(s => s.id as string));
      const incomingIds = new Set(list.filter(x => !!x.id).map(x => x.id!));

      // 2) delete somente o que foi removido
      const toDelete = [...currentIds].filter(id => !incomingIds.has(id));
      if (toDelete.length) {
        const { error: delErr } = await supabase.from('services').delete().in('id', toDelete);
        if (delErr) { toast.error('Erro ao remover serviços'); throw delErr; }
      }

      // 3) upsert cria/atualiza
      if (list.length) {
        const payload = list.map(x => ({
          id: x.id, // se undefined => insert
          business_id: businessId,
          store_id: storeId,
          name: x.name,
          duration_min: x.duration_min,
          price_cents: x.price_cents,
          is_active: x.is_active ?? true,
          color: x.color ?? null,
        }));

        const { error: upErr } = await supabase
          .from('services')
          .upsert(payload, { onConflict: 'id' });
        if (upErr) { toast.error('Erro ao salvar serviços'); throw upErr; }
      }

      toast.success('Serviços salvos');
      await refetch();
    },
    [storeId, businessId, refetch]
  );

  const removeService = useCallback(
    async (serviceId: string) => {
      const { error } = await supabase.from('services').delete().eq('id', serviceId);
      if (error) { toast.error('Erro ao remover serviço'); throw error; }
      await refetch();
    },
    [refetch]
  );

  /** --------- Derivados --------- */
  const hasAddress = useMemo(
    () =>
      !!(store?.address?.street || store?.address?.city || store?.address?.state || store?.address?.zip),
    [store]
  );
  const filledInfo = !!store?.name && !!store?.slug && hasAddress;
  const filledHours = hours.length === 7 && hours.every((d) => d.is_closed || (d.open_time && d.close_time));
  const filledTheme = !!(store?.primary_color && store?.secondary_color); // logo opcional
  const filledServices = services.length > 0;
  const allGood = filledInfo && filledHours && filledTheme && filledServices;

  return {
    loading,
    store,
    hours,
    services,
    refetch,
    updateStore,
    upsertHours,
    saveServices,
    removeService,
    completion: { filledInfo, filledHours, filledTheme, filledServices, allGood },
  };
}
