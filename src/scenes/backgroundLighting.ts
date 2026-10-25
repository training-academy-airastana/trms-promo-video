import {getLightingState} from './lighting';
import {getBackgroundMotion} from './backgroundMotion';

export type LightMode = 'Calm' | 'Focus' | 'Transition' | 'Highlight' | 'Closing';
export type LightCue = {
  readonly time: number;
  readonly mode: LightMode;
  readonly focus?: readonly [number, number];
};
export type LightAccent = {
  readonly time: number;
  readonly duration: number;
  readonly strength: number;
};

// Absolute film time; local scenes can supply timeOffsetSeconds to keep one world.
export const TRMS_LIGHT_CUES: readonly LightCue[] = [
  {time: 0, mode: 'Calm'},
  {time: 3.2, mode: 'Focus', focus: [0.69, 0.50]},
  {time: 6.5, mode: 'Transition'},
  {time: 8.4, mode: 'Focus', focus: [0.60, 0.52]},
  {time: 13.8, mode: 'Transition'},
  {time: 15.8, mode: 'Highlight', focus: [0.48, 0.53]},
  {time: 18.8, mode: 'Calm'},
  {time: 20.8, mode: 'Highlight', focus: [0.48, 0.53]},
  {time: 23.8, mode: 'Transition'},
  {time: 26.0, mode: 'Highlight', focus: [0.65, 0.52]},
  {time: 29.6, mode: 'Focus', focus: [0.65, 0.52]},
  {time: 32.6, mode: 'Transition'},
  {time: 35.8, mode: 'Closing', focus: [0.50, 0.52]},
  {time: 40, mode: 'Closing', focus: [0.50, 0.52]},
];

export const TRMS_LIGHT_ACCENTS: readonly LightAccent[] = [
  {time: 14.9, duration: 1.8, strength: 0.08},
  {time: 15.8, duration: 2.4, strength: 0.17},
  {time: 20.8, duration: 2.6, strength: 0.15},
  {time: 24.85, duration: 1.4, strength: 0.12},
  {time: 26.0, duration: 2.8, strength: 0.17},
  {time: 35.0, duration: 2.2, strength: 0.14},
];

const modes: readonly LightMode[] = ['Calm', 'Focus', 'Transition', 'Highlight', 'Closing'];
const presets: Record<LightMode, readonly [number, number, number, number]> = {
  // radiance, focus influence, horizontal spread, direction in radians
  Calm: [0.67, 0.08, 1.00, -0.50],
  Focus: [0.80, 0.33, 0.91, -0.31],
  Transition: [0.76, 0.12, 1.17, 0.12],
  Highlight: [0.94, 0.38, 1.02, -0.13],
  Closing: [0.89, 0.26, 1.23, -0.22],
};

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (value: number) => {
  const x = Math.max(0, Math.min(1, value));
  return x * x * x * (x * (x * 6 - 15) + 10);
};
const hash = (i: number) => {
  const value = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};
const noise = (x: number) => {
  const i = Math.floor(x);
  return mix(hash(i), hash(i + 1), smooth(x - i));
};
const hex = (a: readonly number[], b: readonly number[], t: number) =>
  `#${a.map((channel, i) => Math.round(mix(channel, b[i], t)).toString(16).padStart(2, '0')).join('')}`;

