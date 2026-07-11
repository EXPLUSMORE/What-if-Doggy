// ============================================================
// useMusic – React-Hook für die Hintergrundmusik
//
// Beobachtet campaignMode, won, gameOver, countdownSeconds und level.
// Startet/wechselt die Musik-Phase automatisch, stoppt bei Sieg oder Game-Over.
// ============================================================

import { useEffect, useRef } from 'react';
import {
  playPhase,
  stopMusic,
  getPhase,
  getTrilogyForLevel,
} from '../audio/musicEngine';

interface UseMusicOptions {
  enabled: boolean;
  campaignMode: boolean;
  won: boolean;
  gameOver: boolean;
  countdownSeconds: number;
  level: number;
  /** Feste Trilogie-Wahl (Settings); -1 = auto per Level */
  trilogyOverride?: number;
}

export function useMusic({
  enabled,
  campaignMode,
  won,
  gameOver,
  countdownSeconds,
  level,
  trilogyOverride = -1,
}: UseMusicOptions): void {
  // Aktuell aktive Trilogie – bei Level-Wechsel neu bestimmen
  const trilogyRef = useRef<number>(0);
  const levelRef = useRef<number>(level);

  // Trilogie: Override aus Settings hat Vorrang, sonst auto per Level
  if (level !== levelRef.current) levelRef.current = level;
  trilogyRef.current = trilogyOverride >= 0 ? trilogyOverride : getTrilogyForLevel(level);

  useEffect(() => {
    if (!enabled) {
      stopMusic();
      return;
    }
    if (won || gameOver) {
      stopMusic();
      return;
    }
    // Im Kampagnenmodus Phase aus Countdown ableiten, sonst immer grün
    const phase = campaignMode ? getPhase(countdownSeconds) : 'green';
    playPhase(trilogyRef.current, phase);
  }, [enabled, campaignMode, won, gameOver, countdownSeconds, level, trilogyOverride]);

  // Musik stoppen wenn Hook unmounted wird
  useEffect(() => {
    return () => stopMusic();
  }, []);
}
