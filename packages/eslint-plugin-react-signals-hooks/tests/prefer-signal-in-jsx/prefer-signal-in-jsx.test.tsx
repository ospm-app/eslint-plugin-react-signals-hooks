/* eslint-disable react-signals-hooks/prefer-show-over-ternary */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: off */
/* eslint-disable eslint-rule/consistent-rule-structure */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable react-signals-hooks/prefer-computed */
/* eslint-disable react-signals-hooks/restrict-signal-locations */
/* eslint-disable react-signals-hooks/prefer-for-over-map */
/** biome-ignore-all assist/source/organizeImports: off */
import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { Fragment, type JSX } from 'react';
import { useId, useMemo } from 'react';

// This component should trigger ESLint warnings for using .value in JSX
const messageSignal = signal('Hello World');

export function TestSignalValueInJSX(): JSX.Element {
  const store = useSignals(1);

  try {
    return <div>{messageSignal.value}</div>;
  } finally {
    store.f();
  }
}

const nameSignal = signal('John');
const ageSignal = signal(25);

// This component should trigger warnings for multiple signal.value usages in JSX
export function TestMultipleSignalValuesInJSX(): JSX.Element {
  const store = useSignals(1);

  try {
    return (
      <div>
        <span>Name: {nameSignal.value}</span>

        <span>Age: {ageSignal.value}</span>
      </div>
    );
  } finally {
    store.f();
  }
}

const classNameSignal = signal('active');

const titleSignal = signal('Click me');

// This component should trigger warning for signal.value in JSX attributes
export function TestSignalValueInJSXAttribute(): JSX.Element {
  const store = useSignals(1);

  try {
    return (
      <button type='button' className={classNameSignal.value} title={titleSignal.value}>
        Button
      </button>
    );
  } finally {
    store.f();
  }
}

const visibleSignal = signal(true);

const contentSignal = signal('Content');

// This component should trigger warning for signal.value in conditional JSX
export function TestSignalValueInConditionalJSX(): JSX.Element {
  const store = useSignals(1);

  try {
    return <div>{visibleSignal.value && <span>{contentSignal.value}</span>}</div>;
  } finally {
    store.f();
  }
}

const countSignal = signal(5);

const multiplierSignal = signal(2);

// This component should trigger warning for signal.value in JSX expressions
export function TestSignalValueInJSXExpressions(): JSX.Element {
  const store = useSignals(1);

  try {
    return <div>Result: {countSignal.value * multiplierSignal.value}</div>;
  } finally {
    store.f();
  }
}

const message2Signal = signal('Hello World');

const visible2Signal = signal(true);

// This component should NOT trigger warnings - using signals directly in JSX
export function TestCorrectSignalUsageInJSX(): JSX.Element {
  const store = useSignals(1);

  try {
    return <div>{visible2Signal ? <span>{message2Signal}</span> : null}</div>;
  } finally {
    store.f();
  }
}

const dataSignal = signal({ name: 'John', age: 25 });

// This component should NOT trigger warnings - signal.value outside JSX
export function TestSignalValueOutsideJSX(): JSX.Element {
  const store = useSignals(1);

  try {
    // This should NOT trigger a warning - .value used outside JSX
    // eslint-disable-next-line react-signals-hooks/forbid-signal-re-assignment
    const userData = dataSignal.value;

    console.info('User data:', userData);

    return <div>{dataSignal}</div>;
  } finally {
    store.f();
  }
}

const itemsSignal = signal(['apple', 'banana', 'cherry']);

// This component should trigger warning for nested JSX with signal.value
export function TestNestedJSXWithSignalValue(): JSX.Element {
  const store = useSignals(1);

  try {
    // This should trigger a warning - using .value in nested JSX
    return (
      <ul>
        {itemsSignal.value.map((item: string, index: number): JSX.Element => {
          // biome-ignore lint/suspicious/noArrayIndexKey: not relevant
          return <li key={index}>{item}</li>;
        })}
      </ul>
    );
  } finally {
    store.f();
  }
}

// This component should trigger warning for signal.value in JSX fragments
export function TestSignalValueInJSXFragment(): JSX.Element {
  const store = useSignals(1);

  try {
    const headerSignal = signal('Title');

    const bodySignal = signal('Content');

    // These should trigger warnings - using .value in JSX fragments
    return (
      <Fragment>
        <h1>{headerSignal.value}</h1>

        <p>{bodySignal.value}</p>
      </Fragment>
    );
  } finally {
    store.f();
  }
}

