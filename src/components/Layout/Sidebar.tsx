// src/components/Layout/Sidebar.tsx
import React from 'react';
import {
  Calendar,
  Users,
  Settings,
  Store,
  BarChart3,
  X,
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

  // ─────────────────────────────────────────────────────────
  // PWA + small: Bottom Dock (flutuante, alto, lindo)
  // ─────────────────────────────────────────────────────────
  if (isPWA && isSmall) {
    return (
      <>
        <nav
          aria-label="Navegação inferior"
          className="fixed inset-x-4 z-50"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          <div className="rounded-2xl shadow-lg ring-1 ring-black/5 bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl transition-colors">
            <ul className="grid grid-cols-4 gap-1 p-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <li key={item.id} className="relative">
                    {isActive && (
                      <span className="pointer-events-none absolute inset-0 -z-10">
                        <span className="absolute inset-0 blur-xl bg-gradient-to-br from-indigo-500/15 via-fuchsia-500/10 to-purple-500/15 rounded-2xl" />
                      </span>
                    )}
                    <button
                      onClick={() => onTabChange(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={clsx(
                        'group w-full h-[64px] rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all duration-200 ease-out',
                        isActive
                          ? 'bg-white/60 dark:bg-gray-900/50 ring-1 ring-indigo-500/20'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                      )}
                    >
                      <span
                        className={clsx(
                          'flex items-center justify-center h-9 w-9 rounded-lg transition-all duration-200',
                          isActive
                            ? 'bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 ring-1 ring-indigo-500/25'
                            : 'bg-transparent'
                        )}
                      >
                        <Icon
                          className={clsx(
                            'h-[20px] w-[20px] transition-transform duration-200',
                            isActive
                              ? 'text-indigo-600 dark:text-indigo-400 scale-105'
                              : 'text-gray-600 dark:text-gray-300 group-hover:scale-105'
                          )}
                        />
                      </span>
                      <span
                        className={clsx(
                          'text-[11px] font-medium tracking-wide',
                          isActive
                            ? 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-fuchsia-400'
                            : 'text-gray-700/90 dark:text-gray-300/95'
                        )}
                      >
                        {item.label}
                      </span>
                      {isActive && (
                        <span className="absolute -top-1 h-1 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 opacity-80" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
        {/* Espaço reservado para o dock (altura maior + safe-area) */}
        <div aria-hidden style={{ height: 'calc(82px + env(safe-area-inset-bottom, 0px))' }} />
      </>
    );
  }

  // ─────────────────────────────────────────────────────────
  // Desktop / web: Sidebar clean (sem brand header)
  // Mobile não-PWA: off-canvas sem ocupar espaço quando fechado
  // ─────────────────────────────────────────────────────────
  const mobileClosed = isSmall && !isOpen;

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && isSmall && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={onClose}>
          <div className="absolute inset-0 bg-black/60 dark:bg-black/70" />
        </div>
      )}

      <aside
        aria-label="Sidebar de navegação"
        aria-hidden={mobileClosed || undefined}
        className={clsx(
          'fixed inset-y-0 left-0 z-50',
          'bg-white dark:bg-gray-950',
          'border-r border-gray-200/80 dark:border-gray-800/80',
          'transform transition-transform duration-300 ease-in-out',
          'lg:static lg:inset-0 lg:flex-shrink-0',
          // CLIPA TUDO quando fechado no mobile
          mobileClosed
            ? 'w-0 -translate-x-full overflow-hidden pointer-events-none'
            : 'w-64 translate-x-0'
        )}
      >
        {/* Topbar mobile só aparece quando ABERTO */}
        {isSmall && isOpen && (
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
        )}

        {/* Navegação */}
        <nav className="mt-4 px-3">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      onTabChange(item.id);
                      if (typeof window !== 'undefined' && window.innerWidth < 1024) onClose();
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    className={clsx(
                      'group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left relative transition-all duration-200 will-change-transform',
                      isActive
                        ? 'bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/5 to-transparent ring-1 ring-indigo-500/25 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.15)]'
                        : 'hover:bg-black/[0.035] dark:hover:bg-white/[0.04]'
                    )}
                  >
                    {isActive && (
                      <span className="pointer-events-none absolute -inset-1 -z-10 rounded-2xl blur-2xl bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/10 to-purple-500/10" />
                    )}
                    <span
                      className={clsx(
                        'flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200',
                        isActive
                          ? 'bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 ring-1 ring-indigo-500/25'
                          : 'bg-gray-50 dark:bg-gray-900/60 ring-1 ring-black/5 dark:ring-white/5 group-hover:ring-indigo-500/20'
                      )}
                    >
                      <Icon
                        className={clsx(
                          'h-[18px] w-[18px] transition-transform',
                          isActive
                            ? 'text-indigo-600 dark:text-indigo-400 scale-105'
                            : 'text-gray-600 dark:text-gray-300 group-hover:scale-105'
                        )}
                      />
                    </span>
                    <span
                      className={clsx(
                        'truncate text-[13px] font-medium tracking-wide',
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-fuchsia-400'
                          : 'text-gray-800 dark:text-gray-200'
                      )}
                    >
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Rodapé opcional (ex: settings) */}
        <div className="mt-auto p-3 hidden">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-black/[0.035] dark:hover:bg-white/[0.04] transition-colors">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-900/60 ring-1 ring-black/5 dark:ring-white/5">
              <Settings className="h-[18px] w-[18px] text-gray-600 dark:text-gray-300" />
            </span>
            <span className="text-[13px] font-medium tracking-wide text-gray-800 dark:text-gray-200">
              Configurações
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
