import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, addMinutes, isBefore } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
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

export function useAvailability({ store, hours, service, provider, horizonDays = 10 }: Params) {
  const [loading, setLoading] = useState(false);
  const [slotsByDay, setSlotsByDay] = useState<Record<string, AvailabilitySlot[]>>({});
  const [days, setDays] = useState<AvailabilityDay[]>([]);

  const hoursMap = useMemo(() => {
    const map = new Map<number, StoreHourRow>();
    hours?.forEach((row) => map.set(row.day_of_week, row));
    return map;
  }, [hours]);

  const timezone = store?.timezone || 'America/Sao_Paulo';
  const slotStep = Math.max(store?.slot_duration_min ?? service?.duration_min ?? 30, 5);
  const providerCapacity = Math.max(provider?.max_parallel ?? 1, 1);

  const refresh = useCallback(async () => {
    if (!store || !service || !provider) {
      setSlotsByDay({});
      setDays([]);
      return;
    }

    setLoading(true);

    try {
      const now = new Date();
      const dayMap: Record<string, AvailabilitySlot[]> = {};
      const dayList: AvailabilityDay[] = [];

      for (let offset = 0; offset < horizonDays; offset++) {
        const dayRef = addDays(now, offset);
        const isoDow = Number(formatInTimeZone(dayRef, timezone, 'i')); // 1=Mon..7=Sun
        const dow = isoDow === 7 ? 0 : isoDow;
        const hoursRow = hoursMap.get(dow);
        const dayKey = formatInTimeZone(dayRef, timezone, 'yyyy-MM-dd');

        const meta: AvailabilityDay = {
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

          // Sem checagem de bookings — disponibilidade total (até providerCapacity)
          if (providerCapacity >= 1) {
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

      Object.values(dayMap).forEach((list) =>
        list.sort((a, b) => a.start.getTime() - b.start.getTime())
      );

      setSlotsByDay(dayMap);
      setDays(dayList);
    } catch (err) {
      console.error(err);
      setSlotsByDay({});
      setDays([]);
    } finally {
      setLoading(false);
    }
  }, [store, service, provider, horizonDays, hoursMap, timezone, slotStep, providerCapacity]);

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
    refresh,
  };
}
