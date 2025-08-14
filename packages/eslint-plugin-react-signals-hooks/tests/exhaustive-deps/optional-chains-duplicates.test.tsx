/** biome-ignore-all lint/correctness/useExhaustiveDependencies: off */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: off */
import { useEffect, useMemo, type JSX } from 'react';
import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';

const objSignal = signal<{ a?: { b?: number } } | null>(null);

export function OptionalChainReads(): JSX.Element | null {
  const v = useMemo(() => {
    return objSignal.value?.a?.b ?? 0;
  }, [
    objSignal.value?.a?.b, // ensure optional chain projection tracked
  ]);

  useEffect(() => {
    console.info(v);
  }, [v]);

  return null;
}

export function DuplicatePathsWithAndWithoutOptional(): JSX.Element | null {
  const store = useSignals(1);

  try {
    useEffect(() => {
      const x1 = objSignal.value?.a?.b;
      // @ts-expect-error
      const x2 = objSignal.value.a?.b; // same base path, different optional placements
      console.info(x1, x2);
      // @ts-expect-error
    }, [objSignal.value?.a?.b, objSignal.value.a?.b]);

    return null;
  } finally {
    store.f();
  }
}
