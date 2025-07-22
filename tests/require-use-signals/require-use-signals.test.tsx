import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
// biome-ignore lint/correctness/noUnusedImports: false positive
import React, { type JSX } from 'react';

// This component should trigger an ESLint warning for missing useSignals()
export function TestMissingUseSignals(): JSX.Element {
  const counterSignal = signal(0);

  // Uses signal.value but missing useSignals() hook
  return <div>{counterSignal}</div>;
}

// This component should trigger an ESLint warning for missing useSignals() with direct signal usage
export function TestMissingUseSignalsDirectUsage(): JSX.Element {
  const messageSignal = signal('Hello');

  // Uses signal directly but missing useSignals() hook
  return <div>{messageSignal}</div>;
}

// This component should NOT trigger an ESLint warning - has useSignals()
export function TestCorrectUseSignals(): JSX.Element {
  useSignals(); // Correctly includes useSignals hook

  const counterSignal = signal(0);

  return <div>{counterSignal}</div>;
}

// This component should NOT trigger an ESLint warning - no signal usage
export function TestNoSignalUsage(): JSX.Element {
  const regularValue = 42;

  return <div>{regularValue}</div>;
}

// Function component with arrow function syntax - should trigger warning
export const TestArrowFunctionMissingUseSignals = (): JSX.Element => {
  const statusSignal = signal('active');

  // Uses signal but missing useSignals()
  return <div>{statusSignal}</div>;
};

// Function component with arrow function syntax - should NOT trigger warning
export const TestArrowFunctionCorrectUseSignals = (): JSX.Element => {
  useSignals(); // Correctly includes useSignals hook

  const statusSignal = signal('active');

  return <div>{statusSignal}</div>;
};

// Component with multiple signal usages - should trigger warning
export function TestMultipleSignalsMissingUseSignals(): JSX.Element {
  const nameSignal = signal('John');
  const ageSignal = signal(25);

  // Uses multiple signals but missing useSignals()
  return (
    <div>
      <span>{nameSignal}</span>
      <span>{ageSignal}</span>
    </div>
  );
}

// Component with signal in JSX expression - should trigger warning
export function TestSignalInJSXMissingUseSignals(): JSX.Element {
  const visibleSignal = signal(true);

  // Uses signal in conditional but missing useSignals()
  return <div>{visibleSignal ? <span>Visible content</span> : null}</div>;
}

// Component that should be ignored based on configuration
export function IgnoredComponent(): JSX.Element {
  const testSignal = signal('test');

  // This should be ignored if "IgnoredComponent" is in ignoreComponents config
  return <div>{testSignal}</div>;
}

// Lower case function - should NOT trigger warning (not a React component)
export function notAComponent(): JSX.Element {
  const testSignal = signal('test');

  // This should not trigger because function name doesn't start with capital letter
  return <div>{testSignal}</div>;
}
