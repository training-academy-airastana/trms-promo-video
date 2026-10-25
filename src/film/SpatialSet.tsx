import React, {useEffect, useMemo} from 'react';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {filmEase} from './filmStyle';

/** Cropped, quiet physical contours give the lens near and distant reference planes. */
export const SpatialSet = ({seconds: t, opacity = 1}: {seconds: number; opacity?: number}) => {
  const presence = filmEase(t, 1.7, 4) * (1 - filmEase(t, 33, 36.3)) * opacity;
  const geometry = useMemo(() => new RoundedBoxGeometry(.72, 24, .15, 4, .055), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (presence < .001) return null;
  const drift = Math.sin(t * .075) * .12;
  return (
    <group>
      <mesh geometry={geometry} position={[-4.6 + drift, -1.6, 4.8]} rotation={[.08, .7 + t * .002, -.33]}>
        <meshPhysicalMaterial color="#0c192b" roughness={.27} metalness={.68} clearcoat={.7} envMapIntensity={.45} transparent opacity={presence * .66} />
      </mesh>
      <mesh geometry={geometry} position={[5.45, 1.2 + drift, 3.2]} rotation={[-.06, -.65, -.29]} scale={[.6, 1, 1]}>
        <meshPhysicalMaterial color="#101e32" roughness={.32} metalness={.65} clearcoat={.55} envMapIntensity={.4} transparent opacity={presence * .42} />
      </mesh>
    </group>
  );
};
