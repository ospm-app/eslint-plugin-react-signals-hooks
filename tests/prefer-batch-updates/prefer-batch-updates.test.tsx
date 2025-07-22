// biome-ignore lint/correctness/noUnusedImports: false positive
import React, { type JSX, useCallback, useEffect, useState } from 'react';
import { signal, batch } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';

// This component should trigger ESLint warning for multiple signal updates without batching
export function TestMultipleSignalUpdates(): JSX.Element {
  useSignals();

  const countSignal = signal(0);
  const nameSignal = signal('John');
  const activeSignal = signal(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
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
