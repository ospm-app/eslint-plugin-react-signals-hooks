import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import type { JSX } from 'react';

// Expect: error for missing useSignals(); multiple returns
export function MultiReturn(): JSX.Element {
  const s = signal(0);
  if (s.value > 0) return <span>{s}</span>;
  return <div>{s}</div>;
}

// Expect: no error; already has try/finally with .f()
export function HasTryFinally(): JSX.Element {
  const s = signal(1);
  try {
    return <div>{s}</div>;
  } finally {
    const store = useSignals(1);
    store.f();
  }
}

// Expect: error for missing useSignals(); async function
export async function AsyncComponent(): Promise<JSX.Element> {
  const s = signal(2);
  await Promise.resolve();
  return <div>{s}</div>;
}

// Expect: error for missing useSignals(); generator function
export function* GeneratorComponent(): Generator<JSX.Element, void, unknown> {
  const s = signal(3);
  yield <div>{s}</div>;
}
