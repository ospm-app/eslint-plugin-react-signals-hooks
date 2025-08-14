// oxlint-disable no-unsafe-optional-chaining
/** biome-ignore-all assist/source/organizeImports: off */
/** biome-ignore-all lint/correctness/noUnsafeOptionalChaining: off */
import { useSignals } from '@preact/signals-react/runtime';
import * as SR from '@preact/signals-react';
import type { JSX } from 'react';

// Incorrect: optional call on namespaced creator should still be detected
export function OptionalChainingOnCall(): JSX.Element {
  const store = useSignals(1);
  try {
    const { value } = SR.signal?.(1); // ❌ should be flagged
    return <div>{value}</div>;
  } finally {
    store.f();
  }
}
