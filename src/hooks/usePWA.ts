// src/hooks/usePWA.ts
import { useEffect, useState } from 'react';

export function useIsPWA() {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia?.('(display-mode: standalone)');
    const isStandalone = () =>
      !!(mql?.matches || (window.navigator as any).standalone);

    const update = () => setIsPWA(isStandalone());
    update();

    mql?.addEventListener?.('change', update);
    return () => mql?.removeEventListener?.('change', update);
  }, []);

  return isPWA;
}
