/* eslint-disable react-signals-hooks/prefer-batch-updates */
/* eslint-disable eslint-rule/consistent-rule-structure */
/* eslint-disable react-signals-hooks/prefer-use-signal-over-use-state */
/** biome-ignore-all lint/correctness/useExhaustiveDependencies: off */
/* eslint-disable react-signals-hooks/prefer-signal-effect */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: off */
import { signal, computed } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { type JSX, useCallback, useEffect, useState } from 'react';

// This component should trigger ESLint warning for not using .peek() in effect
export function TestMissingPeekInEffect(): JSX.Element {
  const store = useSignals(1);

  try {
    const countSignal = signal(0);

    const [effectCount, setEffectCount] = useState(0);

    // Should trigger warning - using .value in effect without needing subscription
    useEffect(() => {
      console.info('Count changed:', countSignal.value);

      setEffectCount((c) => c + 1);
    }, []); // This creates a dependency on countSignal.value

    const onClick = useCallback(() => {
      countSignal.value++;
    }, []); // This creates a dependency on countSignal.value

    return (
      <div>
        <div>Count: {countSignal}</div>

        <div>Effect runs: {effectCount}</div>

        <button type='button' onClick={onClick}>
          Increment
        </button>
      </div>
    );
  } finally {
    store.f();
  }
}

// This component should NOT trigger warning - using .peek() in effect
export function TestCorrectPeekInEffect(): JSX.Element {
  const store = useSignals(1);

  try {
    const countSignal = signal(0);

    const [effectCount, setEffectCount] = useState(0);

    // Correct - using .peek() to read without subscribing
    useEffect(() => {
      console.info('Count changed (peek):', countSignal.peek());

      setEffectCount((c) => c + 1);
    }, []); // No dependency on countSignal

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
  } finally {
    store.f();
  }
}

// This component should trigger warning for using .value in JSX
export function TestMissingValueInJSX(): JSX.Element {
  const store = useSignals(1);

  try {
    const countSignal = signal(0);

    const onClick = useCallback(() => {
      countSignal.value++;
    }, [countSignal.value]);

    // Should trigger warning - using .value in JSX
    return (
      <div>
        <div>Count: {countSignal}</div>

        <div>Count (with .value): {countSignal.value}</div>

        <button type='button' onClick={onClick}>
          Increment
        </button>
      </div>
    );
  } finally {
    store.f();
  }
}

// This component should NOT trigger warning - using .value in JSX
export function TestCorrectValueInJSX(): JSX.Element {
  const store = useSignals(1);

  try {
    const countSignal = signal(0);

    const onClick = useCallback(() => {
      countSignal.value++;
    }, [countSignal.value]);

    // Correct - using .value in JSX is allowed but not required
    return (
      <div>
        <div>Count: {countSignal}</div>

        <button type='button' onClick={onClick}>
          Increment
        </button>
      </div>
    );
  } finally {
    store.f();
  }
}

// This component should trigger warning for incorrect .peek() usage in JSX
export function TestIncorrectPeekInJSX(): JSX.Element {
  const store = useSignals(1);

  try {
    const countSignal = signal(0);

    const onClick = useCallback(() => {
      countSignal.value++;
    }, [countSignal.value]);

    // Should trigger warning - .peek() in JSX is not reactive
    return (
      <div>
        <div>Count (with .peek()): {countSignal.peek()}</div>

        <button type='button' onClick={onClick}>
          Increment
        </button>
      </div>
    );
  } finally {
    store.f();
  }
}

// This component should trigger warning for not using .peek() in event handler
export function TestMissingPeekInEventHandler(): JSX.Element {
  const store = useSignals(1);

  try {
    const countSignal = signal(0);
    const [clicks, setClicks] = useState(0);

    const handleClick = useCallback(() => {
      // Should trigger warning - using .value in event handler when we don't need to track changes
      console.info('Current count:', countSignal.value);

      setClicks((c) => c + 1);
    }, []);

    const onClick = useCallback(() => {
      countSignal.value++;
    }, [countSignal.value]);

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
  } finally {
    store.f();
  }
}

// This component should NOT trigger warning - using .peek() in event handler
export function TestCorrectPeekInEventHandler(): JSX.Element {
  const store = useSignals(1);

  try {
    const countSignal = signal(0);
    const [clicks, setClicks] = useState(0);

    const onClick1 = useCallback(() => {
      // Correct - using .peek() in event handler when we don't need to track changes
      console.info('Current count (peek):', countSignal.peek());

      setClicks((c) => c + 1);
    }, []);

    const onClick2 = useCallback(() => {
      countSignal.value++;
    }, [countSignal.value]);

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
  } finally {
    store.f();
  }
}

// This component should trigger warning for not using .value in computed
export function TestMissingValueInComputed(): JSX.Element {
  const store = useSignals(1);

  try {
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
  } finally {
    store.f();
  }
}

// This component should NOT trigger warning - using .value in computed
export function TestCorrectValueInComputed(): JSX.Element {
  const store = useSignals(1);

  try {
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
  } finally {
    store.f();
  }
}

// This component should trigger warning for using .value in effect when .peek() would be better
export function TestValueInsteadOfPeekInEffect(): JSX.Element {
  const store = useSignals(1);

  try {
    const userSignal = signal<{ id: number; name: string }>({ id: 1, name: 'John' });

    const [logs, setLogs] = useState<Array<string>>([]);

    // Should trigger warning - using .value in effect when we don't need to track changes
    useEffect(() => {
      const log = `User updated: ${userSignal.value.name}`;

      setLogs((prev) => [...prev, log]);
    }, [userSignal.value.name]); // This creates a dependency on userSignal.value.name

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
  } finally {
    store.f();
  }
}

// This component should NOT trigger warning - using .peek() in effect when appropriate
export function TestCorrectPeekInEffect2(): JSX.Element {
  const store = useSignals(1);

  try {
    const userSignal = signal({ id: 1, name: 'John' });
    const [logs, setLogs] = useState<Array<string>>([]);
    const [updateTrigger, setUpdateTrigger] = useState(0);

    useEffect(() => {
      // Correct - using .peek() when we don't need to track changes
      const log = `User updated: ${userSignal.peek().name}`;

      setLogs((prev) => [...prev, log]);
    }, [updateTrigger]); // No dependency on userSignal

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
  } finally {
    store.f();
  }
}
