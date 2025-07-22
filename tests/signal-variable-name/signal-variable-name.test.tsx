/** biome-ignore-all lint/correctness/noUnusedVariables: <explanation> */
import { computed, signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
// biome-ignore lint/correctness/noUnusedImports: false positive
import React, { type JSX } from 'react';

// These should trigger ESLint warnings and be autofixed

// Incorrect: starts with 'use'
export function TestUsePrefix(): JSX.Element {
  useSignals();
  const useSomethingSignal = signal(0);
  const somethingSignal = signal(0); // Should be 'somethingSignal'
  const counterSignal = signal(10); // Should be 'counterSignal'
  const dataSignal = computed(() => useSomethingSignal.value * 2); // Should be 'dataSignal'

  return <div>{useSomethingSignal}</div>;
}

// Incorrect: doesn't end with 'Signal'
export function TestMissingSignalSuffix(): JSX.Element {
  useSignals();
  const CounterSignal = signal(0); // Should be 'counterSignal'
  const data = signal('hello'); // Should be 'dataSignal'
  const computed1 = computed(() => CounterSignal.value + 1); // Should be 'computed1Signal'
  const myValue = signal(true); // Should be 'myValueSignal'

  return <div>{CounterSignal}</div>;
}

// Incorrect: starts with uppercase
export function TestUppercaseStart(): JSX.Element {
  useSignals();
  const CounterSignal = signal(0); // Should be 'counterSignal'
  const dataSignal = signal('test'); // Should be 'dataSignal'
  const computedSignal = computed(() => CounterSignal.value * 2); // Should be 'computedSignal'

  return <div>{CounterSignal}</div>;
}

// Incorrect: combination of issues
export function TestMultipleIssues(): JSX.Element {
  useSignals();
  const UseSomething = signal(0); // Should be 'somethingSignal'
  const counter = signal(10); // Should be 'counterSignal'
  const data = signal('hello'); // Should be 'dataSignal'
  const computedValue = computed(() => UseSomething.value + 1); // Should be 'computedValueSignal'

  return <div>{UseSomething}</div>;
}

// These should NOT trigger warnings - correct naming

export function TestCorrectNaming(): JSX.Element {
  useSignals();
  const counterSignal = signal(0); // Correct
  const dataSignal = signal('hello'); // Correct
  const computedSignal = computed(() => counterSignal.value * 2); // Correct
  const isLoadingSignal = signal(false); // Correct
  const rDataSignal = signal(null); // Correct

  return <div>{counterSignal}</div>;
}

// Edge cases that should NOT trigger warnings

export function TestEdgeCases(): JSX.Element {
  useSignals();

  // Regular variables (not signals) - should not be affected
  const counter = 0;
  const data = 'hello';
  const useCallback = () => {};
  const UseSomething = 'test';

  // Signal variables with correct naming
  const validSignal = signal(0);
  const anotherValidSignal = computed(() => validSignal.value + 1);

  return <div>{validSignal}</div>;
}

// Test with destructuring (should not be affected)
export function TestDestructuring(): JSX.Element {
  useSignals();

  const obj = { signal: () => 0, computed: () => 1 };
  const { signal: mySignal, computed: myComputed } = obj;

  const validSignal = signal(0);

  return <div>{validSignal}</div>;
}

// Test with different signal imports
export function TestDifferentImports(): JSX.Element {
  useSignals();

  // These should trigger warnings
  const counter = signal(0); // Should be 'counterSignal'
  const data = computed(() => counter.value * 2); // Should be 'dataSignal'

  return <div>{counter}</div>;
}

// Test with nested scopes
export function TestNestedScopes(): JSX.Element {
  useSignals();

  const outerSignal = signal(0); // Correct

  function innerFunction() {
    const inner = signal(1); // Should be 'innerSignal'
    const useInner = signal(2); // Should be 'innerSignal'
    return inner.value + useInner.value;
  }

  return <div>{outerSignal}</div>;
}

// Test with arrow functions
export const TestArrowFunction = (): JSX.Element => {
  useSignals();

  const count = signal(0); // Should be 'countSignal'
  const data = signal('test'); // Should be 'dataSignal'
  const computedValue = computed(() => count.value + 1); // Should be 'computedValueSignal'

  return <div>{count}</div>;
};

// Test with const assertions and type annotations
export function TestTypeAnnotations(): JSX.Element {
  useSignals();

  const counter = signal(0); // Should be 'counterSignal'
  const data = signal<string>('hello'); // Should be 'dataSignal'
  const computed1 = computed<number>(() => counter.value * 2); // Should be 'computed1Signal'

  return <div>{counter}</div>;
}
