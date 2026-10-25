import React from 'react';
import {AbsoluteFill, Track, useVideoConfig} from 'remotion';
import {FilmGrain} from '../scenes/AmbientBackdrop';
import {FilmStage} from './FilmStage';
import {CertificatesScene, ClosingScene, ConnectedScene, IntroScene, ScaleScene} from './FilmScenes';
import {useFilmFont} from './filmStyle';
import {FilmContentProvider} from './filmContent';
import {FilmAudio} from './FilmAudio';

/** One optical world; five independent source-editable scene instances. */
export const FullFilm = () => {
  const {fps} = useVideoConfig();
  useFilmFont();
  return (
    <FilmContentProvider>
    <AbsoluteFill style={{backgroundColor: '#080e19', fontFamily: 'Manrope, Arial, sans-serif', color: '#e7eef2'}}>
      <FilmStage />
      <Track name="TRMS — five scenes">
        <IntroScene
          name="01 — From chaos to clarity" from={0} durationInFrames={18 * fps}
          inFilm title="Training is" emphasis="everywhere."
          chaosTitle="Leave the chaos" chaosEmphasis="in the past."
        />
        <ConnectedScene
          name="02 — One connected system" from={18 * fps} durationInFrames={11 * fps}
          inFilm title="One system." subtitle="To manage it all."
        />
        <ScaleScene
          name="03 — Training at scale" from={29 * fps} durationInFrames={13 * fps}
          inFilm trainings="1,500" participations="22,000" dataLabel="Illustrative data"
        />
        <CertificatesScene
          name="04 — Every achievement" from={42 * fps} durationInFrames={10 * fps}
          inFilm certificates="19,200" dataLabel="Illustrative data"
        />
        <ClosingScene
          name="05 — Training, connected" from={52 * fps} durationInFrames={8 * fps}
          inFilm wordmark="TRMS." tagline="Training, connected."
        />
      </Track>
      <FilmGrain />
      <FilmAudio />
    </AbsoluteFill>
    </FilmContentProvider>
  );
};
