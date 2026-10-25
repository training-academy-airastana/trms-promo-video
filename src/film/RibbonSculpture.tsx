import React, {useEffect, useMemo} from 'react';
import {BufferAttribute, BufferGeometry, Color, Vector3} from 'three';
import {getConferenceSection, getRibbonFinish, showEase} from './conferenceChoreography';

const SEGMENTS = 256;
// Rounded rectangular cross section: broad polished faces and narrow bevels.
const profile: [number, number][] = [];
const radius = 0.14;
for (let corner = 0; corner < 4; corner++) {
  const centers = [[0.5 - radius, 0.5 - radius], [-0.5 + radius, 0.5 - radius], [-0.5 + radius, -0.5 + radius], [0.5 - radius, -0.5 + radius]];
  for (let step = 0; step <= 4; step++) {
    const angle = (corner * 90 + step * 22.5) * Math.PI / 180;
    profile.push([centers[corner][0] + Math.cos(angle) * radius, centers[corner][1] + Math.sin(angle) * radius]);
  }
}

/** The cube assembly fuses into one continuous, beveled metal surface. */
export const RibbonSculpture = ({seconds}: {seconds: number}) => {
  const geometry = useMemo(() => {
    const mesh = new BufferGeometry();
    mesh.setAttribute('position', new BufferAttribute(new Float32Array(SEGMENTS * profile.length * 3), 3));
    const colors = new Float32Array(SEGMENTS * profile.length * 3);
    const indices: number[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const u = i / SEGMENTS;
      const blue = showEase(u, 0.49, 0.56) * (1 - showEase(u, 0.77, 0.84));
      const color = new Color('#b8c4cf').lerp(new Color('#456fa3'), blue);
      for (let j = 0; j < profile.length; j++) {
        color.toArray(colors, (i * profile.length + j) * 3);
        const a = i * profile.length + j;
        const b = i * profile.length + (j + 1) % profile.length;
        const c = (i + 1) % SEGMENTS * profile.length + j;
        const d = (i + 1) % SEGMENTS * profile.length + (j + 1) % profile.length;
        indices.push(a, b, c, b, d, c);
      }
    }
    mesh.setAttribute('color', new BufferAttribute(colors, 3));
    mesh.setIndex(indices);
    return mesh;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const amount = getRibbonFinish(seconds);
  if (amount < 0.0001) return null;
  const positions = geometry.getAttribute('position') as BufferAttribute;
  const grow = seconds >= 33 ? showEase(seconds, 33, 35) : 1;
  const point = new Vector3();
  for (let i = 0; i < SEGMENTS; i++) {
    const section = getConferenceSection(i / 4, seconds);
    for (let j = 0; j < profile.length; j++) {
      point.set(0, profile[j][0] * section.scale.y * 0.42 * 1.025 * grow, profile[j][1] * section.scale.z * 0.42 * 1.025 * grow);
      point.applyQuaternion(section.orientation).add(section.position);
      positions.setXYZ(i * profile.length + j, point.x, point.y, point.z);
    }
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return (
    <mesh geometry={geometry} frustumCulled={false} castShadow receiveShadow>
      <meshPhysicalMaterial vertexColors metalness={0.88} roughness={0.19} clearcoat={0.75} clearcoatRoughness={0.13} envMapIntensity={1.05} transparent opacity={amount} depthWrite={amount > 0.95} />
    </mesh>
  );
};
