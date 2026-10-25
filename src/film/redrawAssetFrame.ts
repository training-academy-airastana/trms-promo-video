import type {Camera, Scene, WebGLRenderer} from 'three';

const pending = new Map<WebGLRenderer, {scene: Scene; camera: Camera; releases: (() => void)[]}>();

/** One redraw after asynchronous assets commit, including Remotion's never frame loop. */
export const redrawAssetFrame = (renderer: WebGLRenderer, scene: Scene, camera: Camera, release: () => void) => {
  const queued = pending.get(renderer);
  if (queued) {
    queued.releases.push(release);
    return;
  }
  pending.set(renderer, {scene, camera, releases: [release]});
  queueMicrotask(() => {
    const frame = pending.get(renderer);
    pending.delete(renderer);
    if (!frame) return;
    renderer.render(frame.scene, frame.camera);
    frame.releases.forEach(done => done());
  });
};
