import React, {useEffect, useMemo} from 'react';
import {Color} from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type {FilmContent} from './filmContent';
import {filmEase} from './filmStyle';
import {getOpeningBlock, getOpeningCamera, getOpeningFlash} from './openingChoreography';
import {WorldText} from './WorldTypography';

const issues = [
  {text: 'Scattered records', x: -5.5, y: 3.3, size: .84, width: 6.3, delay: 0, distance: 38},
  {text: 'Manual scheduling', x: 6.3, y: -3.0, size: .88, width: 6.5, delay: .18, distance: 39},
  {text: 'Disconnected teams', x: -8.5, y: 3.6, size: .86, width: 6.7, delay: .48, distance: 43},
  {text: 'Missed training', x: 8.4, y: -3.3, size: .90, width: 6.4, delay: .70, distance: 41},
  {text: 'Expiring certificates', x: -5.8, y: -3.1, size: .80, width: 6.4, delay: .92, distance: 40},
  {text: 'Lost progress', x: 6.3, y: 2.9, size: .82, width: 5.2, delay: 1.12, distance: 37},
  {text: 'Spreadsheet overload', x: -.8, y: 4.2, size: .88, width: 7.0, delay: 1.33, distance: 44},
  {text: 'No clear overview', x: .9, y: -4.2, size: .90, width: 6.5, delay: 1.50, distance: 43},
];

/** The same 64 blocks travel from a defocused deep field into one physical cube. */
const ScatteredBlocks = ({seconds}: {seconds: number}) => {
  const geometry = useMemo(() => new RoundedBoxGeometry(.42, .42, .42, 4, .03), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <group>
    {Array.from({length: 64}, (_, index) => {
      const block = getOpeningBlock(index, seconds);
      const x = index % 4 - 1.5;
      const z = Math.floor(index / 16) - 1.5;
      const blue = x >= .5 && z === 1.5;
      const dark = z === -1.5 && x === -1.5;
      const assembledColor = blue ? '#7c9fb9' : dark ? '#252923' : '#a09c92';
      const color = new Color(blue ? '#15375b' : '#40526b').lerp(new Color(assembledColor), block.assemble);
      return <mesh key={index} geometry={geometry} position={block.position} rotation={block.rotation} scale={block.scale} castShadow={block.assemble > .85} receiveShadow>
        <meshPhysicalMaterial color={color} roughness={.43 + block.assemble * ((blue ? .23 : .27) - .43)} metalness={blue ? .5 : .62} envMapIntensity={.26 + block.assemble * .44} clearcoat={.48} clearcoatRoughness={.20} />
      </mesh>;
    })}
  </group>;
};

const ProblemField = ({seconds: t}: {seconds: number}) => {
  const camera = getOpeningCamera(t);
  const clear = filmEase(t, 8.05, 8.75);
  return <group position={camera.position} quaternion={camera.orientation}>
    {issues.map((issue, index) => {
      const launch = 2.35 + issue.delay;
      return <WorldText
        key={issue.text} text={issue.text}
        position={[0, 0, 0]}
        size={issue.size} maxWidth={issue.width} seconds={t}
        start={launch - .7} end={launch - .35} out={8.4}
        opacity={.82 * (1 - clear)}
        depthWrite={false}
        wordMotion={wordSeconds => {
          const travel = filmEase(wordSeconds, launch, launch + 6.2);
          // Each word starts behind the lens, with its own delayed depth path.
          const distance = -1.8 + travel * (issue.distance + 1.8);
          const lateral = .54 + travel * .46;
          return {
            position: [issue.x * lateral + Math.sin(wordSeconds * .15 + index) * .07 * travel, issue.y * lateral, -distance],
            opacity: 1 - travel * .45,
            blur: 12 + Math.pow(travel, 1.25) * 36,
          };
        }}
        rotate={(index % 3 - 1) * .025} muted
      />;
    })}
  </group>;
};

export const ChaosOpening = ({seconds: t, content}: {seconds: number; content: FilmContent}) => <group>
  <ScatteredBlocks seconds={t} />
  <pointLight position={[.1, .4, 3]} color="#e2edff" intensity={getOpeningFlash(t).intensity * 45} distance={45} decay={2} />
  <ProblemField seconds={t} />
  <WorldText text={content.title} position={[.1, .55, .75]} size={1.0} maxWidth={7.5} seconds={t} start={.35} end={1.15} out={3.35} />
  <WorldText text={content.emphasis} position={[.1, -.5, .9]} size={1.0} maxWidth={7.8} seconds={t} start={.95} end={1.8} out={3.35} />
  <WorldText text={content.chaosTitle} position={[.1, .51, 1.05]} size={.86} maxWidth={7.3} seconds={t} start={4.05} end={4.95} out={7.35} />
  <WorldText text={content.chaosEmphasis} position={[.1, -.49, 1.2]} size={.96} maxWidth={7.2} seconds={t} start={4.5} end={5.4} out={7.35} />
  <WorldText text={content.tagline} position={[.1, -1.66, .5]} size={.29} maxWidth={5.8} seconds={t} start={11.45} end={12.25} out={12.35} />
</group>;
