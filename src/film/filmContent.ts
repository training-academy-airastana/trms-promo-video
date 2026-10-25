import {createContext, createElement, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode} from 'react';

/** Shared copy for the world typography and editable scene instances. */
export const filmContent = {
  title: 'Training is',
  emphasis: 'everywhere.',
  chaosTitle: 'Leave the chaos',
  chaosEmphasis: 'in the past.',
  system: 'One system.',
  subtitle: 'To manage it all.',
  trainings: '1,500',
  participations: '22,000',
  certificates: '19,200',
  dataLabel: 'Illustrative data',
  wordmark: 'TRMS.',
  tagline: 'Training, connected.',
};

export type FilmContent = typeof filmContent;

const CopyContext = createContext<{content: FilmContent; publish: (copy: Partial<FilmContent>) => void} | null>(null);

export const FilmContentProvider = ({children}: {children: ReactNode}) => {
  const [content, setContent] = useState(filmContent);
  const publish = useCallback((copy: Partial<FilmContent>) => {
    setContent(previous => Object.entries(copy).every(([key, value]) => previous[key as keyof FilmContent] === value)
      ? previous : {...previous, ...copy});
  }, []);
  const value = useMemo(() => ({content, publish}), [content, publish]);
  return createElement(CopyContext.Provider, {value}, children);
};

export const useFilmContent = () => useContext(CopyContext)?.content ?? filmContent;

/** Only copy edits publish; camera frames never trigger a second state clock. */
export const usePublishFilmContent = (copy: Partial<FilmContent> | undefined, inFilm: boolean | undefined) => {
  const publish = useContext(CopyContext)?.publish;
  const signature = JSON.stringify(copy ?? {});
  useLayoutEffect(() => {
    if (inFilm && publish) publish(JSON.parse(signature) as Partial<FilmContent>);
  }, [publish, signature, inFilm]);
};
