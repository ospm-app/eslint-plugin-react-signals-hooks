/** biome-ignore-all assist/source/organizeImports: off */
import { useSignals } from '@preact/signals-react/runtime';
import * as NS from '@preact/signals-react';
import type { JSX } from 'react';

// Incorrect: namespaced custom creator from creatorNames option
export function NamespacedCustomCreator(): JSX.Element {
  const store = useSignals(1);

  try {
    // @ts-expect-error
    const { value } = NS.mySignal(1); // ❌ should be flagged
    return <div>{value}</div>;
  } finally {
    store.f();
  }
}
