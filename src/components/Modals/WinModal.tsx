// ============================================================
// WinModal – Sieges-Overlay mit Konfetti + Level-Fortschritt
// ============================================================

import { useEffect, useRef } from 'react';
import { formatTime } from '../../hooks/useTimer';
import { useLang } from '../../i18n/LanguageContext';
import { MAX_CAMPAIGN_LEVEL } from '../../engine/generator';
import type { Difficulty } from '../../types';

interface WinModalProps {
  elapsedSeconds: number;
  difficulty: Difficulty;
  onRestart: () => void;
  onNewPuzzle: () => void;
  // Kampagnen-Props (optional)
  campaignMode?: boolean;
  level?: number;
  onNextLevel?: () => void;
}

function runConfetti(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d')!;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    w: Math.random() * 10 + 5,
    h: Math.random() * 6 + 3,
    color: `hsl(${Math.random() * 360},80%,60%)`,
    vx: (Math.random() - 0.5) * 3,
    vy: Math.random() * 4 + 2,
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 6,
  }));

  let rafId: number;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      if (p.y > canvas.height) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
    }
    rafId = requestAnimationFrame(draw);
  }

  draw();
  return () => cancelAnimationFrame(rafId);
}

export function WinModal({
  elapsedSeconds,
  difficulty,
  onRestart,
  onNewPuzzle,
  campaignMode = false,
  level = 0,
  onNextLevel,
}: WinModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { t } = useLang();

  useEffect(() => {
    if (!canvasRef.current) return;
    const stop = runConfetti(canvasRef.current);
    const timer = setTimeout(stop, campaignMode ? 6000 : 4000);
    return () => { stop(); clearTimeout(timer); };
  }, [campaignMode]);

  // Zufaelliges Motivations-Zitat basierend auf Level-Nummer
  const quotes = t.motivationalQuotes as readonly string[];
  const quoteIndex = campaignMode ? ((level * 7 + 3) % quotes.length) : (level % quotes.length);
  const quote = quotes[quoteIndex];

  const isChampion = campaignMode && level >= MAX_CAMPAIGN_LEVEL;
  const nextLvl = level + 1;

  if (campaignMode && isChampion) {
    // Kampagne abgeschlossen – Trophäen-Screen
    return (
      <>
        <canvas ref={canvasRef} className="confetti" aria-hidden />
        <div className="modal-backdrop" role="dialog" aria-modal aria-labelledby="win-title">
          <div className="modal">
            <p className="modal__title" id="win-title">{t.campaign.champion}</p>
            <p className="modal__subtitle">{t.campaign.championMsg}</p>
            <p className="modal__quote">{quote}</p>
            <div className="modal__time">{formatTime(elapsedSeconds)}</div>
            <div className="modal__actions">
              <button className="btn btn--primary" onClick={onNextLevel}>
                {t.campaign.endlessContinue}
              </button>
              <button className="btn" onClick={onNewPuzzle}>
                {t.campaign.restartCampaign}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (campaignMode) {
    // Normales Level abgeschlossen
    return (
      <>
        <canvas ref={canvasRef} className="confetti" aria-hidden />
        <div className="modal-backdrop" role="dialog" aria-modal aria-labelledby="win-title">
          <div className="modal">
            <div className="modal__level-badge">
              {t.campaign.levelBadge(level, MAX_CAMPAIGN_LEVEL)}
            </div>
            <p className="modal__title" id="win-title">
              {t.campaign.levelComplete(level)}
            </p>
            <p className="modal__quote">{quote}</p>
            <div className="modal__time">{formatTime(elapsedSeconds)}</div>
            <div className="modal__actions">
              <button className="btn btn--primary" onClick={onNextLevel}>
                {t.campaign.nextLevel(nextLvl)}
              </button>
              <button className="btn" onClick={onRestart}>
                {t.win.again}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Free-Play-Sieg (Standard)
  return (
    <>
      <canvas ref={canvasRef} className="confetti" aria-hidden />
      <div className="modal-backdrop" role="dialog" aria-modal aria-labelledby="win-title">
        <div className="modal">
          <p className="modal__title" id="win-title">{t.win.title}</p>
          <p className="modal__subtitle">{t.win.difficulty}: {t.difficulty[difficulty]}</p>
          <div className="modal__time">{formatTime(elapsedSeconds)}</div>
          <div className="modal__actions">
            <button className="btn btn--primary" onClick={onNewPuzzle}>
              {t.win.newPuzzle}
            </button>
            <button className="btn" onClick={onRestart}>
              {t.win.again}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
