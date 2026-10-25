import React, {useEffect, useLayoutEffect, useMemo} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {ACESFilmicToneMapping, AlwaysStencilFunc, Color, Euler, KeepStencilOp, Quaternion, ReplaceStencilOp, Vector3} from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {StudioReflections} from '../scenes/Opening';
import {AnimatedBackground} from '../scenes/AnimatedBackground';
import {filmEase} from './filmStyle';
import {getConferenceSection, getRibbonFinish, getShowState} from './conferenceChoreography';
import {CertificateLettering} from './CertificateLettering';
import {RibbonSculpture} from './RibbonSculpture';
import {WorldTypography} from './WorldTypography';
import {SpatialOptics} from './SpatialOptics';
import {SpatialSet} from './SpatialSet';
import {useFilmContent, type FilmContent} from './filmContent';
import {ChaosOpening} from './ChaosOpening';
import {getAssembledBlock, getOpeningCamera, getOpeningFlash, openingCubeRotation, OPENING_CUBE_SCALE} from './openingChoreography';
import {getChoreographyTime, getStoryTime, OPENING_SECONDS, SOURCE_OPENING_SECONDS} from './filmTiming';

type Point = [number, number, number];
const accent = '#7c9fb9';
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const blend = (a: Point, b: Point, t: number): Point => a.map((v, i) => lerp(v, b[i], t)) as Point;
const openingRotation = openingCubeRotation;

// The 64 opening blocks keep their identities through every later transformation.
const initialPositions: Point[] = Array.from({length: 64}, (_, i) => getAssembledBlock(i).toArray());

const connectedPositions = (): Point[] => {
  const people: Point[] = Array.from({length: 8}, (_, i) => [1 + Math.cos(i / 8 * Math.PI * 2) * 0.25, 0.48 + Math.sin(i / 8 * Math.PI * 2) * 0.25, 0]);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 7; col++) people.push([1 + (col - 3) * 0.16, -0.22 - row * 0.17 + Math.sin(col / 6 * Math.PI) * 0.13, 0]);
  }
  const calendar: Point[] = [];
  for (const y of [0.62, -0.46]) for (let i = 0; i < 5; i++) calendar.push([3 + (i - 2) * 0.24, y, 0]);
  for (const x of [2.52, 3.48]) for (let i = 0; i < 3; i++) calendar.push([x, 0.35 - i * 0.27, 0]);
  for (const [x, y] of [[-0.23, 0.16], [0, 0.16], [0.23, 0.16], [-0.23, -0.1], [0, -0.1]]) calendar.push([3 + x, y, 0]);
  const bars: Point[] = [];
  [4, 7, 10].forEach((height, col) => {
    for (let i = 0; i < height; i++) bars.push([4.62 + col * 0.37, -0.48 + i * 0.14, 0]);
  });
  return [...people, ...calendar, ...bars].map((point, i): Point => {
    const icon = i < 22 ? 0 : i < 43 ? 1 : 2;
    const centers = [1, 3, 4.99];
    const positions: Point[] = [[-2.85, -.62, 1], [.1, -.63, -.7], [3.1, -.6, -2]];
    return [positions[icon][0] + (point[0] - centers[icon]) * 1.28, positions[icon][1] + point[1] * 1.28, positions[icon][2]];
  });
};
const icons = connectedPositions();

const metricPosition = (i: number, seconds: number): Point => {
  const expand = filmEase(seconds, 20.0, 22.1);
  const col = i % 8 - 3.5;
  const row = Math.floor(i / 8) - 3.5;
  return [
    3.35 + col * lerp(0.40, 0.49, expand),
    0.12 + row * lerp(0.40, 0.47, expand),
    Math.sin(col * 0.4 + row * 0.32 + seconds * 0.16) * 0.18 + expand * Math.cos(i * 0.7) * 0.27,
  ];
};

const closingPosition = (i: number, seconds: number): Point => {
  const p = new Vector3((i % 4 - 1.5) * 0.255, (Math.floor(i / 4) % 4 - 1.5) * 0.255, (Math.floor(i / 16) - 1.5) * 0.255);
  p.applyEuler(new Euler(0.23, -0.43 + (seconds - 33) * 0.012, 0.04));
  p.add(new Vector3(0, 1.66, 0));
  return p.toArray();
};

