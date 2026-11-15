import { Flame, RotateCcw } from 'lucide-react';
import { ReactNode, useEffect, useRef, useState } from 'react';

export type BurnState = 'intact' | 'burning' | 'burned';

interface BurnableSectionProps {
  id?: string;
  label?: string;
  theme?: 'dark' | 'light';
  children: ReactNode;
  globalBurnSignal: number;
  globalBurnDelayMs?: number;
  resetSignal: number;
  onBurnComplete?: (id: string) => void;
  onHoverBurnControl?: (hovering: boolean) => void;
  showSectionBurnButton?: boolean;
  className?: string;
  preserveSpaceWhenBurned?: boolean;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  hue: number;
}

// Fast deterministic 2D value noise + 3-octave fBm for organic paper burn edges
function buildNoiseGrid(w: number, h: number, seed: number): Float32Array {
  const hash = (ix: number, iy: number) => {
    let n = ix * 374761393 + iy * 668265263 + seed * 1442695041;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967295;
  };

  const smoothNoise = (x: number, y: number) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);

    const a = hash(x0, y0);
    const b = hash(x0 + 1, y0);
    const c = hash(x0, y0 + 1);
    const d = hash(x0 + 1, y0 + 1);

    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };

  const grid = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const ny = (y / h) * 6.5;
    for (let x = 0; x < w; x++) {
      const nx = (x / w) * 8.5;
      const val =
        smoothNoise(nx, ny) * 0.58 +
        smoothNoise(nx * 2.1 + 11.3, ny * 2.1 + 7.1) * 0.28 +
        smoothNoise(nx * 4.4 + 29.7, ny * 4.4 + 19.2) * 0.14;
      grid[y * w + x] = val;
    }
  }
  return grid;
}

