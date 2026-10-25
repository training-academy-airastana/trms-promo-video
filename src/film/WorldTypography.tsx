import React, {useEffect, useMemo, useState} from 'react';
import {cancelRender, continueRender, delayRender} from 'remotion';
import {AdditiveBlending, CanvasTexture, KeepStencilOp, LinearFilter, NotEqualStencilFunc, Vector2} from 'three';
import {useThree} from '@react-three/fiber';
import {getProceduralLight} from '../scenes/backgroundLighting';
import {filmEase, loadFilmFont} from './filmStyle';
import type {FilmContent} from './filmContent';
import {redrawAssetFrame} from './redrawAssetFrame';
import {getWordTiming, splitWords, WORD_STAGGER} from './wordReveal';

type Point = [number, number, number];
type WordMotion = {position: Point; opacity: number; blur: number};
type TextProps = {
  text: string; position: Point; size: number; maxWidth: number;
  seconds: number; start: number; end: number; out?: number;
  weight?: number; rotate?: number; muted?: boolean;
  opacity?: number; blur?: number;
  depthWrite?: boolean;
  occludeGlow?: boolean;
  wordMotion?: (seconds: number) => WordMotion;
};

type WordArtwork = {texture: CanvasTexture; width: number; height: number; x: number; texel: Vector2};

