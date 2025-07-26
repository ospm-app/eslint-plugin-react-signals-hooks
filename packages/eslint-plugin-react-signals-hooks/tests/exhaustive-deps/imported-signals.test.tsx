import { useCallback, useEffect, type JSX } from 'react';
import { counterSignal, nameSignal } from './signals';
import { useSignals } from '@preact/signals-react/runtime';

// This component should trigger an ESLint warning for missing imported signal dependency
export function TestMissingImportedSignalDep(): JSX.Element | null {
  // This effect uses imported counterSignal.value but doesn't list it as a dependency
  useEffect(() => {
    // Access the signal value directly to make it a dependency
    const count = counterSignal.value;

    console.info('Counter value:', count);

    // Use the signal directly in a condition to ensure it's detected
    if (count > 5) {
      // Do something with the signal value
      nameSignal.value = `Count is high: ${count}`;
    }
  }, []); // Empty dependency array - should flag counterSignal as missing

  // This callback also uses the signal but doesn't list it
  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const handleClick = useCallback(() => {
    console.info('Current counter:', counterSignal.value);
  }, [counterSignal]); // Should flag counterSignal unnecessary and counterSignal.value as missing

  return (
    <button type='button' onClick={handleClick}>
      {counterSignal}
    </button>
  );
}

// This component should NOT trigger an ESLint warning
export function TestCorrectImportedSignalDep(): JSX.Element | null {
  // This effect correctly lists imported counterSignal as a dependency
  useSignals();

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  useEffect(() => {
    console.info('Value:', counterSignal.value);
  }, [counterSignal.value]); // Correctly includes the imported signal

  return <div>{counterSignal}</div>;
}
