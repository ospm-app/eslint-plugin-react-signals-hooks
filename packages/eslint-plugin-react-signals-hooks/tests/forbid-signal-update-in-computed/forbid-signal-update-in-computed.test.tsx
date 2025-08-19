/* eslint-disable react-signals-hooks/restrict-signal-locations */
/* eslint-disable react-signals-hooks/signal-variable-name */
import { signal, computed, batch } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import type { JSX } from 'react';

// =============================
// Incorrect: Direct .value write inside computed
// =============================
export function DirectValueWriteInComputed(): JSX.Element {
  useSignals();

  const countSignal = signal(0);

  const doubled = computed(() => {
    countSignal.value++; // ❌ write inside computed
    return countSignal.value * 2;
  });

  return <div>{doubled}</div>;
}

// =============================
// Incorrect: set/update methods inside computed
// =============================
export function MethodUpdatesInComputed(): JSX.Element {
  useSignals();

  const countSignal = signal(0);

  const result = computed(() => {
    // @ts-expect-error signal update inside computed
    countSignal.set(1); // ❌
    // @ts-expect-error signal update inside computed
    countSignal.update((v) => v + 1); // ❌
    return countSignal.value;
  });

  return <div>{result}</div>;
}

// =============================
// Incorrect: Indirect write via alias inside computed
// =============================
export function AliasWriteInComputed(): JSX.Element {
  useSignals();

  const countSignal = signal(0);

  const result = computed(() => {
    const s = countSignal;
    s.value += 1; // ❌
    return s.value;
  });

  return <div>{result}</div>;
}

// =============================
// Incorrect: Nested scope write inside computed
// =============================
export function NestedWriteInComputed(): JSX.Element {
  const store = useSignals(1);

  try {
    const countSignal = signal(0);

    const result = computed(() => {
      function bump() {
        countSignal.value++; // ❌
      }
      bump();
      return countSignal.value;
    });

    return <div>{result}</div>;
  } finally {
    store.f();
  }
}

// =============================
// Incorrect: Batched writes inside computed
// =============================
export function BatchedWritesInComputed(): JSX.Element {
  const store = useSignals(1);

  try {
    const a = signal(0);
    const b = signal(0);

    const total = computed(() => {
      batch(() => {
        a.value = 1; // ❌
        b.value = 2; // ❌
      });
      return a.value + b.value;
    });

    return <div>{total}</div>;
  } finally {
    store.f();
  }
}

// =============================
// Incorrect: Update derived from function call in computed
// =============================
function getCounter() {
  return signal(0);
}

export function CallResultUpdateInComputed(): JSX.Element {
  useSignals();

  const result = computed(() => {
    getCounter().value++; // ❌
    return 1;
  });

  return <div>{result}</div>;
}

// =============================
// Correct: Pure read-only computed
// =============================
export function PureComputedOk(): JSX.Element {
  useSignals();

  const countSignal = signal(0);

  const doubled = computed(() => countSignal.value * 2); // ✅ read-only

  return <div>{doubled}</div>;
}

// =============================
// Correct: Writes outside computed
// =============================
export function WritesOutsideComputedOk(): JSX.Element {
  useSignals();

  const countSignal = signal(0);
  countSignal.value++;

  const value = computed(() => countSignal.value); // ✅ read-only

  return <div>{value}</div>;
}

// =============================
// Allowed per spec: creating a new signal inside computed (no external writes)
// =============================
export function CreateSignalInsideComputedOk(): JSX.Element {
  useSignals();

  const value = computed(() => {
    const tmp = signal(0); // allowed by spec (not an external write)
    return tmp.value;
  });

  return <div>{value}</div>;
}
