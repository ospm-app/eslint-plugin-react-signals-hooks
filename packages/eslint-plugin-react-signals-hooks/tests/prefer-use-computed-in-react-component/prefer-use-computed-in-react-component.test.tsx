/* eslint-disable react-signals-hooks/restrict-signal-locations */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: off */
/* eslint-disable react-signals-hooks/prefer-use-signal-over-use-state */
import { signal, computed, useComputed } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { useMemo, useState, type JSX } from 'react';

// ❌ Should be flagged by prefer-use-computed-in-react-component (computed inside component)
export function TestComputedInsideComponent(): JSX.Element {
  const store = useSignals(1);

  try {
    const count = signal(1);

    const doubled = computed(() => count.value * 2);

    return <div>{doubled}</div>;
  } finally {
    store.f();
  }
}

// ❌ Arrow function component using computed inside component
export const TestComputedInArrowComponent = (): JSX.Element => {
  const store = useSignals(1);

  try {
    const items = signal([1, 2, 3]);

    const total = computed(() => items.value.reduce((a, b) => a + b, 0));
    return <span>{total}</span>;
  } finally {
    store.f();
  }
};

// ✅ useComputed inside component (recommended)
export function TestUseComputedInsideComponent(): JSX.Element {
  const store = useSignals(1);

  try {
    const price = signal(100);
    const discount = signal(0.1);

    const finalPrice = useComputed(() => price.value * (1 - discount.value));

    return <div>{finalPrice.value.toFixed(2)}</div>;
  } finally {
    store.f();
  }
}

// ✅ computed at module scope is allowed
const globalCount = signal(0);
const globalDoubled = computed(() => globalCount.value * 2);
export function TestGlobalComputedUsage(): JSX.Element {
  const store = useSignals(1);

  try {
    return <div>{globalDoubled}</div>;
  } finally {
    store.f();
  }
}

// ℹ️ Also recommend useComputed over useMemo when deriving from signals (covered by prefer-computed)
export function TestUseMemoWithSignalsShouldPreferUseComputed(): JSX.Element {
  const store = useSignals(1);

  try {
    const a = signal(2);
    const b = signal(3);

    // This should be flagged by prefer-computed (not by this rule)
    const result = useMemo(() => a.value * b.value, [a.value, b.value]);

    return <div>{result}</div>;
  } finally {
    store.f();
  }
}

// ✅ No signals
export function TestNoSignals(): JSX.Element {
  const [n] = useState(1);
  return <div>{n}</div>;
}
