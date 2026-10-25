type Position = readonly [number, number];
type BackgroundPose = {
  readonly time: number;
  readonly key: Position;
  readonly fill: Position;
  readonly shift: number;
  readonly angle: number;
  readonly spread: number;
};

// Absolute film seconds. Each scene has a new optical composition, with travel
// inside the scene as well as across its boundaries. UV origin is bottom-left.
export const BACKGROUND_POSES: readonly BackgroundPose[] = [
  {time: 0, key: [0.035, 0.02], fill: [0.88, 0.58], shift: -0.035, angle: -0.24, spread: 1.00},
  {time: 5.5, key: [0.39, 0.09], fill: [0.83, 0.64], shift: 0.005, angle: -0.04, spread: 1.08},
  {time: 8.6, key: [0.92, 0.31], fill: [0.13, 0.70], shift: 0.085, angle: 0.34, spread: 0.89},
  {time: 12.5, key: [0.78, 0.58], fill: [0.18, 0.12], shift: 0.035, angle: 0.20, spread: 1.02},
  {time: 16.2, key: [0.08, 0.91], fill: [0.90, 0.16], shift: -0.085, angle: -0.32, spread: 0.95},
  {time: 19.1, key: [0.12, 0.73], fill: [0.79, 0.10], shift: -0.035, angle: -0.19, spread: 1.05},
  {time: 21.7, key: [0.45, 0.04], fill: [0.87, 0.72], shift: 0.028, angle: 0.07, spread: 1.13},
  {time: 24.1, key: [0.70, -0.04], fill: [0.17, 0.62], shift: 0.060, angle: 0.19, spread: 1.02},
  {time: 26.5, key: [0.95, 0.64], fill: [0.14, 0.13], shift: 0.090, angle: 0.38, spread: 0.92},
  {time: 30.8, key: [0.80, 0.91], fill: [0.19, 0.24], shift: 0.045, angle: 0.25, spread: 1.04},
  {time: 34.7, key: [0.48, 0.04], fill: [0.89, 0.73], shift: -0.025, angle: -0.18, spread: 1.12},
  {time: 40, key: [0.58, 0.19], fill: [0.14, 0.78], shift: 0.030, angle: -0.06, spread: 1.20},
];

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** A pure frame-time controller shared by light sources and refractive plates. */
export const getBackgroundMotion = (seconds: number) => {
  let index = 0;
  while (index < BACKGROUND_POSES.length - 1 && seconds >= BACKGROUND_POSES[index + 1].time) index++;
  const a = BACKGROUND_POSES[index];
  const b = BACKGROUND_POSES[Math.min(index + 1, BACKGROUND_POSES.length - 1)];
  const x = a === b ? 0 : Math.max(0, Math.min(1, (seconds - a.time) / (b.time - a.time)));
  const t = x * x * x * (x * (x * 6 - 15) + 10);
  return {
    key: [mix(a.key[0], b.key[0], t), mix(a.key[1], b.key[1], t)] as [number, number],
    fill: [mix(a.fill[0], b.fill[0], t), mix(a.fill[1], b.fill[1], t)] as [number, number],
    shift: mix(a.shift, b.shift, t),
    angle: mix(a.angle, b.angle, t),
    spread: mix(a.spread, b.spread, t),
  };
};
