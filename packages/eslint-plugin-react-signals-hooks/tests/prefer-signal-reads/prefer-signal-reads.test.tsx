import { signal, computed } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { type JSX, useCallback, useEffect } from 'react';
import { useState } from 'react';

// This component should trigger ESLint warning for direct signal usage in non-JSX context
export function TestDirectSignalUsage(): JSX.Element {
  useSignals();

  const countSignal = signal(0);
  const nameSignal = signal('John');
  const isActiveSignal = signal(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const handleClick = useCallback(() => {
    // Should trigger warning - direct signal usage in non-JSX context
    const currentCount = countSignal; // Should be countSignal.value
    const currentName = nameSignal; // Should be nameSignal.value
    const isActive = isActiveSignal; // Should be isActiveSignal.value

    console.info(currentCount, currentName, isActive);
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <div>Name: {nameSignal}</div>

      <div>Active: {isActiveSignal.toString()}</div>

      <button type='button' onClick={handleClick}>
        Log Values
      </button>
    </div>
  );
}

// This component should NOT trigger warning - using .value in non-JSX context
export function TestCorrectSignalReads(): JSX.Element {
  useSignals();

  const countSignal = signal(0);
  const nameSignal = signal('John');
  const isActiveSignal = signal(false);

  const handleClick = useCallback(() => {
    // Correct - using .value in non-JSX context
    const currentCount = countSignal.value;
    const currentName = nameSignal.value;
    const isActive = isActiveSignal.value;

    console.info(currentCount, currentName, isActive);
  }, [countSignal.value, isActiveSignal.value, nameSignal.value]);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <div>Name: {nameSignal}</div>

      <div>Active: {isActiveSignal.toString()}</div>

      <button type='button' onClick={handleClick}>
        Log Values
      </button>
    </div>
  );
}

// This component should trigger warning for direct signal usage in effect
export function TestSignalInEffect(): JSX.Element {
  useSignals();

  const countSignal = signal(0);

  // Should trigger warning - direct signal usage in effect
  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  useEffect(() => {
    console.info('Current count:', countSignal); // Should be countSignal.value
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onClick = useCallback(() => {
    countSignal.value++;
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <button type='button' onClick={onClick}>
        Increment
      </button>
    </div>
  );
}

// This component should NOT trigger warning - using .value in effect
export function TestCorrectSignalInEffect(): JSX.Element {
  useSignals();

  const countSignal = signal(0);

  // Correct - using .value in effect
  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  useEffect(() => {
    console.info('Current count:', countSignal.value);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onClick = useCallback(() => {
    countSignal.value++;
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <button type='button' onClick={onClick}>
        Increment
      </button>
    </div>
  );
}

// This component should trigger warning for direct signal usage in computed
export function TestSignalInComputed(): JSX.Element {
  useSignals();

  const firstNameSignal = signal('John');
  const lastNameSignal = signal('Doe');

  // Should trigger warning - direct signal usage in computed
  const fullNameSignal = computed(() => {
    return `${firstNameSignal} ${lastNameSignal}`; // Should be firstNameSignal.value and lastNameSignal.value
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onClick = useCallback(() => {
    firstNameSignal.value = 'Jane';
    lastNameSignal.value = 'Smith';
  }, []);

  return (
    <div>
      <div>Full Name: {fullNameSignal}</div>

      <button type='button' onClick={onClick}>
        Change Name
      </button>
    </div>
  );
}

// This component should NOT trigger warning - using .value in computed
export function TestCorrectSignalInComputed(): JSX.Element {
  useSignals();

  const firstNameSignal = signal('John');
  const lastNameSignal = signal('Doe');

  // Correct - using .value in computed
  const fullNameSignal = computed(() => {
    return `${firstNameSignal.value} ${lastNameSignal.value}`;
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onClick = useCallback(() => {
    firstNameSignal.value = 'Jane';
    lastNameSignal.value = 'Smith';
  }, []);

  return (
    <div>
      <div>Full Name: {fullNameSignal}</div>

      <button type='button' onClick={onClick}>
        Change Name
      </button>
    </div>
  );
}

// This component should trigger warning for direct signal usage in callback
export function TestSignalInCallback(): JSX.Element {
  useSignals();

  const countSignal = signal(0);
  const multiplierSignal = signal(2);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const calculateTotal = useCallback(() => {
    // Should trigger warning - direct signal usage in callback
    // @ts-expect-error you can't multiply objects in typescript obviously :)
    return countSignal * multiplierSignal; // Should be .value for both
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onIncrementClick = useCallback(() => {
    countSignal.value++;
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onIncrementMultiplierClick = useCallback(() => {
    multiplierSignal.value++;
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <div>Multiplier: {multiplierSignal}</div>

      <div>Total: {calculateTotal()}</div>

      <button type='button' onClick={onIncrementClick}>
        Increment Count
      </button>

      <button type='button' onClick={onIncrementMultiplierClick}>
        Increment Multiplier
      </button>
    </div>
  );
}

// This component should NOT trigger warning - using .value in callback
export function TestCorrectSignalInCallback(): JSX.Element {
  useSignals();

  const countSignal = signal(0);
  const multiplierSignal = signal(2);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const calculateTotal = useCallback(() => {
    // Correct - using .value in callback
    return countSignal.value * multiplierSignal.value;
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onIncrementCountClick = useCallback(() => {
    countSignal.value++;
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onIncrementMultiplierClick = useCallback(() => {
    multiplierSignal.value++;
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>

      <div>Multiplier: {multiplierSignal}</div>

      <div>Total: {calculateTotal()}</div>

      <button type='button' onClick={onIncrementCountClick}>
        Increment Count
      </button>

      <button type='button' onClick={onIncrementMultiplierClick}>
        Increment Multiplier
      </button>
    </div>
  );
}

// This component should trigger warning for direct signal usage in conditional
export function TestSignalInConditional(): JSX.Element {
  useSignals();

  const userSignal = signal<{ name: string; age: number }>({ name: 'John', age: 30 });

  const [_isAdmin, setIsAdmin] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const getUserStatus = useCallback(() => {
    // Should trigger warning - direct signal usage in conditional
    if (userSignal) {
      // Should be userSignal.value
      return 'User exists';
    }

    return 'No user';
  }, []);

  const onToggleAdminClick = useCallback(() => {
    setIsAdmin((prev) => !prev);
  }, []);

  return (
    <div>
      <div>Name: {userSignal.value.name}</div>

      <div>Age: {userSignal.value.age}</div>

      <div>Status: {getUserStatus()}</div>

      <button type='button' onClick={onToggleAdminClick}>
        Toggle Admin
      </button>
    </div>
  );
}

// This component should NOT trigger warning - using .value in conditional
export function TestCorrectSignalInConditional(): JSX.Element {
  useSignals();

  const userSignal = signal<{ name: string; age: number }>({ name: 'John', age: 30 });

  const [_isAdmin, setIsAdmin] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const getUserStatus = useCallback(() => {
    // Correct - using .value in conditional
    if (userSignal.value) {
      return 'User exists';
    }

    return 'No user';
  }, []);

  const onToggleAdminClick = useCallback(() => {
    setIsAdmin((prev) => !prev);
  }, []);

  return (
    <div>
      <div>Name: {userSignal.value.name}</div>

      <div>Age: {userSignal.value.age}</div>

      <div>Status: {getUserStatus()}</div>

      <button type='button' onClick={onToggleAdminClick}>
        Toggle Admin
      </button>
    </div>
  );
}
