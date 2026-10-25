import React from 'react';
import {AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {FilmGrain} from '../scenes/AmbientBackdrop';
import {FilmStage} from './FilmStage';
import {useFilmFont} from './filmStyle';
import {filmContent, usePublishFilmContent, type FilmContent} from './filmContent';
import {getStoryTime} from './filmTiming';
import {StaggeredText} from './StaggeredText';
import {FilmAudio} from './FilmAudio';

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease} as const;
type SceneProps = {inFilm?: boolean};

const SceneShell = ({inFilm, offset, copy, children}: SceneProps & {offset: number; copy?: Partial<FilmContent>; children: React.ReactNode}) => {
  useFilmFont();
  usePublishFilmContent(copy, inFilm);
  return <>
    {!inFilm && <FilmStage timeOffsetSeconds={offset} content={{...filmContent, ...copy}} />}
    <AbsoluteFill style={{fontFamily: 'Manrope, Arial, sans-serif', color: '#e7eef2'}}>{children}</AbsoluteFill>
    {!inFilm && <FilmGrain timeOffsetSeconds={offset} />}
    {!inFilm && <FilmAudio timeOffsetSeconds={offset} />}
  </>;
};

const Brand = ({seconds, start}: {seconds: number; start: number}) => (
  <div style={{position: 'absolute', left: 140, top: 90, fontWeight: 700, fontSize: 28, letterSpacing: '-0.05em', opacity: .85}}>
    <StaggeredText text="TRMS." seconds={seconds} start={start + .15} end={start + .85} left={140} top={90} />
  </div>
);
const DataNote = ({label, seconds, start}: {label: string; seconds: number; start: number}) => (
  <div style={{position: 'absolute', left: 143, top: 944, fontSize: 22, fontWeight: 400, color: '#a1b4c4', letterSpacing: '0.01em', opacity: .7}}>
    <StaggeredText text={label} seconds={seconds} start={start + .35} end={start + 1.15} lit={false} />
  </div>
);

// Main titles now live inside the persistent Three.js stage. Standalone scenes
// forward their editable copy into the same stage, with the same absolute time.
const IntroInner = ({inFilm, title = filmContent.title, emphasis = filmContent.emphasis, chaosTitle = filmContent.chaosTitle, chaosEmphasis = filmContent.chaosEmphasis}: SceneProps & {title?: string; emphasis?: string; chaosTitle?: string; chaosEmphasis?: string}) => {
  return <SceneShell inFilm={inFilm} offset={0} copy={{title, emphasis, chaosTitle, chaosEmphasis}}>{null}</SceneShell>;
};
export const IntroScene = Interactive.create({Component: IntroInner, layout: 'absolute-fill', schema: {
  title: {type: 'string', default: filmContent.title, description: 'Opening line'},
  emphasis: {type: 'string', default: filmContent.emphasis, description: 'Emphasis line'},
  chaosTitle: {type: 'string', default: filmContent.chaosTitle, description: 'Problem resolution line'},
  chaosEmphasis: {type: 'string', default: filmContent.chaosEmphasis, description: 'Leaving the problems behind'},
}});
const ConnectedInner = ({inFilm, title = filmContent.system, subtitle = filmContent.subtitle}: SceneProps & {title?: string; subtitle?: string}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  return <SceneShell inFilm={inFilm} offset={18} copy={{system: title, subtitle}}><Brand seconds={getStoryTime(frame / fps + 18)} start={7} /></SceneShell>;
};
export const ConnectedScene = Interactive.create({Component: ConnectedInner, layout: 'absolute-fill', schema: {
  title: {type: 'string', default: filmContent.system, description: 'Main line'},
  subtitle: {type: 'string', default: filmContent.subtitle, description: 'Second line'},
}});
const ScaleInner = ({inFilm, trainings = filmContent.trainings, participations = filmContent.participations, dataLabel = filmContent.dataLabel}: SceneProps & {trainings?: string; participations?: string; dataLabel?: string}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const t = getStoryTime(frame / fps + 29);
  return <SceneShell inFilm={inFilm} offset={29} copy={{trainings, participations}}><Brand seconds={t} start={15} /><DataNote label={dataLabel} seconds={t} start={15} /></SceneShell>;
};
export const ScaleScene = Interactive.create({Component: ScaleInner, layout: 'absolute-fill', schema: {
  trainings: {type: 'string', default: filmContent.trainings, description: 'Illustrative trainings count'},
  participations: {type: 'string', default: filmContent.participations, description: 'Illustrative participations count'},
  dataLabel: {type: 'string', default: filmContent.dataLabel, description: 'Data disclosure'},
}});
const CertificatesInner = ({inFilm, certificates = filmContent.certificates, dataLabel = filmContent.dataLabel}: SceneProps & {certificates?: string; dataLabel?: string}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const t = getStoryTime(frame / fps + 42);
  return <SceneShell inFilm={inFilm} offset={42} copy={{certificates}}><Brand seconds={t} start={25} /><DataNote label={dataLabel} seconds={t} start={25} /></SceneShell>;
};
export const CertificatesScene = Interactive.create({Component: CertificatesInner, layout: 'absolute-fill', schema: {
  certificates: {type: 'string', default: filmContent.certificates, description: 'Illustrative certificates count'},
  dataLabel: {type: 'string', default: filmContent.dataLabel, description: 'Data disclosure'},
}});

const ClosingInner = ({inFilm, wordmark = 'TRMS.', tagline = 'Training, connected.'}: SceneProps & {wordmark?: string; tagline?: string}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = getStoryTime(frame / fps + 52);
  const sourceFrame = (t - 33) * fps;
  return (
    <SceneShell inFilm={inFilm} offset={52}>
      <Interactive.Div name="Final wordmark" style={{scale: interpolate(sourceFrame, [1.1 * fps, 2.7 * fps], [0.94, 1], clamp), position: 'absolute', left: 160, top: 455, width: 1600, textAlign: 'center', fontSize: 240, fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.065em', translate: interpolate(sourceFrame, [1.1 * fps, 2.65 * fps], ['0px 26px', '0px 0px'], clamp)}}>
        <StaggeredText text={wordmark} seconds={t} start={34.1} end={35.5} left={160} top={455} />
      </Interactive.Div>
      <Interactive.Div name="Final tagline" style={{position: 'absolute', left: 160, top: 767, width: 1600, textAlign: 'center', fontSize: 48, fontWeight: 400, lineHeight: 1.2, letterSpacing: '-0.035em', opacity: .9, translate: interpolate(sourceFrame, [2.2 * fps, 3.8 * fps], ['0px 15px', '0px 0px'], clamp)}}>
        <StaggeredText text={tagline} seconds={t} start={35.2} end={36.7} left={160} top={767} />
      </Interactive.Div>
    </SceneShell>
  );
};

export const ClosingScene = Interactive.create({
  Component: ClosingInner,
  layout: 'absolute-fill',
  schema: {
    wordmark: {type: 'string', default: 'TRMS.', description: 'Wordmark'},
    tagline: {type: 'string', default: 'Training, connected.', description: 'Sign-off'},
  },
});
