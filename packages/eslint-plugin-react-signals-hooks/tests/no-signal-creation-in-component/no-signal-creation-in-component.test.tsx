/* eslint-disable react-signals-hooks/no-non-signal-with-signal-suffix */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: <explanation> */
/* eslint-disable react-signals-hooks/prefer-use-signal-over-use-state */
/** biome-ignore-all lint/correctness/useExhaustiveDependencies: off */
import type { Signal } from '@preact/signals-react';
import { signal, computed } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { useState, useEffect, useCallback, type JSX } from 'react';

// This component should trigger a warning - creating signal in component body
export function TestSignalInComponentBody(): JSX.Element {
  useSignals();

  const countSignal = signal(0); // Should warn - signal created in component body

  const onClick = useCallback(() => {
    countSignal.value++;
  }, [countSignal.value]);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <button type='button' onClick={onClick}>
        Increment
      </button>
    </div>
  );
}

// This component should NOT trigger warning - using useState instead of signal
export function TestUseStateInsteadOfSignal(): JSX.Element {
  useSignals();

  const [count, setCount] = useState(0);

  const onClick = useCallback(() => {
    setCount((c) => c + 1);
  }, []);

  return (
    <div>
      <div>Count: {count}</div>

      <button type='button' onClick={onClick}>
        Increment
      </button>
    </div>
  );
}

// This component should trigger a warning - creating signal in useEffect
export function TestSignalInUseEffect(): JSX.Element {
  useSignals();

  const [count, _setCount] = useState(0);

  useEffect(() => {
    const timerSignal = signal(0); // Should warn - signal created in effect

    const interval = globalThis.setInterval(() => {
      timerSignal.value += 1;
    }, 1000);

    return () => {
      globalThis.clearInterval(interval);
    };
    // eslint-disable-next-line react-signals-hooks/exhaustive-deps
  }, []);

  return <div>Timer: {count}</div>;
}

// This component should trigger a warning - creating signal in useCallback
export function TestSignalInUseCallback(): JSX.Element {
  useSignals();

  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    const clickSignal = signal(0); // Should warn - signal created in callback

    clickSignal.value += 1;

    setCount(clickSignal.value);
  }, []);

  return (
    <button type='button' onClick={handleClick}>
      Clicked {count} times
    </button>
  );
}

// This component should NOT trigger warning - using signal from props
export function TestSignalFromProps({ countSignal }: { countSignal: Signal<number> }): JSX.Element {
  useSignals();

  const onClick = useCallback(() => {
    countSignal.value++;
  }, [countSignal.value]);

  return (
    <div>
      <div>Count from props: {countSignal}</div>

      <button type='button' onClick={onClick}>
        Increment
      </button>
    </div>
  );
}

// This component should trigger a warning - creating computed in component body
export function TestComputedInComponentBody(): JSX.Element {
  useSignals();

  const firstName = 'John';
  const lastName = 'Doe';

  const fullNameSignal = computed(() => {
    return `${firstName} ${lastName}`;
  }); // Should warn - computed in component body

  return <div>Hello, {fullNameSignal}</div>;
}

// This component should NOT trigger warning - using hook that returns a signal
export function TestCustomHookWithSignal(): JSX.Element {
  useSignals();

  const countSignal = useCounterSignal();

  const onClick = useCallback(() => {
    countSignal.value++;
  }, [countSignal.value]);

  return (
    <div>
      <div>Count from hook: {countSignal}</div>

      <button type='button' onClick={onClick}>
        Increment
      </button>
    </div>
  );
}

// Custom hook that creates and returns a signal
function useCounterSignal(): Signal<number> {
  const store = useSignals(2);

  try {
    const countSignal = signal(0);

    return countSignal;
  } finally {
    store.f();
  }
}

// This component should NOT trigger warning - signal created outside component
const globalSignal = signal('I am global');

export function TestGlobalSignal(): JSX.Element {
  useSignals();

  return <div>{globalSignal}</div>;
}

// This component should trigger a warning - signal created in a nested function
export function TestSignalInNestedFunction(): JSX.Element {
  useSignals();

  function createCounter(): { increment: () => number; getCount: () => number } {
    const counterSignal = signal(0); // Should warn - signal created in nested function

    return {
      increment: () => {
        return counterSignal.value++;
      },
      getCount: () => {
        return counterSignal.value;
      },
    };
  }

  const counter = createCounter();

  return (
    <div>
      <div>Count: {counter.getCount()}</div>

      <button type='button' onClick={counter.increment}>
        Increment
      </button>
    </div>
  );
}

// This component should trigger a warning - signal created in a class method
class CounterClass {
  countSignal = signal(0); // Should warn - signal created in class field

  increment(): void {
    this.countSignal.value++;
  }

  getCount(): number {
    return this.countSignal.value;
  }
}

export function TestSignalInClassMethod(): JSX.Element {
  const store = useSignals(1);

  try {
    const counter = new CounterClass();

    const onClick = useCallback(() => {
      counter.increment();
    }, [counter]);

    return (
      <div>
        <div>Count: {counter.getCount()}</div>

        <button type='button' onClick={onClick}>
          Increment
        </button>
      </div>
    );
  } finally {
    store.f();
  }
}

// This component should NOT trigger warning - signal created in module scope
const moduleSignal = signal('module scope');

export function TestModuleScopeSignal(): JSX.Element {
  const store = useSignals(1);

  try {
    return <div>{moduleSignal}</div>;
  } finally {
    store.f();
  }
}

// Test component for custom signal names
export function TestCustomSignalNames(): JSX.Element {
  const store = useSignals(1);

  try {
    // These should be ignored because we'll configure custom signal names
    const customSignal1 = signal(0);
    const customSignal2 = signal('test');

    return (
      <div>
        <div>Signal 1: {customSignal1}</div>
        <div>Signal 2: {customSignal2}</div>
      </div>
    );
  } finally {
    store.f();
  }
}

// Test component for custom severity levels
export function TestCustomSeverity(): JSX.Element {
  const store = useSignals(1);

  try {
    // These should have different severity levels configured
    const warningSignal = signal(0); // Should be 'warn'
    const errorSignal = signal('test'); // Should be 'error'

    return (
      <div>
        <div>Warning: {warningSignal}</div>
        <div>Error: {errorSignal}</div>
      </div>
    );
  } finally {
    store.f();
  }
}

// Test configuration for custom options
export const customOptionsConfig = {
  rules: {
    'react-signals-hooks/no-signal-creation-in-component': [
      'error',
      {
        signalNames: ['customSignal1', 'customSignal2'],
        severity: {
          warning: 'warn',
          error: 'error',
        },
      },
    ],
  },
};

// Test component for file/pattern-based disabling
export function TestFilePatternDisable(): JSX.Element {
  const store = useSignals(1);

  try {
    // This would be ignored in test files
    const testSignal = signal(0);

    return <div>{testSignal}</div>;
  } finally {
    store.f();
  }
}

export const filePatternConfig = {
  rules: {
    'react-signals-hooks/no-signal-creation-in-component': [
      'error',
      {
        disableInTestFiles: true,
      },
    ],
  },
};

// Test component for allowed patterns
export function TestAllowedPatterns(): JSX.Element {
  const store = useSignals(1);

  try {
    // This should be ignored because of allowed patterns
    const allowedSignal = signal(0);

    return <div>{allowedSignal}</div>;
  } finally {
    store.f();
  }
}

export const allowedPatternsConfig = {
  rules: {
    'react-signals-hooks/no-signal-creation-in-component': [
      'error',
      {
        allowedPatterns: ['.*/tests/.*'],
      },
    ],
  },
};
