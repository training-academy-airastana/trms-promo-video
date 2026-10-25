export const SOURCE_OPENING_SECONDS = 13;
export const OPENING_SECONDS = 18;
export const FILM_SECONDS = 60;

// Delivery seconds → existing choreography seconds. Scene boundaries stay exact.
const beats = [
  [0, 0], [18, 13], [29, 21], [42, 31], [52, 39], [60, 46],
] as const;
const spans = beats.slice(1).map((beat, i) => beat[0] - beats[i][0]);
const speeds = beats.slice(1).map((beat, i) => (beat[1] - beats[i][1]) / spans[i]);
const tangents = beats.map((_, i) => {
  if (i === 0) return speeds[0];
  if (i === beats.length - 1) return speeds[speeds.length - 1];
  const left = spans[i - 1];
  const right = spans[i];
  const w1 = 2 * right + left;
  const w2 = right + 2 * left;
  return (w1 + w2) / (w1 / speeds[i - 1] + w2 / speeds[i]);
});

/** Monotone Hermite clock: slower motion with continuous speed across scene cuts. */
export const getChoreographyTime = (seconds: number) => {
  const t = Math.max(0, Math.min(FILM_SECONDS, seconds));
  let i = 0;
  while (i < beats.length - 2 && t >= beats[i + 1][0]) i++;
  const u = (t - beats[i][0]) / spans[i];
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * beats[i][1]
    + (u3 - 2 * u2 + u) * spans[i] * tangents[i]
    + (-2 * u3 + 3 * u2) * beats[i + 1][1]
    + (u3 - u2) * spans[i] * tangents[i + 1];
};

/** Preserve the original lighting and later scene choreography on the slower clock. */
export const getStoryTime = (seconds: number) => {
  const source = getChoreographyTime(seconds);
  return source < SOURCE_OPENING_SECONDS
    ? source / SOURCE_OPENING_SECONDS * 7
    : source - (SOURCE_OPENING_SECONDS - 7);
};
