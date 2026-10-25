import React, {useEffect, useMemo, useState} from 'react';
import {cancelRender, continueRender, delayRender} from 'remotion';
import {CanvasTexture, PlaneGeometry, SRGBColorSpace} from 'three';
import {useThree} from '@react-three/fiber';
import {filmEase, loadFilmFont} from './filmStyle';
import {redrawAssetFrame} from './redrawAssetFrame';
import {splitWords, WORD_STAGGER} from './wordReveal';

type PrintedWord = {
  text: string; x: number; y: number; width: number; height: number;
  atlasX: number; atlasY: number;
};
type PrintedArtwork = {texture: CanvasTexture; words: PrintedWord[]};

const PrintedWordMesh = ({word, texture, opacity}: {word: PrintedWord; texture: CanvasTexture; opacity: number}) => {
  const geometry = useMemo(() => {
    const plane = new PlaneGeometry(word.width / 2048 * 2.82, word.height / 1280 * 1.76);
    const uv = plane.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (word.atlasX + uv.getX(i) * word.width) / 2048, 1 - (word.atlasY + (1 - uv.getY(i)) * word.height) / 1280);
    }
    return plane;
  }, [word]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} position={[(word.x / 2048 - .5) * 2.82, (.5 - word.y / 1280) * 1.76, .006]}>
    <meshStandardMaterial map={texture} transparent opacity={opacity} roughness={.95} metalness={0} envMapIntensity={.08} depthWrite={false} />
  </mesh>;
};

/** Printed words retain their document layout and share one GPU texture atlas. */
export const CertificateLettering = ({opacity, seconds}: {opacity: number; seconds: number}) => {
  const {gl, scene, camera} = useThree();
  const [artwork, setArtwork] = useState<PrintedArtwork>();
  const [handle] = useState(() => delayRender('Preparing certificate typography'));
  useEffect(() => {
    let disposed = false;
    let texture: CanvasTexture | undefined;
    loadFilmFont().then(() => {
      if (disposed) return;
      const atlas = document.createElement('canvas');
      atlas.width = 2048;
      atlas.height = 1280;
      const ctx = atlas.getContext('2d');
      if (!ctx) throw new Error('Could not create certificate lettering');
      const words: PrintedWord[] = [];
      let cursorX = 0;
      let cursorY = 0;
      let rowHeight = 0;
      const line = (text: string, x: number, baseline: number, fontSize: number, weight: number, color: string, right = false) => {
        ctx.font = `${weight} ${fontSize}px Manrope`;
        const lineX = right ? x - ctx.measureText(text).width : x;
        for (const word of splitWords(text)) {
          const width = Math.ceil(ctx.measureText(word.text).width);
          const prefix = ctx.measureText(text.slice(0, word.offset)).width;
          const padding = Math.ceil(fontSize * .25 + 6);
          const cellWidth = width + padding * 2;
          const cellHeight = Math.ceil(fontSize * 1.6 + padding * 2);
          if (cursorX + cellWidth > atlas.width) {cursorX = 0; cursorY += rowHeight + 4; rowHeight = 0;}
          ctx.fillStyle = color;
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.fillText(word.text, cursorX + padding, cursorY + padding + fontSize * 1.15);
          words.push({
            text: word.text, width: cellWidth, height: cellHeight,
            x: lineX + prefix - padding + cellWidth / 2,
            y: baseline - padding - fontSize * 1.15 + cellHeight / 2,
            atlasX: cursorX, atlasY: cursorY,
          });
          cursorX += cellWidth + 4;
          rowHeight = Math.max(rowHeight, cellHeight);
        }
      };
      line('TRMS.', 80, 132, 76, 700, '#182734');
      line('TRAINING, CONNECTED.', 1965, 122, 28, 400, '#3e535f', true);
      line('CERTIFICATE', 80, 446, 135, 500, '#213445');
      line('OF COMPLETION', 88, 540, 48, 500, '#344954');
      line('Recognising progress.', 88, 758, 45, 400, '#2e414f');
      line('Every achievement, accounted for.', 88, 828, 32, 400, '#3e535f');
      line('TRAINING RECORD', 88, 1128, 24, 500, '#344954');
      texture = new CanvasTexture(atlas);
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 4;
      setArtwork({texture, words});
    }).catch(cancelRender);
    return () => {disposed = true; texture?.dispose(); continueRender(handle);};
  }, [handle]);
  useEffect(() => {
    if (artwork) redrawAssetFrame(gl, scene, camera, () => continueRender(handle));
  }, [artwork, gl, scene, camera, handle]);
  if (!artwork) return null;
  return <group>
    {artwork.words.map((word, index) => <PrintedWordMesh
      key={index} word={word} texture={artwork.texture}
      opacity={opacity * filmEase(seconds, 25.85 + index * WORD_STAGGER, 26.4 + index * WORD_STAGGER)}
    />)}
    <mesh position={[(328 / 2048 - .5) * 2.82, (.5 - 1071 / 1280) * 1.76, .006]}>
      <planeGeometry args={[480 / 2048 * 2.82, 2 / 1280 * 1.76]} />
      <meshStandardMaterial color="#344954" transparent opacity={opacity * filmEase(seconds, 27.4, 28.2)} roughness={.95} metalness={0} envMapIntensity={.08} depthWrite={false} />
    </mesh>
  </group>;
};
