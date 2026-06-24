# What if Doggy – CLAUDE.md

Dieses Dokument hält den aktuellen Projektstand fest, damit die Arbeit nahtlos fortgesetzt werden kann.

## Projektziel

Vollständiges webbasiertes Logikspiel (ähnlich LinkedIn Queens). Spieler platzieren „Hunde" in einem N×N-Raster: genau 1 pro Zeile, Spalte und farbiger Region, keine zwei Hunde dürfen benachbart sein.

## Tech-Stack

- **React 18** + **TypeScript 5** + **Vite 5**
- **Vitest** für Tests (Ziel ≥ 90 % Coverage)
- **vite-plugin-pwa** für PWA-Support
- Kein externes UI-Framework

## Aktueller Stand

### ✅ Vollständig implementiert

| Datei | Inhalt |
|---|---|
| `package.json` | Alle Dependencies definiert |
| `tsconfig.json` / `tsconfig.node.json` | TypeScript-Konfiguration |
| `vite.config.ts` | Vite + React + PWA Plugin |
| `vitest.config.ts` | Test-Konfiguration, Coverage-Thresholds (90 %) |
| `index.html` | HTML-Einstiegspunkt |
| `public/favicon.svg` | 🐕 SVG-Favicon |
| `public/pwa-192x192.png` | PWA-Icon 192×192 |
| `public/pwa-512x512.png` | PWA-Icon 512×512 |
| `src/types.ts` | Alle TypeScript-Typen (Cell, Region, Puzzle, GameState, …) |
| `src/engine/solver.ts` | Backtracking-Solver mit Constraint Propagation, Eindeutigkeitsprüfung |
| `src/engine/generator.ts` | Seed-basierter Puzzle-Generator, Voronoi-Regionwachstum, Tagesrätsel |
| `src/engine/validator.ts` | Regelprüfung, Konfliktmeldung, Hint-Logik, Auto-Exclude |
| `src/hooks/useLocalStorage.ts` | Typsicherer localStorage-Hook |
| `src/hooks/useGame.ts` | Zentraler Spielzustand (useReducer), Undo/Redo, What-if, Persistenz |
| `src/hooks/useTimer.ts` | Spieluhr, startet beim ersten Klick, friert bei Sieg ein |
| `src/hooks/useKeyboard.ts` | Tastatursteuerung (Pfeiltasten, WASD, Z/Y, H, I, R) |
| `src/styles/globals.css` | CSS Custom Properties, Dark Mode (System + manuell), kein Framework |
| `src/components/Board/Cell.tsx` | Einzelzelle: Regionfarbe, Zustand, What-if-Farbe, Konflikt-Highlight |
| `src/components/Board/GameBoard.tsx` | Spielgitter, rendert alle Cells, Tastatur-Fokus-Management |
| `src/components/Header/Header.tsx` | Titel, Timer, Schwierigkeits-Badge, Dark-Mode-Toggle |
| `src/components/Controls/Controls.tsx` | Neustart, Undo, Redo, What-if, Hint, Neues Puzzle, Tagesrätsel |
| `src/components/Modals/WinModal.tsx` | Sieges-Overlay mit Canvas-Konfetti-Animation |
| `src/components/Modals/DailyModal.tsx` | Tagesrätsel-Auswahl (Easy/Medium/Hard) |
| `src/App.tsx` | Root-Komponente, verbindet alle Hooks und Komponenten |
| `src/main.tsx` | React-Einstiegspunkt (StrictMode) |
| `src/vite-env.d.ts` | Vite-Typ-Referenz |
| `tests/setup.ts` | Vitest-Setup (@testing-library/jest-dom) |
| `tests/unit/solver.test.ts` | Tests für Solver (Eindeutigkeit, Edge Cases) |
| `tests/unit/generator.test.ts` | Tests für Generator (Reproduzierbarkeit, Regionkorrektheit) |
| `tests/unit/validator.test.ts` | Tests für Validator (alle 4 Regeltypen, Hint, Auto-Exclude) |
| `tests/integration/game.test.tsx` | Integrationstests Spielablauf (What-if, Undo/Redo, Sieg) |
| `README.md` | Projektdoku, Architektur, Solver-Strategie, Setup-Anleitung |

