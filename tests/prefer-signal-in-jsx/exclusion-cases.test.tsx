import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
// biome-ignore lint/correctness/noUnusedImports: false positive
import React, { type JSX } from 'react';

// These cases should NOT trigger prefer-signal-in-jsx warnings

export function TestPropertyAccess(): JSX.Element {
  useSignals();

  const userSignal = signal({
    isActive: true,
    isLoggedIn: false,
    name: 'John',
  });

  return (
    <div>
      {/* Property access - should NOT trigger */}
      <div>{userSignal.value.isActive ? 'Yes' : 'No'}</div>
      <div>{userSignal.value?.isLoggedIn}</div>
      <div>{userSignal.value.isLoggedIn}</div>
      <div>{userSignal.value.name}</div>
    </div>
  );
}

export function TestArrayIndexAccess(): JSX.Element {
  useSignals();

  const itemsSignal = signal(['item1', 'item2', 'item3']);

  return (
    <div>
      {/* Array index access - should NOT trigger */}
      <div>{itemsSignal.value[0]}</div>
      <div>{itemsSignal.value[1]}</div>
    </div>
  );
}

export function TestClassNameUsage(): JSX.Element {
  useSignals();

  const themeSignal = signal('dark');

  return (
    <div>
      {/* className usage - should NOT trigger */}
      <div className={themeSignal.value}>Content</div>
      <div className={`theme-${themeSignal.value}`}>Content</div>
    </div>
  );
}

export function TestJoinMethod(): JSX.Element {
  useSignals();
  const itemsSignal = signal(['apple', 'banana', 'cherry']);

  return (
    <div>
      {/* .join() method - should NOT trigger */}
      <div>{itemsSignal.value.join(', ')}</div>
      <div>{itemsSignal.value.join(' | ')}</div>
    </div>
  );
}

export function TestMathExpressions(): JSX.Element {
  useSignals();
  const taxRateSignal = signal(0.15);
  const priceSignal = signal(100);

  return (
    <div>
      {/* Math expressions - should NOT trigger */}
      <div>{taxRateSignal.value * 100}%</div>
      <div>${priceSignal.value * 1.2}</div>
      <div>{priceSignal.value + taxRateSignal.value}</div>
    </div>
  );
}

export function TestMethodChaining(): JSX.Element {
  useSignals();
  const textSignal = signal('  Hello World  ');
  const numbersSignal = signal([1, 2, 3, 4, 5]);

  return (
    <div>
      {/* Method chaining - should NOT trigger */}
      <div>{textSignal.value.trim().toUpperCase()}</div>
      <div>{numbersSignal.value.filter((n) => n > 2).length}</div>
      <div>{textSignal.value.substring(0, 5)}</div>
    </div>
  );
}

export function TestInputElementAttributes(): JSX.Element {
  useSignals();

  const inputValueSignal = signal('initial value');
  const placeholderSignal = signal('Enter text here');
  const maxLengthSignal = signal(10);
  const minSignal = signal(0);
  const maxSignal = signal(100);
  const stepSignal = signal(1);

  return (
    <div>
      {/* Input element attributes - should NOT trigger */}
      <input
        type='text'
        value={inputValueSignal.value}
        placeholder={placeholderSignal.value}
        maxLength={maxLengthSignal.value}
      />

      <input type='number' min={minSignal.value} max={maxSignal.value} step={stepSignal.value} />

      <input
        type='range'
        min={minSignal.value}
        max={maxSignal.value}
        step={stepSignal.value}
        value={inputValueSignal.value}
      />
    </div>
  );
}

// These cases SHOULD trigger prefer-signal-in-jsx warnings

export function TestDirectValueAccess(): JSX.Element {
  useSignals();

  const messageSignal = signal('Hello');
  const countSignal = signal(42);

  return (
    <div>
      {/* Direct .value access - SHOULD trigger */}
      <div>{messageSignal.value}</div>
      <div>{countSignal.value}</div>
    </div>
  );
}
