/** biome-ignore-all lint/correctness/useExhaustiveDependencies: not relevant */
import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  useState,
  useEffect,
  useCallback,
  type JSX,
  useLayoutEffect,
  useMemo,
  useRef,
  useTransition,
  useDeferredValue,
  memo,
} from 'react';

// This component should trigger a warning - direct signal assignment in useEffect without dependencies
export function TestDirectSignalAssignmentInEffect(): JSX.Element {
  useSignals();

  const countSignal = signal(0);
  const [otherState, setOtherState] = useState(0);

  useEffect(() => {
    countSignal.value = otherState * 2; // Should warn - direct assignment without proper dependencies
  }, []); // Missing dependency: otherState

  const onClick = useCallback(() => {
    setOtherState((c) => c + 1);
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <button type='button' onClick={onClick}>
        Increment State
      </button>
    </div>
  );
}

// This component should NOT trigger warning - using useSignalsEffect for signal assignments
export function TestUseSignalsEffect(): JSX.Element {
  useSignals();
  const countSignal = signal(0);
  const [otherState, setOtherState] = useState(0);

  useSignalsEffect(() => {
    countSignal.value = otherState * 2; // OK - using useSignalsEffect
  });

  return (
    <div>
      <div>Count: {countSignal}</div>
      <button type='button' onClick={() => setOtherState((c) => c + 1)}>
        Increment State
      </button>
    </div>
  );
}

// This component should trigger a warning - signal assignment in useEffect with incorrect dependencies
export function TestSignalAssignmentWithIncorrectDeps(): JSX.Element {
  useSignals();
  const countSignal = signal(0);
  const [stateA, setStateA] = useState(0);
  const [stateB, setStateB] = useState(0);

  useEffect(() => {
    countSignal.value = stateA + stateB; // Should warn - stateB is missing from deps
  }, [stateA]);

  return (
    <div>
      <div>Count: {countSignal}</div>
      <button type='button' onClick={() => setStateA((a) => a + 1)}>
        Increment A
      </button>
      <button type='button' onClick={() => setStateB((b) => b + 1)}>
        Increment B
      </button>
    </div>
  );
}

// This component should NOT trigger warning - using useSignalsEffect with proper dependencies
export function TestUseSignalsEffectWithDeps(): JSX.Element {
  useSignals();
  const countSignal = signal(0);
  const [stateA, setStateA] = useState(0);
  const [stateB, setStateB] = useState(0);

  useSignalsEffect(() => {
    countSignal.value = stateA + stateB; // OK - using useSignalsEffect
  });

  return (
    <div>
      <div>Count: {countSignal}</div>

      <button type='button' onClick={() => setStateA((a) => a + 1)}>
        Increment A
      </button>

      <button type='button' onClick={() => setStateB((b) => b + 1)}>
        Increment B
      </button>
    </div>
  );
}

// This component should trigger a warning - signal assignment in useEffect with empty dependency array
export function TestSignalAssignmentWithEmptyDeps(): JSX.Element {
  useSignals();
  const countSignal = signal(0);
  const [otherState, setOtherState] = useState(0);

  useEffect(() => {
    // Should warn - signal assignment in effect with empty deps array
    const interval = globalThis.setInterval(() => {
      countSignal.value += 1; // Should warn - direct assignment in effect
    }, 1000);

    return () => {
      return globalThis.clearInterval(interval);
    };
  }, []);

  const onClick = useCallback(() => {
    setOtherState((c) => c + 1);
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <div>State: {otherState}</div>

      <button type='button' onClick={onClick}>
        Update State
      </button>
    </div>
  );
}

// This component should NOT trigger warning - using useSignals for reactive updates
export function TestUseSignalsForReactiveUpdates(): JSX.Element {
  useSignals();

  const countSignal = signal(0);

  const [start, setStart] = useState(false);

  useEffect(() => {
    if (!start) return;

    const interval = globalThis.setInterval(() => {
      // OK - using useSignals for reactive updates
      countSignal.value += 1;
    }, 1000);

    return () => {
      return globalThis.clearInterval(interval);
    };
  }, [start]);

  const onClick = useCallback(() => {
    setStart((s) => !s);
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <button type='button' onClick={onClick}>
        {start ? 'Stop' : 'Start'} Counter
      </button>
    </div>
  );
}

// This component should trigger a warning - signal assignment in useLayoutEffect
export function TestSignalAssignmentInUseLayoutEffect(): JSX.Element {
  useSignals();
  const countSignal = signal(0);
  const [otherState, setOtherState] = useState(0);

  useLayoutEffect(() => {
    countSignal.value = otherState * 2; // Should warn - direct assignment in useLayoutEffect
  }, [otherState]);

  const onClick = useCallback(() => {
    setOtherState((c) => c + 1);
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <button type='button' onClick={onClick}>
        Increment State
      </button>
    </div>
  );
}

// This component should NOT trigger warning - using useSignalsLayoutEffect
export function TestUseSignalsLayoutEffect(): JSX.Element {
  useSignals();

  const countSignal = signal(0);
  const [otherState, setOtherState] = useState(0);

  useSignalsLayoutEffect(() => {
    countSignal.value = otherState * 2; // OK - using useSignalsLayoutEffect
  });

  const onClick = useCallback(() => {
    setOtherState((c) => c + 1);
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <button type='button' onClick={onClick}>
        Increment State
      </button>
    </div>
  );
}

// This component should trigger a warning - signal assignment in useEffect with cleanup
export function TestSignalAssignmentWithCleanup(): JSX.Element {
  useSignals();

  const countSignal = signal(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return;

    const interval = globalThis.setInterval(() => {
      countSignal.value += 1; // Should warn - direct assignment in effect
    }, 1000);

    return () => {
      globalThis.clearInterval(interval);
    };
  }, [isRunning]);

  const onClick = useCallback(() => {
    setIsRunning((r) => !r);
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <button type='button' onClick={onClick}>
        {isRunning ? 'Stop' : 'Start'}
      </button>
    </div>
  );
}

// This component should NOT trigger warning - using useSignals with cleanup
export function TestUseSignalsWithCleanup(): JSX.Element {
  useSignals();

  const countSignal = signal(0);
  const [isRunning, setIsRunning] = useState(false);

  useSignalsEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = globalThis.setInterval(() => {
      // OK - using useSignalsEffect
      countSignal.value += 1;
    }, 1000);

    return () => {
      return globalThis.clearInterval(interval);
    };
  });

  const onClick = useCallback(() => {
    setIsRunning((r) => !r);
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <button type='button' onClick={onClick}>
        {isRunning ? 'Stop' : 'Start'}
      </button>
    </div>
  );
}

// Test component with complex dependencies
interface ComplexDepsProps {
  id: number;
  onUpdate: (id: number) => void;
}

export function TestComplexDependencies({ id, onUpdate }: ComplexDepsProps): JSX.Element {
  useSignals();
  const countSignal = signal(0);
  const [user, setUser] = useState({ id: 1, name: 'John' });
  const [_filters, setFilters] = useState({ active: true, query: '' });

  // Memoized value as a dependency
  const userStatus = useMemo(
    () => ({
      isActive: user.id > 0,
      lastUpdated: Date.now(),
    }),
    [user.id]
  );

  // Should warn - complex object in dependencies
  useEffect(() => {
    countSignal.value = user.id * 10;
  }, [user]); // Should warn about object as dependency

  // Should warn - function in dependencies
  useEffect(() => {
    countSignal.value = id * 5;
  }, [onUpdate]); // Should warn about function in dependencies

  // Should warn - memoized object in dependencies
  useEffect(() => {
    countSignal.value = userStatus.lastUpdated;
  }, [userStatus]); // Should warn about memoized object

  return (
    <div>
      <div>Count: {countSignal}</div>
      <button type='button' onClick={() => setUser((u) => ({ ...u, id: u.id + 1 }))}>
        Update User
      </button>
      <button type='button' onClick={() => setFilters((f) => ({ ...f, active: !f.active }))}>
        Toggle Active
      </button>
    </div>
  );
}

// Test component with async/await in effects
export function TestAsyncEffects(): JSX.Element {
  useSignals();
  const dataSignal = signal<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Should warn - async function in useEffect
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`https://api.example.com/data?retry=${retryCount}`);
        const result = await response.json();

        if (isMounted) {
          dataSignal.value = result; // Should warn - signal assignment in async effect
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error)
    return (
      <div>
        Error: {error.message}{' '}
        <button type='button' onClick={handleRetry}>
          Retry
        </button>
      </div>
    );

  return <div>Data: {JSON.stringify(dataSignal.value)}</div>;
}

// Custom hook with effect
function useCustomEffectHook(id: number) {
  const dataSignal = signal<Record<string, unknown> | null>(null);

  // Should warn - signal assignment in custom hook effect
  useEffect(() => {
    fetch(`https://api.example.com/items/${id}`)
      .then((res) => res.json())
      .then((data) => {
        dataSignal.value = data; // Should warn - signal assignment in custom hook effect
      });
  }, [id]);

  return dataSignal;
}

// Test component using custom hook with effect
export function TestCustomHookWithEffect(): JSX.Element {
  useSignals();
  const [id, setId] = useState(1);
  const dataSignal = useCustomEffectHook(id);

  return (
    <div>
      <div>Data: {JSON.stringify(dataSignal.value)}</div>

      <button type='button' onClick={() => setId((i) => i + 1)}>
        Next Item
      </button>
    </div>
  );
}

// Test component with multiple effects
function useMultipleEffects() {
  const countSignal = signal(0);

  const [a, setA] = useState(0);
  const [b, setB] = useState(0);

  // Should warn - multiple signals in one effect
  useEffect(() => {
    countSignal.value = a + b; // Should warn - signal assignment in effect

    const timeout = setTimeout(() => {
      countSignal.value += 1; // Should warn - another signal assignment
    }, 1000);

    return () => clearTimeout(timeout);
  }, [a, b]);

  // Nested effect - should also warn
  useEffect(() => {
    const interval = setInterval(() => {
      countSignal.value += 1; // Should warn - signal assignment in nested effect
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return { countSignal, setA, setB };
}

export function TestMultipleEffects(): JSX.Element {
  useSignals();
  const { countSignal, setA, setB } = useMultipleEffects();

  return (
    <div>
      <div>Count: {countSignal}</div>

      <button type='button' onClick={() => setA((a) => a + 1)}>
        Increment A
      </button>

      <button type='button' onClick={() => setB((b) => b + 1)}>
        Increment B
      </button>
    </div>
  );
}

// Test component with concurrent features
export function TestConcurrentFeatures(): JSX.Element {
  useSignals();

  const [isPending, startTransition] = useTransition();

  const [tab, setTab] = useState('home');

  const deferredTab = useDeferredValue(tab);

  const dataSignal = signal<Record<string, unknown> | null>(null);

  // Should warn - effect with deferred value
  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      dataSignal.value = { tab: deferredTab, data: `Data for ${deferredTab}` }; // Should warn
    }, 1000);

    return () => clearTimeout(timer);
  }, [deferredTab]);

  const selectTab = useCallback((newTab: string) => {
    startTransition(() => {
      setTab(newTab);
    });
  }, []);

  return (
    <div>
      <div style={{ opacity: isPending ? 0.5 : 1 }}>
        {dataSignal.value ? JSON.stringify(dataSignal.value) : 'Loading...'}
      </div>

      <button type='button' onClick={() => selectTab('home')}>
        Home
      </button>

      <button type='button' onClick={() => selectTab('about')}>
        About
      </button>

      <button type='button' onClick={() => selectTab('contact')}>
        Contact
      </button>
    </div>
  );
}

// Test component with refs and effects
export function TestRefsAndEffects(): JSX.Element {
  useSignals();

  const countSignal = signal(0);

  const buttonRef = useRef<HTMLButtonElement>(null);

  const [clickCount, setClickCount] = useState(0);

  // Should warn - effect with ref and signal assignment
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const handleClick = () => {
      countSignal.value += 1; // Should warn - signal assignment in effect
      setClickCount((c) => c + 1);
    };

    button.addEventListener('click', handleClick);

    return () => {
      return button.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <div>
      <div>Signal Count: {countSignal}</div>

      <div>Click Count: {clickCount}</div>

      <button type='button' ref={buttonRef}>
        Increment Both
      </button>
    </div>
  );
}

// Test component with cleanup functions
export function TestEffectCleanup(): JSX.Element {
  useSignals();

  const countSignal = signal(0);
  const [isActive, setIsActive] = useState(true);

  // Should warn - signal assignment in cleanup
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const timer = globalThis.setInterval(() => {
      countSignal.value += 1;
    }, 1000);

    return () => {
      globalThis.clearInterval(timer);
      countSignal.value = 0; // Should warn - signal assignment in cleanup
    };
  }, [isActive]);

  return (
    <div>
      <div>Count: {countSignal}</div>
      <button type='button' onClick={() => setIsActive((a) => !a)}>
        {isActive ? 'Stop' : 'Start'}
      </button>
    </div>
  );
}

// Memoized component with effects
const MemoizedComponent = memo(
  ({ id, onUpdate }: { id: number; onUpdate: (id: number) => void }) => {
    useSignals();
    const dataSignal = signal<Record<string, unknown> | null>(null);

    // Should warn - signal assignment in memo component effect
    useEffect(() => {
      fetch(`https://api.example.com/items/${id}`)
        .then((res) => res.json())
        .then((data) => {
          dataSignal.value = data; // Should warn
          onUpdate(id);
        });
    }, [id, onUpdate]);

    return (
      <div>
        Item {id}: {JSON.stringify(dataSignal.value)}
      </div>
    );
  }
);

// Test component with memoized child
export function TestMemoizedComponent(): JSX.Element {
  const [id, setId] = useState(1);
  const [lastUpdatedId, setLastUpdatedId] = useState<number | null>(null);

  const handleUpdate = useCallback((updatedId: number) => {
    setLastUpdatedId(updatedId);
  }, []);

  return (
    <div>
      <MemoizedComponent id={id} onUpdate={handleUpdate} />

      <div>Last Updated ID: {lastUpdatedId ?? 'None'}</div>

      <button type='button' onClick={() => setId((i) => i + 1)}>
        Next Item
      </button>
    </div>
  );
}

// Test component for custom signal names
export function TestCustomSignalNames(): JSX.Element {
  useSignals();

  // These should be ignored because we'll configure custom signal names
  const customSignal1 = signal(0);
  const customSignal2 = signal('test');

  useEffect(() => {
    // These assignments should be ignored due to custom signal names
    customSignal1.value = 42;
    customSignal2.value = 'updated';
  }, []);

  return (
    <div>
      <div>Signal 1: {customSignal1}</div>
      <div>Signal 2: {customSignal2}</div>
    </div>
  );
}

// Test component for custom severity levels
export function TestCustomSeverity(): JSX.Element {
  useSignals();

  const warningSignal = signal(0);
  const errorSignal = signal('test');

  useEffect(() => {
    // These should have different severity levels configured
    warningSignal.value = 42; // Should be 'warn'
    errorSignal.value = 'error'; // Should be 'error'
  }, []);

  return (
    <div>
      <div>Warning: {warningSignal}</div>
      <div>Error: {errorSignal}</div>
    </div>
  );
}

// Test configuration for custom options
export const customOptionsConfig = {
  rules: {
    'react-signals-hooks/no-signal-assignment-in-effect': [
      'error',
      {
        signalNames: ['customSignal1', 'customSignal2'],
        severity: {
          warning: 'warn',
          error: 'error',
        },
      },
    ],
  },
};

// Test component for file/pattern-based disabling
export function TestFilePatternDisable(): JSX.Element {
  useSignals();

  const testSignal = signal(0);

  useEffect(() => {
    // This would be ignored in test files
    testSignal.value = 42;
  }, []);

  return <div>{testSignal}</div>;
}

export const filePatternConfig = {
  rules: {
    'react-signals-hooks/no-signal-assignment-in-effect': [
      'error',
      {
        disableInTestFiles: true,
      },
    ],
  },
};

// Mock implementations for demonstration
function useSignalsEffect(
  effect: (() => () => void) | (() => void),
  deps?: unknown[] | undefined
): void {
  useEffect(() => {
    const cleanup = effect();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, deps);
}

function useSignalsLayoutEffect(
  effect: (() => void) | (() => () => void),
  deps?: unknown[] | undefined
): void {
  useLayoutEffect(() => {
    const cleanup = effect();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, deps);
}
