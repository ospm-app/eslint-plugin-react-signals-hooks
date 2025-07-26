import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { useEffect, useState, type JSX } from 'react';

// This component should trigger an ESLint warning for missing signal dependency
export function TestMissingSignalDep(): JSX.Element {
  // Component-scoped signal
  const counterSignal = signal(0);
  const [_count, setCount] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  useEffect(() => {
    // This should be flagged as a missing dependency
    console.info('Counter value:', counterSignal.value);

    if (counterSignal.value > 5) {
      setCount(counterSignal.value);
    }
  }, [setCount]); // Missing counterSignal,value dependency

  return <div>{counterSignal}</div>;
}

// This component should NOT trigger an ESLint warning
export function TestCorrectSignalDep() {
  // Component-scoped signal
  const valueSignal = signal(0);

  // This effect correctly lists valueSignal.value as a dependency
  useEffect(() => {
    console.info('Value:', valueSignal.value);
  }, [valueSignal.value]); // Correctly includes the signal

  return <div>{valueSignal}</div>;
}

// This component should trigger an ESLint warning for missing signal value access
export function TestMissingSignalValueDep() {
  // Component-scoped signal
  useSignals();

  const nameSignal = signal('test');

  // This effect uses nameSignal.value but doesn't list it as a dependency
  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  useEffect(() => {
    const name = nameSignal.value;
    console.info('Name:', name);
  }, []); // Empty dependency array - should flag nameSignal.value as missing

  return <div>{nameSignal}</div>;
}
