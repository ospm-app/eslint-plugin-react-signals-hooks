import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import type { JSX } from 'react';

// Expect: in A, reuse existing storeA; in B, reuse existing storeB; in C, error to insert new store
export function A(): JSX.Element {
  const storeA = useSignals(1);
  try {
    const s = signal(0);
    return <div>{s}</div>;
  } finally {
    storeA.f();
  }
}

export function B(): JSX.Element {
  const storeB = useSignals(1);
  try {
    const s = signal(1);
    return <div>{s}</div>;
  } finally {
    storeB.f();
  }
}

export function C(): JSX.Element {
  const s = signal(2);
  return <div>{s}</div>;
}
