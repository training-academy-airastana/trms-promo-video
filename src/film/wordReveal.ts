import {filmEase} from './filmStyle';

// Source choreography seconds; the common film clock stretches this to ~0.2s.
export const WORD_STAGGER = .14;

export const splitWords = (text: string) => Array.from(text.matchAll(/\S+/gu), match => ({
  text: match[0], offset: match.index,
}));

/** All words finish within the line's existing reveal window. */
export const getWordTiming = (index: number, count: number, start: number, end: number) => {
  const span = Math.max(.01, end - start);
  const budget = Math.min(.42, span * .45, Math.max(0, count - 1) * WORD_STAGGER);
  const delay = count > 1 ? index * budget / (count - 1) : 0;
  return {delay, start: start + delay, end: end - budget + delay};
};

export const getWordReveal = (seconds: number, index: number, count: number, start: number, end: number) => {
  const timing = getWordTiming(index, count, start, end);
  return filmEase(seconds, timing.start, timing.end);
};