const vertexShader = `
  varying vec2 vUv;
  varying vec2 vScreen;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vScreen = gl_Position.xy / gl_Position.w * .5 + .5;
  }
`;
const fragmentShader = `
  uniform sampler2D uMap;
  uniform vec2 uTexel;
  uniform vec2 uLight;
  uniform float uBlur;
  uniform float uOpacity;
  uniform float uMuted;
  uniform float uGlowPass;
  varying vec2 vUv;
  varying vec2 vScreen;
  void main() {
    float a = texture2D(uMap, vUv).r;
    if (uBlur > .1) {
      a = 0.;
      float weights = 0.;
      for (int y = -2; y <= 2; y++) {
        for (int x = -2; x <= 2; x++) {
          vec2 sampleOffset = vec2(float(x), float(y));
          float weight = exp(-dot(sampleOffset, sampleOffset) * .5);
          a += texture2D(uMap, vUv + sampleOffset * uTexel * uBlur * .38).r * weight;
          weights += weight;
        }
      }
      a /= weights;
    }
    // Green stores a soft halo baked once from this word's glyphs. The red
    // channel keeps the original sharp mask, so glow never softens the ink.
    float glow = texture2D(uMap, vUv).g * mix(.14, .075, uMuted);
    // Existing lettering keeps its original appearance. In the certificate
    // scene, ink and light are separate: only the additive halo uses a stencil.
    if (uGlowPass < .5) a = max(a, glow);
    else if (uGlowPass > 1.5) a = glow;
    a *= uOpacity;
    if (a < (uGlowPass > .5 && uGlowPass < 1.5 ? .018 : .004)) discard;
    float light = exp(-pow((vScreen.x - uLight.x) * 2.4 + (vScreen.y - uLight.y) * .4, 2.));
    vec3 ink = mix(vec3(.43, .61, .78), vec3(.87, .91, .93), light * .65 + .35);
    ink *= mix(1., .67, uMuted);
    gl_FragColor = vec4(ink, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const WorldWord = ({artwork, position, appear, disappear, seconds, rotate, muted, opacity, blur, depthWrite, occludeGlow}: {
  artwork: WordArtwork; position: Point; appear: number; disappear: number;
  seconds: number; rotate: number; muted: boolean; opacity: number; blur: number; depthWrite: boolean;
  occludeGlow: boolean;
}) => {
  const light = getProceduralLight(seconds);
  const uniforms = useMemo(() => ({
    uMap: {value: artwork.texture}, uTexel: {value: artwork.texel},
    uLight: {value: new Vector2()}, uBlur: {value: 0}, uOpacity: {value: 0}, uMuted: {value: 0},
  }), [artwork]);
  uniforms.uLight.value.fromArray(light.keyCenter);
  uniforms.uOpacity.value = appear * (1 - disappear) * opacity;
  uniforms.uBlur.value = (1 - appear) * 28 + blur;
  uniforms.uMuted.value = muted ? 1 : 0;
  if (appear <= .001 || disappear >= .999 || opacity <= .001) return null;
  return (
    <group position={position} rotation={[0, rotate, 0]}>
      <mesh position={[artwork.x, -(1 - appear) * .16 + disappear * .14, -(1 - appear) * .4]}>
        <planeGeometry args={[artwork.width, artwork.height]} />
        {/* R3F copies wrappers: a fresh prop commits scalar values every frame. */}
        <shaderMaterial uniforms={{...uniforms, uGlowPass: {value: occludeGlow ? 1 : 0}}} vertexShader={vertexShader} fragmentShader={fragmentShader} transparent depthWrite={depthWrite} />
      </mesh>
      {occludeGlow && <mesh position={[artwork.x, -(1 - appear) * .16 + disappear * .14, -(1 - appear) * .4]} renderOrder={2}>
        <planeGeometry args={[artwork.width, artwork.height]} />
        <shaderMaterial
          uniforms={{...uniforms, uGlowPass: {value: 2}}} vertexShader={vertexShader} fragmentShader={fragmentShader}
          transparent blending={AdditiveBlending} depthWrite={false}
          stencilWrite stencilWriteMask={0} stencilRef={1} stencilFunc={NotEqualStencilFunc}
          stencilFail={KeepStencilOp} stencilZFail={KeepStencilOp} stencilZPass={KeepStencilOp}
        />
      </mesh>}
    </group>
  );
};

/** Words share the original line layout, with independent focus and opacity. */
export const WorldText = ({text, position, size, maxWidth, seconds, start, end, out = 100, weight = 400, rotate = 0, muted = false, opacity = 1, blur = 0, depthWrite = true, occludeGlow = false, wordMotion}: TextProps) => {
  const {gl, scene, camera} = useThree();
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender('Preparing spatial film typography'));
  useEffect(() => {
    let active = true;
    loadFilmFont().then(() => {if (active) setReady(true);}).catch(cancelRender);
    return () => {active = false; continueRender(handle);};
  }, [handle]);
  const artwork = useMemo(() => {
    if (!ready) return null;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const fontSize = 240;
    ctx.font = `${weight} ${fontSize}px Manrope`;
    const inkWidth = ctx.measureText(text).width;
    const padding = 58;
    const scale = Math.min(size / fontSize, maxWidth / Math.max(1, inkWidth));
    return splitWords(text).map(word => {
      const prefix = ctx.measureText(text.slice(0, word.offset)).width;
      const wordWidth = ctx.measureText(word.text).width;
      const glyph = document.createElement('canvas');
      glyph.width = Math.ceil(wordWidth + padding * 2);
      glyph.height = 400;
      const mask = glyph.getContext('2d')!;
      mask.font = `${weight} ${fontSize}px Manrope`;
      mask.fillStyle = '#fff';
      mask.textBaseline = 'alphabetic';
      mask.fillText(word.text, padding, 284);
      const crisp = mask.getImageData(0, 0, glyph.width, glyph.height);
      const halo = document.createElement('canvas');
      halo.width = glyph.width;
      halo.height = glyph.height;
      const soft = halo.getContext('2d')!;
      soft.filter = 'blur(12px)';
      soft.drawImage(glyph, 0, 0);
      const glow = soft.getImageData(0, 0, halo.width, halo.height);
      for (let i = 0; i < crisp.data.length; i += 4) {
        crisp.data[i] = crisp.data[i + 3];
        crisp.data[i + 1] = glow.data[i + 3];
        crisp.data[i + 2] = 0;
        crisp.data[i + 3] = 255;
      }
      mask.putImageData(crisp, 0, 0);
      const texture = new CanvasTexture(glyph);
      texture.minFilter = LinearFilter;
      texture.generateMipmaps = false;
      return {
        texture, width: glyph.width * scale, height: glyph.height * scale,
        x: (prefix + glyph.width / 2 - padding - inkWidth / 2) * scale,
        texel: new Vector2(1 / glyph.width, 1 / glyph.height),
      };
    });
  }, [ready, text, weight, size, maxWidth]);
  useEffect(() => () => artwork?.forEach(word => word.texture.dispose()), [artwork]);
  useEffect(() => {
    if (artwork) redrawAssetFrame(gl, scene, camera, () => continueRender(handle));
  }, [artwork, handle, gl, scene, camera]);
  const disappear = filmEase(seconds, out, out + .65);
  if (!artwork || disappear >= .999) return null;
  return <group>{artwork.map((word, index) => {
    const timing = getWordTiming(index, artwork.length, start, end);
    const motion = wordMotion?.(seconds - index * WORD_STAGGER);
    return <WorldWord
      key={index} artwork={word} position={motion?.position ?? position}
      appear={filmEase(seconds, timing.start, timing.end)} disappear={disappear}
      seconds={seconds} rotate={rotate} muted={muted}
      depthWrite={depthWrite} occludeGlow={occludeGlow}
      opacity={opacity * (motion?.opacity ?? 1)} blur={blur + (motion?.blur ?? 0)}
    />;
  })}</group>;
};

export const WorldTypography = ({seconds: t, content: c}: {seconds: number; content: FilmContent}) => (
  <group>
    {t >= 7 && t < 15 && <>
      <WorldText text={c.system} position={[0, 1.58, -.8]} size={.78} maxWidth={6} seconds={t} start={7.3} end={8.4} out={14.3} />
      <WorldText text={c.subtitle} position={[0, .72, -1.25]} size={.48} maxWidth={6.1} seconds={t} start={7.9} end={9} out={14.3} muted />
      <WorldText text="People" position={[-2.85, -1.62, 1]} size={.19} maxWidth={2} seconds={t} start={9.2} end={10.1} out={14} muted />
      <WorldText text="Schedules" position={[.1, -1.62, -.7]} size={.22} maxWidth={2} seconds={t} start={9.4} end={10.3} out={14} muted />
      <WorldText text="Progress" position={[3.1, -1.62, -2]} size={.24} maxWidth={2} seconds={t} start={9.6} end={10.5} out={14} muted />
    </>}
    {t >= 15 && t < 25 && <>
      <WorldText text="Training at scale." position={[-2.55, 1.42, -.6]} size={.26} maxWidth={4.4} seconds={t} start={15.25} end={16} out={23.25} muted />
      <WorldText text={c.trainings} position={[-2.35, .12, 1.05]} size={1.33} maxWidth={4.3} seconds={t} start={15.65} end={16.65} out={19.35} rotate={.025} />
      <WorldText text="Trainings" position={[-2.45, -.96, .35]} size={.32} maxWidth={4} seconds={t} start={15.8} end={16.8} out={19.35} muted />
      <WorldText text={c.participations} position={[-2.0, .06, .65]} size={1.25} maxWidth={4.75} seconds={t} start={20} end={21} out={23.25} rotate={-.03} />
      <WorldText text="Participations" position={[-2.15, -1.02, -.1]} size={.32} maxWidth={4} seconds={t} start={20.1} end={21.1} out={23.25} muted />
    </>}
    {t >= 25 && t < 33 && <>
      <WorldText text="Achievement," position={[2.65, .91, -1.0]} size={.65} maxWidth={4.7} seconds={t} start={25.3} end={26.35} out={32.2} rotate={-.04} occludeGlow />
      <WorldText text="recognised." position={[2.6, .08, -.45]} size={.65} maxWidth={4.5} seconds={t} start={25.5} end={26.55} out={32.2} rotate={-.04} occludeGlow />
      <WorldText text={c.certificates} position={[2.4, -1.0, .6]} size={.65} maxWidth={4} seconds={t} start={26.1} end={27.2} out={32.2} occludeGlow />
      <WorldText text="Certificates" position={[2.4, -1.67, .3]} size={.24} maxWidth={3.6} seconds={t} start={26.6} end={27.5} out={32.2} muted occludeGlow />
    </>}
  </group>
);
