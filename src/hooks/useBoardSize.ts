// ============================================================
// useBoardSize – Dynamische Spielfeldgröße
//
// Berechnet die optimale Zellgröße basierend auf:
//   - Viewport-Breite und -Höhe
//   - Anzahl der Zellen im Gitter (n × n)
//
// Setzt CSS Custom Properties auf :root:
//   --cell-size:    Zellgröße in px
//   --cell-gap:     Lücke zwischen Zellen (1px mobil, 2px desktop)
//   --border-thick: Rahmendicke des Gitters (2px mobil, 3px desktop)
//
// Reagiert auf window resize und Änderung der Puzzle-Größe.
// ============================================================

import { useEffect } from 'react';

/** Reservierter Platz über und unter dem Board (Header + Controls + Gaps) */
const V_RESERVE_MOBILE  = 215;  // px: Header ~80 + TopCtrl ~44 + BotCtrl ~44 + Gaps ~47
const V_RESERVE_DESKTOP = 270;  // px: etwas mehr wegen größerem Header

/** Seitenabstand links+rechts */
const H_PAD_MOBILE  = 16;   // .5rem je Seite
const H_PAD_DESKTOP = 48;   // 1.5rem je Seite

/** Maximale Zellgröße auf Desktop */
const CELL_MAX = 60;

export function useBoardSize(puzzleSize: number): void {
  useEffect(() => {
    const update = () => {
      const n     = puzzleSize;
      const vw    = window.innerWidth;
      const vh    = window.innerHeight;
      const mobile = vw <= 520;

      // Abstände innerhalb des Gitters
      const gap   = mobile ? 1 : 2;          // var(--cell-gap)
      const bord  = mobile ? 2 : 3;          // var(--border-thick)
      const inner = (n - 1) * gap + 2 * bord; // Gesamter Innenabstand

      // Verfügbarer Platz
      const availW = vw - (mobile ? H_PAD_MOBILE : H_PAD_DESKTOP) - inner;
      const availH = vh - (mobile ? V_RESERVE_MOBILE : V_RESERVE_DESKTOP) - inner;

      // Optimal: kleineres von Breiten- und Höhenlimit
      const fromW = availW / n;
      const fromH = availH / n;
      // Minimale Zellgröße: für große Gitter (12×12, 15×15) erlauben wir kleinere Zellen
      const cellMin = n <= 10 ? 22 : n <= 12 ? 18 : 14;
      const cell  = Math.min(CELL_MAX, Math.max(cellMin, Math.floor(Math.min(fromW, fromH))));

      const root = document.documentElement;
      root.style.setProperty('--cell-size',    `${cell}px`);
      root.style.setProperty('--cell-gap',     `${gap}px`);
      root.style.setProperty('--border-thick', `${bord}px`);
    };

    update();
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, [puzzleSize]);
}
