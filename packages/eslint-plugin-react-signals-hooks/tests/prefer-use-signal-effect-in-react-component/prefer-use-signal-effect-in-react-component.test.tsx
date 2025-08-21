/* eslint-disable react-signals-hooks/prefer-signal-methods */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable react-signals-hooks/prefer-use-signal-over-use-state */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: off */
/** biome-ignore-all lint/correctness/useExhaustiveDependencies: off */
import { effect, signal, useSignalEffect } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { type JSX, useEffect, useState } from 'react';

// ❌ Should be flagged by prefer-use-signal-effect-in-react-component (effect inside component)
export function TestEffectInsideComponent(): JSX.Element {
  const store = useSignals(1);

  try {
    const a = signal(0);
    const b = signal('x');

    effect(() => {
      console.info(a.value, b.value);
    });

    return (
      <div>
        <p>{a}</p>
        <p>{b}</p>
      </div>
    );
  } finally {
    store.f();
  }
}

// ❌ Arrow function component using effect inside component
export const TestEffectInArrowComponent = (): JSX.Element => {
  const store = useSignals(1);

  try {
    const enabled = signal(true);

    effect(() => {
      if (enabled.value) console.info('enabled');
    });

    return <span>{enabled ? 'yes' : 'no'}</span>;
  } finally {
    store.f();
  }
};

// ✅ useSignalEffect inside component (recommended)
export function TestUseSignalEffectInsideComponent(): JSX.Element {
  const store = useSignals(1);

  try {
    const count = signal(1);
    useSignalEffect(() => {
      console.info('count', count.value);
    });
    return <div>{count}</div>;
  } finally {
    store.f();
  }
}

// ✅ effect at module scope is allowed
const outside = signal(0);

effect(() => {
  // allowed at module scope
  void outside.value;
});

export function TestGlobalEffectUsage(): JSX.Element {
  const store = useSignals(1);

  try {
    return <div>{outside}</div>;
  } finally {
    store.f();
  }
}

// ℹ️ Also recommend useSignalEffect over useEffect when depending on signals (covered by prefer-signal-effect)
export function TestUseEffectWithSignalsShouldPreferUseSignalEffect(): JSX.Element {
  const store = useSignals(1);

  try {
    const s = signal('hello');

    useEffect(() => {
      console.info(s.value);
    }, [s.value]);

    return <div>{s}</div>;
  } finally {
    store.f();
  }
}

// ✅ No signals
export function TestNoSignals(): JSX.Element {
  const [n] = useState(1);

  useEffect(() => {
    console.info(n);
  }, [n]);

  return <div>{n}</div>;
}
