import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const Checklist: React.FC<{
  items: Array<{ ok: boolean; label: string; onClick: () => void }>;
}> = ({ items }) => (
  <div className="space-y-2">
    {items.map((it, i) => (
      <button
        key={i}
        onClick={it.onClick}
        className="w-full flex items-center justify-between p-3 rounded-xl border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full grid place-items-center ${it.ok ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
            {it.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          </div>
          <span className="text-sm">{it.label}</span>
        </div>
        <span className="text-xs text-indigo-600">ir →</span>
      </button>
    ))}
  </div>
);

export default Checklist;
