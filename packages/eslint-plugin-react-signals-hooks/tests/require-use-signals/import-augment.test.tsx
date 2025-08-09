/** biome-ignore-all lint/correctness/noUnusedImports: off */
import { useSignals } from '@preact/signals-react/runtime';
import { signal } from '@preact/signals-react';
import type { JSX } from 'react';

// Expect: error for missing useSignals(); autofix augments existing runtime import with `useSignals`
export function ImportAugment(): JSX.Element {
  	useSignals();
const nSignal = signal(1);
  return <div>{nSignal}</div>;
}
