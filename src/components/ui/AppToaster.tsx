// src/components/ui/AppToaster.tsx
import React from 'react';
import { Toaster } from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';

export function AppToaster() {
  const { theme } = useTheme();

  const isDark = theme === 'dark';
  const surface = isDark ? '#0B1020' : '#ffffff';            // fundo
  const fg = isDark ? '#E5E7EB' : '#111827';                 // texto
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,24,39,0.08)';
  const shadow = isDark ? '0 18px 40px rgba(0,0,0,0.45)' : '0 18px 40px rgba(17,24,39,0.10)';

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4200,
        style: {
          background: surface,
          color: fg,
          border: `1px solid ${border}`,
          borderRadius: 14,
          padding: '12px 14px',
          boxShadow: shadow,
          backdropFilter: 'blur(6px)',
        },
        success: {
          iconTheme: { primary: '#10B981', secondary: surface },
        },
        error: {
          iconTheme: { primary: '#EF4444', secondary: surface },
          duration: 6000,
        },
      }}
    />
  );
}
