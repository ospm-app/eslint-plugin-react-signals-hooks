import { signal } from '@preact/signals-react';
import { useEffect } from 'react';
import type { JSX } from 'react';

// Expect: error then autofix to effect(); also import { effect } augmentation from '@preact/signals-react'
export function OnlySignalDeps(): JSX.Element {
  const countSignal = signal(0);
  useEffect(() => {
    console.info(countSignal.value);
  }, [countSignal.value]);
  return <div>{countSignal}</div>;
}
