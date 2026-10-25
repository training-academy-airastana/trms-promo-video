import {Euler, Matrix4, Quaternion, Vector3} from 'three';
import {filmEase} from './filmStyle';

export const OPENING_CUBE_SCALE = 1.2;
export const openingCubeRotation = new Euler(.24 + .025 * Math.sin(3.5), -.39, .045);

/** Shared camera pose also gives the problem words an exact camera-space flight path. */
export const getOpeningCamera = (seconds: number) => {
  const settle = filmEase(seconds, 8, 13);
  const lerp = (a: number, b: number) => a + (b - a) * settle;
  const position = new Vector3(
    lerp(.12 + Math.sin(seconds * .16) * .16, .024),
    lerp(.18 + Math.sin(seconds * .12) * .06, .18),
    lerp(13.1 - seconds * .025, 12.55),
  );
  const target = new Vector3(.1, .02, 0);
  const orientation = new Quaternion().setFromRotationMatrix(
    new Matrix4().lookAt(position, target, new Vector3(0, 1, 0)),
  );
  return {position, target, orientation};
};

/** One smooth central light pulse bridges the receding words and cube assembly. */
export const getOpeningFlash = (seconds: number) => ({
  intensity: filmEase(seconds, 7.75, 8.35) * (1 - filmEase(seconds, 8.4, 9.35)),
  spread: filmEase(seconds, 7.75, 9.1),
});

const hash = (index: number, seed: number) => {
  const value = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453;
  return value - Math.floor(value);
};

export const getAssembledBlock = (index: number) => new Vector3(
  (index % 4 - 1.5) * .48 * OPENING_CUBE_SCALE,
  (Math.floor(index / 4) % 4 - 1.5) * .48 * OPENING_CUBE_SCALE,
  (Math.floor(index / 16) - 1.5) * .48 * OPENING_CUBE_SCALE,
).applyEuler(openingCubeRotation).add(new Vector3(.1, .05, 0));

/** A seeded deep field leaves the central headline clear from the first frame. */
const scatter = Array.from({length: 64}, (_, index) => {
  const z = -5 - hash(index, 3) * 10.5;
  const depthScale = (13 - z) / 13;
  const x = (hash(index, 1) * 2 - 1) * 6.5;
  let y = (hash(index, 2) * 2 - 1) * 3.25;
  if (Math.abs(x) < 3.6 && Math.abs(y) < 1.45) y = (y < 0 ? -1 : 1) * (1.7 + Math.abs(y) * .5);
  return new Vector3(
    x * depthScale,
    y * depthScale,
    z,
  );
});

export const getOpeningBlock = (index: number, seconds: number) => {
  const start = 8.05 + hash(index, 8) * .55;
  const assemble = filmEase(seconds, start, 11.35 + hash(index, 9) * .4);
  const position = scatter[index].clone();
  position.x += Math.sin(seconds * .13 + index * 1.71) * .24;
  position.y += Math.sin(seconds * .11 + index * 2.13) * .17;
  const target = getAssembledBlock(index);
  position.lerp(target, assemble);
  // Individual smooth approach arcs, with tangents settling into the assembly.
  const arc = Math.sin(assemble * Math.PI) * (1 - assemble);
  position.x += Math.sin(index * 2.37) * arc * 1.1;
  position.y += Math.cos(index * 1.73) * arc * .55;
  const rotation = new Euler(
    openingCubeRotation.x + (1 - assemble) * (Math.sin(index * 1.6) * 1.1 + seconds * .024),
    openingCubeRotation.y + (1 - assemble) * (Math.cos(index * 2.4) * 1.4 + seconds * .02),
    openingCubeRotation.z + (1 - assemble) * Math.sin(index * .7) * .7,
  );
  return {
    position,
    rotation,
    assemble,
    scale: .85 + assemble * (OPENING_CUBE_SCALE - .85),
  };
};
