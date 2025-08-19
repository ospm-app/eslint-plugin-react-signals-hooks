/* eslint-disable react-signals-hooks/prefer-show-over-ternary */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/** biome-ignore-all lint/correctness/noUnusedVariables: off */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: off */
/** biome-ignore-all assist/source/organizeImports: off */
import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  useRef,
  useState,
  type JSX,
  Component,
  useContext,
  useCallback,
  createContext,
} from 'react';

// This component should NOT trigger any warnings - proper signal naming
export function TestValidSignalNaming(): JSX.Element {
  const store = useSignals(1);

  try {
    const countSignal = signal(0);
    const [name, _setName] = useState('');
    const isValid = true;

    return (
      <div>
        <div>Count: {countSignal}</div>

        <div>Name: {name}</div>

        <div>Is Valid: {isValid ? 'Yes' : 'No'}</div>
      </div>
    );
  } finally {
    store.f();
  }
}

// This component should trigger a warning - non-signal variable with 'Signal' suffix
export function TestInvalidSignalNaming(): JSX.Element {
  const store = useSignals(1);

  try {
    const countSignal = signal(0);
    const [nameSignal, _setName] = useState(''); // Should warn about nameSignal
    const isValidSignal = true; // Should warn about isValidSignal

    return (
      <div>
        <div>Count: {countSignal}</div>

        <div>Name: {nameSignal}</div>

        <div>Is Valid: {isValidSignal ? 'Yes' : 'No'}</div>
      </div>
    );
  } finally {
    store.f();
  }
}

// This component should NOT trigger warnings - signal variables with 'Signal' suffix
export function TestSignalVariables(): JSX.Element {
  const store = useSignals(1);

  try {
    const countSignal = signal(0);

    const nameSignal = signal('');

    const isValidSignalSignal = signal(true);

    return (
      <div>
        <div>Count: {countSignal}</div>

        <div>Name: {nameSignal}</div>

        <div>Is Valid: {isValidSignalSignal ? 'Yes' : 'No'}</div>
      </div>
    );
  } finally {
    store.f();
  }
}

// This component should trigger warnings for destructured non-signal values with 'Signal' suffix
export function TestDestructuredProps({ userSignal }: { userSignal: string }): JSX.Element {
  const store = useSignals(1);

  try {
    // Should warn about userSignal prop
    const [isLoadingSignal, _setIsLoading] = useState(false); // Should warn about isLoadingSignal
    const dataSignal = signal<Record<string, unknown>>({});

    return (
      <div>
        <div>User: {userSignal}</div>

        <div>Loading: {isLoadingSignal ? 'Yes' : 'No'}</div>

        <div>Data: {JSON.stringify(dataSignal.value)}</div>
      </div>
    );
  } finally {
    store.f();
  }
}

// This component should NOT trigger warnings for destructured signal values with 'Signal' suffix
export function TestDestructuredSignals(): JSX.Element {
  const store = useSignals(1);

  try {
    const userSignal = signal({ name: 'John', id: 1 });

    const { name: userNameSignal, id: userIdSignal } = userSignal.value;

    // Should not warn about destructured values from signals
    return (
      <div>
        <div>User: {userNameSignal}</div>

        <div>ID: {userIdSignal}</div>
      </div>
    );
  } finally {
    store.f();
  }
}

// This component tests function parameters with 'Signal' suffix
export function TestFunctionParameters(): JSX.Element {
  const store = useSignals(1);

  try {
    const handleClick = (eventSignal: React.MouseEvent) => {
      // Should warn about eventSignal
      console.info('Clicked:', eventSignal);
    };

    const processData = useCallback((dataSignal: unknown) => {
      // Should warn about dataSignal
      return JSON.stringify(dataSignal);
    }, []);

    return (
      <button type='button' onClick={handleClick}>
        Click Me {processData({ test: 'test' })}
      </button>
    );
  } finally {
    store.f();
  }
}

// This component tests type aliases with 'Signal' suffix
// Should NOT warn about UserSignal, types are not variables
type UserSignal = {
  id: number;
  name: string;
};

// Should NOT warn about ConfigSignal, types are not variables
interface ConfigSignal {
  theme: string;
  isDark: boolean;
}

export function TestTypeAliases(): JSX.Element {
  const store = useSignals(1);

  try {
    const user: UserSignal = { id: 1, name: 'John' };
    const config: ConfigSignal = { theme: 'light', isDark: false };

    return (
      <div>
        <div>User: {user.name}</div>
        <div>Theme: {config.theme}</div>
      </div>
    );
  } finally {
    store.f();
  }
}

// Class component with properties and methods
export class TestClassComponent extends Component {
  // Should not warn - class property with Signal suffix that is a signal
  private countSignal = signal(0);

  // Should warn - class property with Signal suffix that is not a signal
  private nameSignal = 'John';

  // Should not warn - method with Signal in name
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: not relevant
  private updateSignal() {
    this.countSignal.value++;
  }

  render() {
    return (
      <div>
        {this.countSignal} - {this.nameSignal}
      </div>
    );
  }
}

