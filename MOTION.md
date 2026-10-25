# TRMS — Everything Connected

## Opening study

- 1920 × 1080, 30 fps, 210 frames (7 seconds).
- Mood: cinematic, warm, restrained. Dark optical glass, ivory and blue light, quiet focus reveals. No bounce or camera shake.
- Palette: warm charcoal #110F0C, ivory #EAE6DE, desaturated blue #7C9FB9 and champagne #CDBC9E.
- 0–1.4s: scattered solid blocks, already visible in the opening frame. Slow camera approach.
- 0.75–1.8s: first title line resolves from soft focus with a short upward drift; blocks begin aligning.
- 1.65–2.85s: “everywhere.” resolves in a blue-to-champagne-to-ivory gradient.
- 3–5.4s: 64 small fragments settle into a compact rounded 4 × 4 × 4 structure. Each cube is 0.42 world units wide, down from the original 1.02. No elastic overshoot.
- 5.8–7s: readable hold with small ambient movement.
- Typography stays separate from the WebGL canvas, keeping text crisp.
- Text and backdrop use the same frame-based light state in `src/scenes/lighting.ts`. The blue/champagne/ivory text field follows the background light origin and pane angle. All text layers sample the same composition-sized field, so color moves continuously across separate lines. There is no independent text color loop.
- Ambient background: a procedural GLSL surface inside the existing ThreeCanvas. Broad warm and cool light fields move continuously with fBm/domain warping, shallow curved-surface shading, a restrained specular sweep and fixed screen-space dither. Actual object lights use the same controller. Calm, Focus, Transition, Highlight and Closing blend continuously across the planned film timeline; see LIGHTING.md.
- Cubes: satin silver/champagne and steel blue, studio environment reflections, warm key and cool rim light.
- All positions, rotations and camera movement are derived from the frame number, so scrubbing and final rendering match.

## Sound

The first visual study is silent. ElevenLabs setup and the five-scene script are in `voiceover/`. Generate speech only after the user approves the trial request and delivery. Music and sound design remain to be selected.

## Data

All metrics in the proposed later scenes are illustrative. Display “Illustrative data” alongside them. The opening has no metrics.
