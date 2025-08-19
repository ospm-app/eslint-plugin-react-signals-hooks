/** biome-ignore-all assist/source/organizeImports: off */
import { useSignals } from '@preact/signals-react/runtime';
import { signal } from '@preact/signals-react';
import type { JSX } from 'react';

// Correct: destructuring only non-signal keys from an object that also contains a signal
export function ObjectNonSignalOnly(): JSX.Element {
  const store = useSignals(1);
  try {
    const o = { sig: signal(1), non: 2 };
    const { non } = o; // ✅ allowed (no overlap with signal-bearing key 'sig')
    return <div>{non}</div>;
  } finally {
    store.f();
  }
}

// Correct: destructuring array element that is not signal when another index is a signal
export function ArrayNonSignalOnly(): JSX.Element {
  const store = useSignals(1);
  try {
    const a = [1, signal(2)];
    const [x] = a; // ✅ allowed (index 0 only; signal at index 1)
    return <div>{x}</div>;
  } finally {
    store.f();
  }
}
