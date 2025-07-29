// oxlint-disable no-unused-vars
/* eslint-disable react-signals-hooks/restrict-signal-locations */
/** biome-ignore-all lint/correctness/noUnusedVariables: <explanation> */
/** biome-ignore-all lint/correctness/useExhaustiveDependencies: not relevant */
import { type JSX, useCallback, useEffect, useState } from 'react';
import { signal, batch } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';

// This component should trigger ESLint warning for multiple signal updates without batching
export function TestMultipleSignalUpdates(): JSX.Element {
  useSignals();

  const countSignal = signal(0);
  const nameSignal = signal('John');
  const activeSignal = signal(false);

  const handleClick = useCallback(() => {
    // Should trigger warning - multiple signal updates without batching
    countSignal.value += 1;
    nameSignal.value = 'Doe';
    activeSignal.value = true;
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <div>Name: {nameSignal}</div>

      <div>Active: {activeSignal.toString()}</div>

      <button type='button' onClick={handleClick}>
        Update All
      </button>
    </div>
  );
}

// This component should NOT trigger warning - using batch for multiple signal updates
export function TestBatchSignalUpdates(): JSX.Element {
  useSignals();

  const countSignal = signal(0);
  const nameSignal = signal('John');
  const activeSignal = signal(false);

  const handleClick = useCallback(() => {
    // Correct - using batch for multiple signal updates
    batch(() => {
      countSignal.value += 1;

      nameSignal.value = 'Doe';

      activeSignal.value = true;
    });
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <div>Name: {nameSignal}</div>

      <div>Active: {activeSignal.toString()}</div>

      <button type='button' onClick={handleClick}>
        Update All
      </button>
    </div>
  );
}

// This component should trigger warning for nested signal updates without batching
export function TestNestedSignalUpdates(): JSX.Element {
  useSignals();

  const userSignal = signal<{ id: number; name: string; active: boolean }>({
    id: 1,
    name: 'John',
    active: false,
  });

  const countSignal = signal(0);

  const handleClick = useCallback(() => {
    // Should trigger warning - multiple signal updates without batching
    userSignal.value = { ...userSignal.value, name: 'Doe' };

    countSignal.value += 1;

    userSignal.value = { ...userSignal.value, active: true };
  }, []);

  return (
    <div>
      <div>User: {JSON.stringify(userSignal.value)}</div>
      <div>Count: {countSignal}</div>
      <button type='button' onClick={handleClick}>
        Update User
      </button>
    </div>
  );
}

// This component should NOT trigger warning - single signal update
export function TestSingleSignalUpdate(): JSX.Element {
  useSignals();
  const countSignal = signal(0);

  const handleClick = useCallback(() => {
    // Correct - single signal update doesn't need batching
    countSignal.value += 1;
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>
      <button type='button' onClick={handleClick}>
        Increment
      </button>
    </div>
  );
}

// This component should trigger warning for multiple signal updates in useEffect
export function TestMultipleUpdatesInEffect(): JSX.Element {
  useSignals();
  const countSignal = signal(0);
  const nameSignal = signal('John');

  // Should trigger warning - multiple signal updates in useEffect without batching

  useEffect(() => {
    countSignal.value = 10;
    nameSignal.value = 'Doe';
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>
      <div>Name: {nameSignal}</div>
    </div>
  );
}

// This component should NOT trigger warning - multiple signal updates in batch callback
export function TestBatchInCallback(): JSX.Element {
  useSignals();
  const countSignal = signal(0);
  const nameSignal = signal('John');

  const updateSignals = useCallback(() => {
    // Correct - using batch in a callback
    batch(() => {
      countSignal.value = 10;
      nameSignal.value = 'Doe';
    });
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <div>Name: {nameSignal}</div>

      <button type='button' onClick={updateSignals}>
        Update
      </button>
    </div>
  );
}

// This component should trigger warning for multiple signal updates in a loop
export function TestSignalUpdatesInLoop(): JSX.Element {
  useSignals();
  const itemsSignal = signal([1, 2, 3]);

  const doubleItems = useCallback(() => {
    // Should trigger warning - multiple signal updates in loop without batching
    for (let i = 0; i < itemsSignal.value.length; i++) {
      itemsSignal.value[i] *= 2;
    }
  }, []);

  return (
    <div>
      <div>Items: {itemsSignal.value.join(', ')}</div>

      <button type='button' onClick={doubleItems}>
        Double Items
      </button>
    </div>
  );
}

// This component should NOT trigger warning - single signal update with array mutation
export function TestSingleArrayUpdate(): JSX.Element {
  useSignals();

  const itemsSignal = signal([1, 2, 3]);

  const addItem = useCallback(() => {
    // Correct - single signal update with array mutation
    itemsSignal.value = [...itemsSignal.value, itemsSignal.value.length + 1];
  }, []);

  return (
    <div>
      <div>Items: {itemsSignal.value.join(', ')}</div>

      <button type='button' onClick={addItem}>
        Add Item
      </button>
    </div>
  );
}

// This component should trigger warning for multiple signal updates in a conditional
export function TestConditionalSignalUpdates(): JSX.Element {
  useSignals();

  const countSignal = signal(0);
  const nameSignal = signal('John');
  const [isAdmin, setIsAdmin] = useState(false);

  const updateUser = useCallback(() => {
    if (isAdmin) {
      // Should trigger warning - multiple signal updates without batching
      countSignal.value = 100;
      nameSignal.value = 'Admin';
    } else {
      countSignal.value = 1;
      nameSignal.value = 'User';
    }
  }, [isAdmin]);

  return (
    <div>
      <div>Count: {countSignal}</div>
      <div>Name: {nameSignal}</div>
      <div>Is Admin: {isAdmin.toString()}</div>
      <button type='button' onClick={() => setIsAdmin(!isAdmin)}>
        Toggle Admin
      </button>
      <button type='button' onClick={updateUser}>
        Update User
      </button>
    </div>
  );
}

// This component should NOT trigger warning - multiple signal updates in batch within conditional
export function TestBatchInConditional(): JSX.Element {
  useSignals();
  const countSignal = signal(0);
  const nameSignal = signal('John');
  const [isAdmin, setIsAdmin] = useState(false);

  const updateUser = useCallback(() => {
    if (isAdmin) {
      // Correct - using batch within conditional
      batch(() => {
        countSignal.value = 100;
        nameSignal.value = 'Admin';
      });
    } else {
      // Single update doesn't need batching
      countSignal.value = 1;
      nameSignal.value = 'User';
    }
  }, [isAdmin]);

  const toggleAdmin = useCallback(() => {
    setIsAdmin((prev) => !prev);
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <div>Name: {nameSignal}</div>

      <div>Is Admin: {isAdmin.toString()}</div>

      <button type='button' onClick={toggleAdmin}>
        Toggle Admin
      </button>

      <button type='button' onClick={updateUser}>
        Update User
      </button>
    </div>
  );
}

// Test component for custom batch function names
export function TestCustomBatchFunction(): JSX.Element {
  useSignals();

  const countSignal = signal(0);
  const nameSignal = signal('John');

  // This should use a custom batch function name
  const handleClick = useCallback(() => {
    customBatchFunction(() => {
      countSignal.value += 1;
      nameSignal.value = 'Doe';
    });
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <div>Name: {nameSignal}</div>

      <button type='button' onClick={handleClick}>
        Update with Custom Batch
      </button>
    </div>
  );
}

// Mock custom batch function
function customBatchFunction(fn: () => void): void {
  fn();
}

// Test component for custom severity levels
export function TestCustomSeverity(): JSX.Element {
  useSignals();

  const warningSignal1 = signal(0);
  const warningSignal2 = signal(1);
  const errorSignal1 = signal('a');
  const errorSignal2 = signal('b');

  // These should have different severity levels configured
  const handleWarningClick = useCallback(() => {
    warningSignal1.value += 1;
    warningSignal2.value += 1; // Should be 'warn'
  }, []);

  const handleErrorClick = useCallback(() => {
    errorSignal1.value += 'x';
    errorSignal2.value += 'y'; // Should be 'error'
  }, []);

  return (
    <div>
      <div>
        Warning Signals: {warningSignal1}, {warningSignal2}
      </div>
      <div>
        Error Signals: {errorSignal1}, {errorSignal2}
      </div>
      <button type='button' onClick={handleWarningClick}>
        Trigger Warning
      </button>
      <button type='button' onClick={handleErrorClick}>
        Trigger Error
      </button>
    </div>
  );
}

// Test configuration for custom options
export const customOptionsConfig = {
  rules: {
    'react-signals-hooks/prefer-batch-updates': [
      'error',
      {
        batchFunctionNames: ['customBatchFunction', 'anotherBatchFunction'],
        severity: {
          warning: 'warn',
          error: 'error',
        },
        ignoreSingleUpdates: true,
      },
    ],
  },
};

// Test component for file/pattern-based disabling
export function TestFilePatternDisable(): JSX.Element {
  useSignals();

  const signal1 = signal(0);
  const signal2 = signal(1);

  // This would be ignored in test files
  const handleClick = useCallback(() => {
    signal1.value += 1;
    signal2.value += 1;
  }, []);

  return (
    <div>
      <div>Signal 1: {signal1}</div>
      <div>Signal 2: {signal2}</div>
      <button type='button' onClick={handleClick}>
        Update Without Batch
      </button>
    </div>
  );
}

export const filePatternConfig = {
  rules: {
    'react-signals-hooks/prefer-batch-updates': [
      'error',
      {
        disableInTestFiles: true,
      },
    ],
  },
};

// Test component for minimum updates threshold
export function TestMinimumUpdatesThreshold(): JSX.Element {
  useSignals();

  const signal1 = signal(0);
  const signal2 = signal(1);

  // This should not trigger the rule because of minimumUpdatesThreshold
  const handleClick = useCallback(() => {
    signal1.value += 1;
    signal2.value += 1;
  }, []);

  return (
    <div>
      <div>Signal 1: {signal1}</div>
      <div>Signal 2: {signal2}</div>
      <button type='button' onClick={handleClick}>
        Update Signals
      </button>
    </div>
  );
}

export const minimumUpdatesConfig = {
  rules: {
    'react-signals-hooks/prefer-batch-updates': [
      'error',
      {
        minimumUpdatesThreshold: 3, // Require at least 3 updates before warning
      },
    ],
  },
};

// Test component for single update scenario (should not warn)
export function TestSingleUpdateScenario(): JSX.Element {
  useSignals();
  const countSignal = signal(0);

  // Single update - no batching needed
  const handleClick = useCallback(() => {
    countSignal.value += 1; // Single update - batching not needed
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>
      <button type='button' onClick={handleClick}>
        Increment
      </button>
    </div>
  );
}

// Test component for independent components scenario (should not warn)
export function TestIndependentComponents(): JSX.Element {
  return (
    <div>
      <ComponentA />
      <ComponentB />
    </div>
  );
}

function ComponentA() {
  useSignals();
  const aSignal = signal('A');

  // Independent update - no need to batch with ComponentB's update
  const handleClick = useCallback(() => {
    aSignal.value = 'Updated A';
  }, []);

  return (
    <div>
      <div>Component A: {aSignal}</div>
      <button type='button' onClick={handleClick}>
        Update A
      </button>
    </div>
  );
}

function ComponentB() {
  useSignals();
  const bSignal = signal('B');

  // Independent update - no need to batch with ComponentA's update
  const handleClick = useCallback(() => {
    bSignal.value = 'Updated B';
  }, []);

  return (
    <div>
      <div>Component B: {bSignal}</div>
      <button type='button' onClick={handleClick}>
        Update B
      </button>
    </div>
  );
}

// Test component for performance critical paths (should not warn)
export function TestPerformanceCriticalPath(): JSX.Element {
  useSignals();
  const processedCount = signal(0);

  // Performance critical loop - avoid batching overhead
  const processBatch = useCallback(() => {
    for (let i = 0; i < 1000; i++) {
      // Avoid batching overhead in tight loops
      processedCount.value = i;
      // Simulate processing
      const result = Math.sqrt(i) * Math.random();
    }
  }, []);

  return (
    <div>
      <div>Processed: {processedCount}</div>
      <button type='button' onClick={processBatch}>
        Process Batch
      </button>
    </div>
  );
}

// Test component for testing environments (should not warn)
export function TestSignalInTestEnvironment(): JSX.Element {
  useSignals();
  const testSignal = signal('initial');

  // Test individual signal updates - no batching needed in tests
  const runTest = useCallback(() => {
    testSignal.value = 'test';
    console.assert(testSignal.value === 'test', 'Test failed');

    // Reset for next test
    testSignal.value = 'reset';
  }, []);

  return (
    <div>
      <div>Test Signal: {testSignal}</div>
      <button type='button' onClick={runTest}>
        Run Test
      </button>
    </div>
  );
}

// Test component for async operations (should not warn about missing batching across async)
export function TestAsyncOperations(): JSX.Element {
  useSignals();
  const loadingSignal = signal(false);
  const dataSignal = signal<string | null>(null);
  const errorSignal = signal<Error | null>(null);

  const fetchData = useCallback(async () => {
    // These will be batched together
    batch(() => {
      loadingSignal.value = true;
      errorSignal.value = null;
    });

    try {
      // Simulate API call
      const result = await new Promise<string>((resolve) => {
        setTimeout(() => resolve('Sample Data'), 100);
      });

      // These will be batched together
      batch(() => {
        dataSignal.value = result;
        loadingSignal.value = false;
      });
    } catch (err) {
      // These will be batched together
      batch(() => {
        errorSignal.value = err as Error;
        loadingSignal.value = false;
      });
    }
  }, []);

  return (
    <div>
      <div>Loading: {loadingSignal.value.toString()}</div>
      <div>Data: {dataSignal.value || 'No data'}</div>
      {errorSignal.value && <div>Error: {errorSignal.value.message}</div>}
      <button type='button' onClick={fetchData} disabled={loadingSignal.value}>
        {loadingSignal ? 'Loading...' : 'Fetch Data'}
      </button>
    </div>
  );
}
