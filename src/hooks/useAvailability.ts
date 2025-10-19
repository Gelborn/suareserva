// hooks/useAvailability.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';

import type { StoreHourRow, StoreRow } from './useStores';
import type { PublicService, PublicTeamMember } from './usePublicStore';

export type AvailabilitySlot = {
  dayKey: string;
  start: Date;
  end: Date;
  isoStart: string;
  isoEnd: string;
  label: string;
};

export type AvailabilityDay = {
  key: string;
  date: Date;
  weekday: string;   // seg, ter, qua...
  dayNumber: string; // 1..31
  fullLabel: string; // segunda-feira, 20 de outubro
  hasSlots: boolean;
};

type Params = {
  store: StoreRow | null;
  /** Mantido por compatibilidade, mas não é usado aqui — o RPC já aplica os horários. */
  hours: StoreHourRow[];
  service: PublicService | null;
  provider: PublicTeamMember | null;
  /** por padrão, pedimos até 30 dias; nunca ultrapassamos 30 */
  horizonDays?: number;
};

export function useAvailability({
  store,
  hours, // eslint-disable-line @typescript-eslint/no-unused-vars
  service,
  provider,
  horizonDays = 30,
}: Params) {
  const [loading, setLoading] = useState(false);
  const [slotsByDay, setSlotsByDay] = useState<Record<string, AvailabilitySlot[]>>({});
  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [error, setError] = useState<string | null>(null);

  const timezone = store?.timezone || 'America/Sao_Paulo';
  const windowDays = Math.min(Math.max(horizonDays ?? 30, 0), 30);

  const refresh = useCallback(async () => {
    if (!store || !service || !provider) {
      setSlotsByDay({});
      setDays([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date();

      // 1) Busca os slots no RPC (apenas buffer_after, expediente, step/duração já aplicados no servidor)
      const { data, error: rpcErr } = await supabase.rpc('get_public_availability', {
        p_store_id: store.id,
        p_service_id: service.id,
        p_team_member_id: provider.id,
        p_from: now.toISOString(),
        p_days: windowDays,
      });

      if (rpcErr) throw rpcErr;

      const rows: Array<{ day_key: string | Date; start_ts: string; end_ts: string }> = data ?? [];

      // 2) Agrupa por dia (em tz da loja)
      const grouped: Record<string, AvailabilitySlot[]> = {};
      for (const r of rows) {
        // usamos o start_ts para derivar a chave do dia no tz da loja
        const start = new Date(r.start_ts);
        const end = new Date(r.end_ts);
        const dayKey = formatInTimeZone(start, timezone, 'yyyy-MM-dd', { locale: ptBR });

        const slot: AvailabilitySlot = {
          dayKey,
          start,
          end,
          isoStart: start.toISOString(),
          isoEnd: end.toISOString(),
          label: formatInTimeZone(start, timezone, 'HH:mm', { locale: ptBR }),
        };

        if (!grouped[dayKey]) grouped[dayKey] = [];
        grouped[dayKey].push(slot);
      }

      // ordena slots de cada dia
      Object.values(grouped).forEach((list) =>
        list.sort((a, b) => a.start.getTime() - b.start.getTime())
      );

      // 3) Constrói a lista de dias do horizonte (mesmo sem slots, mantemos no grid)
      const dayList: AvailabilityDay[] = [];
      for (let offset = 0; offset <= windowDays; offset++) {
        const dayRef = addDays(now, offset);
        const key = formatInTimeZone(dayRef, timezone, 'yyyy-MM-dd', { locale: ptBR });

        const meta: AvailabilityDay = {
          key,
          date: fromZonedTime(`${key}T00:00:00`, timezone),
          weekday: formatInTimeZone(dayRef, timezone, 'EEE', { locale: ptBR }),
          dayNumber: formatInTimeZone(dayRef, timezone, 'd', { locale: ptBR }),
          fullLabel: formatInTimeZone(dayRef, timezone, "EEEE, d 'de' MMMM", { locale: ptBR }),
          hasSlots: Boolean(grouped[key]?.length),
        };

        dayList.push(meta);
      }

      setSlotsByDay(grouped);
      setDays(dayList);
    } catch (e: any) {
      console.error(e);
      setSlotsByDay({});
      setDays([]);
      setError('Não foi possível carregar horários disponíveis.');
    } finally {
      setLoading(false);
    }
  }, [store, service, provider, timezone, windowDays]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasAnySlot = useMemo(
    () => Object.values(slotsByDay).some((list) => list.length > 0),
    [slotsByDay]
  );

  return {
    loading,
    slotsByDay,
    days,
    hasAnySlot,
    error,
    refresh,
  };
}