export const getProceduralLight = (
  seconds: number,
  cues: readonly LightCue[] = TRMS_LIGHT_CUES,
  accents: readonly LightAccent[] = TRMS_LIGHT_ACCENTS,
) => {
  if (!cues.length) throw new Error('AnimatedBackground needs at least one lighting cue.');
  let index = 0;
  while (index < cues.length - 1 && seconds >= cues[index + 1].time) index++;
  const a = cues[index];
  const b = cues[Math.min(index + 1, cues.length - 1)];
  const progress = a === b ? 0 : smooth((seconds - a.time) / (b.time - a.time));
  const weights = Object.fromEntries(modes.map((mode) => [mode, 0])) as Record<LightMode, number>;
  weights[a.mode] += 1 - progress;
  weights[b.mode] += progress;
  const parameters = [0, 0, 0, 0];
  for (const mode of modes) {
    for (let i = 0; i < parameters.length; i++) parameters[i] += presets[mode][i] * weights[mode];
  }
  const focusA = a.focus ?? [0.62, 0.48];
  const focusB = b.focus ?? [0.62, 0.48];
  const focus: [number, number] = [mix(focusA[0], focusB[0], progress), mix(focusA[1], focusB[1], progress)];
  const motion = getBackgroundMotion(seconds);
  const wanderX = noise(seconds * 0.14 + 3.7) - 0.5;
  const wanderY = noise(seconds * 0.11 + 11.2) - 0.5;
  const focusPull = parameters[1] * 0.16;
  const keyCenter: [number, number] = [
    mix(motion.key[0], focus[0], focusPull) + wanderX * 0.065,
    mix(motion.key[1], focus[1], focusPull) + wanderY * 0.050,
  ];
  const fillCenter: [number, number] = [
    motion.fill[0] + (noise(seconds * 0.10 + 5.1) - 0.5) * 0.055,
    motion.fill[1] + (noise(seconds * 0.13 + 17.8) - 0.5) * 0.055,
  ];
  let accent = 0;
  for (const event of accents) {
    const distance = (seconds - event.time) / Math.max(event.duration * 0.24, 0.01);
    accent += Math.exp(-0.5 * distance * distance) * event.strength;
  }
  let sheen = 0;
  let sheenPosition = 0;
  cues.forEach((cue, i) => {
    if (cue.mode !== 'Transition') return;
    const offset = seconds - cue.time;
    const envelope = Math.exp(-0.5 * Math.pow(offset / 1.65, 2));
    const direction = i % 2 === 0 ? 1 : -1;
    sheen += envelope;
    sheenPosition += envelope * direction * offset * 0.37;
  });
  const energy = parameters[0] + accent + 0.018 * (noise(seconds * 0.20 + 27.4) - 0.5);
  const warmShift = 0.10 + 0.13 * noise(seconds * 0.16 + 8.5) + 0.05 * weights.Closing;

  return {
    time: seconds,
    weights,
    focus,
    keyCenter,
    fillCenter,
    // Keep the studio key above the objects even when its projected light field
    // travels along the bottom edge. This prevents grazing floor-shadow streaks.
    keyPosition: [keyCenter[0] * 14 - 7, 4.0 + keyCenter[1] * 4.5, 5.2] as [number, number, number],
    fillPosition: [fillCenter[0] * 14 - 7, fillCenter[1] * 8 - 1, 2.8] as [number, number, number],
    keyColor: hex([255, 225, 177], [216, 231, 248], warmShift),
    fillColor: hex([109, 153, 207], [150, 173, 197], noise(seconds * 0.12 + 4.5) * 0.32),
    energy,
    accent,
    spread: parameters[2] * motion.spread,
    direction: parameters[3] * 0.48 + motion.angle * 0.95 + 0.055 * wanderY,
    sheen: Math.min(sheen, 1.15),
    sheenPosition: sheenPosition / Math.max(sheen, 0.00001),
    warpStrength: 0.023 + 0.009 * weights.Transition,
  };
};

export type ProceduralLight = ReturnType<typeof getProceduralLight>;

/** Shared type color follows the new light travel in both the opening and film. */
export const getSceneTextLight = (seconds: number) => {
  const light = getProceduralLight(seconds);
  const center = light.keyCenter[0] * 100;
  return {
    ...getLightingState(seconds * 30, 30),
    textGradient: `linear-gradient(${90 - light.direction * 28}deg, #f0f1ef ${center - 42}%, #d6e5ef ${center - 10}%, #90b4d5 ${center + 19}%, #eef0ed ${center + 55}%)`,
    detailColor: '#abc6de',
    textGlow: `rgba(158,193,225,${0.07 + light.accent * 0.12})`,
  };
};
