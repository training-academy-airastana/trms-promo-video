import {getBackgroundMotion} from './backgroundMotion';

/** Screen-space projections of seven long, gently curved optical glass strips. */
const PLATES = [
  {center: 0.035, width: 0.105, angle: -0.14, tilt: -0.16, thickness: 0.020, roughness: 0.13, visibility: 0.76},
  {center: 0.180, width: 0.085, angle: -0.18, tilt: 0.09, thickness: 0.016, roughness: 0.18, visibility: 0.42},
  {center: 0.315, width: 0.125, angle: -0.11, tilt: -0.06, thickness: 0.025, roughness: 0.12, visibility: 0.69},
  {center: 0.485, width: 0.065, angle: 0.025, tilt: 0.16, thickness: 0.014, roughness: 0.22, visibility: 0.24},
  {center: 0.600, width: 0.115, angle: 0.075, tilt: -0.12, thickness: 0.024, roughness: 0.14, visibility: 0.72},
  {center: 0.790, width: 0.080, angle: 0.12, tilt: 0.07, thickness: 0.017, roughness: 0.20, visibility: 0.34},
  {center: 0.940, width: 0.100, angle: -0.045, tilt: -0.09, thickness: 0.021, roughness: 0.15, visibility: 0.61},
] as const;

const smooth = (v: number) => v * v * v * (v * (v * 6 - 15) + 10);
const hash = (i: number) => {
  const n = Math.sin(i * 127.1 + 19.7) * 43758.5453;
  return n - Math.floor(n);
};
const noise = (x: number) => {
  const i = Math.floor(x);
  return hash(i) + (hash(i + 1) - hash(i)) * smooth(x - i);
};

export const GLASS_BAND_COUNT = PLATES.length;

export const getGlassBands = (seconds: number) => {
  const motion = getBackgroundMotion(seconds);
  return PLATES.map((plate, i) => {
    const tilt = plate.tilt + motion.angle * 0.23 + (noise(seconds * 0.15 + i * 4.31) - 0.5) * 0.10;
    const angle = plate.angle + motion.angle + (noise(seconds * 0.12 + i * 3.17 + 21) - 0.5) * 0.045;
    return {
      center: plate.center + motion.shift * (0.74 + i * 0.055) + (noise(seconds * 0.13 + i * 2.41) - 0.5) * 0.016,
      halfWidth: plate.width * 0.5 * Math.cos(tilt) * (0.95 + motion.spread * 0.05),
      slope: Math.tan(angle),
      tilt,
      thickness: plate.thickness,
      ior: 1.46,
      roughness: plate.roughness,
      visibility: plate.visibility,
    };
  });
};
