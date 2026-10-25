import type {CSSProperties} from 'react';
import {Easing, interpolate, interpolateColors} from 'remotion';

const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: Easing.bezier(0.4, 0, 0.2, 1),
} as const;

export const LIGHT_PALETTE = {
  core: '#fff3db',
  warm: '#e2d2b1',
  mid: '#aeb6b5',
  blue: '#5687bb',
  rim: '#294c79',
  ivory: '#f0e9df',
} as const;

/** One frame-based light cue drives both the optical backdrop and the lettering. */
export const getLightingState = (frame: number, fps: number) => {
  const t = frame / fps;
  const unfold = interpolate(t, [2.2, 6.6], [0, 1], clamp);
  const lightX = -95 + unfold * 855 + 24 * Math.sin(t * 0.32);
  const skew = interpolate(unfold, [0, 1], [-29, -4]);
  // The blue falloff follows the same light origin across the full composition.
  const center = lightX / 1920 * 100;
  const textBlue = interpolateColors(0.32, [0, 1], [LIGHT_PALETTE.blue, LIGHT_PALETTE.ivory]);

  return {
    unfold,
    skew,
    drift: 14 * Math.sin(t * 0.28),
    lightX,
    lightY: 1120 + unfold * 145,
    lightWidth: 790 + unfold * 530,
    lightHeight: 730 - unfold * 60,
    textGradient: `linear-gradient(${90 - skew}deg, ${LIGHT_PALETTE.ivory} ${center - 45}%, ${LIGHT_PALETTE.warm} ${center - 12}%, ${textBlue} ${center + 14}%, ${LIGHT_PALETTE.ivory} ${center + 48}%)`,
    detailColor: interpolateColors(unfold, [0, 0.5, 1], [textBlue, LIGHT_PALETTE.warm, LIGHT_PALETTE.ivory]),
    textGlow: interpolateColors(unfold, [0, 1], ['rgba(130,172,208,0.16)', 'rgba(226,210,177,0.16)']),
  };
};

export type LightingState = ReturnType<typeof getLightingState>;

/** Map every word to the same screen-sized light field, including separate lines. */
export const getLitTextStyle = (
  lighting: LightingState,
  left: number,
  top: number,
): CSSProperties => ({
  display: 'inline-block',
  // Manrope's descenders extend below the tight line box. Give the clipped
  // background a paint gutter, then cancel its layout footprint with margins.
  padding: '0.16em 0.06em 0.25em',
  margin: '-0.16em -0.06em -0.25em',
  overflow: 'visible',
  backgroundImage: lighting.textGradient,
  backgroundSize: '1920px 1080px',
  backgroundPosition: `calc(${-left}px + 0.06em) calc(${-top}px + 0.16em)`,
  backgroundRepeat: 'no-repeat',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  color: 'transparent',
  filter: `drop-shadow(0 0 18px ${lighting.textGlow})`,
});
