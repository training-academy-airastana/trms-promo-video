import React, {useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {AbsoluteFill, cancelRender, continueRender, delayRender, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig, CanvasImage} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {ACESFilmicToneMapping, PMREMGenerator} from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {FilmGrain} from './AmbientBackdrop';
import {AnimatedBackground} from './AnimatedBackground';
import {getLitTextStyle} from './lighting';
import {getSceneTextLight} from './backgroundLighting';

export type OpeningProps = {title: string; emphasis: string; accent: string};

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamped = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease} as const;
const focusClamped = {...clamped, easing: Easing.bezier(0.35, 0, 0.25, 1)};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export const StudioReflections = () => {
  const {gl, scene} = useThree();
  useLayoutEffect(() => {
    const previous = scene.environment;
    const generator = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const environment = generator.fromScene(room, 0.045);
    scene.environment = environment.texture;
    room.dispose();
    generator.dispose();
    return () => {
      scene.environment = previous;
      environment.dispose();
    };
  }, [gl, scene]);
  return null;
};

const Camera = () => {
  const {camera} = useThree();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  useLayoutEffect(() => {
    const t = frame / fps;
    camera.position.set(0.15 - t * 0.018, 0.18, 13.2 - 0.65 * Math.min(t / 7, 1));
    camera.lookAt(0.1, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, frame, fps]);
  return null;
};

const Blocks = ({accent}: {accent: string}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const geometry = useMemo(() => new RoundedBoxGeometry(0.42, 0.42, 0.42, 4, 0.03), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const blocks = useMemo(() => Array.from({length: 64}, (_, i) => {
    const x = i % 4 - 1.5;
    const y = Math.floor(i / 4) % 4 - 1.5;
    const z = Math.floor(i / 16) - 1.5;
    return {x, y, z, i};
  }), []);
  return (
    <group position={[2.72, 0.05, 0]} rotation={[0.24 + 0.025 * Math.sin(t * 0.5), -0.48 + 0.09 * (t / 7), 0.045]}>
      {blocks.map(({x, y, z, i}) => {
        const progress = interpolate(t, [1.1 + (i % 9) * 0.09, 4.6 + (i % 9) * 0.09], [0, 1], clamped);
        const drift = (1 - progress) * 0.045 * Math.sin(t * 0.8 + i);
        const blue = x >= 0.5 && z === 1.5;
        const dark = z === -1.5 && x === -1.5;
        return (
          <mesh
            key={i}
            geometry={geometry}
            castShadow
            receiveShadow
            position={[
              mix(x * 0.90 + Math.sin(i * 2.37) * 0.20, x * 0.48, progress),
              mix(y * 0.83 + Math.cos(i * 1.73) * 0.20 + drift, y * 0.48, progress),
              mix(z * 1.05 + Math.sin(i * 1.17) * 0.22, z * 0.48, progress),
            ]}
            rotation={[
              (1 - progress) * (Math.sin(i * 1.6) * 0.65 + t * 0.045),
              (1 - progress) * (Math.cos(i * 2.4) * 0.75 + t * 0.035),
              (1 - progress) * Math.sin(i * 0.7) * 0.35,
            ]}
          >
            <meshPhysicalMaterial
              color={blue ? accent : dark ? '#252923' : '#a09c92'}
              roughness={blue ? 0.23 : 0.27}
              metalness={blue ? 0.50 : 0.62}
              envMapIntensity={0.7}
              clearcoat={0.48}
              clearcoatRoughness={0.22}
            />
          </mesh>
        );
      })}
    </group>
  );
};

// The full film reuses the approved opening geometry and choreography verbatim.
export {Blocks as OpeningBlocks};

export const OpeningTypography: React.FC<OpeningProps & {showBrand?: boolean}> = ({title, emphasis, showBrand = true}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const lighting = getSceneTextLight(frame / fps);
  return (
    <>
      {showBrand && <div style={{position: 'absolute', left: 140, top: 90, fontWeight: 700, fontSize: 28, letterSpacing: '-0.05em', filter: `blur(${interpolate(frame, [0, 0.8 * fps], [4, 0], focusClamped)}px)`, opacity: interpolate(frame, [0, 0.8 * fps], [0, 0.85], clamped)}}><span style={getLitTextStyle(lighting, 140, 90)}>TRMS.</span></div>}
      <div style={{position: 'absolute', left: 134, top: 371, width: 850, fontSize: 112, fontWeight: 400, lineHeight: 1.15, letterSpacing: '-0.045em'}}>
        <div style={{paddingBottom: 12}}>
          <div style={{translate: `0 ${interpolate(frame, [0.75 * fps, 1.8 * fps], [24, 0], clamped)}px`, filter: `blur(${interpolate(frame, [0.75 * fps, 1.8 * fps], [12, 0], focusClamped)}px)`, opacity: interpolate(frame, [0.75 * fps, 1.6 * fps], [0, 1], clamped)}}><span style={getLitTextStyle(lighting, 134, 371)}>{title}</span></div>
        </div>
        <div style={{paddingBottom: 20}}>
          <div style={{translate: `0 ${interpolate(frame, [1.65 * fps, 2.85 * fps], [24, 0], clamped)}px`, filter: `blur(${interpolate(frame, [1.65 * fps, 2.85 * fps], [12, 0], focusClamped)}px)`, opacity: interpolate(frame, [1.65 * fps, 2.55 * fps], [0, 1], clamped)}}>
            <span style={getLitTextStyle(lighting, 134, 512)}>{emphasis}</span>
          </div>
        </div>
      </div>
      <div style={{position: 'absolute', left: 143, top: 693, display: 'flex', alignItems: 'center', gap: 18, fontSize: 23, letterSpacing: '-0.02em', filter: `blur(${interpolate(frame, [4.6 * fps, 5.8 * fps], [5, 0], focusClamped)}px)`, opacity: interpolate(frame, [4.6 * fps, 5.8 * fps], [0, 0.8], clamped)}}>
        <span style={{display: 'block', height: 1, width: 32, backgroundColor: lighting.detailColor}} />
        <span style={getLitTextStyle(lighting, 193, 693)}>Training, connected.</span>
      </div>
    </>
  );
};

export const Opening: React.FC<OpeningProps> = ({title, emphasis, accent}) => {
  const {width, height} = useVideoConfig();
  const [fontHandle] = useState(() => delayRender('Loading local Manrope font'));
  useEffect(() => {
    let active = true;
    const font = new FontFace('Manrope', `url("${staticFile('fonts/Manrope.ttf')}")`, {weight: '200 800'});
    font.load().then((loaded) => {
      if (!active) return;
      document.fonts.add(loaded);
      continueRender(fontHandle);
    }).catch(cancelRender);
    return () => { active = false; };
  }, [fontHandle]);
  return (
    <>
      <AbsoluteFill
        style={{
          backgroundColor: '#110f0c',
          fontFamily: 'Manrope, Arial, sans-serif',
          color: '#eae6de'
        }}
      >
        <ThreeCanvas
          width={width}
          height={height}
          shadows="variance"
          camera={{fov: 34, position: [0, 0.18, 13.2], near: 0.1, far: 60}}
          gl={{antialias: true, alpha: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.95}}
        >
          <fog attach="fog" args={['#110f0c', 19, 35]} />
          <Camera />
          <StudioReflections />
          <AnimatedBackground />
          <Blocks accent={accent} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.7, 0]} receiveShadow>
            <planeGeometry args={[200, 200]} />
            <shadowMaterial transparent opacity={0.24} />
          </mesh>
        </ThreeCanvas>
        <OpeningTypography title={title} emphasis={emphasis} accent={accent} />
        <FilmGrain />
      </AbsoluteFill>
    </>
  );
};
