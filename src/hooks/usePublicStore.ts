import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { ServiceRow, StoreHourRow, StoreRow } from './useStores';

export type PublicTeamMember = {
  id: string;
  full_name: string;
  profile_pic?: string | null;
  max_parallel: number;
};

export type PublicService = ServiceRow & {
  providers: PublicTeamMember[];
};

export function usePublicStore(slug?: string | null) {
  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState<StoreRow | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [hours, setHours] = useState<StoreHourRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const refresh = useCallback(async () => {
    if (!slug) {
      setStore(null);
      setServices([]);
      setHours([]);
      setError(null);
      setNotFound(false);
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const { data: storeRow, error: storeErr } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (storeErr) throw storeErr;
      if (!storeRow) {
        setStore(null);
        setNotFound(true);
        setServices([]);
        setHours([]);
        return;
      }

      const storeId = (storeRow as StoreRow).id;

      const [hoursRes, servicesRes] = await Promise.all([
        supabase
          .from('store_hours')
          .select('*')
          .eq('store_id', storeId)
          .order('day_of_week'),
        supabase
          .from('services')
          .select(
            `
            id,
            business_id,
            store_id,
            name,
            description,
            duration_min,
            price_cents,
            is_active,
            color,
            service_pic,
            created_at,
            updated_at,
            service_providers (
              team_members:team_members!service_providers_team_member_id_fkey (
                id,
                full_name,
                profile_pic,
                max_parallel,
                is_active
              )
            )
          `
          )
          .eq('store_id', storeId)
          .eq('is_active', true)
          .order('name'),
      ]);

      if (hoursRes.error) throw hoursRes.error;
      if (servicesRes.error) throw servicesRes.error;

      const svcList: PublicService[] = (servicesRes.data ?? []).map((svc: any) => {
        const providerLinks = Array.isArray(svc.service_providers) ? svc.service_providers : [];
        const providers: PublicTeamMember[] = providerLinks
          .map((link: any) => link?.team_members ?? null)
          .filter((tm: any) => tm && (tm.is_active ?? true))
          .map((tm: any) => ({
            id: tm.id,
            full_name: tm.full_name,
            profile_pic: tm.profile_pic ?? null,
            max_parallel: tm.max_parallel ?? 1,
          }));

        const mapped: PublicService = {
          id: svc.id,
          business_id: svc.business_id,
          store_id: svc.store_id,
          name: svc.name,
          description: svc.description ?? null,
          duration_min: svc.duration_min,
          price_cents: svc.price_cents,
          is_active: true,
          color: svc.color ?? null,
          service_pic: svc.service_pic ?? null,
          created_at: svc.created_at ?? null,
          updated_at: svc.updated_at ?? null,
          providers,
        };
        return mapped;
      });

      setStore(storeRow as StoreRow);
      setHours((hoursRes.data ?? []) as StoreHourRow[]);
      setServices(svcList);
      setNotFound(false);
      setError(null);
    } catch (e: any) {
      console.error(e);
      setStore(null);
      setServices([]);
      setHours([]);
      setError('Não foi possível carregar os dados da loja.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const team = useMemo(() => {
    const map = new Map<string, PublicTeamMember>();
    services.forEach((svc) => {
      svc.providers.forEach((p) => {
        if (!map.has(p.id)) map.set(p.id, p);
      });
    });
    return Array.from(map.values()).sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-br'));
  }, [services]);

  return {
    loading,
    store,
    services,
    hours,
    team,
    error,
    notFound,
    refresh,
  };
}