const FilmCamera = ({seconds}: {seconds: number}) => {
  const {camera, invalidate} = useThree();
  useLayoutEffect(() => {
    if (seconds < OPENING_SECONDS) {
      const pose = getOpeningCamera(getChoreographyTime(seconds));
      camera.position.copy(pose.position);
      camera.quaternion.copy(pose.orientation);
    } else {
      const show = getShowState(getStoryTime(seconds));
      camera.position.fromArray(show.camera.position);
      camera.lookAt(...show.camera.target);
    }
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, seconds]);
  return null;
};

const ContinuationBlocks = ({seconds}: {seconds: number}) => {
  const geometry = useMemo(() => new RoundedBoxGeometry(0.42, 0.42, 0.42, 4, 0.03), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const finish = getRibbonFinish(seconds);
  return (
    <group>
      {initialPositions.map((origin, i) => {
        const delay = i % 8 * 0.035;
        const connect = filmEase(seconds, 7.05 + delay, 9.7 + delay);
        const scaleUp = filmEase(seconds, 14.9 + delay, 16.7 + delay);
        const certificate = filmEase(seconds, 24.8 + delay, 26.3 + delay);
        const closing = filmEase(seconds, 33.0 + delay, 35.0 + delay);
        let position = blend(origin, icons[i], connect);
        position = blend(position, metricPosition(i, seconds), scaleUp);
        const cardPoint: Point = [-2.2 + (i % 8 - 3.5) * 0.39, (Math.floor(i / 8) - 3.5) * 0.28, .8];
        position = blend(position, cardPoint, certificate);
        position = blend(position, closingPosition(i, seconds), closing);
        const baseScale = lerp(lerp(OPENING_CUBE_SCALE, 0.43, connect), 0.76, scaleUp);
        const size = lerp(baseScale * (1 - certificate), 0.52, closing);
        const x = i % 4 - 1.5;
        const z = Math.floor(i / 16) - 1.5;
        const blue = x >= 0.5 && z === 1.5;
        const dark = z === -1.5 && x === -1.5;
        const section = getConferenceSection(i, seconds);
        const visibility = seconds < 33 ? 1 - filmEase(seconds, 25.1, 25.75) : closing;
        const sectionScale = section.scale.multiplyScalar(visibility);
        const meshScale = new Vector3(size, size, size).lerp(sectionScale, section.weight);
        const meshPosition = new Vector3(...position).lerp(section.position, section.weight);
        const orientation = new Quaternion().setFromEuler(new Euler(
          lerp(lerp(openingRotation.x, 0.06, connect), 0.23, closing),
          lerp(lerp(openingRotation.y, -0.08, connect), -0.43 + (seconds - 33) * 0.012, closing),
          lerp(openingRotation.z, 0.015, connect),
        )).slerp(section.orientation, section.weight);
        const color = new Color(blue ? accent : dark ? '#252923' : '#a09c92')
          .lerp(new Color(blue ? '#5d83b0' : '#b8c4cf'), section.weight);
        return (
          <mesh
            key={i}
            geometry={geometry}
            position={meshPosition}
            scale={meshScale}
            visible={meshScale.lengthSq() > 0.00001 && finish < 0.9999}
            quaternion={orientation}
            castShadow receiveShadow
          >
            <meshPhysicalMaterial
              color={color}
              roughness={lerp(blue ? 0.23 : 0.27, 0.21, section.weight)}
              metalness={lerp(blue ? 0.50 : 0.62, 0.83, section.weight)}
              envMapIntensity={lerp(0.7, 1.0, section.weight)}
              clearcoat={lerp(0.48, 0.7, section.weight)} clearcoatRoughness={0.20}
              transparent opacity={1 - finish} depthWrite={finish < 0.01}
            />
          </mesh>
        );
      })}
    </group>
  );
};

const Certificate = ({index, seconds}: {index: number; seconds: number}) => {
  const geometry = useMemo(() => new RoundedBoxGeometry(3.28, 2.25, 0.055, 4, 0.025), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const enter = filmEase(seconds, 25.2 + index * 0.28, 27.0 + index * 0.28);
  const exit = filmEase(seconds, 32.9 + index * 0.1, 34.45 + index * 0.1);
  const reveal = enter * (1 - exit);
  const back = 2 - index;
  const fan = filmEase(seconds, 27.1, 29.6) * (1 - filmEase(seconds, 31.0, 33.1));
  return (
    <group
      visible={reveal > 0.02}
      position={[-2.25 + back * .37 + back * fan * .26 - exit * .8, -.16 + back * .28 + back * fan * .18 + (1 - enter) * .3, 1.05 - back * (.65 + fan * .35)]}
      rotation={[.08 + .015 * Math.sin(seconds * .23) + fan * back * .045, .15 + back * .04 + Math.sin(seconds * .17) * .045 + fan * back * .11, -.045 + back * .035 + fan * back * .065]}
      scale={lerp(.88, 1.14, enter) * (1 - exit * .22)}
    >
      <mesh geometry={geometry} castShadow={reveal > .98} receiveShadow>
        <meshPhysicalMaterial
          color={index === 2 ? '#62615a' : index === 1 ? '#3b4c56' : '#2a3b4a'}
          metalness={0} roughness={0.9} clearcoat={0} specularIntensity={0.12} envMapIntensity={0.1}
          transparent opacity={reveal} depthWrite={reveal > .98}
          stencilWrite={reveal > .98} stencilRef={1} stencilFunc={AlwaysStencilFunc}
          stencilFail={KeepStencilOp} stencilZFail={ReplaceStencilOp} stencilZPass={ReplaceStencilOp}
        />
      </mesh>
      {index === 2 && (
        <group position={[0, 0, 0.032]}>
          {/* Quiet embossed strokes describe a certificate, without a UI panel. */}
          {[[-1.43, 0, 0.012, 1.83], [1.43, 0, 0.012, 1.83], [0, 0.91, 2.86, 0.012], [0, -0.91, 2.86, 0.012]].map(([x, y, w, h], i) => (
            <mesh key={i} position={[x, y, 0]}><boxGeometry args={[w, h, 0.005]} /><meshStandardMaterial color="#405360" metalness={0} roughness={0.9} envMapIntensity={0.1} transparent opacity={reveal * 0.7} depthWrite={false} /></mesh>
          ))}
          <CertificateLettering opacity={reveal} seconds={seconds} />
          <mesh position={[0.98, -0.48, 0.015]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.255, 0.255, 0.025, 64]} /><meshPhysicalMaterial color="#31566e" metalness={0.25} roughness={0.6} clearcoat={0.05} envMapIntensity={0.18} transparent opacity={reveal} depthWrite={reveal > .98} /></mesh>
          <mesh position={[0.98, -0.48, 0.035]}><torusGeometry args={[0.23, 0.012, 8, 64]} /><meshPhysicalMaterial color="#708994" metalness={0.3} roughness={0.55} envMapIntensity={0.16} transparent opacity={reveal} depthWrite={reveal > .98} /></mesh>
        </group>
      )}
    </group>
  );
};

/** One WebGL scene and one uninterrupted absolute-time optical background. */
export const FilmStage = ({timeOffsetSeconds = 0, content}: {timeOffsetSeconds?: number; content?: FilmContent}) => {
  const sharedContent = useFilmContent();
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const seconds = frame / fps + timeOffsetSeconds;
  const choreographySeconds = getChoreographyTime(seconds);
  const storySeconds = getStoryTime(seconds);
  const opening = seconds < OPENING_SECONDS;
  const show = getShowState(storySeconds);
  return (
    <ThreeCanvas
      width={width} height={height} shadows="variance"
      frameloop="demand"
      camera={{fov: 34, position: [0, 0.18, 13.2], near: 0.1, far: 60}}
      gl={{antialias: true, alpha: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.95}}
    >
      <fog attach="fog" args={['#070e1c', opening ? 22 : 15, opening ? 43 : 34]} />
      <FilmCamera seconds={seconds} />
      <SpatialOptics seconds={storySeconds} opening={opening} flash={opening ? getOpeningFlash(choreographySeconds) : undefined} width={width} height={height} />
      <StudioReflections />
      <AnimatedBackground timeSeconds={storySeconds} look="deep" />
      <SpatialSet seconds={storySeconds} opacity={filmEase(choreographySeconds, SOURCE_OPENING_SECONDS, SOURCE_OPENING_SECONDS + 1.4)} />
      {opening ? <ChaosOpening seconds={choreographySeconds} content={content ?? sharedContent} /> : <ContinuationBlocks seconds={storySeconds} />}
      {storySeconds >= 17 && <RibbonSculpture seconds={storySeconds} />}
      {!opening && <WorldTypography seconds={storySeconds} content={content ?? sharedContent} />}
      {storySeconds >= 25 && storySeconds < 35 && (
        <group>
          <Certificate index={0} seconds={storySeconds} />
          <Certificate index={1} seconds={storySeconds} />
          <Certificate index={2} seconds={storySeconds} />
        </group>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.7, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} /><shadowMaterial transparent depthWrite={false} opacity={0.24 * (1 - show.passage * 0.90) * (1 - show.finale)} />
      </mesh>
    </ThreeCanvas>
  );
};
