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
      const { data, error: rpcError } = await supabase.rpc('get_public_store', { p_slug: slug });
      if (rpcError) throw rpcError;
      if (!data) {
        setStore(null);
        setNotFound(true);
        setServices([]);
        setHours([]);
        return;
      }

      const payload = data as {
        store: StoreRow | null;
        hours: StoreHourRow[] | null;
        services: Array<
          PublicService & {
            providers?: PublicTeamMember[];
            service_providers?: any;
          }
        > | null;
      };

      if (!payload.store) {
        setStore(null);
        setNotFound(true);
        setServices([]);
        setHours([]);
        return;
      }

      const normalizedHours = Array.isArray(payload.hours)
        ? (payload.hours as StoreHourRow[]).map((row) => ({
            ...row,
            day_of_week: Number(row.day_of_week),
            is_closed: Boolean(row.is_closed),
          }))
        : [];

      const normalizedServices: PublicService[] = Array.isArray(payload.services)
        ? payload.services.map((svc: any) => {
            const providersSrc = Array.isArray(svc.providers)
              ? svc.providers
              : Array.isArray(svc.service_providers)
              ? svc.service_providers
              : [];
            const providers: PublicTeamMember[] = providersSrc
              .map((raw: any) => {
                const tm = raw?.team_members ?? raw;
                if (!tm) return null;
                return tm;
              })
              .filter((tm: any) => tm && (tm.is_active ?? true))
              .map((tm: any) => ({
                id: tm.id,
                full_name: tm.full_name,
                profile_pic: tm.profile_pic ?? null,
                max_parallel: tm.max_parallel ?? 1,
              }));

            return {
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
          })
        : [];

      setStore(payload.store);
      setHours(normalizedHours);
      setServices(normalizedServices);
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
