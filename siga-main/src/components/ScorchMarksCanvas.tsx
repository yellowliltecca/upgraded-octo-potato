import { useEffect, useRef } from 'react';

interface ScorchMarksCanvasProps {
  torchActive: boolean;
  clearSignal: number;
  hidden: boolean;
  onHasMarksChange?: (hasMarks: boolean) => void;
}

interface BurnStamp {
  pageX: number;
  pageY: number;
  radius: number;
  bornAt: number;
  offsets: number[];
}

interface EmberParticle {
  pageX: number;
  pageY: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  isSmoke: boolean;
}

const VERTICES = 16;

function createBurnStamp(pageX: number, pageY: number, radius: number, now: number): BurnStamp {
  const offsets: number[] = [];
  for (let i = 0; i < VERTICES; i++) {
    offsets.push(0.74 + Math.random() * 0.52);
  }
  return { pageX, pageY, radius, bornAt: now, offsets };
}

function traceOrganicPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  offsets: number[]
) {
  ctx.beginPath();
  for (let i = 0; i < VERTICES; i++) {
    const angle = (i / VERTICES) * Math.PI * 2;
    const nextAngle = ((i + 1) / VERTICES) * Math.PI * 2;
    const r0 = radius * offsets[i];
    const r1 = radius * offsets[(i + 1) % VERTICES];
    const x0 = cx + Math.cos(angle) * r0;
    const y0 = cy + Math.sin(angle) * r0;
    const x1 = cx + Math.cos(nextAngle) * r1;
    const y1 = cy + Math.sin(nextAngle) * r1;
    const mx = (x0 + x1) * 0.5;
    const my = (y0 + y1) * 0.5;
    if (i === 0) {
      const prevR = radius * offsets[VERTICES - 1];
      const prevAngle = ((VERTICES - 1) / VERTICES) * Math.PI * 2;
      const px = cx + Math.cos(prevAngle) * prevR;
      const py = cy + Math.sin(prevAngle) * prevR;
      ctx.moveTo((px + x0) * 0.5, (py + y0) * 0.5);
    }
    ctx.quadraticCurveTo(x0, y0, mx, my);
  }
  ctx.closePath();
}

