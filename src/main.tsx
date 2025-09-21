// src/main.tsx
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { hookSessionMirror, restoreSessionIfNeeded } from './lib/sessionMirror';
import { supabase } from './lib/supabaseClient';

async function bootstrap() {
  // liga o espelho de sessão
  hookSessionMirror();

  // restaura sessão no boot (especialmente útil em PWA)
  await restoreSessionIfNeeded();

  // quando a app volta ao foreground, garante sessão novamente
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      const { data } = await supabase.auth.getSession();
      if (!data.session) await restoreSessionIfNeeded();
    }
  });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

bootstrap();
