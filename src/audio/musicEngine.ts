// ============================================================
// musicEngine.ts – Web Audio API Musik-Engine
//
// 5 Trilogien, jede mit 3 Phasen (grün / gelb / rot).
// Phasenwechsel per Countdown: >120s grün, >60s gelb, ≤60s rot.
// ============================================================

type WaveType = OscillatorType;
export type PhaseKey = 'green' | 'yellow' | 'red';

interface Step { f?: number; d: number; }
interface LayerDef { p: Step[]; bpm: number; wave: WaveType; gain: number; }

// ── Frequenzen (Hz) ───────────────────────────────────────────
const C2=65.4,  E2=82.4,  G2=98,   A2=110;
const C3=130.8, E3=164.8, G3=196,  A3=220,  B3=246.9;
const C4=261.6, D4=293.7, E4=329.6,F4=349.2,G4=392, A4=440,  B4=493.9;
const Ab4=415.3,Bb4=466.2;
const C5=523.3, Cs5=554.4,D5=587.3,Eb5=622.3,E5=659.3,G5=784,B5=987.8;

const n = (f: number, d: number): Step => ({ f, d });
const r = (d: number): Step => ({ d });

// ── 5 Trilogien ──────────────────────────────────────────────
const TRILOGIES: Array<Record<PhaseKey, LayerDef[] | 'siren'>> = [

  // ── 0: Denker-Kaffee ☕ ────────────────────────────────────
  {
    green: [{ bpm:75, wave:'sine', gain:.11, p:[
      n(C4,2),n(E4,1),n(G4,1),n(C5,2),n(G4,1),n(E4,1),
    ]}],
    yellow: [{ bpm:110, wave:'triangle', gain:.15, p:[
      n(D4,.5),r(.25),n(F4,.5),n(A4,.75),n(F4,.5),r(.25),n(D4,.5),r(1),
    ]}],
    red: [
      { bpm:150, wave:'square',   gain:.08, p:[n(E5,.25),n(B4,.25),n(E5,.25),n(B4,.25),n(E5,.5),n(A4,.5)] },
      { bpm:150, wave:'sawtooth', gain:.13, p:[n(A2,.5),r(.5)] },
    ],
  },

  // ── 1: 8-Bit Abenteuer 🎮 ─────────────────────────────────
  {
    green: [{ bpm:95, wave:'square', gain:.08, p:[
      n(C4,.5),n(E4,.5),n(G4,.5),n(A4,.5),n(G4,.5),n(E4,.5),n(C4,.5),n(D4,.5),
    ]}],
    yellow: [{ bpm:125, wave:'sawtooth', gain:.09, p:[
      n(A3,.5),n(C4,.25),n(B3,.25),n(A3,.5),n(E4,.5),n(D4,.5),n(C4,.25),n(B3,.25),n(A3,1),
    ]}],
    red: [
      { bpm:155, wave:'square', gain:.08, p:[
        n(E5,.25),r(.25),n(E5,.25),r(.25),n(E5,.5),n(C5,.25),n(E5,.25),n(G5,.5),r(.5),
      ]},
      { bpm:155, wave:'square', gain:.12, p:[n(A2,.5),r(.25),n(A2,.25),r(.5),n(E2,.5)] },
    ],
  },

  // ── 2: Zen bis Sturm 🌊 ───────────────────────────────────
  {
    green: [
      { bpm:55, wave:'sine', gain:.09, p:[n(C3,4),n(G3,4),n(E3,4),n(C3,4)] },
      { bpm:55, wave:'sine', gain:.11, p:[r(3),n(C5,.2),r(3.8),r(4),r(3),n(G5,.2),r(3.8),r(4)] },
    ],
    yellow: [{ bpm:100, wave:'triangle', gain:.17, p:[
      n(C2,.5),r(.5),n(G2,.25),n(C2,.25),r(.5),n(C2,.5),n(A2,.25),r(.25),n(C2,.5),r(.5),
    ]}],
    red: 'siren',
  },

  // ── 3: Coldplay – Clocks 🕐 ───────────────────────────────
  // Grün: entspanntes Arpeggio in Eb-Dur (Triplet-Muster, langsam)
  // Gelb: Original-Tempo, Sägezahn, mehr Druck
  // Rot: Staccato-Sturm + Bass-Puls
  {
    green: [{ bpm:80, wave:'sine', gain:.10, p:[
      // Eb-Dur Arpeggio (vereinfacht, absteigend): Eb5 Bb4 Ab4 Bb4
      n(Eb5,.33),n(Bb4,.33),n(Ab4,.33),
      n(Eb5,.33),n(Bb4,.33),n(Ab4,.33),
      n(Eb5,.33),n(Bb4,.33),n(Ab4,.33),
      n(Eb5,.33),n(Bb4,.33),n(Ab4,.33),
    ]}],
    yellow: [{ bpm:130, wave:'triangle', gain:.12, p:[
      n(Eb5,.33),n(Bb4,.33),n(Ab4,.33),
      n(Eb5,.33),n(Bb4,.33),n(Ab4,.33),
      n(Eb5,.33),n(Bb4,.33),n(Ab4,.33),
      n(Eb5,.33),n(Bb4,.33),n(Ab4,.33),
    ]}],
    red: [
      { bpm:155, wave:'square', gain:.08, p:[
        n(Eb5,.2),r(.1),n(Bb4,.2),r(.1),n(Ab4,.2),r(.1),
        n(Eb5,.2),r(.1),n(Bb4,.2),r(.1),n(Ab4,.4),r(.1),
      ]},
      { bpm:155, wave:'sawtooth', gain:.14, p:[n(A2,.5),r(.5)] },
    ],
  },

  // ── 4: Yiruma – River Flows in You 🌸 ────────────────────
  // Grün: sanfte Hauptmelodie (A-Dur, fließend, Piano-feel)
  // Gelb: schnellere, drängendere Variation
  // Rot: alarmierend beschleunigt + Bass
  {
    green: [
      // Melodie (rechte Hand)
      { bpm:65, wave:'sine', gain:.10, p:[
        n(A4,1.5),n(B4,.5),n(Cs5,1),n(B4,.5),n(A4,.5),
        r(.5),n(E5,1.5),n(D5,.5),n(Cs5,1),n(B4,.5),n(A4,1),
        n(A4,1.5),n(B4,.5),n(Cs5,1),n(B4,.5),n(A4,.5),
        r(.5),n(E5,1),n(E5,.5),n(D5,.5),n(Cs5,.5),n(B4,.5),n(A4,2),
      ]},
      // Begleitung (linke Hand) – sanfte Achtelnoten
      { bpm:65, wave:'sine', gain:.06, p:[
        n(A3,.5),n(E4,.5),n(A4,.5),n(E4,.5), // A-Dur
        n(A3,.5),n(E4,.5),n(A4,.5),n(E4,.5),
        n(B3,.5),n(E4,.5),n(G4,.5),n(E4,.5), // H-Moll
        n(B3,.5),n(E4,.5),n(G4,.5),n(E4,.5),
        n(Cs5,.5),n(E4,.5),n(A4,.5),n(E4,.5),// C#-Moll
        n(Cs5,.5),n(E4,.5),n(A4,.5),n(E4,.5),
        n(D4,.5),n(A4,.5),n(D5,.5),n(A4,.5), // D-Dur
        n(D4,.5),n(A4,.5),n(D5,.5),n(A4,.5),
      ]},
    ],
    yellow: [
      { bpm:105, wave:'triangle', gain:.11, p:[
        n(A4,1),n(B4,.5),n(Cs5,.5),n(B4,.5),n(A4,.5),
        n(E5,1),n(D5,.5),n(Cs5,.5),n(B4,.5),n(A4,.5),
        n(A4,1),n(B4,.5),n(Cs5,.5),n(B4,.5),n(A4,.5),
        n(E5,.5),n(E5,.5),n(D5,.5),n(Cs5,.5),n(B4,.5),n(A4,1),
      ]},
      { bpm:105, wave:'triangle', gain:.07, p:[
        n(A3,.5),n(E4,.5),n(A3,.5),n(E4,.5),
        n(B3,.5),n(E4,.5),n(B3,.5),n(E4,.5),
        n(Cs5,.5),n(E4,.5),n(Cs5,.5),n(E4,.5),
        n(D4,.5),n(A4,.5),n(D4,.5),n(A4,.5),
      ]},
    ],
    red: [
      { bpm:150, wave:'square', gain:.08, p:[
        n(A4,.25),n(B4,.25),n(Cs5,.25),n(B4,.25),
        n(A4,.25),n(E5,.25),n(D5,.25),n(Cs5,.25),
        n(B4,.5),n(A4,.5),
      ]},
      { bpm:150, wave:'sawtooth', gain:.12, p:[n(A2,.5),r(.25),n(E2,.25),r(.5)] },
    ],
  },
];

