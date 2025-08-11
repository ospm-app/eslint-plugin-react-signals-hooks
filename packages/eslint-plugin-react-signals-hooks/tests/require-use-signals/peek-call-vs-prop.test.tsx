import { signal } from '@preact/signals-react';
import type { JSX } from 'react';

// Expect: error for missing useSignals(); .peek used as a call counts
export function PeekCallMissing(): JSX.Element {
  const s = signal(0);
  // should trigger: .peek() call
  return <div>{s.peek()}</div>;
}

// Expect: no error (no value subscription) — .peek property access only should NOT count
export function PeekPropertyNoCall(): JSX.Element {
  const s = signal(0);
  // should NOT trigger: property access w/o call
  // @ts-expect-error: intentionally accessing property for test semantics
  return <div>{(s as any).peek}</div>;
}
