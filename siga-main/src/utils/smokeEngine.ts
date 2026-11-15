export interface SmokePuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  growRate: number;
  alpha: number;
  life: number;
  maxLife: number;
  wobblePhase: number;
  wobbleFreq: number;
  wobbleAmp: number;
}

export class CigaretteSmokeEngine {
  private puffs: SmokePuff[] = [];
  private emitAccum = 0;

  clear() {
    this.puffs = [];
    this.emitAccum = 0;
  }

  stepAndDraw(
    ctx: CanvasRenderingContext2D,
    tipX: number,
    tipY: number,
    dpr: number,
    dt: number,
    now: number,
    isLit: boolean,
    heatLevel: number,
    isHoveringTip: boolean,
    scaleFactor = 1
  ) {
    const glowLevel = isLit ? 1 : heatLevel;

    // 1. Draw glowing ember & subtle warm light bounce on fingers/lips
    if (glowLevel > 0.02) {
      const flicker =
        0.86 +
        0.14 * Math.sin(now * 0.012) +
        0.08 * Math.sin(now * 0.029);
      const hoverBoost = isHoveringTip ? 1.32 : 1.0;
      const strength = glowLevel * flicker * hoverBoost;

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      const ambientRadius = 56 * dpr * scaleFactor * Math.min(1.25, strength);
      const ambientGrad = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, ambientRadius);
      ambientGrad.addColorStop(0, `rgba(255, 125, 30, ${(0.45 * glowLevel).toFixed(3)})`);
      ambientGrad.addColorStop(0.38, `rgba(255, 72, 12, ${(0.18 * glowLevel).toFixed(3)})`);
      ambientGrad.addColorStop(1, 'rgba(255, 60, 0, 0)');
      ctx.fillStyle = ambientGrad;
      ctx.beginPath();
      ctx.arc(tipX, tipY, ambientRadius, 0, Math.PI * 2);
      ctx.fill();

      const coreR = Math.max(3.5 * dpr, 5.5 * dpr * scaleFactor * strength);
      const emberGrad = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, coreR * 2.1);
      emberGrad.addColorStop(0, `rgba(255, 246, 204, ${(0.96 * glowLevel).toFixed(3)})`);
      emberGrad.addColorStop(0.32, `rgba(255, 130, 22, ${(0.92 * glowLevel).toFixed(3)})`);
      emberGrad.addColorStop(0.7, `rgba(210, 38, 4, ${(0.55 * glowLevel).toFixed(3)})`);
      emberGrad.addColorStop(1, 'rgba(120, 10, 0, 0)');
      ctx.fillStyle = emberGrad;
      ctx.beginPath();
      ctx.arc(tipX, tipY, coreR * 2.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 2. Emit rich multi-layered smoke when lit
    if (isLit) {
      this.emitAccum += dt;
      const interval = isHoveringTip ? 16 : 22;
      while (this.emitAccum >= interval) {
        this.emitAccum -= interval;

        // Tight bright filament puff near tip
        this.puffs.push({
          x: tipX + (Math.random() - 0.5) * 2.5 * dpr,
          y: tipY - 2 * dpr,
          vx: (Math.random() - 0.38) * 0.14,
          vy: -(0.72 + Math.random() * 0.45),
          radius: (2.2 + Math.random() * 2.4) * scaleFactor,
          growRate: 0.24 * scaleFactor,
          alpha: (0.24 + Math.random() * 0.16) * (isHoveringTip ? 1.2 : 1),
          life: 0,
          maxLife: 135 + Math.random() * 85,
          wobblePhase: now * 0.004 + Math.random() * 1.4,
          wobbleFreq: 0.045 + Math.random() * 0.025,
          wobbleAmp: 0.45 + Math.random() * 0.35,
        });

        // Broader drifting plume cloud (every 2nd tick)
        if (Math.random() < 0.55) {
          this.puffs.push({
            x: tipX + (Math.random() - 0.5) * 5 * dpr,
            y: tipY - 5 * dpr,
            vx: (Math.random() - 0.3) * 0.24,
            vy: -(0.52 + Math.random() * 0.4),
            radius: (5.5 + Math.random() * 5.5) * scaleFactor,
            growRate: 0.38 * scaleFactor,
            alpha: (0.14 + Math.random() * 0.12) * (isHoveringTip ? 1.2 : 1),
            life: 0,
            maxLife: 170 + Math.random() * 95,
            wobblePhase: Math.random() * Math.PI * 2,
            wobbleFreq: 0.025 + Math.random() * 0.02,
            wobbleAmp: 0.75 + Math.random() * 0.5,
          });
        }
      }

      // Draw subtle continuous curling filament strand near tip
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(tipX, tipY - 2 * dpr);
      const strandHeight = 52 * dpr * scaleFactor;
      for (let step = 1; step <= 10; step++) {
        const st = step / 10;
        const sy = tipY - 2 * dpr - st * strandHeight;
        const sx =
          tipX +
          Math.sin(now * 0.0045 - st * 4.2) * (5.5 * st * dpr * scaleFactor) +
          st * 3 * dpr;
        ctx.lineTo(sx, sy);
      }
      const strandGrad = ctx.createLinearGradient(tipX, tipY, tipX, tipY - strandHeight);
      strandGrad.addColorStop(0, 'rgba(236, 232, 226, 0.38)');
      strandGrad.addColorStop(0.55, 'rgba(218, 214, 208, 0.18)');
      strandGrad.addColorStop(1, 'rgba(200, 196, 190, 0)');
      ctx.strokeStyle = strandGrad;
      ctx.lineWidth = 2.1 * dpr * scaleFactor;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    }

    // 3. Update & render billowing smoke puffs (capped for constant 60fps)
    if (this.puffs.length > 260) {
      this.puffs.splice(0, this.puffs.length - 260);
    }

    const stepDt = dt * 0.06;
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.life += stepDt;
      if (p.life >= p.maxLife) {
        this.puffs.splice(i, 1);
        continue;
      }

      const t = p.life / p.maxLife;
      const curl = Math.sin(p.life * p.wobbleFreq + p.wobblePhase) * (p.wobbleAmp + t * 0.9);
      p.x += (p.vx + curl * 0.6) * dpr * stepDt;
      p.y += p.vy * dpr * stepDt;
      p.radius += p.growRate * dpr * stepDt;

      const fadeIn = Math.min(1, t * 5.5);
      const fadeOut = Math.pow(1 - t, 1.55);
      const alpha = p.alpha * fadeIn * fadeOut;

      if (alpha > 0.005) {
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        grad.addColorStop(0, `rgba(235, 231, 225, ${alpha.toFixed(3)})`);
        grad.addColorStop(0.5, `rgba(204, 199, 192, ${(alpha * 0.5).toFixed(3)})`);
        grad.addColorStop(1, 'rgba(175, 170, 164, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
