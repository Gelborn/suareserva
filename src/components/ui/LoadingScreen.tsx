import React from "react";
import LogoWordmark from "./LogoWordmark";

/**
 * Fullscreen loading with animated logo.
 * Acessível (role="progressbar" + aria-busy).
 */
export const LoadingScreen: React.FC<{ message?: string }> = ({ message = "Carregando…" }) => {
  return (
    <div
      className="min-h-screen bg-white dark:bg-gray-900 grid place-items-center"
      role="progressbar"
      aria-busy="true"
      aria-label={message}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Spinner + logo */}
        <div className="relative">
          {/* spinner ring */}
          <div className="absolute inset-0 grid place-items-center">
            <div className="w-14 h-14 rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-transparent animate-spin" />
          </div>

          {/* glow pulse */}
          <div className="absolute -inset-3 rounded-2xl blur-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 animate-logoGlow" />

          {/* logo */}
          <LogoWordmark className="relative z-10" />
        </div>

        {/* helper text */}
        <p className="text-sm text-gray-600 dark:text-gray-300 animate-pulse">{message}</p>
      </div>
    </div>
  );
};

/**
 * Compact inline loader (para dentro de cards/sections).
 */
export const InlineLoader: React.FC<{ label?: string }> = ({ label = "Carregando…" }) => {
  return (
    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300" role="progressbar" aria-busy="true">
      <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-transparent animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
};

export default LoadingScreen;
