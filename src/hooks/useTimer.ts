// ============================================================
// useTimer – Spieluhr
// Startet beim ersten Klick, friert bei Sieg ein.
// ============================================================

import { useEffect, useRef } from 'react';

interface UseTimerOptions {
  startedAt: number;   // Unix-ms, 0 = noch nicht gestartet
  frozen: boolean;     // true wenn gewonnen
  onTick: (elapsedSeconds: number) => void;
}

export function useTimer({ startedAt, frozen, onTick }: UseTimerOptions): void {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (startedAt === 0 || frozen) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      onTickRef.current(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, frozen]);
}

/** Formatiert Sekunden als MM:SS */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
