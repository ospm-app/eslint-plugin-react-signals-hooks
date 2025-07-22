import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import React, { useCallback, useState, type JSX } from 'react';

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
