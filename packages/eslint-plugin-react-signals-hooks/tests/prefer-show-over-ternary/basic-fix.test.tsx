import { signal } from '@preact/signals-react';
import type { JSX } from 'react';

// Expect: suggest replacing ternary with <Show>; autofix adds/augments `import { Show } from '@preact/signals-react'`
export function TernaryWithSignal(): JSX.Element {
  const visibleSignal = signal(true);
  return visibleSignal.value ? <span>On</span> : <span>Off</span>;
}
