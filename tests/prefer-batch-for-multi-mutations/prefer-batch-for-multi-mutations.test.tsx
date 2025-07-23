// biome-ignore lint/correctness/noUnusedImports: false positive
import React, { type JSX, useCallback } from 'react';
import { signal, batch } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';

// This component should trigger ESLint warning for multiple signal mutations outside batch
export function TestMultipleMutationsOutsideBatch(): JSX.Element {
  useSignals();

  const countSignal = signal(0);
  const nameSignal = signal('');
  const itemsSignal = signal<string[]>([]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const handleClick = useCallback(() => {
    // These should trigger a warning - multiple mutations outside batch
    countSignal.value += 1;

    nameSignal.value = 'Updated';

    itemsSignal.value = [...itemsSignal.value, 'new item'];
  }, [itemsSignal.value]);

  return (
    <div>
      <button type='button' onClick={handleClick}>
        Update
      </button>

      <div>Count: {countSignal}</div>

      <div>Name: {nameSignal}</div>

      <div>Items: {itemsSignal.value.join(', ')}</div>
    </div>
  );
}

// This component should NOT trigger warning - uses batch for multiple mutations
export function TestBatchUsage(): JSX.Element {
  useSignals();

  const countSignal = signal(0);
  const nameSignal = signal('');
  const itemsSignal = signal<string[]>([]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const handleClick = useCallback(() => {
    // This should NOT trigger a warning - uses batch
    batch(() => {
      countSignal.value += 1;
      nameSignal.value = 'Updated';
      itemsSignal.value = [...itemsSignal.value, 'new item'];
    });
  }, [itemsSignal.value]);

  return (
    <div>
      <button type='button' onClick={handleClick}>
        Update
      </button>

      <div>Count: {countSignal}</div>

      <div>Name: {nameSignal}</div>

      <div>Items: {itemsSignal.value.join(', ')}</div>
    </div>
  );
}

// This component should NOT trigger warning - only one signal mutation
export function TestSingleMutation(): JSX.Element {
  useSignals();
  const countSignal = signal(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const handleClick = useCallback(() => {
    // This should NOT trigger a warning - only one mutation
    countSignal.value += 1;
  }, []);

  return (
    <div>
      <button type='button' onClick={handleClick}>
        Increment
      </button>
      <div>Count: {countSignal}</div>
    </div>
  );
}

// This component should trigger warning for multiple mutations in different scopes
export function TestMultipleMutationsInDifferentScopes(): JSX.Element {
  useSignals();
  const countSignal = signal(0);
  const nameSignal = signal('');

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const updateCount = useCallback(() => {
    countSignal.value += 1;
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const updateName = useCallback(() => {
    nameSignal.value = 'Updated';
  }, []);

  const handleClick = useCallback(() => {
    // These should trigger a warning - multiple mutations in same function call
    updateCount();
    updateName();
  }, [updateCount, updateName]);

  return (
    <div>
      <button type='button' onClick={handleClick}>
        Update
      </button>
      <div>Count: {countSignal}</div>
      <div>Name: {nameSignal}</div>
    </div>
  );
}

// This component should NOT trigger warning - mutations in separate event handlers
export function TestSeparateEventHandlers(): JSX.Element {
  useSignals();

  const countSignal = signal(0);

  const nameSignal = signal('');

  const handleIncrement = () => {
    countSignal.value += 1;
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const handleUpdateName = useCallback(() => {
    nameSignal.value = 'Updated';
  }, []);

  return (
    <div>
      <button type='button' onClick={handleIncrement}>
        Increment
      </button>

      <button type='button' onClick={handleUpdateName}>
        Update Name
      </button>

      <div>Count: {countSignal}</div>

      <div>Name: {nameSignal}</div>
    </div>
  );
}
