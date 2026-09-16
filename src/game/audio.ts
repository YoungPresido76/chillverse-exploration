import type { RegionStyle } from "./types";
import type { SurfaceKind } from "./world/layout";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let amb: GainNode | null = null;
let muted = false;
let ambNodes: Array<{ stop: () => void }> = [];
let chirpTimer: number | null = null;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC({ latencyHint: "interactive" });
  master = ctx.createGain();
  sfx = ctx.createGain();
  amb = ctx.createGain();
  sfx.gain.value = 0.7;
  amb.gain.value = 0.0;
  master.gain.value = muted ? 0 : 0.9;
  sfx.connect(master);
  amb.connect(master);
  master.connect(ctx.destination);
  return ctx;
}

export function unlockAudio() {
  const c = ensure();
  if (c.state === "suspended") void c.resume();
}

export function setMuted(next: boolean) {
  muted = next;
  if (master && ctx) {
    master.gain.setTargetAtTime(next ? 0 : 0.9, ctx.currentTime, 0.02);
  }
}

function tone(freq: number, dur: number, type: OscillatorType, gain = 0.12, slide = 0) {
  const c = ensure();
  if (c.state !== "running" || muted) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g);
  g.connect(sfx!);
  osc.start(t);
  osc.stop(t + dur + 0.02);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
  };
}

function noiseBuffer(c: AudioContext, seconds = 2) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export function stopAmbience() {
  ambNodes.forEach((n) => n.stop());
  ambNodes = [];
  if (chirpTimer) {
    window.clearInterval(chirpTimer);
    chirpTimer = null;
  }
}

export function setAmbience(style: RegionStyle) {
  const c = ensure();
  stopAmbience();
  if (!amb) return;
  amb.gain.setTargetAtTime(muted ? 0 : 0.11, c.currentTime, 0.25);
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 2.5);
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  if (style === "meadow") filter.frequency.value = 720;
  else if (style === "lakeside") filter.frequency.value = 480;
  else if (style === "cavern") filter.frequency.value = 260;
  else filter.frequency.value = 180;
  const g = c.createGain();
  g.gain.value = style === "space" ? 0.35 : 0.55;
  src.connect(filter);
  filter.connect(g);
  g.connect(amb);
  src.start();
  ambNodes.push({
    stop: () => {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
      src.disconnect();
      filter.disconnect();
      g.disconnect();
    },
  });

  if (style === "space" || style === "cavern") {
    const osc = c.createOscillator();
    const og = c.createGain();
    osc.type = "sine";
    osc.frequency.value = style === "space" ? 55 : 72;
    og.gain.value = 0.04;
    osc.connect(og);
    og.connect(amb);
    osc.start();
    ambNodes.push({
      stop: () => {
        try {
          osc.stop();
        } catch {
          /* already stopped */
        }
        osc.disconnect();
        og.disconnect();
      },
    });
  }

  if (style === "meadow") {
    chirpTimer = window.setInterval(() => {
      if (muted) return;
      tone(1400 + Math.random() * 600, 0.08, "sine", 0.018, 200);
    }, 2800);
  } else if (style === "cavern") {
    chirpTimer = window.setInterval(() => {
      if (muted) return;
      tone(880, 0.05, "sine", 0.02, -400);
    }, 2200);
  } else if (style === "lakeside") {
    chirpTimer = window.setInterval(() => {
      if (muted) return;
      tone(220 + Math.random() * 40, 0.12, "triangle", 0.015, -30);
    }, 1800);
  }
}

export const sfxPlay = {
  click() {
    tone(620, 0.06, "square", 0.05);
  },
  deny() {
    tone(140, 0.16, "sawtooth", 0.08, -40);
  },
  start() {
    tone(330, 0.12, "triangle", 0.09, 80);
    tone(495, 0.18, "sine", 0.06, 40);
  },
  complete() {
    tone(392, 0.14, "triangle", 0.1);
    tone(523, 0.2, "triangle", 0.08);
    tone(659, 0.28, "sine", 0.07);
  },
  artifact() {
    tone(784, 0.12, "sine", 0.07);
    tone(988, 0.18, "triangle", 0.06);
    tone(1174, 0.24, "sine", 0.05);
  },
  discover() {
    tone(520, 0.1, "sine", 0.05, 80);
    tone(740, 0.16, "triangle", 0.045);
  },
  step(surface: SurfaceKind = "dirt") {
    if (surface === "wood") tone(210 + Math.random() * 30, 0.045, "square", 0.028, -40);
    else if (surface === "stone" || surface === "rock") tone(90 + Math.random() * 25, 0.05, "square", 0.034, -15);
    else if (surface === "crystal") tone(420 + Math.random() * 40, 0.04, "triangle", 0.02, 60);
    else if (surface === "void") tone(70 + Math.random() * 20, 0.06, "sine", 0.02, 20);
    else if (surface === "water") tone(160 + Math.random() * 40, 0.07, "sine", 0.03, -50);
    else tone(140 + Math.random() * 40, 0.05, "square", 0.03 + Math.random() * 0.02, -20);
  },
  enter() {
    tone(220, 0.25, "sine", 0.08, 180);
  },
};
