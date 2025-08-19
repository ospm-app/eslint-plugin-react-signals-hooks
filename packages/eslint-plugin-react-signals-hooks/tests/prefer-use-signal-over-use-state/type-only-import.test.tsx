import type { ReadonlySignal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { useState, type JSX } from 'react';

export function TypeOnlyImportCase(): JSX.Element {
  useSignals();
  const [n, setN] = useState(0);
  setN(n + 1);
  return <div>{n}</div>;
}