// Drawn ONCE onto the static document-sized canvas per stamp (zero per-frame redraw cost!)
function bakeStampToStaticCanvas(ctx: CanvasRenderingContext2D, s: BurnStamp) {
  const { pageX: x, pageY: y, radius: r, offsets } = s;

  // 1. Warm brown scorch halo
  const scorchR = r * 1.8;
  const scorchGrad = ctx.createRadialGradient(x, y, r * 0.5, x, y, scorchR);
  scorchGrad.addColorStop(0, 'rgba(32, 16, 6, 0.72)');
  scorchGrad.addColorStop(0.6, 'rgba(62, 32, 12, 0.3)');
  scorchGrad.addColorStop(1, 'rgba(40, 20, 6, 0)');
  ctx.fillStyle = scorchGrad;
  ctx.beginPath();
  ctx.arc(x, y, scorchR, 0, Math.PI * 2);
  ctx.fill();

  // 2. Charred soot rim
  traceOrganicPath(ctx, x, y, r * 1.15, offsets);
  ctx.fillStyle = '#25221E';
  ctx.fill();

  // 3. Burned pitch-black core
  traceOrganicPath(ctx, x, y, r * 0.88, offsets);
  ctx.fillStyle = '#050505';
  ctx.fill();

  // 4. Speckled gray ash grains along perimeter
  const dotCount = 9;
  for (let i = 0; i < dotCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = r * (0.88 + Math.random() * 0.42);
    const tone = 82 + Math.floor(Math.random() * 75);
    ctx.fillStyle = `rgba(${tone}, ${tone - 4}, ${tone - 9}, 0.82)`;
    ctx.beginPath();
    ctx.arc(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, 1 + Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function ScorchMarksCanvas({
  torchActive,
  clearSignal,
  hidden,
  onHasMarksChange,
}: ScorchMarksCanvasProps) {
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement>(null);

  const coolingStampsRef = useRef<BurnStamp[]>([]);
  const allStampsRef = useRef<BurnStamp[]>([]);
  const particlesRef = useRef<EmberParticle[]>([]);
  const hasMarksRef = useRef(false);

  const torchRef = useRef(torchActive);
  torchRef.current = torchActive;

  const pointerRef = useRef({
    clientX: -100,
    clientY: -100,
    lastPageX: -100,
    lastPageY: -100,
    inside: false,
    lastStampTime: 0,
  });

  const addStamp = (pageX: number, pageY: number, radius: number, now: number) => {
    const stamp = createBurnStamp(pageX, pageY, radius, now);
    allStampsRef.current.push(stamp);
    coolingStampsRef.current.push(stamp);
    if (coolingStampsRef.current.length > 45) {
      coolingStampsRef.current.shift();
    }

    const staticCanvas = staticCanvasRef.current;
    if (staticCanvas) {
      const sctx = staticCanvas.getContext('2d');
      if (sctx) {
        bakeStampToStaticCanvas(sctx, stamp);
      }
    }

    if (!hasMarksRef.current) {
      hasMarksRef.current = true;
      onHasMarksChange?.(true);
    }

    // Emit sparks & thin smoke
    for (let k = 0; k < 2; k++) {
      particlesRef.current.push({
        pageX: pageX + (Math.random() - 0.5) * 14,
        pageY: pageY + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 0.85,
        vy: -(0.9 + Math.random() * 1.7),
        size: 1.3 + Math.random() * 1.7,
        life: 0,
        maxLife: 22 + Math.random() * 18,
        isSmoke: false,
      });
    }
    if (Math.random() < 0.55) {
      particlesRef.current.push({
        pageX: pageX + (Math.random() - 0.5) * 8,
        pageY: pageY - 4,
        vx: (Math.random() - 0.35) * 0.35,
        vy: -(0.6 + Math.random() * 0.6),
        size: 6 + Math.random() * 5.5,
        life: 0,
        maxLife: 42 + Math.random() * 24,
        isSmoke: true,
      });
    }
    if (particlesRef.current.length > 75) {
      particlesRef.current.splice(0, particlesRef.current.length - 75);
    }
  };

  useEffect(() => {
    if (torchActive && pointerRef.current.inside) {
      const px = pointerRef.current.clientX + window.scrollX;
      const py = pointerRef.current.clientY + window.scrollY;
      const now = performance.now();
      addStamp(px, py, 19 + Math.random() * 7, now);
      pointerRef.current.lastPageX = px;
      pointerRef.current.lastPageY = py;
      pointerRef.current.lastStampTime = now;
    }
  }, [torchActive]);

  useEffect(() => {
    if (clearSignal === 0) return;
    allStampsRef.current = [];
    coolingStampsRef.current = [];
    particlesRef.current = [];
    hasMarksRef.current = false;
    onHasMarksChange?.(false);

    const staticCanvas = staticCanvasRef.current;
    if (staticCanvas) {
      const sctx = staticCanvas.getContext('2d');
      sctx?.clearRect(0, 0, staticCanvas.width, staticCanvas.height);
    }
  }, [clearSignal, onHasMarksChange]);

  useEffect(() => {
    const staticCanvas = staticCanvasRef.current;
    const fxCanvas = fxCanvasRef.current;
    if (!staticCanvas || !fxCanvas) return;

    const fxCtx = fxCanvas.getContext('2d');
    if (!fxCtx) return;

    const syncSizes = () => {
      const docW = document.documentElement.clientWidth;
      const docH = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        window.innerHeight
      );
      if (staticCanvas.width !== docW || staticCanvas.height !== docH) {
        staticCanvas.width = docW;
        staticCanvas.height = docH;
        const sctx = staticCanvas.getContext('2d');
        if (sctx && allStampsRef.current.length > 0) {
          for (let i = 0; i < allStampsRef.current.length; i++) {
            bakeStampToStaticCanvas(sctx, allStampsRef.current[i]);
          }
        }
      }

      fxCanvas.width = window.innerWidth;
      fxCanvas.height = window.innerHeight;
    };

    syncSizes();
    const ro = new ResizeObserver(syncSizes);
    ro.observe(document.body);
    window.addEventListener('resize', syncSizes);

    const handleMove = (clientX: number, clientY: number) => {
      const p = pointerRef.current;
      p.clientX = clientX;
      p.clientY = clientY;
      p.inside = true;

      if (!torchRef.current) return;

      const pageX = clientX + window.scrollX;
      const pageY = clientY + window.scrollY;
      const dist = Math.hypot(pageX - p.lastPageX, pageY - p.lastPageY);
      const now = performance.now();

      if (dist >= 16 || now - p.lastStampTime > 130) {
        addStamp(pageX, pageY, 14 + Math.random() * 10, now);
        p.lastPageX = pageX;
        p.lastPageY = pageY;
        p.lastStampTime = now;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      handleMove(e.clientX, e.clientY);
    };

    let rafId = 0;
    const renderFx = (now: number) => {
      const ptr = pointerRef.current;
      if (torchRef.current && ptr.inside && now - ptr.lastStampTime > 165) {
        const pageX = ptr.clientX + window.scrollX;
        const pageY = ptr.clientY + window.scrollY;
        addStamp(
          pageX + (Math.random() - 0.5) * 8,
          pageY + (Math.random() - 0.5) * 8,
          17 + Math.random() * 10,
          now
        );
        ptr.lastStampTime = now;
      }

      const cooling = coolingStampsRef.current;
      const parts = particlesRef.current;

      if (cooling.length === 0 && parts.length === 0) {
        fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
        rafId = requestAnimationFrame(renderFx);
        return;
      }

      fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      // Render cooling ember glow rims ONLY for stamps < 1.2s old
      for (let i = cooling.length - 1; i >= 0; i--) {
        const s = cooling[i];
        const age = now - s.bornAt;
        if (age >= 1200) {
          cooling.splice(i, 1);
          continue;
        }
        const t = 1 - age / 1200;
        const sx = s.pageX - scrollX;
        const sy = s.pageY - scrollY;
        traceOrganicPath(fxCtx, sx, sy, s.radius * 1.06, s.offsets);
        fxCtx.strokeStyle = `rgba(255, ${Math.round(90 + t * 80)}, 18, ${(t * 0.85).toFixed(3)})`;
        fxCtx.lineWidth = 2.4;
        fxCtx.stroke();
      }

      // Render active sparks & rising smoke
      for (let i = parts.length - 1; i >= 0; i--) {
        const pt = parts[i];
        pt.life += 1;
        if (pt.life >= pt.maxLife) {
          parts.splice(i, 1);
          continue;
        }
        pt.pageX += pt.vx;
        pt.pageY += pt.vy;
        const t = pt.life / pt.maxLife;
        const px = pt.pageX - scrollX;
        const py = pt.pageY - scrollY;

        if (pt.isSmoke) {
          pt.size += 0.26;
          const alpha = (1 - t) * 0.2;
          const sg = fxCtx.createRadialGradient(px, py, 0, px, py, pt.size);
          sg.addColorStop(0, `rgba(190, 185, 176, ${alpha.toFixed(3)})`);
          sg.addColorStop(1, 'rgba(140, 134, 126, 0)');
          fxCtx.fillStyle = sg;
          fxCtx.beginPath();
          fxCtx.arc(px, py, pt.size, 0, Math.PI * 2);
          fxCtx.fill();
        } else {
          const alpha = 1 - t;
          fxCtx.fillStyle = `rgba(255, ${Math.round(120 + (1 - t) * 115)}, 32, ${alpha.toFixed(3)})`;
          fxCtx.beginPath();
          fxCtx.arc(px, py, pt.size * (0.4 + 0.6 * alpha), 0, Math.PI * 2);
          fxCtx.fill();
        }
      }

      rafId = requestAnimationFrame(renderFx);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    rafId = requestAnimationFrame(renderFx);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', syncSizes);
      window.removeEventListener('pointermove', onPointerMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  if (hidden) return null;

  return (
    <>
      <canvas
        ref={staticCanvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 z-30"
      />
      <canvas
        ref={fxCanvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-30"
      />
    </>
  );
}