// This component should trigger warning for signal.value in complex JSX expressions
export function TestSignalValueInComplexJSX(): JSX.Element {
  const store = useSignals(1);

  try {
    const userSignal = signal({ name: 'John', isActive: true });

    const statusSignal = signal('online');

    // These should trigger warnings for statusSignal.value - using .value in complex JSX
    // Should not trigger warning for userSignal.value.isActive and userSignal.value.name
    return (
      <div>
        <span className={userSignal.value.isActive ? 'active' : 'inactive'}>
          {userSignal.value.name} is {statusSignal.value}
        </span>
      </div>
    );
  } finally {
    store.f();
  }
}

// Arrow function component with signal.value in JSX - should trigger warning
export const TestArrowFunctionSignalValue = (): JSX.Element => {
  const store = useSignals(1);

  try {
    const id = useId();

    const labelSignal = signal('Label');

    // This should trigger a warning - using .value in JSX
    return <label htmlFor={id}>{labelSignal.value}</label>;
  } finally {
    store.f();
  }
};

// Component with signal.value in JSX callback - should trigger warning
export function TestSignalValueInJSXCallback(): JSX.Element {
  const store = useSignals(1);

  try {
    const itemsSignal = signal([1, 2, 3, 4, 5]);

    // This should trigger a warning - using .value in JSX callback
    return (
      <div>
        {itemsSignal.value
          .filter((x: number): boolean => {
            return x > 2;
          })
          .map((item: number, index: number): JSX.Element => {
            // biome-ignore lint/suspicious/noArrayIndexKey: not relevant
            return <span key={index}>{item}</span>;
          })}
      </div>
    );
  } finally {
    store.f();
  }
}

// Component with signal.value in JSX ternary - should trigger warning
export function TestSignalValueInJSXTernary(): JSX.Element {
  const store = useSignals(1);

  try {
    const loadingSignal = signal(false);

    const dataSignal = signal('Loaded data');

    const errorSignal = signal('Error message');

    // These should trigger warnings - using .value in JSX ternary
    return <div>{loadingSignal.value ? 'Loading...' : dataSignal.value || errorSignal.value}</div>;
  } finally {
    store.f();
  }
}

interface UserData {
  name: string;
  age: number;
}

// This component should NOT trigger warnings for JSON.stringify with signal.value
export function TestJSONStringifyWithSignalValue(): JSX.Element {
  const store = useSignals(1);

  try {
    const dataSignal = signal<UserData>({ name: 'John', age: 30 });
    const jsonString = JSON.stringify(dataSignal.value);
    const parsedData = JSON.parse(jsonString) as UserData;

    return (
      <div>
        <div>JSON String: {jsonString}</div>

        <div>Name: {parsedData.name}</div>

        <div>Age: {parsedData.age}</div>
      </div>
    );
  } finally {
    store.f();
  }
}

interface ItemsData {
  items: Array<number>;
}

// This component should NOT trigger warnings for JSON.stringify in useMemo with signal.value
export function TestJSONInUseMemoWithSignalValue(): JSX.Element {
  const store = useSignals(1);

  try {
    const dataSignal = signal<ItemsData>({ items: [1, 2, 3] });

    const formattedData = useMemo<ItemsData>(() => {
      const jsonString = JSON.stringify(dataSignal.value);
      return JSON.parse(jsonString) as ItemsData;
    }, [dataSignal.value]);

    return (
      <div>
        <div>Items Count: {formattedData.items.length}</div>
      </div>
    );
  } finally {
    store.f();
  }
}

interface ConfigData {
  config: {
    theme: string;
  };
}

// This component should NOT trigger warnings for JSON.stringify in callback with signal.value
export function TestJSONInCallbackWithSignalValue(): JSX.Element {
  const store = useSignals(1);

  try {
    const dataSignal = signal<ConfigData>({ config: { theme: 'dark' } });

    const handleClick = () => {
      const jsonString = JSON.stringify(dataSignal.value);
      const parsedData = JSON.parse(jsonString) as ConfigData;
      console.info('Config:', parsedData.config);
    };

    return (
      <button type='button' onClick={handleClick}>
        Log Config
      </button>
    );
  } finally {
    store.f();
  }
}

interface SimpleData {
  name: string;
}

// This component should trigger warning for direct JSON.stringify in JSX with signal
export function TestDirectJSONStringifyInJSX(): JSX.Element {
  const store = useSignals(1);

  try {
    const dataSignal = signal<SimpleData>({ name: 'Alice' });

    // This should trigger a warning - using JSON.stringify with signal.value directly in JSX
    return <div>{JSON.stringify(dataSignal.value)}</div>;
  } finally {
    store.f();
  }
}
