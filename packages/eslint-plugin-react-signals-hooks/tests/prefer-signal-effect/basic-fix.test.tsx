/** biome-ignore-all lint/correctness/useHookAtTopLevel: off */
import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { useEffect } from 'react';
import type { JSX } from 'react';

// Expect: error then autofix to effect(); also import { effect } augmentation from '@preact/signals-react'
export function OnlySignalDeps(): JSX.Element {
  const store = useSignals(1);

  try {
    const countSignal = signal(0);

    useEffect(() => {
      console.info(countSignal.value);
    }, [countSignal.value]);

    return <div>{countSignal}</div>;
  } finally {
    store.f();
  }
}
