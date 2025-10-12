import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, addMinutes, isBefore } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
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
  weekday: string;
  dayNumber: string;
  fullLabel: string;
  hasSlots: boolean;
};

type Params = {
  store: StoreRow | null;
  hours: StoreHourRow[];
  service: PublicService | null;
  provider: PublicTeamMember | null;
  horizonDays?: number;
};

type BookedRow = {
  id: string;
  start_ts: string;
  end_ts: string;
  status: string;
};

const BUSY_STATUSES = new Set(['pending', 'confirmed', 'completed']);

export function useAvailability({ store, hours, service, provider, horizonDays = 10 }: Params) {
  const [loading, setLoading] = useState(false);
  const [slotsByDay, setSlotsByDay] = useState<Record<string, AvailabilitySlot[]>>({});
  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [error, setError] = useState<string | null>(null);

  const hoursMap = useMemo(() => {
    const map = new Map<number, StoreHourRow>();
    hours?.forEach((row) => map.set(row.day_of_week, row));
    return map;
  }, [hours]);

  const timezone = store?.timezone || 'America/Sao_Paulo';
  const bufferBefore = store?.buffer_before_min ?? 0;
  const bufferAfter = store?.buffer_after_min ?? 0;
  const slotStep = Math.max(store?.slot_duration_min ?? service?.duration_min ?? 30, 5);
  const providerCapacity = Math.max(provider?.max_parallel ?? 1, 1);

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
      const rangeEnd = addDays(now, horizonDays);

      const { data, error: bookingsErr } = await supabase
        .from('bookings')
        .select('id, start_ts, end_ts, status')
        .eq('store_id', store.id)
        .eq('team_member_id', provider.id)
        .gte('start_ts', now.toISOString())
        .lt('start_ts', rangeEnd.toISOString())
        .order('start_ts');

      let bookedRows: BookedRow[] = [];
      let fallbackWarning: string | null = null;

      if (bookingsErr) {
        const code = bookingsErr.code || '';
        const rlsIssue = code === '42501' || code === '42P17';
        if (rlsIssue) {
          fallbackWarning =
            'Não conseguimos validar reservas existentes em tempo real. Escolha o horário desejado e confirmaremos manualmente com a loja.';
        } else {
          throw bookingsErr;
        }
      } else {
        bookedRows = (data ?? []) as BookedRow[];
      }

      const busy = bookedRows
        .filter((row: BookedRow) => BUSY_STATUSES.has(row.status))
        .map((row: BookedRow) => ({
          start: new Date(row.start_ts),
          end: new Date(row.end_ts),
        }));

      const dayMap: Record<string, AvailabilitySlot[]> = {};
      const dayList: AvailabilityDay[] = [];

      for (let offset = 0; offset < horizonDays; offset++) {
        const dayRef = addDays(now, offset);
        const isoDow = Number(formatInTimeZone(dayRef, timezone, 'i')); // 1=Mon .. 7=Sun
        const dow = isoDow === 7 ? 0 : isoDow;
        const hoursRow = hoursMap.get(dow);
        const dayKey = formatInTimeZone(dayRef, timezone, 'yyyy-MM-dd');

        const meta = {
          key: dayKey,
          date: fromZonedTime(`${dayKey}T00:00:00`, timezone),
          weekday: formatInTimeZone(dayRef, timezone, 'EEE'),
          dayNumber: formatInTimeZone(dayRef, timezone, 'd'),
          fullLabel: formatInTimeZone(dayRef, timezone, "EEEE, d 'de' MMMM"),
          hasSlots: false,
        };

        if (!hoursRow || hoursRow.is_closed || !hoursRow.open_time || !hoursRow.close_time) {
          dayList.push(meta);
          continue;
        }

        const openUtc = fromZonedTime(`${dayKey}T${hoursRow.open_time}`, timezone);
        const closeUtc = fromZonedTime(`${dayKey}T${hoursRow.close_time}`, timezone);

        const daySlots: AvailabilitySlot[] = [];
        let cursor = openUtc;

        while (!isBefore(closeUtc, cursor)) {
          const serviceEnd = addMinutes(cursor, service.duration_min);
          if (serviceEnd > closeUtc) break;
          if (cursor <= now) {
            cursor = addMinutes(cursor, slotStep);
            continue;
          }

          const candidateStart = addMinutes(cursor, -bufferBefore);
          const candidateEnd = addMinutes(serviceEnd, bufferAfter);

          const overlapCount = busy.reduce((count, booking) => {
            const bookingStart = addMinutes(booking.start, -bufferBefore);
            const bookingEnd = addMinutes(booking.end, bufferAfter);
            const overlaps = candidateStart < bookingEnd && candidateEnd > bookingStart;
            return overlaps ? count + 1 : count;
          }, 0);

          if (overlapCount < providerCapacity) {
            const slot: AvailabilitySlot = {
              dayKey,
              start: cursor,
              end: serviceEnd,
              isoStart: cursor.toISOString(),
              isoEnd: serviceEnd.toISOString(),
              label: formatInTimeZone(cursor, timezone, 'HH:mm'),
            };
            daySlots.push(slot);
          }

          cursor = addMinutes(cursor, slotStep);
        }

        if (daySlots.length) {
          dayMap[dayKey] = daySlots;
          meta.hasSlots = true;
        }

        dayList.push(meta);
      }

      // sort each day's slots just in case
      Object.values(dayMap).forEach((list) =>
        list.sort((a, b) => a.start.getTime() - b.start.getTime())
      );

      setError(fallbackWarning);
      setSlotsByDay(dayMap);
      setDays(dayList);
    } catch (err) {
      console.error(err);
      setSlotsByDay({});
      setDays([]);
      setError('Não foi possível carregar horários disponíveis.');
    } finally {
      setLoading(false);
    }
  }, [store, service, provider, horizonDays, hoursMap, timezone, bufferBefore, bufferAfter, slotStep, providerCapacity]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasAnySlot = useMemo(
    () => Object.values(slotsByDay).some((day) => day.length > 0),
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
