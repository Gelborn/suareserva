// src/components/Layout/Sidebar.tsx
import React from 'react';
import { 
  Calendar, 
  Users, 
  Settings, 
  Store, 
  BarChart3,
  X,
  Home
} from 'lucide-react';
import { clsx } from 'clsx';
import { useIsPWA } from '../../hooks/usePWA';
import { useIsSmallScreen } from '../../hooks/useMediaQuery';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'team', label: 'Time', icon: Users },
  { id: 'store', label: 'Loja', icon: Store },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeTab, onTabChange }) => {
  const isPWA = useIsPWA();
  const isSmall = useIsSmallScreen(1024); // < lg

  // ----- PWA + small: renderizar BottomNav estilo mobile -----
  if (isPWA && isSmall) {
    return (
      <>
        {/* Conteúdo principal continua igual (o Sidebar "some") */}
        {/* Bottom Nav fixo */}
        <nav
          className={clsx(
            'fixed bottom-0 inset-x-0 z-50',
            'bg-white/90 dark:bg-gray-900/80 backdrop-blur',
            'border-t border-gray-200 dark:border-gray-800'
          )}
        >
          <ul className="flex items-stretch justify-between px-2 py-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id} className="flex-1">
                  <button
                    onClick={() => onTabChange(item.id)}
                    className={clsx(
                      'w-full flex flex-col items-center justify-center gap-1 py-2 rounded-md transition',
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    )}
                  >
                    <Icon className={clsx('h-5 w-5', isActive ? '' : 'opacity-90')} />
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        {/* reserve espaço p/ não cobrir conteúdo */}
        <div className="h-14" />
      </>
    );
  }

  // ----- Drawer/Aside padrão (desktop e web normal) -----
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={onClose}
        >
          {/* overlay com cores ajustadas para dark */}
          <div className="absolute inset-0 bg-black/60 dark:bg-black/70" />
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64',
          'bg-white dark:bg-gray-900',
          'border-r border-gray-200 dark:border-gray-800',
          'transform transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:inset-0 lg:flex-shrink-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Sidebar de navegação"
      >
        {/* Topbar mobile (apenas em <lg) */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800 lg:hidden">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800/70"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Navegação */}
        <nav className="mt-6 px-3">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      onTabChange(item.id);
                      onClose();
                    }}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all',
                      // estados ajustados para dark (bordas + bg + texto)
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/60 shadow-sm'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 border border-transparent hover:border-gray-100 dark:hover:border-gray-800'
                    )}
                  >
                    <Icon
                      className={clsx(
                        'h-5 w-5',
                        isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'
                      )}
                    />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
