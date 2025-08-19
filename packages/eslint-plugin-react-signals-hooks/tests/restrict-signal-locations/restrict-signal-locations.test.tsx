/* eslint-disable import/order */
/** biome-ignore-all lint/correctness/noUnusedVariables: not the target of the test */
/** biome-ignore-all assist/source/organizeImports: off */
/** biome-ignore-all lint/suspicious/noRedeclare: not relevant */
import { signal, computed } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { Component, useCallback, useEffect, useMemo, type JSX } from 'react';

// ====================================
// Module Level Signals (Allowed)
// ====================================
const globalSignal = signal('global');
const globalComputedSignal = computed((): string => {
  return globalSignal.value.toUpperCase();
});

// ====================================
// Exported Module Level Signals (Should Warn)
// ====================================
//Should warn: Exporting signals from a file often leads to circular imports and breaks the build with hard to debug. use @biomejs/biome for circular imports diagnostic.
export const global2Signal = signal('global');
//Should warn: Exporting signals from a file often leads to circular imports and breaks the build with hard to debug. use @biomejs/biome for circular imports diagnostic.
export const global2ComputedSignal = computed((): string => {
  return global2Signal.value.toUpperCase();
});

// ====================================
// Component with Signal (Should Warn)
// ====================================
export function ComponentWithSignal(): JSX.Element {
  useSignals();

  // Should warn: Signal created inside component
  const countSignal = signal(0);

  // Should warn: Computed signal created inside component
  const doubleCount = computed(() => countSignal.value * 2);

  // Should warn: Computed in component body
  const memoizedValue = useMemo(() => {
    return computed(() => countSignal.value * 3);
  }, [countSignal.value]);

  return (
    <div>
      <p>Count: {countSignal}</p>
      <p>Double: {doubleCount}</p>
      <p>Triple: {memoizedValue}</p>
    </div>
  );
}

// ====================================
// Component with Module Level Signal (Allowed)
// ====================================
export function ComponentWithModuleSignal(): JSX.Element {
  useSignals();
  return (
    <div>
      {globalSignal} - {globalComputedSignal}
    </div>
  );
}

// ====================================
// Custom Hook (Allowed by default)
// ====================================
export function useCounter(initialValue = 0) {
  // Should be allowed - signal in custom hook
  const count = signal(initialValue);
  const increment = () => count.value++;
  return { count, increment };
}

// ====================================
// Component with Allowed Directory (Configuration Test)
// ====================================
// This would be in a file under an allowed directory
// and would be tested with a custom config
export function ComponentInAllowedDir(): JSX.Element {
  // This would be allowed if the file is in an allowed directory
  const allowedSignal = signal('allowed');
  return <div>{allowedSignal}</div>;
}

// ====================================
// Component with Allowed Computed (Configuration Test)
// ====================================
// This would be tested with allowComputedInComponents: true
export function ComponentWithAllowedComputed(): JSX.Element {
  const countSignal = signal(0);
  // This would be allowed with allowComputedInComponents: true
  const doubleCount = computed(() => countSignal.value * 2);

  return (
    <div>
      <p>Count: {countSignal}</p>
      <p>Double: {doubleCount}</p>
    </div>
  );
}

// ====================================
// Component with Custom Hook Pattern (Configuration Test)
// ====================================
// This would be tested with customHookPattern: '^use[A-Z]'
// to ensure custom hooks are properly identified
export function useCustomPatternHook() {
  const customSignal = signal('custom');
  return customSignal;
}

// ====================================
// Function Component with Custom Hook (Allowed)
// ====================================
export const CounterComponent = (): JSX.Element => {
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

// ====================================
// Aliased and Namespace Imports (Should Warn inside components)
// ====================================
import { signal as sig, computed as cmp } from '@preact/signals-react';
import * as S from '@preact/signals-react';

export function ComponentWithAliasedImports(): JSX.Element {
  useSignals();
  // Should warn: aliased signal/computed inside component
  const a = sig(1);
  const b = cmp(() => a.value + 1);
  return (
    <div>
      {a} {b}
    </div>
  );
}

export function ComponentWithNamespaceImports(): JSX.Element {
  useSignals();
  // Should warn: namespaced signal/computed inside component
  const a = S.signal(1);
  const b = S.computed(() => a.value + 1);
  return (
    <div>
      {a} {b}
    </div>
  );
}

// ====================================
// Exported Signals (Should Warn)
// ====================================
const exportedVarSignal = signal('exported');
export { exportedVarSignal }; // Should warn: named export of signal variable

const exportedDefaultSignal = signal('defaultExported');
export default exportedDefaultSignal; // Should warn: default export of signal identifier

// (Avoid duplicate default exports in this test file)

// ====================================
// memo/forwardRef wrapped components (Should be treated as components)
// ====================================
import { memo, forwardRef } from 'react';

export const MemoWrapped = memo((): JSX.Element => {
  const m = signal(0); // Should warn
  return <div>{m}</div>;
});

export const ForwardRefWrapped = forwardRef(function Fwd(): JSX.Element {
  const f = signal(0); // Should warn
  return <div>{f}</div>;
});
