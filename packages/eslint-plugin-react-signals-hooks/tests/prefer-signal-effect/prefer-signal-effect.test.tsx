/* eslint-disable react-signals-hooks/prefer-signal-methods */
/* eslint-disable eslint-rule/consistent-rule-structure */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable react-signals-hooks/prefer-use-signal-over-use-state */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: off */
/* eslint-disable react-signals-hooks/prefer-show-over-ternary */
/** biome-ignore-all lint/correctness/useExhaustiveDependencies: off */
import { effect, signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { type JSX, useCallback, useEffect, useState } from 'react';

// This component should trigger ESLint warning for useEffect with signal-only dependencies
export function TestUseEffectWithSignalDeps(): JSX.Element {
  const store = useSignals(1);

  try {
    const counterSignal = signal(0);
    const nameSignal = signal('John');

    // This should trigger a warning - useEffect with only signal dependencies
    useEffect(() => {
      console.info('Counter:', counterSignal.value);
      console.info('Name:', nameSignal.value);
    }, [counterSignal.value, nameSignal.value]);

    return (
      <div>
        <p>{counterSignal}</p>
        <p>{nameSignal}</p>
      </div>
    );
  } finally {
    store.f();
  }
}

// This component should trigger warning for useEffect with direct signal dependencies
export function TestUseEffectWithDirectSignalDeps(): JSX.Element {
  const store = useSignals(1);

  try {
    const statusSignal = signal('active');
    const flagSignal = signal(true);

    // This should trigger a warning - useEffect with direct signal dependencies
    useEffect(() => {
      if (flagSignal.value) {
        console.info('Status:', statusSignal.value);
      }
    }, [flagSignal.value, statusSignal.value]);

    return (
      <div>
        <p>Status: {statusSignal}</p>
        <p>Flag: {flagSignal ? 'true' : 'false'}</p>
      </div>
    );
  } finally {
    store.f();
  }
}

// This component should trigger warning for useEffect with mixed signal.value dependencies
export function TestUseEffectMixedSignalValueDeps(): JSX.Element {
  const store = useSignals(1);

  try {
    const dataSignal = signal({ count: 0, message: 'hello' });
    const enabledSignal = signal(true);

    // This should trigger a warning - all dependencies are signals
    useEffect(() => {
      if (enabledSignal.value) {
        console.info('Data:', dataSignal.value);
      }
    }, [enabledSignal.value, dataSignal.value]);

    return (
      <div>
        <p>Count: {dataSignal.value.count}</p>
        <p>Message: {dataSignal.value.message}</p>
        <p>Enabled: {enabledSignal ? 'yes' : 'no'}</p>
      </div>
    );
  } finally {
    store.f();
  }
}

// This component should NOT trigger warnings - useEffect with mixed dependencies
export function TestUseEffectMixedDeps(): JSX.Element {
  const store = useSignals(1);

  try {
    const valueSignal = signal(0);
    const [regularState, setRegularState] = useState(0);

    // This should NOT trigger a warning - mixed signal and regular dependencies
    useEffect(() => {
      console.info('Signal:', valueSignal.peek());
      console.info('State:', regularState);
    }, [valueSignal.value, regularState]);

    const onClick = useCallback(() => {
      return setRegularState((prev) => prev + 1);
    }, []);

    return (
      <div>
        <p>Signal: {valueSignal}</p>

        <p>State: {regularState}</p>

        <button type='button' onClick={onClick}>
          Increment State
        </button>
      </div>
    );
  } finally {
    store.f();
  }
}

// This component should NOT trigger warnings - useEffect with no dependencies
export function TestUseEffectNoDeps(): JSX.Element {
  const store = useSignals(1);

  try {
    const messageSignal = signal('Hello');

    // This should NOT trigger a warning - no dependency array
    useEffect(() => {
      console.info('Effect runs on every render');
      console.info('Message:', messageSignal.peek());
    }, []);

    return <div>{messageSignal}</div>;
  } finally {
    store.f();
  }
}

// This component should NOT trigger warnings - useEffect with empty dependencies
export function TestUseEffectEmptyDeps(): JSX.Element {
  const store = useSignals(1);

  try {
    const initialSignal = signal('initial');

    // This should NOT trigger a warning - empty dependency array
    useEffect(() => {
      console.info('Effect runs once on mount');
      console.info('Initial:', initialSignal.peek());
    }, []);

    return <div>{initialSignal}</div>;
  } finally {
    store.f();
  }
}

// This component should NOT trigger warnings - already using effect()
export function TestCorrectEffectUsage(): JSX.Element {
  const store = useSignals(1);

  try {
    const counterSignal = signal(0);

    const nameSignal = signal('John');

    // This should NOT trigger a warning - already using effect()
    effect(() => {
      console.info('Counter:', counterSignal.value);
      console.info('Name:', nameSignal.value);
    });

    return (
      <div>
        <p>{counterSignal}</p>
        <p>{nameSignal}</p>
      </div>
    );
  } finally {
    store.f();
  }
}

// This component should trigger warning for useEffect with single signal dependency
export function TestUseEffectSingleSignalDep(): JSX.Element {
  const store = useSignals(1);

  try {
    const themeSignal = signal('dark');

    // This should trigger a warning - single signal dependency
    useEffect(() => {
      document.body.className = themeSignal.value;
    }, []);

    return <div className={themeSignal.value}>Content</div>;
  } finally {
    store.f();
  }
}

// This component should trigger warning for useEffect with computed signal dependency
export function TestUseEffectComputedSignalDep(): JSX.Element {
  const store = useSignals(1);

  try {
    const baseSignal = signal(10);

    const multiplierSignal = signal(2);

    // This should trigger a warning - computed from signals
    useEffect(() => {
      const result = baseSignal.value * multiplierSignal.value;

      console.info('Result:', result);
    }, []);

    return (
      <div>
        <p>Base: {baseSignal}</p>
        <p>Multiplier: {multiplierSignal}</p>
        <p>Result: {baseSignal.value * multiplierSignal.value}</p>
      </div>
    );
  } finally {
    store.f();
  }
}

// Arrow function component with useEffect and signal deps - should trigger warning
export const TestArrowFunctionUseEffect = (): JSX.Element => {
  const store = useSignals(1);

  try {
    const stateSignal = signal('ready');

    // This should trigger a warning - useEffect with signal dependency in arrow function
    useEffect(() => {
      console.info('State changed:', stateSignal.value);
    }, []);

    return <div>State: {stateSignal}</div>;
  } finally {
    store.f();
  }
};

// Component with useEffect and nested signal access
export function TestUseEffectNestedSignalAccess(): JSX.Element {
  const store = useSignals(1);

  try {
    const userSignal = signal({ profile: { name: 'John', age: 25 } });

    const settingsSignal = signal({ theme: 'dark', language: 'en' });

    // This should trigger a warning - nested signal access in dependencies
    useEffect(() => {
      console.info('User:', userSignal.value.profile.name);

      console.info('Theme:', settingsSignal.value.theme);
    }, []);

    return (
      <div>
        <p>Name: {userSignal.value.profile.name}</p>

        <p>Age: {userSignal.value.profile.age}</p>

        <p>Theme: {settingsSignal.value.theme}</p>
      </div>
    );
  } finally {
    store.f();
  }
}

// Component with useEffect and signal array dependency
export function TestUseEffectSignalArrayDep(): JSX.Element {
  const store = useSignals(1);

  try {
    const itemsSignal = signal<Array<string>>([]);

    const filterSignal = signal('');

    // This should trigger a warning - signal array dependencies
    useEffect(() => {
      const filtered = itemsSignal.value.filter((item: string): boolean => {
        return item.includes(filterSignal.value);
      });

      console.info('Filtered items:', filtered);
    }, []);

    return (
      <div>
        <p>Items: {itemsSignal.value.length}</p>

        <p>Filter: {filterSignal}</p>
      </div>
    );
  } finally {
    store.f();
  }
}

// Component with multiple useEffect calls with signal dependencies
export function TestMultipleUseEffectsWithSignals(): JSX.Element {
  const store = useSignals(1);

  try {
    const countSignal = signal(0);

    const nameSignal = signal('test');

    const enabledSignal = signal(true);

    // These should trigger warnings - multiple useEffect with signal dependencies
    useEffect(() => {
      console.info('Count changed:', countSignal.value);
    }, []);

    useEffect(() => {
      console.info('Name changed:', nameSignal.value);
    }, []);

    useEffect(() => {
      if (enabledSignal.value) {
        console.info('Feature enabled');
      }
    }, []);

    return (
      <div>
        <p>Count: {countSignal}</p>

        <p>Name: {nameSignal}</p>

        <p>Enabled: {enabledSignal ? 'yes' : 'no'}</p>
      </div>
    );
  } finally {
    store.f();
  }
}
