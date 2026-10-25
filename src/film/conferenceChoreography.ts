import {Curve, Euler, Matrix4, Quaternion, Vector3} from 'three';

type Point = [number, number, number];
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const showEase = (seconds: number, start: number, end: number) => {
  const t = Math.max(0, Math.min(1, (seconds - start) / (end - start)));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/** A single closed, three-dimensional ribbon; evenly spaced sections keep seams tidy. */
class ConnectionKnot extends Curve<Vector3> {
  getPoint(t: number, target = new Vector3()) {
    const u = t * Math.PI * 2;
    const radius = 1.13 + Math.cos(3 * u) * 0.36;
    return target.set(radius * Math.cos(2 * u), radius * Math.sin(2 * u), Math.sin(3 * u) * 0.47);
  }
}
const curve = new ConnectionKnot();
curve.arcLengthDivisions = 2048;
const samples = curve.getSpacedPoints(256);

const section = (index: number, seconds: number, portal: number) => {
  const sample = (i: number) => {
    const n = (i + 64) % 64;
    const u = n / 64 * Math.PI * 2;
    const circular = new Vector3(Math.cos(u) * 3.65, Math.sin(u) * 2.55, 0);
    return samples[Math.round(n * 4)].clone().lerp(circular, portal);
  };
  const point = sample(index);
  const previous = sample(index - 1);
  const next = sample(index + 1);
  const tangent = next.clone().sub(previous).normalize();
  const side = new Vector3(0, 0, 1).cross(tangent).normalize();
  const normal = tangent.clone().cross(side).normalize();
  const orientation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(tangent, side, normal));
  const roll = Math.sin(index / 64 * Math.PI * 4 + seconds * 0.28) * 0.52 * (1 - portal);
  orientation.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), roll));
  return {
    point,
    orientation,
    length: previous.distanceTo(next) * 0.5 * 0.965,
  };
};

export const getShowState = (seconds: number) => {
  const sculpt = showEase(seconds, 15.25, 17.25);
  const passage = showEase(seconds, 24.05, 24.92) * (1 - showEase(seconds, 25.02, 26.45));
  const finale = showEase(seconds, 33.0, 34.6);
  const closePush = showEase(seconds, 33.0, 33.9) * (1 - showEase(seconds, 34.1, 36.0));
  const orbit = showEase(seconds, 7, 10);
  const certificates = showEase(seconds, 25.5, 27.5);
  const sideways = .024 + Math.sin((seconds - 7) * .28) * 2.35 * orbit;
  const cameraX = mix(sideways, -1.3 + Math.sin((seconds - 26) * .29) * 1.1, certificates);
  const cameraY = .18 + Math.sin((seconds - 7) * .22) * .52 * orbit;
  const cameraZ = 12.55 - orbit * .7 - sculpt * .45 + Math.sin((seconds - 7) * .17) * .28 * orbit;
  return {
    sculpt,
    passage,
    finale,
    // Lateral travel continues through the held compositions, revealing actual parallax.
    camera: {
      position: [
        mix(mix(cameraX, 2.95, passage), 0, finale),
        mix(mix(cameraY, .02, passage), .18, finale),
        mix(mix(cameraZ, 6.15, passage), 13.0, finale) - closePush * 1.6,
      ] as Point,
      target: [mix(mix(.10, 2.95, passage), 0, finale), mix(.02, .08, passage), 0] as Point,
    },
  };
};

export const getRibbonFinish = (seconds: number) => seconds >= 33
  ? showEase(seconds, 34.3, 35.6)
  : showEase(seconds, 17.0, 18.0) * (1 - showEase(seconds, 25.15, 25.75));

/** Transforms the existing 64 cube meshes into ribbon sections, with no extra particles. */
export const getConferenceSection = (index: number, seconds: number) => {
  const portal = showEase(seconds, 23.65, 24.65);
  const shape = section(index, seconds, portal);
  const isClosing = seconds >= 33;
  const closeSettle = showEase(seconds, 33.65, 36.15);
  const closeScale = mix(2.15, 0.61, closeSettle);
  const scale = isClosing ? closeScale : 1.38 + showEase(seconds, 20.0, 22.0) * 0.12;
  const rotation = isClosing
    ? new Euler(0.16 + 0.12 * closeSettle, -0.36 + (seconds - 33) * 0.035, -0.05)
    : new Euler(0.19 + Math.sin(seconds * 0.14) * 0.10, -0.32 + (seconds - 17) * 0.085, -0.10);
  const turn = new Quaternion().setFromEuler(rotation);
  // The finale uses the knot again, after the passage has moved past the camera.
  const finalShape = isClosing ? section(index, seconds, 0) : shape;
  const point = finalShape.point.clone().multiplyScalar(scale).applyQuaternion(turn);
  point.add(new Vector3(
    isClosing ? 0 : mix(1.5, 2.95, portal),
    isClosing ? mix(0.30, 1.73, closeSettle) : -.1,
    isClosing ? mix(2.5, 0, closeSettle) : -.7 + showEase(seconds, 24.45, 25.45) * 18,
  ));
  const orientation = turn.multiply(finalShape.orientation);
  const weight = isClosing
    ? showEase(seconds, 33.0, 33.7)
    : showEase(seconds, 15.25, 17.25) * (1 - showEase(seconds, 25.75, 26.7));
  return {
    position: point,
    orientation,
    scale: new Vector3(finalShape.length / 0.42, mix(0.44, 0.64, isClosing ? 0 : portal) / 0.42, 0.12 / 0.42).multiplyScalar(scale),
    weight,
  };
};
