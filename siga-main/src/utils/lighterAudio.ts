// Procedural Web Audio API synthesizer for authentic metallic Zippo lighter sounds
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export function playLighterIgniteSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 1. Metallic flip-lid clink ("tink!")
  const pingFreqs = [2280, 3860, 5120];
  pingFreqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = idx === 0 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.94, now + 0.085);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09 / (idx + 1), now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  });

  // 2. Gritty flint spark strike ("chhk")
  const flintStart = now + 0.045;
  const flintSrc = ctx.createBufferSource();
  flintSrc.buffer = createNoiseBuffer(ctx, 0.07);
  const flintFilter = ctx.createBiquadFilter();
  flintFilter.type = 'bandpass';
  flintFilter.frequency.setValueAtTime(3900, flintStart);
  flintFilter.Q.setValueAtTime(1.8, flintStart);

  const flintGain = ctx.createGain();
  flintGain.gain.setValueAtTime(0.001, flintStart);
  flintGain.gain.linearRampToValueAtTime(0.24, flintStart + 0.008);
  flintGain.gain.exponentialRampToValueAtTime(0.001, flintStart + 0.065);

  flintSrc.connect(flintFilter);
  flintFilter.connect(flintGain);
  flintGain.connect(ctx.destination);
  flintSrc.start(flintStart);
  flintSrc.stop(flintStart + 0.07);

  // 3. Soft gas/wick ignition whoosh ("fwoosh")
  const whooshStart = now + 0.08;
  const whooshSrc = ctx.createBufferSource();
  whooshSrc.buffer = createNoiseBuffer(ctx, 0.28);
  const whooshFilter = ctx.createBiquadFilter();
  whooshFilter.type = 'bandpass';
  whooshFilter.frequency.setValueAtTime(420, whooshStart);
  whooshFilter.frequency.exponentialRampToValueAtTime(1050, whooshStart + 0.09);
  whooshFilter.frequency.exponentialRampToValueAtTime(360, whooshStart + 0.26);
  whooshFilter.Q.setValueAtTime(0.95, whooshStart);

  const whooshGain = ctx.createGain();
  whooshGain.gain.setValueAtTime(0.001, whooshStart);
  whooshGain.gain.linearRampToValueAtTime(0.22, whooshStart + 0.045);
  whooshGain.gain.exponentialRampToValueAtTime(0.001, whooshStart + 0.27);

  whooshSrc.connect(whooshFilter);
  whooshFilter.connect(whooshGain);
  whooshGain.connect(ctx.destination);
  whooshSrc.start(whooshStart);
  whooshSrc.stop(whooshStart + 0.28);
}

export function playLighterCloseSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Crisp metallic snap shut ("clack")
  [1480, 2760].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.72, now + 0.055);

    gain.gain.setValueAtTime(0.08 / (idx + 1), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  });

  // Soft air puff extinguishing flame
  const puffSrc = ctx.createBufferSource();
  puffSrc.buffer = createNoiseBuffer(ctx, 0.09);
  const puffFilter = ctx.createBiquadFilter();
  puffFilter.type = 'lowpass';
  puffFilter.frequency.setValueAtTime(650, now);

  const puffGain = ctx.createGain();
  puffGain.gain.setValueAtTime(0.07, now);
  puffGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  puffSrc.connect(puffFilter);
  puffFilter.connect(puffGain);
  puffGain.connect(ctx.destination);
  puffSrc.start(now);
  puffSrc.stop(now + 0.09);
}

export function playCigaretteLightSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = createNoiseBuffer(ctx, 0.22);

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(2200, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.21);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(now);
  src.stop(now + 0.22);
}
