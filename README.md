# TRMS Motion Studio

**Everything Connected** is a 60-second TRMS promo film: 1920 x 1080, 30 fps, 1,800 frames. React, Three.js, GLSL and SVG run inside Remotion. Five scenes share one continuous 3D stage with procedural lighting, refractive glass bands, depth of field and animated typography.

The film includes English narration, an original instrumental score and subtle sound accents. Displayed statistics are illustrative, as disclosed on screen.

## Install and preview

Use Node.js 20.11 or newer and npm:

```sh
npm ci
npm run studio
```

Open http://localhost:3000/TRMS-Full-Film and press Space to play. The `Film-scenes` folder provides individual scenes for editing. The earlier standalone opening and lighting studies are also retained.

The repository includes the local Manrope font, source audio and all three synchronized playback stems. No ElevenLabs key or API calls are needed to preview or render the existing film.

## Render

```sh
npx remotion render src/index.ts TRMS-Full-Film output/trms-full-film.mp4 --codec=h264 --crf=16 --x264-preset=slow --pixel-format=yuv420p --image-format=png --concurrency=2 --timeout=120000
```

On Windows with a compatible GPU, append `--gl=angle` for the rendering setup used for the final export. Rendering speed depends on the machine. The composition includes audio automatically. `output/` contains local renders and is excluded from Git.

## Timeline

| Scene | Time |
| --- | --- |
| Scattered training, problems and assembly | 0-18 s |
| Connected people, schedules and progress | 18-29 s |
| Training and participation metrics | 29-42 s |
| Certificates and recognition | 42-52 s |
| TRMS closing | 52-60 s |

All motion is driven by the Remotion frame; scrubbing and exports use the same timing. See [FILM.md](FILM.md) for scene editing and implementation notes.

## Edit the film

- [src/film/FullFilm.tsx](src/film/FullFilm.tsx): full composition and scene tracks.
- [src/film/filmContent.ts](src/film/filmContent.ts): shared film copy.
- [src/film/filmTiming.ts](src/film/filmTiming.ts): delivery timing and choreography mapping.
- [src/film/FilmStage.tsx](src/film/FilmStage.tsx): persistent 3D stage, objects and matte certificates.
- [src/film/ChaosOpening.tsx](src/film/ChaosOpening.tsx): scattered blocks, problem text and cube assembly.
- [src/film/WorldTypography.tsx](src/film/WorldTypography.tsx): 3D text, staggered reveals and certificate-aware glow.
- [src/film/SpatialOptics.tsx](src/film/SpatialOptics.tsx): depth of field and optical compositing.
- [src/scenes/AnimatedBackground.tsx](src/scenes/AnimatedBackground.tsx): procedural background and coordinated object lighting.
- [src/film/FilmAudio.tsx](src/film/FilmAudio.tsx): narration, music and light accents.
- [src/Root.tsx](src/Root.tsx): registered compositions.

[LIGHTING.md](LIGHTING.md), [RIBBED-GLASS.md](RIBBED-GLASS.md), [MOTION.md](MOTION.md) and [REFERENCE-ANALYSIS.md](REFERENCE-ANALYSIS.md) document the art direction and background studies. References are inspiration, not bundled reference footage.

## Audio production

Existing assets are in `public/audio/trms/2026-10-25-v1/`. Source MP3 recordings, the production plan, cue manifest and the three 48 kHz stereo WAV stems are versioned. Redundant master and premaster WAV files are excluded; they can be rebuilt locally.

To remix without API calls, install Python and NumPy (`python -m pip install numpy`), then run `npm run audio:mix`. The script uses FFmpeg supplied by the installed Remotion package.

To generate new audio, copy `.env.example` to `.env.local`, set your own `ELEVENLABS_API_KEY`, and follow [voiceover/README.md](voiceover/README.md). Generation consumes ElevenLabs credits and requires the explicit `--confirm` flag. Environment files and local credentials are excluded from Git.

## Assets

Manrope is included under the [SIL Open Font License](public/fonts/OFL-Manrope.txt). TRMS currently uses a text wordmark. This private project does not grant a general reuse license for the film or audio.
