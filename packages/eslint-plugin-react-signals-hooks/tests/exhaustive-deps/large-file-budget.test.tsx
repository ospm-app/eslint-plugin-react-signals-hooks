/** biome-ignore-all lint/correctness/useExhaustiveDependencies: off */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: off */
/** biome-ignore-all assist/source/organizeImports: off */
import { useEffect, useMemo, useCallback } from 'react';
import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';

const s1 = signal(0);
const s2 = signal('x');

// This file intentionally has many hooks to exercise performance budgets.
export function BigComponent({ n }: { n: number }) {
  const store = useSignals(1);
  try {
    const base = useMemo(() => s1.value + n, [s1.value, n]);
    const text = useMemo(() => `${s2.value}-${base}`, [s2.value, base]);

    // A bunch of effects and callbacks
    const cb0 = useCallback(() => console.info(text, 0), [text]);
    const cb1 = useCallback(() => console.info(text, 1), [text]);
    const cb2 = useCallback(() => console.info(text, 2), [text]);
    const cb3 = useCallback(() => console.info(text, 3), [text]);
    const cb4 = useCallback(() => console.info(text, 4), [text]);
    const cb5 = useCallback(() => console.info(text, 5), [text]);
    const cb6 = useCallback(() => console.info(text, 6), [text]);
    const cb7 = useCallback(() => console.info(text, 7), [text]);
    const cb8 = useCallback(() => console.info(text, 8), [text]);
    const cb9 = useCallback(() => console.info(text, 9), [text]);

    useEffect(() => { console.info(base, text); }, [base, text]);
    useEffect(() => { console.info(cb0()); }, [cb0]);
    useEffect(() => { console.info(cb1()); }, [cb1]);
    useEffect(() => { console.info(cb2()); }, [cb2]);
    useEffect(() => { console.info(cb3()); }, [cb3]);
    useEffect(() => { console.info(cb4()); }, [cb4]);
    useEffect(() => { console.info(cb5()); }, [cb5]);
    useEffect(() => { console.info(cb6()); }, [cb6]);
    useEffect(() => { console.info(cb7()); }, [cb7]);
    useEffect(() => { console.info(cb8()); }, [cb8]);
    useEffect(() => { console.info(cb9()); }, [cb9]);

    // Multi-line arrays with comments and trailing commas repeated
    useEffect(() => {
      console.info(s1.value, s2.value);
    }, [
      s1.value, // first
      s2.value, // second
    ]);

    useEffect(() => {
      console.info(s1.value + 1);
    }, [
      s1.value, // dep
    ]);

    return <div>{text}</div>;
  } finally {
    store.f();
  }
}
