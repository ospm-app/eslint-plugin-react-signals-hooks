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
