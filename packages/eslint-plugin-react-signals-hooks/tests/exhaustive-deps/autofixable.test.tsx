/* eslint-disable react-signals-hooks/prefer-use-signal-over-use-state */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: off */
/** biome-ignore-all lint/correctness/useExhaustiveDependencies: off */
/** biome-ignore-all assist/source/organizeImports: off */
import { useSignals } from '@preact/signals-react/runtime';
import { useCallback, useMemo, useEffect, useState } from 'react';
import type { JSX } from 'react';
import { Pressable } from 'react-native';

type Props = {
  id: string;
};

// Test file to demonstrate autofixable error indicators
export function TestAutofixableComponent({ id }: Props): JSX.Element {
  const store = useSignals(1);

  try {
    const [count, setCount] = useState(0);
    const name = 'test';
    const rand = Math.random();

    // This should trigger a missing dependency error with suggestions
    const memoizedValue = useMemo(() => {
      return count * 2 + name.length;
    }, []); // Missing dependencies: count

    // This should trigger a missing dependency error with suggestions
    const callback = useCallback(() => {
      console.info(count, rand);

      setCount(count + 1);
    }, []); // Missing dependencies: count

    useEffect(() => {
      console.info(count, id);
      // This should trigger a missing dependency error with suggestions
    }, []); // Missing dependencies: count, id

    return <Pressable onPress={callback}>{memoizedValue}</Pressable>;
  } finally {
    store.f();
  }
}
