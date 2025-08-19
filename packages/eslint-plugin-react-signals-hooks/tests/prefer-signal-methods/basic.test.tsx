import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import type { JSX } from 'react';

// Expect: warn to use .peek() when reading without tracking
export function NonReactiveRead(): JSX.Element | null {
  const store = useSignals(1);

  try {
    const sSignal = signal(0);
    console.info(sSignal.value);

    return null;
  } finally {
    store.f();
  }
}
