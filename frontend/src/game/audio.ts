/**
 * Sound effects and music, synthesised with WebAudio. No audio files.
 * Browsers block sound until the user interacts, so `unlock()` is called from PRESS START.
 */
import { store } from "../state/store";

let ctx: AudioContext | null = null;
let musicTimer: number | null = null;

export function unlock() {
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return;
    }
  }
  void ctx.resume();
  startMusic();
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slideTo?: number) {
  if (!ctx || vol <= 0) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const SFX: Record<string, (v: number) => void> = {
  start: (v) => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, "square", v * 0.25, i * 0.07)),
  move: (v) => tone(440, 0.05, "square", v * 0.15),
  select: (v) => { tone(660, 0.07, "square", v * 0.2); tone(880, 0.1, "square", v * 0.2, 0.06); },
  pop: (v) => tone(520, 0.08, "sine", v * 0.25, 0, 780),
  think: (v) => tone(300, 0.1, "sine", v * 0.12, 0, 420),
  chime: (v) => { tone(880, 0.12, "triangle", v * 0.3); tone(1175, 0.2, "triangle", v * 0.3, 0.1); },
  paper: (v) => tone(180, 0.09, "sawtooth", v * 0.08, 0, 90),
  stamp: (v) => tone(110, 0.14, "square", v * 0.3, 0, 55),
  ask: (v) => { tone(587, 0.1, "triangle", v * 0.3); tone(784, 0.16, "triangle", v * 0.3, 0.12); },
  error: (v) => tone(196, 0.25, "sawtooth", v * 0.15, 0, 130),
  fanfare: (v) => [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) =>
    tone(f, i === 7 ? 0.5 : 0.13, "square", v * 0.22, i * 0.13)),
};

export function sfx(name: keyof typeof SFX | string) {
  SFX[name]?.(store.getState().settings.sfx);
}

// A calm pentatonic loop: melody on a triangle wave, soft bass underneath.
const MELODY = [0, 2, 4, 7, 4, 2, 0, -1, 0, 4, 7, 9, 7, 4, 2, -1];
const SCALE = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880];
const BASS = [131, 131, 98, 110];

function startMusic() {
  if (musicTimer !== null || !ctx) return;
  let step = 0;
  musicTimer = window.setInterval(() => {
    const vol = store.getState().settings.music;
    if (vol > 0 && ctx?.state === "running" && !document.hidden) {
      const n = MELODY[step % MELODY.length];
      if (n >= 0) tone(SCALE[n], 0.32, "triangle", vol * 0.07);
      if (step % 4 === 0) tone(BASS[(step / 4) % BASS.length], 0.9, "sine", vol * 0.09);
    }
    step++;
  }, 340);
}
