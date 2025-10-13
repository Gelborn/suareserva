import React from 'react';
import { Clock, ChevronDown, AlertTriangle } from 'lucide-react';
import Card from '../components/Card';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase'; // ajuste se necessário

/* ───────────────────────── Types ───────────────────────── */
type DbHour = {
  store_id: string;
  day_of_week: number;      // 0..6
  is_closed: boolean;
  open_time: string | null; // HH:MM:SS
  close_time: string | null;
};

export type HoursRow = {
  day: number;               // 0..6
  is_closed: boolean;
  open_time: string | null;  // HH:MM
  close_time: string | null; // HH:MM
};

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/* ──────────────────────── Helpers ──────────────────────── */
const pad = (n: number) => String(n).padStart(2, '0');

const toHHMM = (t: string | null): string | null => {
  if (!t) return null;
  const m = /^(\d{2}):(\d{2})/.exec(t);
  return m ? `${m[1]}:${m[2]}` : null;
};

const toPGTime = (t: string | null): string | null => {
  if (!t) return null;
  const m = /^(\d{2}):(\d{2})$/.exec(t);
  if (!m) return null;
  return `${pad(Number(m[1]))}:${pad(Number(m[2]))}:00`;
};

const parseMins = (hhmm?: string | null) => {
  if (!hhmm) return null;
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

const makeEmptyWeek = (): HoursRow[] =>
  Array.from({ length: 7 }, (_, day) => ({
    day,
    is_closed: true,
    open_time: null,
    close_time: null,
  }));

const byDay = (a: HoursRow, b: HoursRow) => a.day - b.day;

function normalizeForCompare(v: { hours: HoursRow[]; slotMin: number; bufferMin: number }) {
  const hours = [...v.hours]
    .sort(byDay)
    .map(h => ({
      ...h,
      open_time: h.open_time || null,
      close_time: h.close_time || null,
      is_closed: !!h.is_closed,
    }));
  return { hours, slotMin: v.slotMin, bufferMin: v.bufferMin };
}

/* ──────────────────────── Validation ───────────────────── */
type DayError = { open?: string; close?: string; general?: string };
const emptyErr: DayError = {};

function validateWeek(rows: HoursRow[]): Record<number, DayError> {
  const errors: Record<number, DayError> = {};
  rows.forEach(r => {
    if (r.is_closed) return; // fechado = sem validação
    const e: DayError = {};
    const om = parseMins(r.open_time);
    const cm = parseMins(r.close_time);

    if (r.open_time && !/^\d{2}:\d{2}$/.test(r.open_time)) e.open = 'Hora inválida';
    if (r.close_time && !/^\d{2}:\d{2}$/.test(r.close_time)) e.close = 'Hora inválida';

    if (!r.open_time) e.open = 'Obrigatório';
    if (!r.close_time) e.close = 'Obrigatório';

    if (om != null && cm != null && om >= cm) e.general = 'Abertura deve ser antes do fechamento';

    if (e.open || e.close || e.general) errors[r.day] = e;
  });
  return errors;
}

/* ──────────────────────── Component ─────────────────────── */
const HoursTab: React.FC<{
  storeId?: string;                   // pode vir indefinido; só carrega quando existir
  persistSlotAndBuffer?: boolean;     // salva em stores.slot_duration_min/buffer_before_min
}> = ({ storeId, persistSlotAndBuffer = true }) => {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [localHours, setLocalHours] = React.useState<HoursRow[]>(makeEmptyWeek());
  const [localSlot, setLocalSlot] = React.useState<number>(30);
  const [localBuffer, setLocalBuffer] = React.useState<number>(0);

  const [errors, setErrors] = React.useState<Record<number, DayError>>({});

  const initialRef = React.useRef<{ hours: HoursRow[]; slotMin: number; bufferMin: number }>({
    hours: makeEmptyWeek(),
    slotMin: 30,
    bufferMin: 0,
  });

  /* ── Load from DB ──────────────────────────────────────── */
  React.useEffect(() => {
    let cancelled = false;

    if (!storeId) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);

        const { data: rows, error } = await supabase
          .from('store_hours')
          .select('day_of_week, is_closed, open_time, close_time')
          .eq('store_id', storeId);

        if (error) throw error;

        const base = makeEmptyWeek();
        (rows || []).forEach((r: DbHour) => {
          if (r.day_of_week >= 0 && r.day_of_week <= 6) {
            base[r.day_of_week] = {
              day: r.day_of_week,
              is_closed: !!r.is_closed,
              open_time: toHHMM(r.open_time),
              close_time: toHHMM(r.close_time),
            };
          }
        });

        let slot = 30, buffer = 0;
        if (persistSlotAndBuffer) {
          const { data: st, error: e2 } = await supabase
            .from('stores')
            .select('slot_duration_min, buffer_before_min')
            .eq('id', storeId)
            .maybeSingle();
          if (e2) throw e2;
          if (st) {
            slot = Number(st.slot_duration_min ?? 30);
            buffer = Number(st.buffer_before_min ?? 0);
          }
        }

        if (!cancelled) {
          setLocalHours(base);
          setLocalSlot(slot);
          setLocalBuffer(buffer);
          setErrors(validateWeek(base));
          initialRef.current = { hours: base, slotMin: slot, bufferMin: buffer };
        }
      } catch (e: any) {
        if (!cancelled) toast.error('Falha ao carregar horários.');
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [storeId, persistSlotAndBuffer]);

  /* ── Mutations ─────────────────────────────────────────── */
  const setHourAt = (i: number, patch: Partial<HoursRow>) => {
    setLocalHours(prev => {
      const next = [...prev];
      const prevClosed = next[i].is_closed;
      next[i] = { ...next[i], ...patch };

      if (patch.is_closed === true) {
        next[i].open_time = null;
        next[i].close_time = null;
      }

      if (prevClosed && patch.is_closed === false) {
        next[i].open_time = next[i].open_time ?? '09:00';
        next[i].close_time = next[i].close_time ?? '18:00';
      }

      setErrors(validateWeek(next));
      return next;
    });
  };

  const setOpen = (i: number, v: string) => {
    const val = /^(\d{2}):(\d{2})$/.test(v) ? v : '';
    setHourAt(i, { open_time: val || null });
  };

  const setClose = (i: number, v: string) => {
    const val = /^(\d{2}):(\d{2})$/.test(v) ? v : '';
    setHourAt(i, { close_time: val || null });
  };

  const dirty = React.useMemo(() => {
    const A = normalizeForCompare({ hours: localHours, slotMin: localSlot, bufferMin: localBuffer });
    const B = normalizeForCompare(initialRef.current);
    return JSON.stringify(A) !== JSON.stringify(B);
  }, [localHours, localSlot, localBuffer]);

  const hasErrors = React.useMemo(() => Object.keys(errors).length > 0, [errors]);

  /* ── Save ──────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!dirty || hasErrors || saving) return;
    if (!storeId) {
      toast.error('Loja inválida.');
      return;
    }
    try {
      setSaving(true);

      const payload: DbHour[] = localHours.map(h => ({
        store_id: storeId,
        day_of_week: h.day,
        is_closed: !!h.is_closed,
        open_time: h.is_closed ? null : toPGTime(h.open_time),
        close_time: h.is_closed ? null : toPGTime(h.close_time),
      }));

      const { error: upErr } = await supabase
        .from('store_hours')
        .upsert(payload, { onConflict: 'store_id,day_of_week' });

      if (upErr) throw upErr;

      if (persistSlotAndBuffer) {
        const { error: stErr } = await supabase
          .from('stores')
          .update({
            slot_duration_min: localSlot,
            buffer_before_min: localBuffer,
          })
          .eq('id', storeId);
        if (stErr) throw stErr;
      }

      initialRef.current = {
        hours: [...localHours].sort(byDay),
        slotMin: localSlot,
        bufferMin: localBuffer,
      };
      toast.success('Horários salvos!');
    } catch (e: any) {
      console.error(e);
      toast.error('Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  /* ── UI ───────────────────────────────────────────────── */
  return (
    <>
      {/* Deixa o ícone nativo invisível e sobrepõe um Clock branco no dark */}
      <style>{`
        .dark .time-input { color-scheme: dark; }

        /* Esconde o ícone nativo do picker (Chrome/Safari) */
        .time-input::-webkit-calendar-picker-indicator {
          opacity: 0;
        }
        /* Evita clear/spin extras em alguns navegadores */
        .time-input::-webkit-clear-button,
        .time-input::-webkit-inner-spin-button,
        .time-input::-webkit-outer-spin-button {
          display: none;
        }
      `}</style>

      <Card className="p-5 relative pb-32 sm:pb-6">
        {/* Cabeçalho */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700">
            <Clock className="w-5 h-5 text-gray-700 dark:stroke-white dark:text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Horário de funcionamento</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">Defina os horários abertos por dia.</p>
          </div>
        </div>

        {!storeId && (
          <div className="mt-4 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            Informe um <strong className="ml-1">storeId</strong> para carregar e salvar horários.
          </div>
        )}

        <div className="mt-5 space-y-6">
          {/* Editor de dias */}
          <div className="divide-y rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            {loading ? (
              <div className="p-4 text-sm text-gray-600 dark:text-slate-400">Carregando…</div>
            ) : (
              localHours.map((d, i) => {
                const err = errors[d.day] || emptyErr;
                const hasGeneral = !!err.general;
                const openErr = !!err.open;
                const closeErr = !!err.close;

                return (
                  <div key={`day-${d.day}`} className="p-3 sm:p-4">
                    {/* ───────────────── Mobile ───────────────── */}
                    <div className="sm:hidden space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-gray-900 dark:text-slate-100">{DAY_LABELS[d.day]}</div>
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={d.is_closed}
                            onChange={(e) => setHourAt(i, { is_closed: e.target.checked })}
                          />
                          Fechado
                        </label>
                      </div>

                      {!d.is_closed && (
                        <div className="flex items-center gap-3">
                          <div className="inline-flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-slate-400">Abre</span>
                            <div className="relative">
                              <input
                                type="time"
                                value={d.open_time || ''}
                                onChange={(e) => setOpen(i, e.target.value)}
                                className={`time-input px-2 py-1 pr-9 rounded-xl border bg-white dark:bg-slate-900/70 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2
                                            ${openErr ? 'border-red-500 focus:ring-red-400' : 'border-gray-200 dark:border-slate-700'}`}
                                aria-invalid={openErr}
                              />
                              <Clock className="pointer-events-none w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-white/90" />
                            </div>
                          </div>
                          <div className="inline-flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-slate-400">Fecha</span>
                            <div className="relative">
                              <input
                                type="time"
                                value={d.close_time || ''}
                                onChange={(e) => setClose(i, e.target.value)}
                                className={`time-input px-2 py-1 pr-9 rounded-xl border bg-white dark:bg-slate-900/70 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2
                                            ${closeErr ? 'border-red-500 focus:ring-red-400' : 'border-gray-200 dark:border-slate-700'}`}
                                aria-invalid={closeErr}
                              />
                              <Clock className="pointer-events-none w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-white/90" />
                            </div>
                          </div>
                        </div>
                      )}

                      {(hasGeneral || openErr || closeErr) && (
                        <div className="text-xs text-red-600 dark:text-red-400">
                          {err.open ? `Abre: ${err.open}. ` : ''}
                          {err.close ? `Fecha: ${err.close}. ` : ''}
                          {err.general ? `${err.general}.` : ''}
                        </div>
                      )}
                    </div>

                    {/* ───────────────── Desktop ───────────────── */}
                    <div className="hidden sm:flex sm:items-center sm:gap-3">
                      <div className="w-16 shrink-0 font-medium text-gray-900 dark:text-slate-100">{DAY_LABELS[d.day]}</div>

                      <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={d.is_closed}
                          onChange={(e) => setHourAt(i, { is_closed: e.target.checked })}
                        />
                        Fechado
                      </label>

                      {!d.is_closed && (
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="inline-flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-slate-400">Abre</span>
                            <div className="relative">
                              <input
                                type="time"
                                value={d.open_time || ''}
                                onChange={(e) => setOpen(i, e.target.value)}
                                className={`time-input px-2 py-1 pr-9 rounded-xl border bg-white dark:bg-slate-900/70 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2
                                            ${openErr ? 'border-red-500 focus:ring-red-400' : 'border-gray-200 dark:border-slate-700'}`}
                                aria-invalid={openErr}
                              />
                              <Clock className="pointer-events-none w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-white/90" />
                            </div>
                          </div>
                          <div className="inline-flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-slate-400">Fecha</span>
                            <div className="relative">
                              <input
                                type="time"
                                value={d.close_time || ''}
                                onChange={(e) => setClose(i, e.target.value)}
                                className={`time-input px-2 py-1 pr-9 rounded-xl border bg-white dark:bg-slate-900/70 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2
                                            ${closeErr ? 'border-red-500 focus:ring-red-400' : 'border-gray-200 dark:border-slate-700'}`}
                                aria-invalid={closeErr}
                              />
                              <Clock className="pointer-events-none w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-white/90" />
                            </div>
                          </div>
                        </div>
                      )}

                      {(hasGeneral || openErr || closeErr) && (
                        <div className="text-xs text-red-600 dark:text-red-400 sm:ml-2">
                          {err.open ? `Abre: ${err.open}. ` : ''}
                          {err.close ? `Fecha: ${err.close}. ` : ''}
                          {err.general ? `${err.general}.` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Slot & Buffer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700">
              <div className="font-medium text-gray-900 dark:text-slate-100 mb-2">Slot do agendamento</div>
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">
                Granularidade dos horários exibidos aos clientes.
              </p>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    className="appearance-none rounded-xl border border-gray-200 dark:border-slate-700
                               bg-white dark:bg-slate-900/70 px-3 pr-10 py-2
                               text-gray-900 dark:text-slate-100"
                    value={localSlot}
                    onChange={(e) => setLocalSlot(parseInt(e.target.value, 10))}
                  >
                    {[10, 15, 20, 30, 45, 60].map(v => (
                      <option key={`slot-${v}`} value={v}>{v} min</option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2
                               text-gray-500 dark:text-slate-400"
                  />
                </div>
                <span className="text-sm text-gray-500 dark:text-slate-400">padrão: 30 min</span>
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700">
              <div className="font-medium text-gray-900 dark:text-slate-100 mb-2">Buffer entre atendimentos</div>
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">
                Tempo extra entre serviços para transição (não aparece para o cliente).
              </p>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    className="appearance-none rounded-xl border border-gray-200 dark:border-slate-700
                               bg-white dark:bg-slate-900/70 px-3 pr-10 py-2
                               text-gray-900 dark:text-slate-100"
                    value={localBuffer}
                    onChange={(e) => setLocalBuffer(parseInt(e.target.value, 10))}
                  >
                    {[0, 5, 10, 15, 20, 30].map(v => (
                      <option key={`buffer-${v}`} value={v}>{v} min</option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2
                               text-gray-500 dark:text-slate-400"
                  />
                </div>
                <span className="text-sm text-gray-500 dark:text-slate-400">padrão: 0 min</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Botão de salvar (desktop inline) */}
        <div className="hidden sm:flex items-center justify-end mt-6">
          <button
            onClick={handleSave}
            disabled={!storeId || !dirty || hasErrors || saving}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60
                       disabled:opacity-50 disabled:cursor-default"
          >
            {saving ? 'Salvando…' : 'Salvar horários'}
          </button>
        </div>

        {/* Botão flutuante (mobile / PWA) */}
        {dirty && (
          <div className="sm:hidden">
            <div
              className="fixed inset-x-0 px-4 z-40 pointer-events-none"
              style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 120px)' }}
            >
              <div className="pointer-events-auto max-w-md mx-auto">
                <button
                  onClick={handleSave}
                  disabled={!storeId || hasErrors || saving}
                  className="w-full shadow-lg rounded-full px-5 py-3 bg-indigo-600 text-white font-semibold
                             hover:bg-indigo-700 active:scale-[0.99] transition disabled:opacity-50"
                >
                  {saving ? 'Salvando…' : 'Salvar horários'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </>
  );
};

export default HoursTab;
