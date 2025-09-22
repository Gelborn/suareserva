// src/components/Layout/Header.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Menu, Moon, Sun, User, LogIn, ChevronDown } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useIsPWA } from '../../hooks/usePWA';
import { useBusiness } from '../../hooks/useBusiness';
import ProfileModal from '../Account/ProfileModal';

interface HeaderProps {
  onMenuClick?: () => void;
  showMenu?: boolean;
  onLoginClick?: () => void;
}

const LS_KEY = 'sr.displayName';

const Header: React.FC<HeaderProps> = ({ onMenuClick, showMenu = false, onLoginClick }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { business, loading: businessLoading, refetch } = useBusiness();
  const isPWA = useIsPWA();

  const [openMenu, setOpenMenu] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // mantém um nome "estável" entre refetches p/ evitar flash
  const [displayName, setDisplayName] = useState<string>(() => {
    // tenta recuperar do storage (último conhecido)
    const fromLS = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
    return fromLS || user?.name || '';
  });

  // fecha menu ao clicar fora / Esc
  useEffect(() => {
    if (!openMenu) return;
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpenMenu(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenMenu(false);
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [openMenu]);

  // sincroniza displayName:
  // 1) se chegou business.name, prioriza e persiste
  // 2) se não há business e terminou loading, usa user.name (se houver)
  useEffect(() => {
    if (business?.name) {
      setDisplayName(business.name);
      try { localStorage.setItem(LS_KEY, business.name); } catch {}
      return;
    }
    if (!businessLoading && !business?.name && user?.name && !displayName) {
      setDisplayName(user.name);
      try { localStorage.setItem(LS_KEY, user.name); } catch {}
    }
  }, [business?.name, businessLoading, user?.name]); // displayName intencionalmente fora

  // ao fechar o modal de perfil, refetch após breve delay
  useEffect(() => {
    if (!openProfile && user) {
      const t = setTimeout(() => refetch(), 300);
      return () => clearTimeout(t);
    }
  }, [openProfile, user, refetch]);

  // skeleton curto quando ainda não temos nenhum nome conhecido
  const nameNode = useMemo(() => {
    if (displayName && displayName.trim().length > 0) return displayName;
    if (businessLoading) {
      return (
        <span className="inline-block h-3 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      );
    }
    return 'Conta';
  }, [displayName, businessLoading]);

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        <div className="flex items-center space-x-4">
          {showMenu && !isPWA && (
            <button
              onClick={onMenuClick}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
              aria-label="Abrir menu lateral"
            >
              <Menu className="h-5 w-5 text-gray-700 dark:text-white" />
            </button>
          )}

          <div className="flex items-center">
            <div className="flex flex-col leading-none">
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                SuaReserva
              </h1>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">.online</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Alternar tema"
            title={theme === 'light' ? 'Tema escuro' : 'Tema claro'}
          >
            {theme === 'light' ? (
              <Moon className="h-5 w-5 text-gray-600" />
            ) : (
              <Sun className="h-5 w-5 text-gray-100" />
            )}
          </button>

          {!user && onLoginClick && (
            <button
              onClick={onLoginClick}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              <LogIn className="h-4 w-4" />
              <span>Entrar</span>
            </button>
          )}

          {user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpenMenu((v) => !v)}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-haspopup="menu"
                aria-expanded={openMenu}
              >
                <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block">
                  {nameNode}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500 hidden sm:block" />
              </button>

              {openMenu && (
                <div
                  className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-[1100] border border-gray-100 dark:border-gray-700"
                  role="menu"
                >
                  <button
                    onClick={() => { setOpenMenu(false); setOpenProfile(true); }}
                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    role="menuitem"
                  >
                    Perfil do negócio
                  </button>
                  <button
                    onClick={() => { setOpenMenu(false); /* Planos futuramente */ }}
                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    role="menuitem"
                  >
                    Planos
                  </button>
                  <div className="my-1 h-px bg-gray-100 dark:bg-gray-700" />
                  <button
                    onClick={() => { setOpenMenu(false); logout(); }}
                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    role="menuitem"
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ProfileModal open={openProfile} onClose={() => setOpenProfile(false)} />
    </header>
  );
};

export default Header;
