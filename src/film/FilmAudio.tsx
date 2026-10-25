import React from 'react';
import {Audio} from '@remotion/media';
import {staticFile, Track, useVideoConfig} from 'remotion';

const directory = 'audio/trms/2026-10-25-v1';

/** Baked 48 kHz stems share the delivery clock, including standalone scenes. */
export const FilmAudio = ({timeOffsetSeconds = 0}: {timeOffsetSeconds?: number}) => {
  const {fps, durationInFrames} = useVideoConfig();
  return <>
    <Track name="Narration">
    <Audio
      name="George — English narration" from={0} durationInFrames={durationInFrames}
      trimBefore={timeOffsetSeconds * fps} src={staticFile(`${directory}/narration.wav`)} volume={1}
    />
    </Track>
    <Track name="Music">
    <Audio
      name="Original instrumental score" from={0} durationInFrames={durationInFrames}
      trimBefore={timeOffsetSeconds * fps} src={staticFile(`${directory}/music-ducked.wav`)} volume={1}
    />
    </Track>
    <Track name="Light accents">
    <Audio
      name="Light and camera air accents" from={0} durationInFrames={durationInFrames}
      trimBefore={timeOffsetSeconds * fps} src={staticFile(`${directory}/light-air.wav`)} volume={1}
    />
    </Track>
  </>;
};
