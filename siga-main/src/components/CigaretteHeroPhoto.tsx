import { useEffect, useRef, useState } from 'react';
import { playCigaretteLightSound } from '../utils/lighterAudio';
import { CigaretteSmokeEngine } from '../utils/smokeEngine';
import { notifyLighterHover } from './LighterCursor';

interface CigaretteHeroPhotoProps {
  isLit: boolean;
  onIgnite: () => void;
  onExtinguish: () => void;
}

// Verified exact cigarette ember center on 1122x1402 image_e892f54f.png
const TIP_X_PCT = 0.5165;
const TIP_Y_PCT = 0.3116;

export function CigaretteHeroPhoto({
  isLit,
  onIgnite,
  onExtinguish,
}: CigaretteHeroPhotoProps) {
  const swayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [imgFailed, setImgFailed] = useState(false);

  const isHoveringTipRef = useRef(false);
  const isLitRef = useRef(isLit);
  const heatRef = useRef(0);
  const smokeRef = useRef(new CigaretteSmokeEngine());

  useEffect(() => {
    isLitRef.current = isLit;
    heatRef.current = isLit ? 1 : 0;
  }, [isLit]);

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

      if (!isLitRef.current) {
        if (isHoveringTipRef.current) {
          heatRef.current = Math.min(1, heatRef.current + dt / 200);
          if (heatRef.current >= 1) {
            isLitRef.current = true;
            playCigaretteLightSound();
            onIgnite();
          }
        } else if (heatRef.current > 0) {
          heatRef.current = Math.max(0, heatRef.current - dt / 340);
        }
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const tipX = w * TIP_X_PCT;
      const tipY = h * TIP_Y_PCT;

      smokeRef.current.stepAndDraw(
        ctx,
        tipX,
        tipY,
        dpr,
        dt,
        now,
        isLitRef.current,
        heatRef.current,
        isHoveringTipRef.current,
        1.22
      );

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [onIgnite]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!swayRef.current) return;
    const rect = swayRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const dx = (nx - TIP_X_PCT) * rect.width;
    const dy = (ny - TIP_Y_PCT) * rect.height;
    const nearTip = Math.hypot(dx, dy) < 34;

    if (nearTip !== isHoveringTipRef.current) {
      isHoveringTipRef.current = nearTip;
      notifyLighterHover({ overCigarette: nearTip });
    }
  };

  const handlePointerEnter = () => {
    notifyLighterHover({ hot: true });
  };

  const handlePointerLeave = () => {
    notifyLighterHover({ hot: false, overCigarette: false });
    isHoveringTipRef.current = false;
  };

  const handleTipClick = () => {
    if (isLit) {
      onExtinguish();
    } else {
      playCigaretteLightSound();
      onIgnite();
    }
  };

  return (
    <div className="relative flex flex-col items-center lg:items-end">
      {/* Street poster frame with subtle tape details */}
      <div className="relative w-full max-w-[430px]">
        {/* Masking tape accents on opposite corners */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-2.5 left-5 z-20 h-5 w-16 -rotate-6 bg-[#D5CFC2]/75 border border-[#141413]/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-2.5 right-6 z-20 h-5 w-16 -rotate-3 bg-[#D5CFC2]/75 border border-[#141413]/20"
        />

        <div className="relative w-full aspect-[4/5] overflow-hidden border border-[#F0EDE6]/20 bg-[#10100F] shadow-[10px_10px_0px_rgba(255,90,31,0.18)]">
          {/* Living idle sway container holding image, canvas, and cigarette target together */}
          <div
            ref={swayRef}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            onPointerMove={handlePointerMove}
            className="relative w-full h-full animate-living-sway select-none"
          >
            {!imgFailed ? (
              <img
                src={`${import.meta.env.BASE_URL}assets/aistudio/image_e892f54f.png`}
                alt="Захар — уличный портрет с сигаретой"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                draggable={false}
                className="w-full h-full object-cover pointer-events-none select-none"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#181816] text-xs text-[#A39E94]">
                Портрет Захара
              </div>
            )}

            <canvas
              ref={canvasRef}
              aria-hidden="true"
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            <button
              type="button"
              onClick={handleTipClick}
              aria-label={isLit ? 'Потушить сигарету' : 'Поджечь сигарету'}
              style={{
                left: `${TIP_X_PCT * 100}%`,
                top: `${TIP_Y_PCT * 100}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-transparent focus-visible:outline-2 focus-visible:outline-[#FF5A1F]"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 w-full max-w-[430px] flex items-center justify-between gap-4 text-xs font-mono text-[#A8A49B]">
        <span>
          {isLit
            ? 'Сигарета горит · можно поджигать страницы'
            : 'Наведи зажигалку на сигарету, чтобы прикурить'}
        </span>
        {isLit && (
          <button
            type="button"
            onClick={onExtinguish}
            className="text-[#F0EDE6] hover:text-[#FF5A1F] underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Потушить
          </button>
        )}
      </div>
    </div>
  );
}
