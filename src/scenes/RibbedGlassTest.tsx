import React from 'react';
import {BackgroundLightingTest} from './BackgroundLightingTest';

/** Existing ten-second lighting study, with the background optical layer enabled. */
export const RibbedGlassTest = ({glassStrength = 1}: {glassStrength?: number}) => <BackgroundLightingTest glass glassStrength={glassStrength} />;