export function BurnableSection({
  id = 'section',
  label,
  theme = 'dark',
  children,
  globalBurnSignal,
  globalBurnDelayMs = 0,
  resetSignal,
  onBurnComplete,
  onHoverBurnControl,
  showSectionBurnButton = true,
  className = '',
  preserveSpaceWhenBurned = true,
}: BurnableSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [burnState, setBurnState] = useState<BurnState>('intact');
  const burnOriginRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.2 });
  const prevGlobalSignalRef = useRef(globalBurnSignal);
  const prevResetSignalRef = useRef(resetSignal);
  const delayTimerRef = useRef<number | null>(null);

  const ignite = (originX = 0.5, originY = 0.25) => {
    if (burnState !== 'intact') return;
    burnOriginRef.current = { x: originX, y: originY };
    setBurnState('burning');
  };

  // Trigger cascade burn when globalBurnSignal increments
  useEffect(() => {
    if (globalBurnSignal === prevGlobalSignalRef.current) return;
    prevGlobalSignalRef.current = globalBurnSignal;

    if (burnState !== 'intact') {
      if (burnState === 'burned') {
        onBurnComplete?.(id);
      }
      return;
    }

    if (delayTimerRef.current) window.clearTimeout(delayTimerRef.current);

    delayTimerRef.current = window.setTimeout(() => {
      // Stagger ignition point organically
      const ox = 0.35 + ((id.charCodeAt(0) * 17) % 30) / 100;
      const oy = 0.15 + ((id.charCodeAt(id.length - 1) * 13) % 45) / 100;
      burnOriginRef.current = { x: ox, y: oy };
      setBurnState('burning');
    }, globalBurnDelayMs);

    return () => {
      if (delayTimerRef.current) window.clearTimeout(delayTimerRef.current);
    };
  }, [globalBurnSignal, globalBurnDelayMs, burnState, id, onBurnComplete]);

  // Restore section when resetSignal increments
  useEffect(() => {
    if (resetSignal === prevResetSignalRef.current) return;
    prevResetSignalRef.current = resetSignal;
    if (delayTimerRef.current) window.clearTimeout(delayTimerRef.current);
    setBurnState('intact');
  }, [resetSignal]);

  // Procedural Canvas Burn Simulation
  useEffect(() => {
    if (burnState !== 'burning') return;

    const container = sectionRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const displayW = Math.max(1, Math.round(rect.width));
    const displayH = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, window.matchMedia('(pointer: coarse)').matches ? 1 : 1.5);

    canvas.width = Math.round(displayW * dpr);
    canvas.height = Math.round(displayH * dpr);

    // Offscreen low-res procedural fire mask grid for 60fps smooth scaling
    const gridW = 200;
    const gridH = Math.max(48, Math.min(240, Math.round((gridW * displayH) / displayW)));

    const offscreen = document.createElement('canvas');
    offscreen.width = gridW;
    offscreen.height = gridH;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    const imgData = offCtx.createImageData(gridW, gridH);
    const data = imgData.data;

    const seed = Math.floor(Math.random() * 10000);
    const noiseGrid = buildNoiseGrid(gridW, gridH, seed);

    const ox = burnOriginRef.current.x;
    const oy = burnOriginRef.current.y;
    const aspect = displayW / displayH;

    // Precompute max normalized distance from ignition origin so burn finishes uniformly
    const corners = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ];
    let maxDist = 0.001;
    for (const [cx, cy] of corners) {
      const d = Math.hypot((cx - ox) * aspect, cy - oy);
      if (d > maxDist) maxDist = d;
    }

    const thresholdGrid = new Float32Array(gridW * gridH);
    for (let gy = 0; gy < gridH; gy++) {
      const ny = gy / gridH;
      for (let gx = 0; gx < gridW; gx++) {
        const nx = gx / gridW;
        const distNorm = Math.hypot((nx - ox) * aspect, ny - oy) / maxDist;
        thresholdGrid[gy * gridW + gx] = distNorm * 0.68 + noiseGrid[gy * gridW + gx] * 0.34;
      }
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const durationMs = reducedMotion ? 900 : Math.min(2800, Math.max(1850, displayH * 2.5));
    const startTime = performance.now();
    const sparks: Spark[] = [];
    let rafId = 0;

    const renderFrame = (now: number) => {
      const elapsed = now - startTime;
      const rawT = Math.min(1, elapsed / durationMs);
      // Smooth ease-in-out curve so fire catches gently and sweeps smoothly
      const easedT = rawT < 0.5 ? 2 * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 2) / 2;
      const progress = easedT * 1.15;

      const flickerPhase = now * 0.015;
      const flameSampleXs: number[] = [];
      const flameSampleYs: number[] = [];

      for (let gy = 0; gy < gridH; gy++) {
        const rowOffset = gy * gridW;
        for (let gx = 0; gx < gridW; gx++) {
          const i = rowOffset + gx;
          const idx = i * 4;
          const diff = progress - thresholdGrid[i];

          if (diff <= -0.055) {
            // Intact pixel
            data[idx + 3] = 0;
          } else if (diff < 0) {
            // Heat scorch halo ahead of flame
            const heat = 1 + diff / 0.055; // 0..1
            data[idx] = 22;
            data[idx + 1] = 10;
            data[idx + 2] = 4;
            data[idx + 3] = Math.round(heat * heat * 165);
          } else if (diff <= 0.014) {
            // Bright incandescent yellow-white flame front
            const f = Math.sin(flickerPhase + gx * 0.4 + gy * 0.3) * 0.15 + 0.85;
            data[idx] = 255;
            data[idx + 1] = Math.round(215 * f);
            data[idx + 2] = Math.round(125 * f);
            data[idx + 3] = 250;
            if (!reducedMotion && Math.random() < 0.012 && flameSampleXs.length < 28) {
              flameSampleXs.push((gx / gridW) * canvas.width);
              flameSampleYs.push((gy / gridH) * canvas.height);
            }
          } else if (diff <= 0.042) {
            // Vivid burning orange fire band
            const band = (diff - 0.014) / 0.028; // 0..1
            data[idx] = Math.round(255 - band * 55);
            data[idx + 1] = Math.round(135 - band * 105);
            data[idx + 2] = Math.round(22 - band * 18);
            data[idx + 3] = 255;
          } else if (diff <= 0.078) {
            // Cooling red ember & dark char crust
            const ember = 1 - (diff - 0.042) / 0.036;
            const pulse = 0.65 + 0.35 * Math.sin(flickerPhase * 1.4 + i * 0.17);
            data[idx] = Math.round(ember * pulse * 175);
            data[idx + 1] = Math.round(ember * pulse * 32);
            data[idx + 2] = Math.round(ember * 6);
            data[idx + 3] = 255;
          } else {
            // Burned away -> pure pitch-black void
            data[idx] = 0;
            data[idx + 1] = 0;
            data[idx + 2] = 0;
            data[idx + 3] = 255;
          }
        }
      }

      offCtx.putImageData(imgData, 0, 0);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);

      // Spawn sparks along active flame front
      for (let s = 0; s < flameSampleXs.length; s++) {
        if (sparks.length < 90 && Math.random() < 0.45) {
          sparks.push({
            x: flameSampleXs[s],
            y: flameSampleYs[s],
            vx: (Math.random() - 0.5) * 1.6 * dpr,
            vy: -(1.2 + Math.random() * 2.6) * dpr,
            size: (1.2 + Math.random() * 2.1) * dpr,
            life: 0,
            maxLife: 24 + Math.random() * 28,
            hue: 22 + Math.random() * 28,
          });
        }
      }

      // Render crisp flying sparks
      if (sparks.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = sparks.length - 1; i >= 0; i--) {
          const sp = sparks[i];
          sp.life += 1;
          if (sp.life >= sp.maxLife) {
            sparks.splice(i, 1);
            continue;
          }
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.vy -= 0.03 * dpr;
          const alpha = 1 - sp.life / sp.maxLife;
          ctx.fillStyle = `hsla(${sp.hue}, 100%, 62%, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, sp.size * (0.4 + 0.6 * alpha), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (rawT < 1) {
        rafId = requestAnimationFrame(renderFrame);
      } else {
        // Fill solid black cleanly at completion
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setBurnState('burned');
        onBurnComplete?.(id);
      }
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [burnState, id, onBurnComplete]);

  const handleLocalBurnClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!sectionRef.current) {
      ignite(0.85, 0.15);
      return;
    }
    const rect = sectionRef.current.getBoundingClientRect();
    const ox = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
    const oy = Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height));
    ignite(ox, oy);
  };

  return (
    <div
      id={id}
      ref={sectionRef}
      className={`relative overflow-hidden ${className} ${
        burnState === 'burned' && !preserveSpaceWhenBurned ? 'hidden' : ''
      }`}
    >
      {/* Underlying content (hidden once fully burned into black space) */}
      <div
        className={
          burnState === 'burned'
            ? 'opacity-0 pointer-events-none select-none'
            : burnState === 'burning'
              ? 'pointer-events-none select-none'
              : ''
        }
        aria-hidden={burnState === 'burned'}
      >
        {children}

        {showSectionBurnButton && burnState === 'intact' && (
          <div className="max-w-6xl mx-auto px-6 pb-8 flex justify-end">
            <button
              type="button"
              onClick={handleLocalBurnClick}
              onMouseEnter={() => onHoverBurnControl?.(true)}
              onMouseLeave={() => onHoverBurnControl?.(false)}
              className={`inline-flex items-center gap-2 text-xs transition-colors py-1.5 px-2 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#FF7B29] ${
                theme === 'light'
                  ? 'text-[#5A544B] hover:text-[#C84B0F]'
                  : 'text-[#9D968B] hover:text-[#FF8A33]'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Поджечь{label ? ` «${label}»` : ' страницу'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Burn fire & black void canvas */}
      {burnState === 'burning' && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
        />
      )}

      {/* Burned state: pure pitch-black void with subtle hover-only restore link */}
      {burnState === 'burned' && (
        <div className="group/void absolute inset-0 bg-[#000000] z-20 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setBurnState('intact')}
            className="opacity-0 group-hover/void:opacity-60 hover:!opacity-100 transition-opacity duration-300 inline-flex items-center gap-2 text-xs text-[#6B675F] hover:text-[#EBE6DC] px-4 py-2 whitespace-nowrap focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-[#FF7B29]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Вернуть блок</span>
          </button>
        </div>
      )}
    </div>
  );
}
