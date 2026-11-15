import { useEffect, useRef, useState } from 'react';
import { playCigaretteLightSound } from '../utils/lighterAudio';
import { CigaretteSmokeEngine } from '../utils/smokeEngine';
import { notifyLighterHover } from './LighterCursor';

// Verified exact mouth & tip positions on 1280x960 image_d379a08f.png
const CIGARETTES = [
  {
    id: 'left',
    label: 'Поджечь сигарету слева',
    mouthX: 348,
    mouthY: 212,
    tipX: 386,
    tipY: 223,
  },
  {
    id: 'right',
    label: 'Поджечь сигарету справа',
    mouthX: 706,
    mouthY: 503,
    tipX: 665,
    tipY: 516,
  },
] as const;

export function ApproachDuoPhoto() {
  const swayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [imgFailed, setImgFailed] = useState(false);
  const [litState, setLitState] = useState<{ left: boolean; right: boolean }>({
    left: false,
    right: false,
  });

  const litRef = useRef({ left: false, right: false });
  const heatRef = useRef({ left: 0, right: 0 });
  const hoveringRef = useRef<{ left: boolean; right: boolean }>({
    left: false,
    right: false,
  });

  const smokeEnginesRef = useRef({
    left: new CigaretteSmokeEngine(),
    right: new CigaretteSmokeEngine(),
  });

  useEffect(() => {
    litRef.current = litState;
    heatRef.current.left = litState.left ? 1 : 0;
    heatRef.current.right = litState.right ? 1 : 0;
  }, [litState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = swayRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, window.matchMedia('(pointer: coarse)').matches ? 1.25 : 2);
    const resize = () => {
      canvas.width = Math.max(1, Math.round(container.offsetWidth * dpr));
      canvas.height = Math.max(1, Math.round(container.offsetHeight * dpr));
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(32, now - lastTime);
      lastTime = now;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      for (const cig of CIGARETTES) {
        const key = cig.id;
        if (!litRef.current[key]) {
          if (hoveringRef.current[key]) {
            heatRef.current[key] = Math.min(1, heatRef.current[key] + dt / 200);
            if (heatRef.current[key] >= 1) {
              litRef.current[key] = true;
              playCigaretteLightSound();
              setLitState((prev) => ({ ...prev, [key]: true }));
            }
          } else if (heatRef.current[key] > 0) {
            heatRef.current[key] = Math.max(0, heatRef.current[key] - dt / 340);
          }
        }

        const tipX = (cig.tipX / 1280) * w;
        const tipY = (cig.tipY / 960) * h;

        smokeEnginesRef.current[key].stepAndDraw(
          ctx,
          tipX,
          tipY,
          dpr,
          dt,
          now,
          litRef.current[key],
          heatRef.current[key],
          hoveringRef.current[key],
          1.28
        );
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!swayRef.current) return;
    const rect = swayRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    let anyOver = false;
    for (const cig of CIGARETTES) {
      const tx = (cig.tipX / 1280) * rect.width;
      const ty = (cig.tipY / 960) * rect.height;
      const near = Math.hypot(px - tx, py - ty) < 34;
      hoveringRef.current[cig.id] = near;
      if (near) anyOver = true;
    }

    notifyLighterHover({ overCigarette: anyOver });
  };

  const handlePointerEnter = () => {
    notifyLighterHover({ hot: true });
  };

  const handlePointerLeave = () => {
    hoveringRef.current.left = false;
    hoveringRef.current.right = false;
    notifyLighterHover({ hot: false, overCigarette: false });
  };

  const toggleCig = (id: 'left' | 'right') => {
    setLitState((prev) => {
      const nextVal = !prev[id];
      if (nextVal) playCigaretteLightSound();
      return { ...prev, [id]: nextVal };
    });
  };

  const eitherLit = litState.left || litState.right;

  return (
    <div className="relative space-y-3">
      <div className="relative">
        {/* Street wheatpaste tape corners */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-2.5 right-8 z-20 h-5 w-16 rotate-3 bg-[#EDE8DC]/85 border border-[#141413]/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-2.5 left-8 z-20 h-5 w-16 -rotate-3 bg-[#EDE8DC]/85 border border-[#141413]/20"
        />

        <div className="relative aspect-[4/3] w-full overflow-hidden border-2 border-[#161615] bg-[#141210] shadow-[10px_10px_0px_#161615]">
          <div
            ref={swayRef}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            onPointerMove={handlePointerMove}
            className="relative w-full h-full animate-living-sway-duo select-none"
          >
            {!imgFailed ? (
              <img
                src={`${import.meta.env.BASE_URL}assets/aistudio/image_d379a08f.png`}
                alt="Это мы с тобой, когда у тебя отличный сайт"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                draggable={false}
                className="w-full h-full object-cover pointer-events-none select-none"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-[#B5AEA2]">
                Это мы с тобой, когда у тебя отличный сайт
              </div>
            )}

            {/* Cigarettes placed naturally in both mouths */}
            <svg
              viewBox="0 0 1280 960"
              aria-hidden="true"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <defs>
                <linearGradient id="cigPaperLeft" x1="348" y1="210" x2="386" y2="225" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#9A7956" />
                  <stop offset="28%" stopColor="#9E7C58" />
                  <stop offset="30%" stopColor="#DCD3C4" />
                  <stop offset="86%" stopColor="#C8BFB1" />
                  <stop offset="100%" stopColor="#46423D" />
                </linearGradient>
                <linearGradient id="cigPaperRight" x1="706" y1="501" x2="665" y2="518" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#9B7A57" />
                  <stop offset="28%" stopColor="#A2805C" />
                  <stop offset="30%" stopColor="#E2DACB" />
                  <stop offset="86%" stopColor="#CFC6B8" />
                  <stop offset="100%" stopColor="#46423D" />
                </linearGradient>
              </defs>

              <g>
                <line
                  x1="347"
                  y1="214.5"
                  x2="385"
                  y2="225.5"
                  stroke="rgba(10, 8, 6, 0.55)"
                  strokeWidth="4.2"
                  strokeLinecap="round"
                />
                <line
                  x1="348"
                  y1="212"
                  x2="386"
                  y2="223"
                  stroke="url(#cigPaperLeft)"
                  strokeWidth="3.6"
                  strokeLinecap="round"
                />
                <circle cx="348" cy="212" r="2.2" fill="rgba(25, 18, 14, 0.45)" />
              </g>

              <g>
                <line
                  x1="705"
                  y1="505.5"
                  x2="664"
                  y2="518.5"
                  stroke="rgba(10, 8, 6, 0.55)"
                  strokeWidth="4.8"
                  strokeLinecap="round"
                />
                <line
                  x1="706"
                  y1="503"
                  x2="665"
                  y2="516"
                  stroke="url(#cigPaperRight)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <circle cx="706" cy="503" r="2.4" fill="rgba(25, 18, 14, 0.45)" />
              </g>
            </svg>

            <canvas
              ref={canvasRef}
              aria-hidden="true"
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {CIGARETTES.map((cig) => (
              <button
                key={cig.id}
                type="button"
                onClick={() => toggleCig(cig.id)}
                aria-label={cig.label}
                style={{
                  left: `${(cig.tipX / 1280) * 100}%`,
                  top: `${(cig.tipY / 960) * 100}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-transparent focus-visible:outline-2 focus-visible:outline-[#FF5A1F]"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="pt-1 flex items-center justify-between gap-4 font-mono text-xs text-[#4A4741]">
        <span>
          {litState.left && litState.right
            ? 'Обе сигареты дымят'
            : eitherLit
              ? 'Одна прикурена — можно поджечь и вторую'
              : 'Наведи зажигалку на сигареты в кадре'}
        </span>
        {eitherLit && (
          <button
            type="button"
            onClick={() => setLitState({ left: false, right: false })}
            className="text-[#161615] hover:text-[#D44410] underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Потушить обе
          </button>
        )}
      </div>
    </div>
  );
}
