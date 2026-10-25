import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {Color, RectAreaLight, Vector2, Vector3, Vector4} from 'three';
import {RectAreaLightUniformsLib} from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import {getProceduralLight, type LightAccent, type LightCue, type ProceduralLight} from './backgroundLighting';
import {backgroundFragmentShader, backgroundVertexShader} from './backgroundShaders';
import {getGlassBands, GLASS_BAND_COUNT} from './ribbedGlass';

export type AnimatedBackgroundProps = {
  readonly cues?: readonly LightCue[];
  readonly accents?: readonly LightAccent[];
  readonly timeOffsetSeconds?: number;
  readonly glass?: boolean;
  readonly glassStrength?: number;
  readonly timeSeconds?: number;
  readonly look?: 'original' | 'deep';
};

// Three's own area light implementation: no effects framework or new dependency.
RectAreaLightUniformsLib.init();

const ObjectLighting = ({light}: {light: ProceduralLight}) => {
  const warm = useRef<RectAreaLight>(null);
  const cool = useRef<RectAreaLight>(null);
  const targetX = (light.focus[0] - 0.5) * 14;
  const targetY = (light.focus[1] - 0.5) * 8;
  useLayoutEffect(() => {
    warm.current?.lookAt(targetX, targetY, 0);
    cool.current?.lookAt(targetX, targetY, 0);
  }, [targetX, targetY, light.keyPosition, light.fillPosition]);
  return (
    <>
      <ambientLight intensity={0.18 + light.energy * 0.055} color="#d8cab6" />
      <hemisphereLight args={['#c9d1d8', '#17130d', 0.44]} />
      <directionalLight
        position={light.keyPosition}
        color={light.keyColor}
        intensity={0.75 * light.energy}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-radius={7}
        shadow-blurSamples={12}
        shadow-bias={-0.0003}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
      />
      <rectAreaLight ref={warm} position={light.keyPosition} color={light.keyColor} intensity={2.1 * light.energy} width={6.5} height={4.0} />
      <rectAreaLight ref={cool} position={light.fillPosition} color={light.fillColor} intensity={1.8 * light.energy} width={5.0} height={4.5} />
    </>
  );
};

/** Mount inside the existing ThreeCanvas. Also coordinates the foreground object lights. */
export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({cues, accents, timeOffsetSeconds = 0, glass = true, glassStrength = 1, timeSeconds, look = 'original'}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const seconds = timeSeconds ?? frame / fps + timeOffsetSeconds;
  const sourceLight = getProceduralLight(seconds, cues, accents);
  const light = glass ? {
    ...sourceLight,
    keyColor: look === 'deep' ? '#c9d9ee' : '#dcecff',
    fillColor: look === 'deep' ? '#467dbd' : '#70a5e3',
  } : sourceLight;
  const glassBands = getGlassBands(seconds);
  const uniforms = useMemo(() => ({
    uTime: {value: 0},
    uResolution: {value: new Vector2()},
    uKeyCenter: {value: new Vector2()},
    uFillCenter: {value: new Vector2()},
    uFocus: {value: new Vector2()},
    uKeyPosition: {value: new Vector3()},
    uFillPosition: {value: new Vector3()},
    uKeyColor: {value: new Color()},
    uFillColor: {value: new Color()},
    uBaseColor: {value: new Color('#110f0c')},
    uEnergy: {value: 0},
    uAccent: {value: 0},
    uSpread: {value: 1},
    uDirection: {value: 0},
    uSheen: {value: 0},
    uSheenPosition: {value: 0},
    uWarpStrength: {value: 0},
    uFocusWeight: {value: 0},
    uClosingWeight: {value: 0},
    uGlassStrength: {value: 0},
    uGlassMode: {value: 0},
    uExposure: {value: 1},
    uContrast: {value: 1},
    uGlassGeometry: {value: Array.from({length: GLASS_BAND_COUNT}, () => new Vector4())},
    uGlassOptics: {value: Array.from({length: GLASS_BAND_COUNT}, () => new Vector4())},
  }), []);
  uniforms.uTime.value = light.time;
  uniforms.uResolution.value.set(width, height);
  uniforms.uKeyCenter.value.fromArray(light.keyCenter);
  uniforms.uFillCenter.value.fromArray(light.fillCenter);
  uniforms.uFocus.value.fromArray(light.focus);
  uniforms.uKeyPosition.value.fromArray(light.keyPosition);
  uniforms.uFillPosition.value.fromArray(light.fillPosition);
  uniforms.uKeyColor.value.set(light.keyColor);
  uniforms.uFillColor.value.set(light.fillColor);
  uniforms.uEnergy.value = light.energy;
  uniforms.uAccent.value = light.accent;
  uniforms.uSpread.value = light.spread;
  uniforms.uDirection.value = light.direction;
  uniforms.uSheen.value = light.sheen;
  uniforms.uSheenPosition.value = light.sheenPosition;
  uniforms.uWarpStrength.value = light.warpStrength;
  uniforms.uFocusWeight.value = light.weights.Focus;
  uniforms.uClosingWeight.value = light.weights.Closing;
  uniforms.uBaseColor.value.set(look === 'deep' ? '#040914' : glass ? '#080e19' : '#110f0c');
  uniforms.uExposure.value = look === 'deep' ? .58 : 1;
  uniforms.uContrast.value = look === 'deep' ? 1.08 : 1;
  uniforms.uGlassStrength.value = glass ? Math.max(0, Math.min(1, glassStrength)) : 0;
  uniforms.uGlassMode.value = glass ? 1 : 0;
  glassBands.forEach((band, i) => {
    uniforms.uGlassGeometry.value[i].set(band.center, band.halfWidth, band.slope, band.tilt);
    uniforms.uGlassOptics.value[i].set(band.thickness, band.ior, band.roughness, band.visibility);
  });

  return (
    <>
      <mesh frustumCulled={false} renderOrder={-1000}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          // R3F copies scalar uniform wrappers; commit the current Remotion frame.
          uniforms={{...uniforms}}
          vertexShader={backgroundVertexShader}
          fragmentShader={backgroundFragmentShader}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
      <ObjectLighting light={light} />
    </>
  );
};
