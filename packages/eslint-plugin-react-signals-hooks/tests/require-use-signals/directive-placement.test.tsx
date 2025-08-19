import { useSignals } from '@preact/signals-react/runtime';
import { signal } from '@preact/signals-react';
import type { JSX } from 'react';

// Expect: error for missing useSignals(); autofix inserts after string directive
export function WithDirective(): JSX.Element {
  'use client';
  useSignals();
  const sSignal = signal(0);
  return <div>{sSignal}</div>;
}
