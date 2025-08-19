/* eslint-disable react-signals-hooks/prefer-show-over-ternary */
/* eslint-disable eslint-rule/consistent-rule-structure */
import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import type { JSX } from 'react';

// These cases should NOT trigger prefer-signal-in-jsx warnings

const userSignal = signal({
  isActive: true,
  isLoggedIn: false,
  name: 'John',
});

export function TestPropertyAccess(): JSX.Element {
  const store = useSignals(1);

  try {
    return (
      <div>
        {/* Property access - should NOT trigger */}
        <div>{userSignal.value.isActive ? 'Yes' : 'No'}</div>

        <div>{userSignal.value.isLoggedIn}</div>

        <div>{userSignal.value.isLoggedIn}</div>

        <div>{userSignal.value.name}</div>
      </div>
    );
  } finally {
    store.f();
  }
}

const itemsSignal = signal(['item1', 'item2', 'item3']);

export function TestArrayIndexAccess(): JSX.Element {
  const store = useSignals(1);

  try {
    return (
      <div>
        {/* Array index access - should NOT trigger */}
        <div>{itemsSignal.value[0]}</div>

        <div>{itemsSignal.value[1]}</div>
      </div>
    );
  } finally {
    store.f();
  }
}

const themeSignal = signal('dark');

export function TestClassNameUsage(): JSX.Element {
  const store = useSignals(1);

  try {
    return (
      <div>
        {/* className usage - should NOT trigger */}
        <div className={themeSignal.value}>Content</div>

        <div className={`theme-${themeSignal.value}`}>Content</div>
      </div>
    );
  } finally {
    store.f();
  }
}

const items2Signal = signal(['apple', 'banana', 'cherry']);

export function TestJoinMethod(): JSX.Element {
  const store = useSignals(1);

  try {
    return (
      <div>
        {/* .join() method - should NOT trigger */}
        <div>{items2Signal.value.join(', ')}</div>

        <div>{items2Signal.value.join(' | ')}</div>
      </div>
    );
  } finally {
    store.f();
  }
}

const taxRateSignal = signal(0.15);
const priceSignal = signal(100);

export function TestMathExpressions(): JSX.Element {
  const store = useSignals(1);

  try {
    return (
      <div>
        {/* Math expressions - should NOT trigger */}
        <div>{taxRateSignal.value * 100}%</div>

        <div>${priceSignal.value * 1.2}</div>

        <div>{priceSignal.value + taxRateSignal.value}</div>
      </div>
    );
  } finally {
    store.f();
  }
}

const textSignal = signal('  Hello World  ');
const numbersSignal = signal([1, 2, 3, 4, 5]);

export function TestMethodChaining(): JSX.Element {
  const store = useSignals(1);

  try {
    return (
      <div>
        {/* Method chaining - should NOT trigger */}
        <div>{textSignal.value.trim().toUpperCase()}</div>

        <div>{numbersSignal.value.filter((n) => n > 2).length}</div>

        <div>{textSignal.value.substring(0, 5)}</div>
      </div>
    );
  } finally {
    store.f();
  }
}

const inputValueSignal = signal('initial value');
const placeholderSignal = signal('Enter text here');
const maxLengthSignal = signal(10);
const minSignal = signal(0);
const maxSignal = signal(100);
const stepSignal = signal(1);

export function TestInputElementAttributes(): JSX.Element {
  const store = useSignals(1);

  try {
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
  } finally {
    store.f();
  }
}

// These cases SHOULD trigger prefer-signal-in-jsx warnings

const messageSignal = signal('Hello');
const countSignal = signal(42);

export function TestDirectValueAccess(): JSX.Element {
  const store = useSignals(1);

  try {
    return (
      <div>
        {/* Direct .value access - SHOULD trigger */}
        <div>{messageSignal.value}</div>

        <div>{countSignal.value}</div>
      </div>
    );
  } finally {
    store.f();
  }
}
