/** biome-ignore-all lint/correctness/useExhaustiveDependencies: off */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: off */
/** biome-ignore-all assist/source/organizeImports: off */
import { useEffect, useMemo, useCallback } from 'react';
import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';

const countSignal = signal(0);

type Data = { user?: { profile?: { name: string } } };

export function MixedReads({ data, factor }: { data: Data; factor: number }) {
  const store = useSignals(1);

  try {
    const name = useMemo(() => {
      // signal + non-signal combined
      return (data.user?.profile?.name ?? 'n/a') + countSignal.value * factor;
    }, [data.user?.profile?.name, countSignal.value, factor]);

    const onClick = useCallback(() => {
      console.info(name);
    }, [name]);

    useEffect(() => {
      console.info(name);
    }, [name]);

    return (
      <button type='button' onClick={onClick}>
        {name}
      </button>
    );
  } finally {
    store.f();
  }
}
