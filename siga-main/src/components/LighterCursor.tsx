import { useEffect, useRef, useState } from 'react';

interface LighterCursorProps {
  enabled: boolean;
  torchActive: boolean;
}

// Lightweight pub-sub for hover state so App never re-renders on mouse hover
type HoverState = { hot: boolean; overCigarette: boolean };
const hoverListeners = new Set<(state: HoverState) => void>();
let currentHoverState: HoverState = { hot: false, overCigarette: false };

export function notifyLighterHover(partial: Partial<HoverState>) {
  const next = { ...currentHoverState, ...partial };
  if (
    next.hot === currentHoverState.hot &&
    next.overCigarette === currentHoverState.overCigarette
  ) {
    return;
  }
  currentHoverState = next;
  hoverListeners.forEach((fn) => fn(next));
}

export function LighterCursor({ enabled, torchActive }: LighterCursorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const flameGroupRef = useRef<SVGGElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const sparksRef = useRef<SVGGElement>(null);

  const [isFinePointer, setIsFinePointer] = useState(true);
  const hoverStateRef = useRef<HoverState>(currentHoverState);
  const pressedRef = useRef(false);
  const torchRef = useRef(torchActive);
  torchRef.current = torchActive;

  const posRef = useRef({ x: -300, y: -300, lastX: -300, tilt: 0, visible: false });

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    setIsFinePointer(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsFinePointer(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Update visual flame scale & spark directly on DOM without triggering React renders
  const syncFlameAppearance = () => {
    const { hot, overCigarette } = hoverStateRef.current;
    const isTorch = torchRef.current;
    const isPressed = pressedRef.current;

    const scale = isTorch
      ? isPressed
        ? 1.5
        : 1.38
      : overCigarette
        ? 1.25
        : isPressed
          ? 1.2
          : hot
            ? 1.05
            : 0.72;

    if (flameGroupRef.current) {
      flameGroupRef.current.style.transform = `scale(${scale})`;
    }
    if (haloRef.current) {
      const size = isTorch ? 64 : hot || overCigarette ? 46 : 28;
      haloRef.current.style.width = `${size}px`;
      haloRef.current.style.height = `${size}px`;
      haloRef.current.style.opacity = isTorch ? '0.95' : hot || overCigarette ? '0.75' : '0.45';
    }
    if (sparksRef.current) {
      sparksRef.current.style.opacity = isPressed ? '1' : isTorch ? '0.65' : '0';
    }
  };

  useEffect(() => {
    syncFlameAppearance();
  }, [torchActive]);

  useEffect(() => {
    const onHoverChange = (state: HoverState) => {
      hoverStateRef.current = state;
      syncFlameAppearance();
    };
    hoverListeners.add(onHoverChange);
    return () => {
      hoverListeners.delete(onHoverChange);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !isFinePointer) return;

    let rafId = 0;

    if (containerRef.current && posRef.current.visible) {
      containerRef.current.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0)`;
      containerRef.current.style.opacity = '1';
    }

    const updateTilt = () => {
      const p = posRef.current;
      const vx = p.x - p.lastX;
      p.lastX = p.x;
      const targetTilt = Math.max(-14, Math.min(14, -vx * 0.4));
      p.tilt += (targetTilt - p.tilt) * 0.2;

      if (tiltRef.current) {
        tiltRef.current.style.transform = `rotate(${p.tilt.toFixed(2)}deg)`;
      }
      rafId = requestAnimationFrame(updateTilt);
    };

    const applyMove = (clientX: number, clientY: number) => {
      const p = posRef.current;
      p.x = clientX;
      p.y = clientY;
      if (containerRef.current) {
        containerRef.current.style.transform = `translate3d(${clientX}px, ${clientY}px, 0)`;
        if (!p.visible) {
          p.visible = true;
          containerRef.current.style.opacity = '1';
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      applyMove(e.clientX, e.clientY);
    };

    const onMouseMove = (e: MouseEvent) => {
      applyMove(e.clientX, e.clientY);
    };

    const onWindowMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget && containerRef.current) {
        posRef.current.visible = false;
        containerRef.current.style.opacity = '0';
      }
    };

    const onDown = () => {
      pressedRef.current = true;
      syncFlameAppearance();
    };

    const onUp = () => {
      pressedRef.current = false;
      syncFlameAppearance();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseout', onWindowMouseOut);
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    rafId = requestAnimationFrame(updateTilt);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseout', onWindowMouseOut);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      cancelAnimationFrame(rafId);
    };
  }, [enabled, isFinePointer]);

  if (!enabled || !isFinePointer) return null;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[9999] will-change-transform"
      style={{
        opacity: 0,
        transform: 'translate3d(-300px, -300px, 0)',
      }}
    >
      {/* Flame tip hotspot aligned directly at (0, 0) */}
      <div
        ref={tiltRef}
        className="relative -translate-x-[19px] -translate-y-[8px] origin-[19px_38px] will-change-transform"
      >
        {/* Lightweight radial aura without expensive CSS blur filter */}
        <div
          ref={haloRef}
          className="absolute left-[19px] top-[8px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-[width,height,opacity] duration-150"
          style={{
            width: '28px',
            height: '28px',
            opacity: 0.45,
            background:
              'radial-gradient(circle, rgba(255,155,40,0.6) 0%, rgba(255,75,0,0.22) 45%, transparent 72%)',
          }}
        />

        <svg
          width="48"
          height="78"
          viewBox="0 0 48 78"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="flameOuter" x1="19" y1="2" x2="19" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFF7C2" />
              <stop offset="32%" stopColor="#FF9E1F" />
              <stop offset="78%" stopColor="#E63900" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="flameInner" x1="19" y1="9" x2="19" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="65%" stopColor="#FFE066" />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="metalBody" x1="8" y1="36" x2="31" y2="74" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#5B5854" />
              <stop offset="35%" stopColor="#32302E" />
              <stop offset="75%" stopColor="#1C1B19" />
              <stop offset="100%" stopColor="#3A3734" />
            </linearGradient>
            <linearGradient id="metalLid" x1="30" y1="22" x2="43" y2="39" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#66635E" />
              <stop offset="100%" stopColor="#242320" />
            </linearGradient>
            <linearGradient id="chimneyGrad" x1="12" y1="25" x2="25" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#B5B0A6" />
              <stop offset="50%" stopColor="#726E68" />
              <stop offset="100%" stopColor="#46433F" />
            </linearGradient>
          </defs>

          {/* Animated flame */}
          <g
            ref={flameGroupRef}
            className="animate-flame"
            style={{
              transform: 'scale(0.72)',
              transformOrigin: '19px 27px',
              transition: 'transform 150ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <path
              d="M19 3C19 3 25.5 12.2 25.5 18.8C25.5 23.2 22.6 26.8 19 26.8C15.4 26.8 12.5 23.2 12.5 18.8C12.5 12.2 19 3 19 3Z"
              fill="url(#flameOuter)"
            />
            <path
              d="M19 10.5C19 10.5 22.5 16.2 22.5 20.4C22.5 23.4 20.9 25.6 19 25.6C17.1 25.6 15.5 23.4 15.5 20.4C15.5 16.2 19 10.5 19 10.5Z"
              fill="url(#flameInner)"
            />
          </g>

          {/* Spark burst */}
          <g
            ref={sparksRef}
            stroke="#FFD369"
            strokeWidth="1.2"
            strokeLinecap="round"
            style={{ opacity: 0, transition: 'opacity 100ms ease' }}
          >
            <line x1="25" y1="26" x2="31" y2="21" />
            <line x1="26" y1="29" x2="33" y2="29" />
            <line x1="13" y1="26" x2="8" y2="22" />
          </g>

          {/* Windguard chimney */}
          <rect x="13" y="26" width="12" height="12" rx="1.2" fill="url(#chimneyGrad)" stroke="#C2BDB2" strokeWidth="0.6" />
          <circle cx="16.5" cy="30" r="1" fill="#181716" />
          <circle cx="21.5" cy="30" r="1" fill="#181716" />
          <circle cx="16.5" cy="34" r="1" fill="#181716" />
          <circle cx="21.5" cy="34" r="1" fill="#181716" />

          {/* Flint spark wheel */}
          <circle cx="26.5" cy="33" r="3.4" fill="#9E998F" stroke="#DFDAD0" strokeWidth="0.6" />
          <circle cx="26.5" cy="33" r="1.3" fill="#2A2927" />

          {/* Flipped open lid */}
          <path
            d="M29 38L39.5 21.5C40.1 20.5 41.5 20.4 42.3 21.1L44.2 22.8C44.9 23.5 44.9 24.7 44.3 25.6L33.5 40.5L29 38Z"
            fill="url(#metalLid)"
            stroke="#8E8980"
            strokeWidth="0.7"
          />

          {/* Hinge */}
          <rect x="28.5" y="36.5" width="3.5" height="5" rx="1" fill="#9A948A" />

          {/* Brushed steel body */}
          <rect
            x="8"
            y="38"
            width="22"
            height="34"
            rx="3"
            fill="url(#metalBody)"
            stroke={torchActive ? '#FF8A3D' : '#858076'}
            strokeWidth={torchActive ? '1.1' : '0.9'}
          />
          <line x1="11.5" y1="40.5" x2="11.5" y2="69.5" stroke="#EBE6DC" strokeOpacity="0.22" strokeWidth="1" />
          <line x1="8.5" y1="42" x2="29.5" y2="42" stroke="#EBE6DC" strokeOpacity="0.16" strokeWidth="0.6" />
        </svg>
      </div>
    </div>
  );
}
