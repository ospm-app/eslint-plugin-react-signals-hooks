import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import type { JSX } from 'react';

// Expect: first triggers (no useSignals), second does not (has useSignals)
export function A(): JSX.Element {
  const s = signal(1);
  return <span>{s}</span>;
}

export function B(): JSX.Element {
  useSignals();
  const s = signal(2);
  return <span>{s}</span>;
}

// Nested hook helper
function useHelper(flag: boolean) {
  if (flag) {
    useSignals();
  }
}

// Expect: still needs top-level useSignals when signal is read in component
export function WithNestedHelper(): JSX.Element {
  useHelper(false);
  const s = signal(3);
  return <div>{s}</div>;
}
