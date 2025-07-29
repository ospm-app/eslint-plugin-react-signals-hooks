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
  useSignals();

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
}

// This component should trigger a warning - non-signal variable with 'Signal' suffix
export function TestInvalidSignalNaming(): JSX.Element {
  useSignals();

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
}

// This component should NOT trigger warnings - signal variables with 'Signal' suffix
export function TestSignalVariables(): JSX.Element {
  useSignals();

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
}

// This component should trigger warnings for destructured non-signal values with 'Signal' suffix
export function TestDestructuredProps({ userSignal }: { userSignal: string }): JSX.Element {
  useSignals();

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
}

// This component should NOT trigger warnings for destructured signal values with 'Signal' suffix
export function TestDestructuredSignals(): JSX.Element {
  useSignals();

  const userSignal = signal({ name: 'John', id: 1 });

  const { name: userNameSignal, id: userIdSignal } = userSignal.value;

  // Should not warn about destructured values from signals
  return (
    <div>
      <div>User: {userNameSignal}</div>

      <div>ID: {userIdSignal}</div>
    </div>
  );
}

// This component tests function parameters with 'Signal' suffix
export function TestFunctionParameters(): JSX.Element {
  useSignals();

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
}

// This component tests type aliases with 'Signal' suffix
type UserSignal = {
  // Should not warn about UserSignal, types are not variables
  id: number;
  name: string;
};

interface ConfigSignal {
  // Should not warn about ConfigSignal, types are not variables
  theme: string;
  isDark: boolean;
}

export function TestTypeAliases(): JSX.Element {
  useSignals();

  const user: UserSignal = { id: 1, name: 'John' };
  const config: ConfigSignal = { theme: 'light', isDark: false };

  return (
    <div>
      <div>User: {user.name}</div>
      <div>Theme: {config.theme}</div>
    </div>
  );
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
  useSignals();

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
}

// Test context with Signal suffix
const UserContextSignal = createContext<{ name: string }>({ name: 'John' });

// Custom hook with Signal suffix
export function useUserSignal() {
  // Should warn - return value has Signal suffix but is not a signal
  const user = useContext(UserContextSignal);
  return user;
}

// Test component using context and custom hook
export function TestContextAndHooks(): JSX.Element {
  useSignals();

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
}

// Test component with generic type parameters
export function TestGenerics<T extends { id: number }>({ items }: { items: T[] }): JSX.Element {
  useSignals();

  // Should warn - non-signal with Signal suffix
  const selectedItemSignal = items[0];

  // Should not warn - signal with Signal suffix
  const selectedItemIdSignal = signal(selectedItemSignal?.id ?? 0);

  return (
    <div>
      {selectedItemIdSignal} - {selectedItemSignal.id}
    </div>
  );
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
  useSignals();

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
}

// Test component with computed property names
export function TestComputedProperties(): JSX.Element {
  useSignals();

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
}

// Test component with variables that have 'Signal' in the middle
export function TestSignalInMiddle(): JSX.Element {
  useSignals();

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
}
