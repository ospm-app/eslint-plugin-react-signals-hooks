/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <explanation> */
import { useSignals } from '@preact/signals-react/runtime';
import { signal, batch } from '@preact/signals-react';
import { useCallback } from 'react';
import type { JSX } from 'react';

const countSignal = signal(0);

// Expect: warn nonUpdateSignalInBatch (read-only inside batch block)
export function ReadInBatchBlock(): JSX.Element {
  useSignals();

  const onClick = useCallback(() => {
    batch(() => {
      console.info(countSignal.value);
    });
  }, []);

  return (
    <button type='button' onClick={onClick}>
      Click
    </button>
  );
}

// Expect: warn nonUpdateSignalInBatch (concise arrow body)
export function ReadInBatchConcise(): JSX.Element {
  useSignals();

  const onClick = useCallback(() => {
    batch(() => console.info(countSignal.value));
  }, []);

  return (
    <button type='button' onClick={onClick}>
      Click
    </button>
  );
}

// Expect: warn nonUpdateSignalInBatch (function expression body)
export function ReadInBatchFunctionExpr(): JSX.Element {
  useSignals();

  const onClick = useCallback(() => {
    batch(function a() {
      console.info(countSignal.value);
    });
  }, []);

  return (
    <button type='button' onClick={onClick}>
      Click
    </button>
  );
}

// Expect: warn for the read expression; warn on single update expression
export function ReadAndUpdateInBatch(): JSX.Element {
  useSignals();

  const onClick = useCallback(() => {
    console.info(countSignal.value);
countSignal.value = 2;
  }, []);

  return (
    <button type='button' onClick={onClick}>
      Click
    </button>
  );
}
