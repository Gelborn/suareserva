// src/hooks/useMediaQuery.ts
import { useEffect, useState } from 'react';

export function useIsSmallScreen(maxWidthPx = 1024) { // ~ < lg
  const [isSmall, setIsSmall] = useState(
    typeof window !== 'undefined' ? window.innerWidth < maxWidthPx : true
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidthPx - 1}px)`);
    const listener = (e: MediaQueryListEvent) => setIsSmall(e.matches);
    setIsSmall(mq.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [maxWidthPx]);

  return isSmall;
}