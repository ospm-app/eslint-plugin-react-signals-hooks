import { Signal } from '@preact/signals-react';
import { signal, computed } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
// biome-ignore lint/correctness/noUnusedImports: false positive
import React, { useState, useEffect, useCallback, type JSX } from 'react';

// This component should trigger a warning - creating signal in component body
export function TestSignalInComponentBody(): JSX.Element {
  useSignals();

  const countSignal = signal(0); // Should warn - signal created in component body

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onClick = useCallback(() => {
    countSignal.value++;
  }, []);

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
    // eslint-disable-next-line react-signals-hooks/exhaustive-deps
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onClick = useCallback(() => {
    countSignal.value++;
  }, []);

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onClick = useCallback(() => {
    countSignal.value++;
  }, []);

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
  const countSignal = signal(0);

  return countSignal;
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
  useSignals();

  const counter = new CounterClass();

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onClick = useCallback(() => {
    counter.increment();
  }, []);

  return (
    <div>
      <div>Count: {counter.getCount()}</div>

      <button type='button' onClick={onClick}>
        Increment
      </button>
    </div>
  );
}

// This component should NOT trigger warning - signal created in module scope
const moduleSignal = signal('module scope');

export function TestModuleScopeSignal(): JSX.Element {
  useSignals();

  return <div>{moduleSignal}</div>;
}
