/* eslint-disable react-signals-hooks/prefer-signal-effect */
import { signal, computed } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
// biome-ignore lint/correctness/noUnusedImports: false positive
import React, { type JSX, useCallback, useEffect, useState } from 'react';

// This component should trigger ESLint warning for not using .peek() in effect
export function TestMissingPeekInEffect(): JSX.Element {
  useSignals();

  const countSignal = signal(0);

  const [effectCount, setEffectCount] = useState(0);

  // Should trigger warning - using .value in effect without needing subscription
  useEffect(() => {
    console.info('Count changed:', countSignal.value);

    setEffectCount((c) => c + 1);
  }, [countSignal.value]); // This creates a dependency on countSignal.value

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onClick = useCallback(() => {
    countSignal.value++;
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <div>Effect runs: {effectCount}</div>

      <button type='button' onClick={onClick}>
        Increment
      </button>
    </div>
  );
}

// This component should NOT trigger warning - using .peek() in effect
export function TestCorrectPeekInEffect(): JSX.Element {
  useSignals();

  const countSignal = signal(0);

  const [effectCount, setEffectCount] = useState(0);

  // Correct - using .peek() to read without subscribing
  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  useEffect(() => {
    console.info('Count changed (peek):', countSignal.peek());

    setEffectCount((c) => c + 1);
  }, []); // No dependency on countSignal

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onClick = useCallback(() => {
    countSignal.value++;
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <div>Effect runs: {effectCount}</div>

      <button type='button' onClick={onClick}>
        Increment
      </button>
    </div>
  );
}

// This component should trigger warning for not using .value in JSX
export function TestMissingValueInJSX(): JSX.Element {
  useSignals();

  const countSignal = signal(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onClick = useCallback(() => {
    countSignal.value++;
  }, []);

  // Should trigger warning - missing .value in JSX
  return (
    <div>
      <div>Count: {countSignal}</div>

      <div>Count (with .value): {countSignal}</div>

      <button type='button' onClick={onClick}>
        Increment
      </button>
    </div>
  );
}

// This component should NOT trigger warning - using .value in JSX
export function TestCorrectValueInJSX(): JSX.Element {
  useSignals();

  const countSignal = signal(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onClick = useCallback(() => {
    countSignal.value++;
  }, []);

  // Correct - using .value in JSX is allowed but not required
  return (
    <div>
      <div>Count: {countSignal}</div>

      <button type='button' onClick={onClick}>
        Increment
      </button>
    </div>
  );
}

// This component should trigger warning for incorrect .peek() usage in JSX
export function TestIncorrectPeekInJSX(): JSX.Element {
  useSignals();

  const countSignal = signal(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onClick = useCallback(() => {
    countSignal.value++;
  }, []);

  // Should trigger warning - .peek() in JSX is not reactive
  return (
    <div>
      <div>Count (with .peek()): {countSignal.peek()}</div>

      <button type='button' onClick={onClick}>
        Increment
      </button>
    </div>
  );
}

// This component should trigger warning for not using .peek() in event handler
export function TestMissingPeekInEventHandler(): JSX.Element {
  useSignals();

  const countSignal = signal(0);
  const [clicks, setClicks] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const handleClick = useCallback(() => {
    // Should trigger warning - using .value in event handler when we don't need to track changes
    console.info('Current count:', countSignal.value);

    setClicks((c) => c + 1);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onClick = useCallback(() => {
    countSignal.value++;
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <div>Clicks: {clicks}</div>

      <button type='button' onClick={handleClick}>
        Log Count
      </button>

      <button type='button' onClick={onClick}>
        Increment
      </button>
    </div>
  );
}

// This component should NOT trigger warning - using .peek() in event handler
export function TestCorrectPeekInEventHandler(): JSX.Element {
  useSignals();
  const countSignal = signal(0);
  const [clicks, setClicks] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onClick1 = useCallback(() => {
    // Correct - using .peek() in event handler when we don't need to track changes
    console.info('Current count (peek):', countSignal.peek());

    setClicks((c) => c + 1);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onClick2 = useCallback(() => {
    countSignal.value++;
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <div>Clicks: {clicks}</div>

      <button type='button' onClick={onClick1}>
        Log Count
      </button>

      <button type='button' onClick={onClick2}>
        Increment
      </button>
    </div>
  );
}

// This component should trigger warning for not using .value in computed
export function TestMissingValueInComputed(): JSX.Element {
  useSignals();
  const firstNameSignal = signal('John');
  const lastNameSignal = signal('Doe');

  // Should trigger warning - missing .value in computed
  const fullNameSignal = computed(() => {
    return `${firstNameSignal} ${lastNameSignal}`;
  });

  return (
    <div>
      <div>Full Name: {fullNameSignal}</div>
      <button
        type='button'
        onClick={() => {
          firstNameSignal.value = 'Jane';
          lastNameSignal.value = 'Smith';
        }}>
        Change Name
      </button>
    </div>
  );
}

// This component should NOT trigger warning - using .value in computed
export function TestCorrectValueInComputed(): JSX.Element {
  useSignals();
  const firstNameSignal = signal('John');
  const lastNameSignal = signal('Doe');

  // Correct - using .value in computed
  const fullNameSignal = computed(() => {
    return `${firstNameSignal.value} ${lastNameSignal.value}`;
  });

  return (
    <div>
      <div>Full Name: {fullNameSignal}</div>
      <button
        type='button'
        onClick={() => {
          firstNameSignal.value = 'Jane';
          lastNameSignal.value = 'Smith';
        }}>
        Change Name
      </button>
    </div>
  );
}

// This component should trigger warning for using .value in effect when .peek() would be better
export function TestValueInsteadOfPeekInEffect(): JSX.Element {
  useSignals();
  const userSignal = signal<{ id: number; name: string }>({ id: 1, name: 'John' });

  const [logs, setLogs] = useState<string[]>([]);

  // Should trigger warning - using .value in effect when we don't need to track changes
  useEffect(() => {
    const log = `User updated: ${userSignal.value.name}`;

    setLogs((prev) => [...prev, log]);
  }, [userSignal.value]); // This creates a dependency on userSignal.value

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onClick = useCallback(() => {
    userSignal.value = { ...userSignal.value, name: 'Jane' };
  }, [userSignal.value]);

  return (
    <div>
      <div>User: {userSignal.value.name}</div>

      <div>
        Logs:
        <ul>
          {logs.map((log, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: not relevant
            <li key={i}>{log}</li>
          ))}
        </ul>
      </div>

      <button type='button' onClick={onClick}>
        Change Name
      </button>
    </div>
  );
}

// This component should NOT trigger warning - using .peek() in effect when appropriate
export function TestCorrectPeekInEffect2(): JSX.Element {
  useSignals();
  const userSignal = signal({ id: 1, name: 'John' });
  const [logs, setLogs] = useState<string[]>([]);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  useEffect(() => {
    // Correct - using .peek() when we don't need to track changes
    const log = `User updated: ${userSignal.peek().name}`;

    setLogs((prev) => [...prev, log]);
  }, [updateTrigger]); // No dependency on userSignal

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onClick = useCallback(() => {
    userSignal.value = { ...userSignal.value, name: 'Jane' };

    setUpdateTrigger((t) => t + 1);
  }, [userSignal.value]);

  return (
    <div>
      <div>User: {userSignal.value.name}</div>

      <div>
        Logs:
        <ul>
          {logs.map((log, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: not relevant
            <li key={i}>{log}</li>
          ))}
        </ul>
      </div>

      <button type='button' onClick={onClick}>
        Change Name and Log
      </button>
    </div>
  );
}
