import { signal } from '@preact/signals-react';
import { useSignals as uS } from '@preact/signals-react/runtime';
import type { JSX } from 'react';

// Expect: no error from require-use-signals (alias is recognized)
export function WithAlias(): JSX.Element {
  uS();
  const countSignal = signal(0);
  return <div>{countSignal}</div>;
}
