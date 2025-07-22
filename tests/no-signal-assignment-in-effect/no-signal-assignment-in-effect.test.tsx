import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
// biome-ignore lint/correctness/noUnusedImports: false positive
import React, { useState, useEffect, useCallback, type JSX } from 'react';

// This component should trigger a warning - direct signal assignment in useEffect without dependencies
export function TestDirectSignalAssignmentInEffect(): JSX.Element {
  useSignals();

  const countSignal = signal(0);
  const [otherState, setOtherState] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
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
    const interval = setInterval(() => {
      countSignal.value += 1; // Should warn - direct assignment in effect
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div>Count: {countSignal}</div>
      <div>State: {otherState}</div>
      <button type='button' onClick={() => setOtherState((s) => s + 1)}>
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

    const interval = setInterval(() => {
      // OK - using useSignals for reactive updates
      countSignal.value += 1;
    }, 1000);

    return () => clearInterval(interval);
  }, [start]);

  return (
    <div>
      <div>Count: {countSignal}</div>
      <button type='button' onClick={() => setStart((s) => !s)}>
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

  return (
    <div>
      <div>Count: {countSignal}</div>
      <button type='button' onClick={() => setOtherState((c) => c + 1)}>
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

  return (
    <div>
      <div>Count: {countSignal}</div>
      <button type='button' onClick={() => setOtherState((c) => c + 1)}>
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

    const interval = setInterval(() => {
      countSignal.value += 1; // Should warn - direct assignment in effect
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div>
      <div>Count: {countSignal}</div>
      <button type='button' onClick={() => setIsRunning((r) => !r)}>
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
    if (!isRunning) return;

    const interval = setInterval(() => {
      // OK - using useSignalsEffect
      countSignal.value += 1;
    }, 1000);

    return () => clearInterval(interval);
  });

  return (
    <div>
      <div>Count: {countSignal}</div>
      <button type='button' onClick={() => setIsRunning((r) => !r)}>
        {isRunning ? 'Stop' : 'Start'}
      </button>
    </div>
  );
}

// Mock implementations for demonstration
function useSignalsEffect(effect: () => void | (() => void), deps?: any[]) {
  useEffect(() => {
    const cleanup = effect();
    return () => {
      if (cleanup) cleanup();
    };
  }, deps);
}

function useSignalsLayoutEffect(effect: () => void | (() => void), deps?: any[]) {
  useLayoutEffect(() => {
    const cleanup = effect();
    return () => {
      if (cleanup) cleanup();
    };
  }, deps);
}