// ── Singleton-State ───────────────────────────────────────────
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let activeOscs: OscillatorNode[] = [];
let activeLFOs: OscillatorNode[] = [];
let currentKey: string | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.65;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// ── Note-Sequencer ────────────────────────────────────────────
function schedLayer(
  ctx: AudioContext,
  dest: AudioNode,
  layer: LayerDef,
  startTime: number,
): OscillatorNode[] {
  const bs = 60 / layer.bpm;
  const totalBeats = layer.p.reduce((s, x) => s + (x.d ?? 0), 0);
  const loopDur = totalBeats * bs;
  const loops = Math.ceil(32 / loopDur) + 1;
  const oscs: OscillatorNode[] = [];

  for (let li = 0; li < loops; li++) {
    let t = startTime + li * loopDur;
    for (const step of layer.p) {
      if (step.f) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = layer.wave === 'square' ? 2400 : 10000;
        osc.connect(filt); filt.connect(g); g.connect(dest);
        osc.type = layer.wave;
        osc.frequency.value = step.f;
        const dur = step.d * bs;
        const atk = Math.min(0.018, dur * 0.08);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(layer.gain, t + atk);
        g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur * 0.83, atk + 0.01));
        osc.start(t); osc.stop(t + dur);
        oscs.push(osc);
      }
      t += (step.d ?? 0) * bs;
    }
  }
  return oscs;
}

