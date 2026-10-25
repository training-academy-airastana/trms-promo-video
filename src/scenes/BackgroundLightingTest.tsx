import React, {useEffect, useMemo} from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {ACESFilmicToneMapping} from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {AnimatedBackground} from './AnimatedBackground';
import {type LightAccent, type LightCue} from './backgroundLighting';
import {StudioReflections} from './Opening';

export const TEST_LIGHT_CUES: readonly LightCue[] = [
  {time: 0, mode: 'Calm'},
  {time: 2.2, mode: 'Focus', focus: [0.65, 0.50]},
  {time: 4.2, mode: 'Transition'},
  {time: 6.0, mode: 'Highlight', focus: [0.68, 0.50]},
  {time: 7.3, mode: 'Focus', focus: [0.68, 0.50]},
  {time: 9.5, mode: 'Closing', focus: [0.65, 0.50]},
  {time: 10, mode: 'Closing', focus: [0.65, 0.50]},
];
export const TEST_LIGHT_ACCENTS: readonly LightAccent[] = [
  {time: 6.0, duration: 2.4, strength: 0.17},
];

// Two stationary instances of the existing rounded TRMS cube primitive/materials.
// The camera and geometry do not animate: changes in this test are lighting only.
export const BackgroundLightingTest = ({glass = false, glassStrength = 1}: {glass?: boolean; glassStrength?: number}) => {
  const {width, height} = useVideoConfig();
  const geometry = useMemo(() => new RoundedBoxGeometry(0.42, 0.42, 0.42, 4, 0.03), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <AbsoluteFill style={{backgroundColor: '#110f0c'}}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows="variance"
        camera={{fov: 34, position: [0, 0.18, 13.2], near: 0.1, far: 60}}
        gl={{antialias: true, alpha: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.95}}
      >
        <StudioReflections />
        <AnimatedBackground cues={TEST_LIGHT_CUES} accents={TEST_LIGHT_ACCENTS} glass={glass} glassStrength={glassStrength} />
        <mesh position={[1.35, 0.05, 0]} rotation={[0.22, -0.4, 0.025]} scale={3} geometry={geometry} castShadow receiveShadow>
          <meshPhysicalMaterial color="#a09c92" roughness={0.27} metalness={0.62} envMapIntensity={0.7} clearcoat={0.48} clearcoatRoughness={0.22} />
        </mesh>
        <mesh position={[3.15, 0.05, 0]} rotation={[0.22, -0.4, 0.025]} scale={3} geometry={geometry} castShadow receiveShadow>
          <meshPhysicalMaterial color="#7c9fb9" roughness={0.23} metalness={0.50} envMapIntensity={0.7} clearcoat={0.48} clearcoatRoughness={0.22} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.7, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <shadowMaterial transparent opacity={0.24} />
        </mesh>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
