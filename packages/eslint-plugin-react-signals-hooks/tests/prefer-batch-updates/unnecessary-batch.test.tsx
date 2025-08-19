/** biome-ignore-all lint/correctness/useExhaustiveDependencies: off */
import { useSignals } from '@preact/signals-react/runtime';
import { signal, batch } from '@preact/signals-react';
import { useCallback } from 'react';
import type { JSX } from 'react';

const countSignal = signal(0);

// Expect: warn removeUnnecessaryBatch and autofix to remove batch wrapper
export function UnnecessaryBatch(): JSX.Element {
  useSignals();

  const onClick = useCallback(() => {
    console.info(countSignal.value);
countSignal.value = 1;
  }, []);

  return (
    <button type='button' onClick={onClick}>
      Click
    </button>
  );
}
