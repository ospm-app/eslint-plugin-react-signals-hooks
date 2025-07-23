/** biome-ignore-all lint/correctness/noUnusedVariables: not the target of the test */
import { signal, computed } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
// biome-ignore lint/correctness/noUnusedImports: false positive
import React, { Component, useCallback, useEffect, useMemo, type JSX } from 'react';

// These should trigger ESLint warnings for incorrect signal locations
export function TestSignalInComponent(): JSX.Element {
  useSignals();

  // Should warn: Signal created inside component
  const countSignal = signal(0);

  // Should warn: Computed signal created inside component
  const doubleCountSignal = computed(() => countSignal.value * 2);

  return (
    <div>
      <p>Count: {countSignal}</p>

      <p>Double: {doubleCountSignal}</p>
    </div>
  );
}

// This should not warn - signals created at module level
const globalSignal = signal('global');
const globalComputedSignal = computed((): string => {
  return globalSignal.value.toUpperCase();
});

export function TestGlobalSignal(): JSX.Element {
  useSignals();

  return (
    <div>
      {globalSignal} - {globalComputedSignal}
    </div>
  );
}

// Test with custom hooks
export function useCustomHook(): JSX.Element {
  // Should warn: Signal created in custom hook
  const localSignal = signal('hook');

  return localSignal;
}

// Test with function components
export const TestFunctionComponent = (): JSX.Element => {
  useSignals();

  // Should warn: Signal created in function component
  const localSignal = signal('function component');

  return <div>{localSignal}</div>;
};

// Test with class components
export class TestClassComponent extends Component {
  // Should warn: Signal created in class field
  countSignal = signal(0);

  // Should warn: Computed signal created in class field
  doubleCountSignal = computed((): number => {
    return this.countSignal.value * 2;
  });

  render() {
    useSignals();

    return (
      <div>
        <p>Count: {this.countSignal}</p>

        <p>Double: {this.doubleCountSignal}</p>
      </div>
    );
  }
}

// Test with nested functions
export function TestNestedFunctions(): JSX.Element {
  useSignals();

  const handleClick = useCallback(() => {
    // Should warn: Signal created in nested function
    const clickSignal = signal('clicked');

    console.info(clickSignal.value);
  }, []);

  return (
    <button type='button' onClick={handleClick}>
      Click me
    </button>
  );
}

// Test with useEffect
export function TestWithUseEffect(): JSX.Element {
  useSignals();

  useEffect(() => {
    // Should warn: Signal created in useEffect
    const effectSignal = signal('effect');
    console.info(effectSignal.value);

    return () => {
      // Should warn: Signal created in cleanup function
      const cleanupSignal = signal('cleanup');

      console.info(cleanupSignal.value);
    };
  }, []);

  return <div>Effect test</div>;
}

// Test with useCallback
export function TestWithUseCallback(): JSX.Element {
  useSignals();

  const memoizedCallback = useCallback(() => {
    // Should warn: Signal created in useCallback
    const callbackSignal = signal('callback');

    console.info(callbackSignal.value);
  }, []);

  return (
    <button type='button' onClick={memoizedCallback}>
      Callback test
    </button>
  );
}

// Test with useMemo
export function TestWithUseMemo(): JSX.Element {
  useSignals();

  const memoizedValue = useMemo(() => {
    // Should warn: Signal created in useMemo
    const memoSignal = signal('memo');

    return memoSignal.value;
  }, []);

  return <div>{memoizedValue}</div>;
}
