import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import type { JSX } from 'react';

// Expect: suggest replacing ternary with <Show>; autofix adds/augments `import { Show } from '@preact/signals-react'`
export function TernaryWithSignal(): JSX.Element {
  const store = useSignals(1);

  try {
    const visibleSignal = signal(true);
    return visibleSignal.value ? <span>On</span> : <span>Off</span>;
  } finally {
    store.f();
  }
}
