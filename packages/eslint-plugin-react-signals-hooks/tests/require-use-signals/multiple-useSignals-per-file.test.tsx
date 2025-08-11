import React from 'react';
import { signal } from '@preact/signals-react';
import type { Signal } from '@preact/signals-react';

// File exercises: multiple existing useSignals declarations per file; ensure per-function reuse.

function A() {
  const store = useSignals(1);
  const s: Signal<number> = signal(0);
  // signal usage
  s.value++;
  // expect fixer to reuse `store` and not add a duplicate; ensure .f() is present
  try {
    // body
  } finally {
    store.f();
  }
  return <div>{s}</div>;
}

function B() {
  // different existing store name
  const localStore = useSignals(1);
  const s: Signal<number> = signal(1);
  s.value++;
  // has a finally but calls a different var; ensure we still add localStore.f() if missing
  try {
    // body
  } finally {
    // intentionally empty to allow fixer to insert
  }
  return <span>{s}</span>;
}

export function C() {
  // No existing store, ensure fixer declares a unique store and wraps try/finally
  const s = signal(2);
  s.value++;
  return <p>{s}</p>;
}
