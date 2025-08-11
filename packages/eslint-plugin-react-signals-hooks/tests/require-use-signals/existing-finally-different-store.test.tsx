import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import type { JSX } from 'react';

// Expect: do not duplicate .f() if finalizer uses the same store; if different variable exists, fixer should insert for the correct store
export function HasDifferentStoreVar(): JSX.Element {
  const store1 = useSignals(1);
  try {
    const s = signal(0);
    return <div>{s}</div>;
  } finally {
    // unrelated call on another variable shouldn't block inserting correct .f()
    const store2 = { f() {} } as any;
    store2.f();
    store1.f();
  }
}

// Expect: missing useSignals; has try/finally that calls something else; fixer should add declaration + call
export function MissingStoreButHasFinally(): JSX.Element {
  try {
    const s = signal(3);
    return <div>{s}</div>;
  } finally {
    const other = { f() {} } as any;
    other.f();
  }
}
