# Procedural TRMS background lighting

## Implementation

`src/scenes/AnimatedBackground.tsx` mounts inside the existing `ThreeCanvas`. It renders an opaque fullscreen backplate before the foreground geometry, with depth writes disabled, and adds the foreground light rig. There is no second canvas, external footage, CSS background gradient, added package, or independent animation loop.

`backgroundShaders.ts` contains the vertex and fragment shaders. The fragment shader combines:

- Three broad overlapping light fields, a smaller focus field and a diagonal specular sweep.
- Quintic-interpolated smooth noise, three-octave fBm and domain warping.
- An analytically shallow curved surface normal, with small roughness variations. This is a shading model, not animated displaced geometry.
- Low-contrast optical facets that are visible primarily where light falls on them.
- A restrained, threshold-gated analytical bloom approximation. This is not a full-frame postprocessing blur: only a high-radiance source produces the additional broad halo.
- Linear color calculations followed by Three.js output color-space conversion, with fixed screen-space dither to reduce banding.

The shader and the actual directional/area lights share the same positions, colors and intensity controller. Broad `RectAreaLight` sources produce moving reflections on existing `MeshPhysicalMaterial` objects. The original procedural studio environment remains as a stable reflection base.

## Frame synchronization

Time is always `useCurrentFrame() / fps + timeOffsetSeconds`. No `useFrame`, `requestAnimationFrame`, wall-clock time or per-render random values are used. The light controller is a pure function. Scrubbing backward and rendering the same frame reproduce the same lighting on the same renderer.

`backgroundLighting.ts` defines Calm, Focus, Transition, Highlight and Closing. Sorted `LightCue` arrays blend the state weights using a quintic curve with zero first and second derivatives at the endpoints. Separate Gaussian `LightAccent` events add a gentle, temporary boost for metrics. The shader noise continues to advect even when a state holds; there is no repeating animation phase.

## Using the component

```tsx
<AnimatedBackground />
```

The defaults describe the planned 40-second TRMS timeline. For a scene whose local frame starts at zero, pass its absolute film start time:

```tsx
<AnimatedBackground timeOffsetSeconds={15} />
```

Optional `cues` and `accents` replace the defaults. Cue times must be strictly increasing, in seconds. `focus` is a normalized composition coordinate, with Y increasing upward, as in the shader UVs. Keep state transitions gradual. To accent an existing metric reveal, align an accent event's `time` with the reveal's absolute film time.

The current repository has one built visual scene, the seven-second opening. Five scenes exist in the voiceover plan; this change does not create or rewrite the remaining visual scenes.

## Test composition

`TRMS-Background-Lighting-Test` is a separate 1920 x 1080, 30 fps, 300-frame composition. It shows two stationary instances of the existing rounded cube geometry and materials. The camera, geometry and rotation stay fixed, so visible changes come from lighting. It exercises all five states and a gentle accent at 6 seconds.

Render the silent test:

```powershell
npx remotion render src/index.ts TRMS-Background-Lighting-Test output/trms-background-lighting-test.mp4 --codec=h264 --crf=18 --pixel-format=yuv420p --concurrency=2 --port=3001
```

Open the live preview at http://localhost:3000/TRMS-Background-Lighting-Test.

## Validation results

- TypeScript check passed.
- Test MP4: H.264, 1920 x 1080, 30 fps, exactly 300 frames / 10.00 seconds; no audio stream.
- All 300 frames were decoded and examined at 480 x 270 for temporal continuity, with a visual review of a sequence contact sheet. No adjacent frames were identical. Mean adjacent-frame luma difference was 0.153 on a 0-255 scale; the maximum was 0.419, with no abrupt global brightness jump detected.
- The stationary object region changed in mean luma from 174.21 to 188.20 during the clip. This confirms foreground lighting responds as the background light moves.
- Two independent full-resolution still renders of frame 180 were pixel-identical.
- The light controller was checked at 1,201 frame positions over the 40-second planned film: weights stay normalized, values are finite, repeat calls match, and no abrupt parameter jump was found. Maximum adjacent-frame energy change was 0.0123.
- The main camera, cube animation and text markup were compared with the saved pre-change source and matched exactly. The text-color controller also matched byte for byte.

Reports: `output/light-controls-check.json`, `output/lighting-video-check.json`, and `output/lighting-repeatability-check.json`. Temporal image analysis is a continuity check, not a guarantee of identical pixels across different GPU drivers or a full optical simulation.

## Scope preservation

The main composition's dimensions, duration, camera, cube count and movement, text content, typography and timing, text-color controller, and voiceover files are preserved. `Opening.tsx` only replaces the background/light rig and exports the existing studio environment helper for the test. Main scene audio is not added or edited.