// ── Sirenen-Spezialfall ───────────────────────────────────────
function schedSiren(ctx: AudioContext, dest: AudioNode, startTime: number): OscillatorNode[] {
  const osc = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const g = ctx.createGain();
  osc.type = 'sawtooth'; osc.frequency.value = 620;
  lfo.type = 'sine';     lfo.frequency.value = 0.9;
  lfoGain.gain.value = 280;
  lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
  osc.connect(g); g.connect(dest); g.gain.value = 0.09;
  osc.start(startTime); lfo.start(startTime);
  osc.stop(startTime + 34); lfo.stop(startTime + 34);
  activeLFOs.push(lfo);
  const beeps = schedLayer(ctx, dest,
    { bpm:170, wave:'square', gain:.07, p:[n(E5,.2),r(.1),n(E5,.2),r(.1),n(B5,.4),r(.2)] },
    startTime
  );
  return [osc, ...beeps];
}

// ── Öffentliche API ───────────────────────────────────────────
export function playPhase(trilogyIdx: number, phase: PhaseKey): void {
  const key = `${trilogyIdx}-${phase}`;
  if (key === currentKey) return;
  currentKey = key;

  const ctx = getCtx();
  const dest = masterGain!;
  const now = ctx.currentTime + 0.05;

  const dying = [...activeOscs, ...activeLFOs];
  dying.forEach(o => { try { o.stop(now + 0.12); } catch (_) {/* ignore */} });
  activeOscs = []; activeLFOs = [];

  const phaseDef = TRILOGIES[trilogyIdx]?.[phase];
  if (!phaseDef) return;

  if (phaseDef === 'siren') {
    activeOscs = schedSiren(ctx, dest, now + 0.12);
  } else {
    for (const layer of phaseDef) {
      activeOscs.push(...schedLayer(ctx, dest, layer, now + 0.12));
    }
  }
}

export function stopMusic(): void {
  const now = audioCtx ? audioCtx.currentTime : 0;
  [...activeOscs, ...activeLFOs].forEach(o => {
    try { o.stop(now + 0.08); } catch (_) {/* ignore */}
  });
  activeOscs = []; activeLFOs = []; currentKey = null;
}

export function getPhase(seconds: number): PhaseKey {
  if (seconds > 120) return 'green';
  if (seconds > 60)  return 'yellow';
  return 'red';
}

/** Pseudo-zufällige Trilogie pro Level (deterministisch, gleichmäßig verteilt über 5) */
export function getTrilogyForLevel(level: number): number {
  const order = [1, 3, 0, 4, 2, 3, 1, 4, 0, 2, 4, 1, 3, 0, 2, 1, 4, 0, 3, 2];
  return order[(level - 1) % order.length];
}
