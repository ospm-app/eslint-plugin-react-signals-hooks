/* eslint-disable react-signals-hooks/prefer-computed */
/* eslint-disable react-signals-hooks/prefer-signal-methods */
/* eslint-disable react-signals-hooks/prefer-batch-updates */

import { effect, signal } from '@preact/signals-core';
import { useSignals } from '@preact/signals-react/runtime';
import { type JSX, useCallback, useEffect, useMemo } from 'react';
import { Pressable } from 'react-native';

const counterSignal = signal(0);
const nameSignal = signal('test');

// Test cases for signal assignments without reads

// Case 1: useEffect with only assignment - should NOT need dependency
export function TestAssignmentOnly(): JSX.Element | null {
  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  useEffect(() => {
    // Only assignment, no read - dependency should be unnecessary
    counterSignal.value = 0;
    nameSignal.value = 'reset';
    // counterSignal.value and nameSignal.value should be flagged as unnecessary
  }, [counterSignal.value, nameSignal.value]);

  return null;
}

// Case 2: useEffect with assignment AND read - dependency IS needed
export function TestAssignmentAndRead(): JSX.Element | null {
  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  useEffect(() => {
    // Both assignment and read - dependency is needed
    const currentValue = counterSignal.value; // READ
    counterSignal.value = currentValue + 1; // ASSIGNMENT
  }, [counterSignal.value]); // This should be required

  return null;
}

// Case 3: useEffect with only read - dependency IS needed
export function TestReadOnly(): JSX.Element | null {
  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  useEffect(() => {
    // Only read, no assignment - dependency is needed
    console.info(counterSignal.value);
  }, [counterSignal.value]); // This should be required

  return null;
}

// Case 4: useCallback with only assignment - should NOT need dependency
export function TestCallbackAssignmentOnly(): JSX.Element | null {
  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const handleReset = useCallback(() => {
    // Only assignment, no read - dependency should be unnecessary
    counterSignal.value = 0;
  }, [counterSignal.value]); // This should be flagged as unnecessary

  return <Pressable onPress={handleReset}>Reset</Pressable>;
}

// Case 5: useMemo with only assignment - should NOT need dependency
export function TestMemoAssignmentOnly(): JSX.Element | null {
  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const resetAction = useMemo(() => {
    return () => {
      // Only assignment, no read - dependency should be unnecessary
      counterSignal.value = 0;
    };
  }, [counterSignal.value]); // This should be flagged as unnecessary

  return <Pressable onPress={resetAction}>Reset</Pressable>;
}

// Case 6: Complex case - assignment to one signal, read from another
export function TestMixedSignals(): JSX.Element | null {
  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  useEffect(() => {
    // Assignment to counterSignal, read from nameSignal
    counterSignal.value = 0; // ASSIGNMENT - no dependency needed
    console.info(nameSignal.value); // READ - dependency needed
  }, [counterSignal.value, nameSignal.value]); // counterSignal.value should be unnecessary, nameSignal.value should be required

  return null;
}

// Case 7: Assignment in conditional - still no dependency needed
export function TestConditionalAssignment(): JSX.Element | null {
  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  useEffect(() => {
    if (Math.random() > 0.5) {
      counterSignal.value = 42; // ASSIGNMENT - no dependency needed
    }
  }, [counterSignal.value]); // This should be flagged as unnecessary

  return null;
}

// Case 8: Assignment in callback within hook - still no dependency needed
export function TestAssignmentInCallback(): JSX.Element | null {
  const store = useSignals(1);

  try {
    effect(() => {
      const timer = setTimeout(() => {
        counterSignal.value = 100; // ASSIGNMENT - no dependency needed
      }, 1000);

      return () => clearTimeout(timer);
    }); // This should be flagged as unnecessary

    return null;
  } finally {
    store.f();
  }
}
