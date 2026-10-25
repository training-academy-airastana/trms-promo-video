import React, {Fragment} from 'react';
import {filmTextStyle} from './filmStyle';
import {getWordReveal, splitWords} from './wordReveal';

/** DOM captions use the same word clock as the world-space typography. */
export const StaggeredText = ({text, seconds, start, end, left = 0, top = 0, lit = true}: {
  text: string; seconds: number; start: number; end: number;
  left?: number; top?: number; lit?: boolean;
}) => {
  const words = splitWords(text);
  return <span aria-label={text}>{words.map((word, index) => {
    const appear = getWordReveal(seconds, index, words.length, start, end);
    const gapStart = word.offset + word.text.length;
    const next = words[index + 1]?.offset ?? text.length;
    return <Fragment key={`${word.offset}-${word.text}`}>
      <span aria-hidden="true" style={{
        ...(lit ? filmTextStyle(seconds, left, top) : {}),
        display: 'inline-block', whiteSpace: 'pre', opacity: appear,
        translate: `0px ${(1 - appear) * 8}px`,
        filter: `blur(${(1 - appear) * 12}px) drop-shadow(0 0 5px rgba(163,196,229,.18)) drop-shadow(0 0 14px rgba(132,172,213,.08))`,
      }}>{word.text}</span>
      <span aria-hidden="true" style={{whiteSpace: 'pre'}}>{text.slice(gapStart, next)}</span>
    </Fragment>;
  })}</span>;
};
