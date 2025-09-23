import React from 'react';
import { RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export type HoursRow = {
  day: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
};

const HoursEditor: React.FC<{
  value: HoursRow[];
  onChange: (h: HoursRow[]) => void;
}> = ({ value, onChange }) => {
  const setAt = (i: number, patch: Partial<HoursRow>) => {
    const next = [...value];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const copyFrom = (i: number) => {
    const src = value[i];
    onChange(value.map((d, idx) => idx === i ? d : { ...d, is_closed: src.is_closed, open_time: src.open_time, close_time: src.close_time }));
    toast.success(`Copiado ${DAY_LABELS[i]} → todos`);
  };

  const presetMonFri = () => {
    const next = value.map(d => {
      if (d.day === 0 || d.day === 6) return { ...d, is_closed: true, open_time: null, close_time: null };
      return { ...d, is_closed: false, open_time: '09:00', close_time: '18:00' };
    });
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={presetMonFri}
          className="px-3 py-1.5 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 text-sm inline-flex items-center gap-2"
        >
          <RefreshCcw className="w-4 h-4" />
          Seg-Sex 09:00–18:00, Sáb/Dom fechado
        </button>
      </div>

      <div className="divide-y rounded-xl border overflow-hidden">
        {value.map((d, i) => (
          <div key={d.day} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="w-16 shrink-0 font-medium">{DAY_LABELS[d.day]}</div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={d.is_closed}
                onChange={(e)=>setAt(i,{is_closed:e.target.checked})}
              />
              Fechado
            </label>
            {!d.is_closed && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2">
                  <span className="text-xs text-gray-500">Abre</span>
                  <input
                    type="time"
                    value={d.open_time || ''}
                    onChange={(e)=>setAt(i,{open_time:e.target.value || null})}
                    className="px-2 py-1 rounded border bg-white dark:bg-gray-900"
                  />
                </div>
                <div className="inline-flex items-center gap-2">
                  <span className="text-xs text-gray-500">Fecha</span>
                  <input
                    type="time"
                    value={d.close_time || ''}
                    onChange={(e)=>setAt(i,{close_time:e.target.value || null})}
                    className="px-2 py-1 rounded border bg-white dark:bg-gray-900"
                  />
                </div>
              </div>
            )}
            <div className="sm:ml-auto">
              <button
                type="button"
                onClick={()=>copyFrom(i)}
                className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                copiar p/ todos
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HoursEditor;
