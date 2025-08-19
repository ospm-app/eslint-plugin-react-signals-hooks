import { signal } from '@preact/signals-react';
import type { JSX } from 'react';

// Expect: error for missing useSignals(); optional chain read counts
export function OptionalRead(): JSX.Element {
  const obj: { s?: ReturnType<typeof signal<number>> } = { s: signal(1) };
  return <div>{obj.s?.value}</div>;
}

// Expect: error for missing useSignals(); optional call of .peek() counts
export function OptionalPeekCall(): JSX.Element {
  const s = signal(0);
  const maybe: any = { s };
  return <div>{maybe.s?.peek?.()}</div>;
}
