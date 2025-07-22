import { computed } from '@preact/signals-react';
import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import React, { useState, useEffect, useCallback, type JSX, type ChangeEventHandler } from 'react';

// This component should trigger a warning - using useState when it could use signal
export function TestUseStateCounter(): JSX.Element {
  useSignals();

  const [count, setCount] = useState(0); // Should warn to use signal instead

  const onClick = useCallback((): void => {
    setCount((c) => c + 1);
  }, []);

  return (
    <div>
      <div>Count: {count}</div>

      <button type='button' onClick={onClick}>
        Increment
      </button>
    </div>
  );
}

// This component should NOT trigger warning - using signal instead of useState
export function TestSignalCounter(): JSX.Element {
  useSignals();

  const countSignal = signal(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onClick = useCallback((): void => {
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

// This component should trigger a warning - multiple useState hooks that could be combined in a signal
export function TestMultipleUseState(): JSX.Element {
  useSignals();

  const [firstName, _setFirstName] = useState(''); // Should warn
  const [lastName, _setLastName] = useState(''); // Should warn
  const [age, setAge] = useState(0); // Should warn

  const onClick = useCallback((): void => {
    setAge((a) => a + 1);
  }, []);

  return (
    <div>
      <div>
        Name: {firstName} {lastName}
      </div>

      <div>Age: {age}</div>

      <button type='button' onClick={onClick}>
        Have Birthday
      </button>
    </div>
  );
}

// This component should NOT trigger warning - using signal for related state
export function TestSignalForRelatedState(): JSX.Element {
  useSignals();

  const userSignal = signal({
    firstName: '',
    lastName: '',
    age: 0,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onClick = useCallback((): void => {
    userSignal.value = { ...userSignal.value, age: userSignal.value.age + 1 };
  }, [userSignal.value]);

  return (
    <div>
      <div>
        Name: {userSignal.value.firstName} {userSignal.value.lastName}
      </div>

      <div>Age: {userSignal.value.age}</div>

      <button type='button' onClick={onClick}>
        Have Birthday
      </button>
    </div>
  );
}

// This component should trigger a warning - using useState with useEffect for derived state
export function TestDerivedStateWithUseEffect(): JSX.Element {
  useSignals();

  const [firstName, setFirstName] = useState(''); // Should warn
  const [lastName, setLastName] = useState(''); // Should warn
  const [fullName, setFullName] = useState(''); // Should warn - derived state

  useEffect(() => {
    setFullName(`${firstName} ${lastName}`.trim());
  }, [firstName, lastName]);

  return (
    <div>
      <div>Full Name: {fullName}</div>

      <input
        type='text'
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        placeholder='First name'
      />

      <input
        type='text'
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        placeholder='Last name'
      />
    </div>
  );
}

// This component should NOT trigger warning - using computed for derived state
export function TestComputedForDerivedState(): JSX.Element {
  useSignals();
  const firstNameSignal = signal('');
  const lastNameSignal = signal('');

  const fullNameSignal = computed<string>(() => {
    return `${firstNameSignal.value} ${lastNameSignal.value}`.trim();
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onChange1 = useCallback<ChangeEventHandler<HTMLInputElement>>((e) => {
    firstNameSignal.value = e.target.value;
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onChange2 = useCallback<ChangeEventHandler<HTMLInputElement>>((e) => {
    lastNameSignal.value = e.target.value;
  }, []);

  return (
    <div>
      <div>Full Name: {fullNameSignal}</div>

      <input
        type='text'
        value={firstNameSignal.value}
        onChange={onChange1}
        placeholder='First name'
      />

      <input
        type='text'
        value={lastNameSignal.value}
        onChange={onChange2}
        placeholder='Last name'
      />
    </div>
  );
}

// This component should NOT trigger warning - using useState for form state is acceptable
export function TestFormWithUseState(): JSX.Element {
  useSignals();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false,
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // Form submission logic
  }, []);

  const onChangeUsername = useCallback<ChangeEventHandler<HTMLInputElement>>((e) => {
    setFormData((d) => {
      return { ...d, username: e.target.value };
    });
  }, []);

  const onChangePassword = useCallback<ChangeEventHandler<HTMLInputElement>>((e) => {
    setFormData((d) => {
      return { ...d, password: e.target.value };
    });
  }, []);

  const onChangeRememberMe = useCallback<ChangeEventHandler<HTMLInputElement>>((e) => {
    setFormData((d) => {
      return { ...d, rememberMe: e.target.checked };
    });
  }, []);

  return (
    <form onSubmit={handleSubmit}>
      <input
        type='text'
        value={formData.username}
        onChange={onChangeUsername}
        placeholder='Username'
      />

      <input
        type='password'
        value={formData.password}
        onChange={onChangePassword}
        placeholder='Password'
      />

      <label>
        <input type='checkbox' checked={formData.rememberMe} onChange={onChangeRememberMe} />
        Remember me
      </label>

      <button type='submit'>Submit</button>
    </form>
  );
}

// This component should trigger a warning - using useState for simple toggle
export function TestToggleWithUseState(): JSX.Element {
  useSignals();

  const [isOpen, setIsOpen] = useState(false); // Should warn - simple toggle

  const onClick = useCallback(() => {
    setIsOpen((o) => !o);
  }, []);

  return (
    <div>
      <button type='button' onClick={onClick}>
        {isOpen ? 'Close' : 'Open'}
      </button>

      {isOpen ? <div>Content</div> : null}
    </div>
  );
}

// This component should NOT trigger warning - using signal for simple toggle
export function TestToggleWithSignal(): JSX.Element {
  useSignals();

  const isOpenSignal = signal(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onClick = useCallback(() => {
    isOpenSignal.value = !isOpenSignal.value;
  }, [isOpenSignal.value]);

  return (
    <div>
      <button type='button' onClick={onClick}>
        {isOpenSignal ? 'Close' : 'Open'}
      </button>

      {isOpenSignal ? <div>Content</div> : null}
    </div>
  );
}
