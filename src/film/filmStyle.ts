import {useEffect, useState} from 'react';
import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import {getSceneTextLight} from '../scenes/backgroundLighting';
import {getLitTextStyle} from '../scenes/lighting';

let fontPromise: Promise<FontFace> | undefined;

export const loadFilmFont = () => {
  fontPromise ??= new FontFace('Manrope', `url("${staticFile('fonts/Manrope.ttf')}")`, {weight: '200 800'})
    .load().then((font) => { document.fonts.add(font); return font; });
  return fontPromise;
};

export const useFilmFont = () => {
  const [handle] = useState(() => delayRender('Loading TRMS film typography'));
  useEffect(() => {
    loadFilmFont().then(() => continueRender(handle)).catch(cancelRender);
  }, [handle]);
};

/** Sample the same absolute-time light source used by the glass and object lights. */
export const filmTextStyle = (seconds: number, left: number, top: number) => {
  return getLitTextStyle(getSceneTextLight(seconds), left, top);
};

export const filmEase = (t: number, start: number, end: number) => {
  const x = Math.max(0, Math.min(1, (t - start) / (end - start)));
  return x * x * x * (x * (x * 6 - 15) + 10);
};
