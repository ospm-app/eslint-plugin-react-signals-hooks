/** biome-ignore-all lint/correctness/useExhaustiveDependencies: not relevant for signals */
/** biome-ignore-all assist/source/organizeImports: off */
import { signal } from '@preact/signals-react';
import { useEffect, useMemo, type JSX } from 'react';

const piecePosMapSignal = signal({ test: {} });

// eslint-disable-next-line react-signals-hooks/require-use-signals
export function TestComponent(): JSX.Element | null {
  const id = 'test';

  const prevPosition = useMemo(() => [0, 1], []);

  const currentPosition = useMemo(() => [0, 1], []);

  useEffect(() => {
    if (!piecePosMapSignal.value[id]) {
      piecePosMapSignal.value[id] = [prevPosition[0], prevPosition[1]];
    }
    // should warn on extra prevPosition, and missing prevPosition[0] and prevPosition[1]
  }, [id, prevPosition, piecePosMapSignal.value[id]]);

  useEffect(() => {
    piecePosMapSignal.value[id] = [currentPosition[0], currentPosition[1]];
  }, [currentPosition, id, currentPosition[0], currentPosition[1]]);

  return null;
}