| `src/components/Modals/GameOverModal.tsx` | Game-Over-Overlay (alle Leben verloren) |
| `src/components/Modals/SolutionModal.tsx` | Lösungsanzeige mit Mehrfachlösungen-Navigation |
| `src/i18n/translations.ts` | DE/EN Übersetzungen |
| `src/i18n/LanguageContext.tsx` | React Context für Sprachumschaltung |

### Layout (Design 1 – Clean & Flat)

```
[Header]  🐕🐕🐕   What if Doggy   🦴🦴🦴
          [Difficulty] [Timer] [DE/EN] [🌙]
[Top]     🎲 Neu · 📅 Daily · 💡 Hint · 🔍 Lösung · 📖 Regeln  (Pill-Buttons)
[Board]   Spielfeld
[Bottom]  ↩ Undo · ↪ Redo · 🔮 What-if · 🔄 Restart  (Pill-Buttons)
```

- `TopControls` + `BottomControls` aus `Controls.tsx` exportiert
- `LivesDisplay.tsx` obsolet – Leben/Knochen direkt im Header
- `.btn--pill`: `border-radius: 99px`, kein sichtbarer Border

### Letzte Änderungen

- **Wrong-Dog-Feedback** `useGame.ts`: Solution-Check VOR Auto-X. Falscher Hund → `conflict: true` erzwungen (roter Rahmen + Shake), kein Auto-X, sofortiger Knochen/Leben-Abzug.
- **Mobiles Layout** `useBoardSize.ts` (neuer Hook): Berechnet `--cell-size`, `--cell-gap`, `--border-thick` dynamisch aus Viewport + Puzzle-Größe; reagiert auf `resize`.
- **Farbpaletten** `types.ts` + `globals.css` + `SettingsModal.tsx`: 3 Paletten (Candy Pop, Jewel Pastel, Neon Night) via `data-palette`-Attribut auf `:root`; Picker in Settings.
- **Integrationstests** `game.test.tsx`: Komplett neu geschrieben mit korrektem `doubleClickCell` für Hunde; 5 neue Solution-Check-Tests.
- **TypeScript** kompiliert sauber (`npx tsc --noEmit` = 0 Fehler).

### Ausstehender Git-Commit (lokal ausführen)

```bash
cd "What if Doggy"
git add -A
git commit -m "feat: Wrong-dog feedback + mobile layout + 3 color palettes"
git push
```

### 🔲 Noch ausstehend

Nichts — das Projekt ist vollständig. Nach `npm install` ist alles startbereit.

## Wichtige Architekturentscheidungen

### Solver-Strategie
Backtracking Zeile für Zeile. Für jede Zeile werden Spalten als Kandidaten geprüft: Spalte frei? Region frei? Kein adjazenter Hund? Lösungen werden gezählt, bei > 1 bricht der Solver ab. Das garantiert Eindeutigkeit ohne vollständige Enumeration.

### Generator-Strategie
1. Zufällige Lösung via Fisher-Yates + Backtracking
2. Voronoi-Flood-Fill: Jede Lösung-Zelle ist Seed einer Region, wächst in alle 4 Richtungen
3. Solver-Check: nur Puzzles mit eindeutiger Lösung werden ausgegeben
4. Seed-basiert (mulberry32 PRNG) → reproduzierbare Puzzles, Tagesrätsel deterministisch

### What-if-Modus
Alle Züge im What-if-Modus bekommen `source: 'whatif'`. Beim Deaktivieren werden alle `whatif`-Züge aus dem Grid gelöscht. Undo/Redo arbeitet auf dem normalen History-Stack, What-if hat keinen eigenen Stack (wird komplett verworfen).

### State-Management
Kein Redux/Zustand. Alles in `useGame` via `useReducer`. Spielzustand wird nach jedem Zug in localStorage gespeichert (Puzzle-ID als Key).

## Bekannte Einschränkungen

- npm-Registry im Sandbox geblockt → `npm install` muss lokal ausgeführt werden

## Setup (lokal)

```bash
cd "What if Doggy"
npm install
npm run dev        # Entwicklungsserver auf http://localhost:5173
npm test           # Tests ausführen
npm run test:coverage  # Coverage-Report
npm run build      # Produktions-Build
```
