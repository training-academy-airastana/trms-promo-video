import React, {useId} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {getLightingState, LIGHT_PALETTE} from './lighting';

/** A continuous light field refracted by adjoining panes, rather than alternating stripes. */
export const AmbientBackdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const id = `backdrop-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const {skew, drift, lightX, lightY, lightWidth, lightHeight} = getLightingState(frame, fps);
  const paneWidth = 146;

  return (
    <AbsoluteFill style={{overflow: 'hidden', pointerEvents: 'none'}}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-light`}>
            <stop offset="0" stopColor={LIGHT_PALETTE.core} stopOpacity="1" />
            <stop offset="0.20" stopColor={LIGHT_PALETTE.warm} stopOpacity="0.96" />
            <stop offset="0.36" stopColor={LIGHT_PALETTE.mid} stopOpacity="0.72" />
            <stop offset="0.52" stopColor={LIGHT_PALETTE.blue} stopOpacity="0.67" />
            <stop offset="0.67" stopColor={LIGHT_PALETTE.rim} stopOpacity="0.40" />
            <stop offset="0.84" stopColor="#162336" stopOpacity="0.16" />
            <stop offset="1" stopColor="#13171d" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-halo`}>
            <stop offset="0" stopColor="#547fac" stopOpacity="0.10" />
            <stop offset="0.6" stopColor="#3a4d64" stopOpacity="0.035" />
            <stop offset="1" stopColor="#13110e" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-pane`}>
            <stop offset="0" stopColor="#000" stopOpacity="0.10" />
            <stop offset="0.06" stopColor="#000" stopOpacity="0.04" />
            <stop offset="0.60" stopColor="#000" stopOpacity="0" />
            <stop offset="0.97" stopColor="#e5ddc9" stopOpacity="0.004" />
            <stop offset="1" stopColor="#e5ddc9" stopOpacity="0.012" />
          </linearGradient>
          <radialGradient id={`${id}-vignette`} cx="51%" cy="42%" r="74%">
            <stop offset="0.30" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.38" />
          </radialGradient>
          <radialGradient id={`${id}-type-halo`}>
            <stop offset="0" stopColor="#b39568" stopOpacity="0.065" />
            <stop offset="1" stopColor="#6d573d" stopOpacity="0" />
          </radialGradient>
          <g id={`${id}-field`}>
            <ellipse cx={lightX} cy={lightY} rx={lightWidth} ry={lightHeight} fill={`url(#${id}-light)`} />
          </g>
          {Array.from({length: 25}, (_, i) => (
            <clipPath id={`${id}-clip-${i}`} key={i}>
              <rect x={i * paneWidth - 900 + drift} y="-800" width={paneWidth + 0.5} height="2800" transform={`skewX(${skew})`} />
            </clipPath>
          ))}
        </defs>
        <rect width="1920" height="1080" fill="#110f0c" />
        <rect width="1920" height="1080" fill={`url(#${id}-vignette)`} />
        <ellipse cx={lightX + 150} cy={lightY - 140} rx={lightWidth * 1.15} ry={lightHeight * 1.20} fill={`url(#${id}-halo)`} />
        {Array.from({length: 25}, (_, i) => {
          const x = i * paneWidth - 900 + drift;
          const refractionX = (i - 10) * 9 + Math.sin(i * 0.73) * 14;
          const refractionY = Math.sin(i * 0.58 + 0.3) * 25;
          return (
            <g key={i} clipPath={`url(#${id}-clip-${i})`}>
              <use href={`#${id}-field`} transform={`translate(${refractionX} ${refractionY})`} />
              <rect x={x} y="-800" width={paneWidth} height="2800" transform={`skewX(${skew})`} fill={`url(#${id}-pane)`} />
            </g>
          );
        })}
        <ellipse cx="490" cy="515" rx="550" ry="210" fill={`url(#${id}-type-halo)`} />
      </svg>
    </AbsoluteFill>
  );
};

/** Shared photographic texture across the background, type, and 3D layer. */
export const FilmGrain = ({timeOffsetSeconds = 0, amount = 0.18}: {timeOffsetSeconds?: number; amount?: number}) => {
  const id = `grain-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sampleFrame = Math.floor((frame / fps + timeOffsetSeconds) * 24 + 0.00001);
  // Move one cached monochrome texture in integer pixels. Changing grain at
  // 24 Hz stays deterministic without rebuilding a turbulence filter each frame.
  const offsetX = sampleFrame * 73 % 47 - 23;
  const offsetY = sampleFrame * 131 % 43 - 21;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: amount, mixBlendMode: 'soft-light', overflow: 'hidden'}}>
      <svg width="100%" height="100%" aria-hidden="true" style={{position: 'absolute', left: -24, top: -24, width: 'calc(100% + 48px)', height: 'calc(100% + 48px)', translate: `${offsetX}px ${offsetY}px`}}>
        <filter id={id} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.76" numOctaves="2" stitchTiles="stitch" seed="23" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id})`} />
      </svg>
    </AbsoluteFill>
  );
};