// Test component using React refs
export function TestRefs(): JSX.Element {
  const store = useSignals(1);

  try {
    // Should warn - ref with Signal suffix that's not a signal
    const inputRefSignal = useRef<HTMLInputElement>(null);

    // Should not warn - signal with Signal suffix
    const counterSignal = signal(0);

    return (
      <div>
        <input ref={inputRefSignal} />
        <div>Count: {counterSignal}</div>
      </div>
    );
  } finally {
    store.f();
  }
}

// Test context with Signal suffix
const UserContextSignal = createContext<{ name: string }>({ name: 'John' });

// Custom hook with Signal suffix
export function useUserSignal() {
  const store = useSignals(2);

  try {
    // Should warn - return value has Signal suffix but is not a signal
    const user = useContext(UserContextSignal);

    return user;
  } finally {
    store.f();
  }
}

// Test component using context and custom hook
export function TestContextAndHooks(): JSX.Element {
  const store = useSignals(1);

  try {
    // Should not warn - signal with Signal suffix
    const themeSignal = signal('light');

    // Should warn - hook return value with Signal suffix that's not a signal
    const userSignal = useUserSignal();

    return (
      <UserContextSignal.Provider value={{ name: 'John' }}>
        <div>
          <div>Theme: {themeSignal}</div>
          <div>User: {userSignal.name}</div>
        </div>
      </UserContextSignal.Provider>
    );
  } finally {
    store.f();
  }
}

// Test component with generic type parameters
export function TestGenerics<T extends { id: number }>({
  items,
}: {
  items: Array<T>;
}): JSX.Element {
  const store = useSignals(1);

  try {
    // Should warn - non-signal with Signal suffix
    const selectedItemSignal = items[0];

    // Should not warn - signal with Signal suffix
    const selectedItemIdSignal = signal(selectedItemSignal?.id ?? 0);

    return (
      <div>
        {selectedItemIdSignal} - {selectedItemSignal?.id}
      </div>
    );
  } finally {
    store.f();
  }
}

// Test component with mapped types
type MappedType<T> = {
  [K in keyof T as K extends string ? `${K}Signal` : never]: T[K];
};

export function TestMappedTypes(): JSX.Element {
  // Should not warn - type-level transformation, not a variable
  const data: MappedType<{ count: number }> = { countSignal: 42 };

  // Should warn - non-signal with Signal suffix
  const countSignal = data.countSignal;

  return <div>{countSignal}</div>;
}

// Test component with complex destructuring
export function TestComplexDestructuring(): JSX.Element {
  const store = useSignals(1);

  try {
    const state = {
      userSignal: { name: 'John' }, // Should warn - nested non-signal with Signal suffix
      settings: { themeSignal: 'dark' }, // Should warn - nested non-signal with Signal suffix
    };

    // Should not warn - destructured values don't have Signal suffix
    const {
      userSignal: user,
      settings: { themeSignal: theme },
    } = state;

    // Should not warn - signal with Signal suffix
    const themeSignal = signal(theme);

    return (
      <div>
        <div>User: {user.name}</div>
        <div>Theme: {themeSignal}</div>
      </div>
    );
  } finally {
    store.f();
  }
}

// Test component with computed property names
export function TestComputedProperties(): JSX.Element {
  const store = useSignals(1);

  try {
    const suffix = 'Signal';
    const key = `count${suffix}`;

    // Should not warn - computed property name is not a variable declaration
    const state = {
      [key]: 42, // This is fine - not a variable declaration
      [`user${suffix}`]: 'John', // This is also fine
    };

    // Should warn - non-signal with Signal suffix
    const countSignal = state.countSignal;

    return <div>{countSignal}</div>;
  } finally {
    store.f();
  }
}

// --- Additional fixtures for safer-fix scenarios ---

// 1) Named export with Signal suffix (reported only when validateExported: true)
export const exportedValueSignal = 42; // Should be reported if validateExported is enabled

// 2) Multi-declarator const — only rename should be suggested, not convert
export const multiSignal = 1,
  alsoHere = 2; // multiSignal should be reported; convert suggestion should NOT be offered

// 3) let/var declarations — only rename should be suggested, not convert
export let tempSignal = 0; // Should be reported; convert suggestion should NOT be offered
export var legacySignal = 'x'; // Should be reported; convert suggestion should NOT be offered

// Test component with variables that have 'Signal' in the middle
export function TestSignalInMiddle(): JSX.Element {
  const store = useSignals(1);

  try {
    // Should not warn - 'Signal' is in the middle of the variable name
    const userSignalData = { name: 'John' };

    // Should not warn - 'Signal' is part of a larger word
    const signalProcessor = { process: () => {} };

    // Should not warn - 'Signal' is not a suffix
    // oxlint-disable-next-line no-unused-vars
    const _signalProcessorInstance = signalProcessor;
    // oxlint-disable-next-line no-unused-vars

    return (
      <div>
        <div>User: {userSignalData.name}</div>

        <button type='button' onClick={signalProcessor.process}>
          Process
        </button>
      </div>
    );
  } finally {
    store.f();
  }
}
