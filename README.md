# 🐕 What if Doggy

Ein webbasiertes Logikrätsel-Spiel ähnlich dem LinkedIn-Spiel „Queens". Platziere Hunde auf dem Spielfeld – nach festen Regeln und mithilfe logischen Denkens!

## Spielregeln

- Das Spielfeld ist ein **N×N-Raster** (Easy: 6×6, Medium: 8×8, Hard: 10×10)
- Jede Zelle gehört genau einer **farbigen Region**
- Du musst **Hunde** platzieren:
  - Genau **1 Hund pro Zeile**
  - Genau **1 Hund pro Spalte**
  - Genau **1 Hund pro farbiger Region**
  - Keine zwei Hunde dürfen **benachbart** sein (auch diagonal)
- Das Spiel ist gewonnen, wenn alle Regeln erfüllt sind

## Steuerung

| Aktion | Maus | Tastatur |
|---|---|---|
| Hund/Markierung/Leer | Klick | Enter / Space |
| Fokus bewegen | Hover | Pfeiltasten / WASD |
| Undo | Controls | Ctrl+Z |
| Redo | Controls | Ctrl+Y / Ctrl+Shift+Z |
| What-if Toggle | Controls | I |
| Hint | Controls | H |
| Neustart | Controls | R |

## Features

- ✅ **3 Schwierigkeitsgrade** (Easy / Medium / Hard)
- ✅ **What-if-Modus** – Züge werden orange markiert und beim Deaktivieren verworfen
- ✅ **Undo / Redo** – unbegrenzte History
- ✅ **Hint-System** – zeigt den nächsten korrekten Zug
- ✅ **Dark Mode** – automatisch per System-Einstellung, manuell umschaltbar
- ✅ **Tagesrätsel** – täglich ein neues deterministisches Puzzle
- ✅ **Lokale Speicherung** – Spielstand bleibt nach Reload erhalten
- ✅ **PWA** – installierbar, offline-fähig
- ✅ **Tastatursteuerung** – vollständig ohne Maus spielbar
- ✅ **Responsive** – funktioniert auf Mobilgeräten

## Setup

```bash
# Dependencies installieren
npm install

# Entwicklungsserver starten (http://localhost:5173)
npm run dev

# Tests ausführen
npm test

# Coverage-Report erstellen
npm run test:coverage

# Produktions-Build
npm run build
```

## Architektur

```
src/
├── types.ts                  # Alle TypeScript-Typen
├── engine/
│   ├── solver.ts             # Constraint Solver (Backtracking)
│   ├── generator.ts          # Puzzle-Generator (Voronoi + Seed-PRNG)
│   └── validator.ts          # Regelprüfung, Hint, Auto-Exclude
├── hooks/
│   ├── useGame.ts            # Zentraler Spielzustand (useReducer)
│   ├── useTimer.ts           # Spieluhr
│   ├── useKeyboard.ts        # Tastatursteuerung
│   └── useLocalStorage.ts    # Typsicherer localStorage-Hook
├── components/
│   ├── Board/
│   │   ├── Cell.tsx          # Einzelne Zelle
│   │   └── GameBoard.tsx     # Spielgitter
│   ├── Header/
│   │   └── Header.tsx        # Titel, Timer, Dark-Mode
│   ├── Controls/
│   │   └── Controls.tsx      # Buttons
│   └── Modals/
│       ├── WinModal.tsx      # Sieges-Overlay + Konfetti
│       └── DailyModal.tsx    # Tagesrätsel-Auswahl
├── styles/
│   └── globals.css           # CSS Custom Properties, Dark Mode
├── App.tsx                   # Root-Komponente
└── main.tsx                  # Einstiegspunkt
```

### Trennung von Logik und UI

Die gesamte Spiellogik (`engine/`, `hooks/`) ist frei von React-Abhängigkeiten und kann unabhängig getestet werden. Die UI-Komponenten sind rein präsentational und erhalten alle Daten als Props.

## Solver-Strategie

Der Solver verwendet **Backtracking mit impliziter Constraint Propagation**:

1. **Zeilenweise Iteration**: Pro Zeile wird genau eine Spalte besetzt (garantiert „1 Hund/Zeile").
2. **Frühe Pruning**: Für jeden Kandidaten werden sofort geprüft:
   - Spalte noch frei? (`usedCols`)
   - Region noch frei? (`usedRegions`)
   - Kein adjazenter Hund?
3. **Eindeutigkeitsprüfung**: Der Solver sucht maximal 2 Lösungen. Bei genau 1 Lösung ist das Puzzle eindeutig.
4. **Komplexität**: O(N!) im Worst Case, durch Pruning in der Praxis sehr schnell (< 1 ms für 10×10).

## Generator-Strategie

Der Generator verwendet einen **Seed-basierten PRNG (mulberry32)**:

1. **Zufällige Lösung**: Fisher-Yates-Shuffle + Backtracking erzeugt eine gültige Hundeverteilung.
2. **Voronoi-Regionwachstum**: Jede Hundzelle ist der Seed einer Region. Von dort aus wächst die Region in alle 4 Richtungen, bis alle Zellen vergeben sind.
3. **Eindeutigkeitscheck**: Der Solver prüft ob genau 1 Lösung existiert. Falls nicht, wird mit leicht modifiziertem Seed neu gewürfelt (max. 200 Versuche).
4. **Reproduzierbarkeit**: Gleicher Seed → gleiches Puzzle → Tagesrätsel sind deterministisch.

## Tests

```bash
npm test               # Alle Tests
npm run test:coverage  # Mit Coverage-Report (Ziel: ≥ 90%)
```

Testabdeckung:
- `tests/unit/solver.test.ts` – Solver (Eindeutigkeit, Korrektheit, Edge Cases)
- `tests/unit/generator.test.ts` – Generator (Reproduzierbarkeit, Regionkorrektheit)
- `tests/unit/validator.test.ts` – Validator (alle 4 Regeltypen, Hint, Auto-Exclude)
- `tests/integration/game.test.tsx` – Spielablauf (useGame Hook, What-if, Undo/Redo, Sieg)

## Tech-Stack

- **React 18** + **TypeScript 5** + **Vite 5**
- **Vitest** + **@testing-library/react** für Tests
- **vite-plugin-pwa** für PWA-Support
- Kein externes UI-Framework
