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
  className?: string;
}> = ({ value, onChange, badges = {}, className = '' }) => {
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Status da Loja' },
    { key: 'info', label: 'Dados da loja' },
    { key: 'hours', label: 'Horário' },
    { key: 'services', label: 'Serviços' },
    { key: 'theme', label: 'Personalização' },
  ];

  return (
    <div className={`bg-white dark:bg-gray-900 ${className}`}>
      {/* faixa de abas com nowrap + scroll horizontal e leve máscara nas bordas */}
      <nav
        role="tablist"
        className={[
          'relative flex flex-nowrap items-center',
          'gap-2 sm:gap-4',
          'overflow-x-auto no-scrollbar',
          'whitespace-nowrap',           // ⬅️ impede quebra em mobile
          'border-b border-gray-200 dark:border-gray-700',
          'px-2 sm:px-4 -mx-2 sm:-mx-4', // ⬅️ edge-to-edge no mobile
          // máscara cria um fade nas laterais para indicar que há mais conteúdo
          '[mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)]',
        ].join(' ')}
      >
        {tabs.map(({ key, label }) => {
          const active = value === key;
          const hasBadge = badges[key] !== undefined; // só mostra bolinha se vier no prop

          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              role="tab"
              aria-selected={active}
              aria-controls={`tab-panel-${key}`}
              className={[
                'relative inline-flex items-center gap-2',
                'shrink-0',                   // ⬅️ impede o botão de encolher e quebrar
                'px-3 sm:px-4 py-3',          // ⬅️ hit area maior
                'text-sm font-medium',
                'transition-colors',
                active
                  ? 'text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white',
                // underline/indicador: só a borda ativa aparece; a inativa fica transparente
                'border-b-2',
                active ? 'border-indigo-600' : 'border-transparent hover:border-gray-300',
                // foco acessível
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:rounded-md',
              ].join(' ')}
            >
              {iconMap[key]}
              <span className="truncate">{label}</span>

              {hasBadge && (
                <span
                  className={[
                    'ml-1 inline-block w-2.5 h-2.5 rounded-full',
                    badges[key] ? 'bg-emerald-500' : 'bg-amber-500',
                  ].join(' ')}
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Tabs;
