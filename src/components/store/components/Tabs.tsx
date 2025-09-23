import React from 'react';
import { Store, Info, Clock, Palette, Scissors } from 'lucide-react';

export type TabKey = 'overview' | 'info' | 'hours' | 'services' | 'theme';

const iconMap: Record<TabKey, React.ReactNode> = {
  overview: <Store className="w-4 h-4" />,
  info: <Info className="w-4 h-4" />,
  hours: <Clock className="w-4 h-4" />,
  services: <Scissors className="w-4 h-4" />,
  theme: <Palette className="w-4 h-4" />,
};

const Tabs: React.FC<{
  value: TabKey;
  onChange: (t: TabKey) => void;
  badges?: Partial<Record<TabKey, boolean>>;
  className?: string;     // ⬅️ novo: deixa o pai controlar padding/posicionamento
}> = ({ value, onChange, badges = {}, className = '' }) => {
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Sua Loja' },
    { key: 'info', label: 'Dados da loja' },
    { key: 'hours', label: 'Horário' },
    { key: 'services', label: 'Serviços' },
    { key: 'theme', label: 'Personalização' },
  ];

  return (
    <div className={`bg-white dark:bg-gray-900 ${className}`}>
      {/* apenas a faixa de abas; sem card/container com max-width interno */}
      <nav className="flex gap-4 overflow-x-auto no-scrollbar border-b border-gray-200 dark:border-gray-700" role="tablist">
        {tabs.map(({ key, label }) => {
          const active = value === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              role="tab"
              aria-selected={active}
              className={`relative inline-flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors
                ${active
                  ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white hover:border-gray-300'}`}
            >
              {iconMap[key]}
              <span>{label}</span>
              <span
                className={`ml-1 inline-block w-2.5 h-2.5 rounded-full ${
                  badges[key] ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Tabs;
