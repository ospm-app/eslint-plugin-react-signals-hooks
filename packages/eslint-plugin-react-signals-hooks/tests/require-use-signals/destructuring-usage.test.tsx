import { useSignals } from '@preact/signals-react/runtime';
import { signal } from '@preact/signals-react';
import type { JSX } from 'react';

// Expect: error for missing useSignals(); destructuring value from signal counts
export function DestructureValue(): JSX.Element {
  const sSignal = signal(0);
  const { value } = sSignal.value as any;
  return <div>{value}</div>;
}

// Expect: error for missing useSignals(); destructuring peek then calling counts
export function DestructurePeekCall(): JSX.Element {
const store = useSignals(1);

  try {
const sSignal = signal(0);
  const { peek } = sSignal.value as any;
  return <div>{peek()}</div>;

} finally {
store.f();
}
}
