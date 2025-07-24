import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
// biome-ignore lint/correctness/noUnusedImports: false positive
import React, { useState, useEffect, useCallback, type JSX, useLayoutEffect } from 'react';

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  useEffect(() => {
    if (!isRunning) return;

    const interval = globalThis.setInterval(() => {
      countSignal.value += 1; // Should warn - direct assignment in effect
    }, 1000);

    return () => {
      return globalThis.clearInterval(interval);
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
    // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
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

    // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  }, deps);
}
