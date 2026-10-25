import React from 'react';
import {Composition, Folder} from 'remotion';
import {FullFilm} from './film/FullFilm';
import {CertificatesScene, ClosingScene, ConnectedScene, IntroScene, ScaleScene} from './film/FilmScenes';
import {Opening} from './scenes/Opening';
import {BackgroundLightingTest} from './scenes/BackgroundLightingTest';
import {RibbedGlassTest} from './scenes/RibbedGlassTest';

export const RemotionRoot = () => (
  <>
  <Composition
    id="TRMS-Full-Film"
    component={FullFilm}
    durationInFrames={1800}
    fps={30}
    width={1920}
    height={1080}
  />
  <Folder name="Film-scenes">
    <Composition id="TRMS-01-Intro" component={IntroScene} durationInFrames={540} fps={30} width={1920} height={1080} defaultProps={{title: 'Training is', emphasis: 'everywhere.', chaosTitle: 'Leave the chaos', chaosEmphasis: 'in the past.'}} />
    <Composition id="TRMS-02-Connected" component={ConnectedScene} durationInFrames={330} fps={30} width={1920} height={1080} defaultProps={{title: 'One system.', subtitle: 'To manage it all.'}} />
    <Composition id="TRMS-03-Scale" component={ScaleScene} durationInFrames={390} fps={30} width={1920} height={1080} defaultProps={{trainings: '1,500', participations: '22,000', dataLabel: 'Illustrative data'}} />
    <Composition id="TRMS-04-Certificates" component={CertificatesScene} durationInFrames={300} fps={30} width={1920} height={1080} defaultProps={{certificates: '19,200', dataLabel: 'Illustrative data'}} />
    <Composition id="TRMS-05-Closing" component={ClosingScene} durationInFrames={240} fps={30} width={1920} height={1080} defaultProps={{wordmark: 'TRMS.', tagline: 'Training, connected.'}} />
  </Folder>
  <Composition
    id="TRMS-Opening"
    component={Opening}
    durationInFrames={210}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{title: 'Training is', emphasis: 'everywhere.', accent: '#7c9fb9'}}
  />
  <Composition
    id="TRMS-Background-Lighting-Test"
    component={BackgroundLightingTest}
    durationInFrames={300}
    fps={30}
    width={1920}
    height={1080}
  />
  <Composition
    id="TRMS-Ribbed-Glass-Test"
    component={RibbedGlassTest}
    durationInFrames={300}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{glassStrength: 1}}
  />
  </>
);
