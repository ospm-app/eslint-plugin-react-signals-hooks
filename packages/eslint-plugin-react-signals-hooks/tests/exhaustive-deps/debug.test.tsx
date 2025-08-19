/* eslint-disable react-signals-hooks/prefer-signal-methods */
/** biome-ignore-all lint/correctness/useExhaustiveDependencies: not relevant for signals */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: off */
/** biome-ignore-all assist/source/organizeImports: off */
import { signal } from '@preact/signals-react';
import { useEffect, useMemo, type JSX } from 'react';
import { useSignals } from '@preact/signals-react/runtime';

const piecePosMapSignal = signal({ test: {} });

type Props = {
  identity: number;
};

export function TestComponent({ identity }: Props): JSX.Element | null {
  const store = useSignals(1);

  try {
    const id = 'test';

    const prevPosition = useMemo<[number, number]>(() => [0, 1], []);

    const currentPosition = useMemo<[number, number]>(() => [0, 1], []);

    useEffect(() => {
      if (!piecePosMapSignal.value[id]) {
        piecePosMapSignal.value[id] = [prevPosition[0], prevPosition[1]];
      }
      // should warn on extra prevPosition, and missing prevPosition[0] and prevPosition[1]
    }, [prevPosition, piecePosMapSignal.value[id]]);

    useEffect(() => {
      piecePosMapSignal.value[id] = [currentPosition[0], currentPosition[1]];
    }, [currentPosition, currentPosition[0], currentPosition[1]]);

    useEffect(() => {
      console.info(identity);
      // should warn on missing identity
    }, []);

    return null;
  } finally {
    store.f();
  }
}
