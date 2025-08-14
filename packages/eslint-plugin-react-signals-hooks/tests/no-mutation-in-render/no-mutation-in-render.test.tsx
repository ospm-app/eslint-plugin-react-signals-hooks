/** biome-ignore-all lint/correctness/useExhaustiveDependencies: relevant,but we testing eslint */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: off */
/** biome-ignore-all lint/suspicious/noArrayIndexKey: not relevant */
/** biome-ignore-all lint/suspicious/noAssignInExpressions: relevant,but we testing eslint */
import {
  signal,
  type Signal,
  computed,
  signal as s,
  computed as cmp,
  effect as eff,
} from '@preact/signals-react';
import * as Signals from '@preact/signals-react';
import { useSignal, useSignals } from '@preact/signals-react/runtime';

import {
  useId,
  useMemo,
  Suspense,
  type JSX,
  useEffect,
  Component,
  StrictMode,
  forwardRef,
  useReducer,
  useCallback,
  type ErrorInfo,
  useTransition,
  type ReactNode,
  useLayoutEffect,
  type ChangeEvent,
  useDeferredValue,
  useImperativeHandle,
  useSyncExternalStore,
  // useRef,
  // useState,
  // useContext,
  // createContext,
} from 'react';
import { flushSync } from 'react-dom';

// This component should trigger ESLint warnings for signal mutation during render
export function TestMutationInRender(): JSX.Element {
  const store = useSignals(1);

  try {
    const counterSignal = signal(0);

    // This should trigger a warning - direct mutation during render
    counterSignal.value = 42;

    return <div>{counterSignal}</div>;
  } finally {
    store.f();
  }
}

// Component using aliased named imports for creators - should trigger warnings
export function TestAliasedCreators(): JSX.Element {
  const store = useSignals(1);

  try {
    const a = s(0);
    const c = cmp(() => a.value + 1);
    eff(() => {
      // effect body
    });

    // Direct assignment via aliased creator variable - should warn
    a.value = 5;

    // Compound update - should warn
    // @ts-expect-error
    c.value++;

    return <div>{a.value + c.value}</div>;
  } finally {
    store.f();
  }
}

// Component using namespace import for creators - should trigger warnings
export function TestNamespaceCreators(): JSX.Element {
  const store = useSignals(1);

  try {
    const ns = Signals.signal({ arr: [1, 2], n: 0 });

    // Mutating method on value - should warn
    ns.value.arr.push(3);

    // Update expression - should warn
    ns.value.n++;

    return <div>{ns.value.n}</div>;
  } finally {
    store.f();
  }
}

// This component should trigger warning for signal array mutation during render
export function TestArrayMutationInRender(): JSX.Element {
  const store = useSignals(1);

  try {
    const itemsSignal = signal<string[]>([]);

    // This should trigger a warning - array mutation during render
    itemsSignal.value[0] = 'new item';

    return <div>{itemsSignal.value.length}</div>;
  } finally {
    store.f();
  }
}

// This component should trigger warning for signal object mutation during render
export function TestObjectMutationInRender(): JSX.Element {
  const store = useSignals(1);

  try {
    const userSignal = signal({ name: 'John', age: 25 });

    // This should trigger a warning - object property mutation during render
    userSignal.value['name'] = 'Jane';

    return <div>{userSignal.value.name}</div>;
  } finally {
    store.f();
  }
}

// This component should trigger warning for increment/decrement during render
export function TestIncrementInRender(): JSX.Element {
  const store = useSignals(1);

  try {
    const counterSignal = signal(0);

    // These should trigger warnings - increment/decrement during render
    counterSignal.value++;
    ++counterSignal.value;
    counterSignal.value--;
    --counterSignal.value;

    return <div>{counterSignal}</div>;
  } finally {
    store.f();
  }
}

// This component should NOT trigger warnings - mutations in useEffect
export function TestMutationInEffect(): JSX.Element {
  const store = useSignals(1);

  try {
    const counterSignal = signal(0);

    useEffect(() => {
      // This should NOT trigger a warning - mutation inside useEffect
      counterSignal.value = 42;
      counterSignal.value++;
    }, [counterSignal.value]);

    return <div>{counterSignal}</div>;
  } finally {
    store.f();
  }
}

// This component should NOT trigger warnings - mutations in useCallback
export function TestMutationInCallback(): JSX.Element {
  const store = useSignals(1);

  try {
    const counterSignal = signal(0);

    const handleClick = useCallback(() => {
      // This should NOT trigger a warning - mutation inside useCallback
      counterSignal.value = counterSignal.value + 1;
    }, [counterSignal.value]);

    return (
      <button type='button' onClick={handleClick}>
        {counterSignal}
      </button>
    );
  } finally {
    store.f();
  }
}

// This component should NOT trigger warnings - mutations in useMemo
export function TestMutationInMemo(): JSX.Element {
  const store = useSignals(1);

  try {
    const dataSignal = signal<number[]>([]);

    const processedData = useMemo(() => {
      // This should NOT trigger a warning - mutation inside useMemo
      dataSignal.value = [1, 2, 3];
      return dataSignal.value.map((x) => x * 2);
    }, []);

    return <div>{processedData.length}</div>;
  } finally {
    store.f();
  }
}

// This component should NOT trigger warnings - mutations in event handlers
export function TestMutationInEventHandler(): JSX.Element {
  const store = useSignals(1);

  try {
    const messageSignal = signal('');

    const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
      const target = event.target as HTMLInputElement;
      // This should NOT trigger a warning - mutation in event handler
      messageSignal.value = target.value;
    }, []);

    return (
      <div>
        <input onChange={handleInputChange} />

        <span>{messageSignal}</span>
      </div>
    );
  } finally {
    store.f();
  }
}

// Arrow function component with mutation - should trigger warning
export const TestArrowFunctionMutation = (): JSX.Element => {
  const store = useSignals(1);

  try {
    const stateSignal = signal('initial');

    // This should trigger a warning - mutation during render in arrow function
    stateSignal.value = 'modified';

    return <div>{stateSignal}</div>;
  } finally {
    store.f();
  }
};

// Nested function with mutation - should trigger warning
export function TestNestedMutation(): JSX.Element {
  const store = useSignals(1);

  try {
    const flagSignal = signal(false);

    function nestedFunction() {
      // This should trigger a warning - mutation in nested function during render
      flagSignal.value = true;
    }

    nestedFunction();

    return <div>{flagSignal ? 'true' : 'false'}</div>;
  } finally {
    store.f();
  }
}

// Component with conditional mutation - should trigger warning
export function TestConditionalMutation(): JSX.Element {
  const store = useSignals(1);

  try {
    const counterSignal = signal(0);

    const shouldUpdate = true;

    if (shouldUpdate) {
      // This should trigger a warning - conditional mutation during render
      counterSignal.value = 100;
    }

    return <div>{counterSignal}</div>;
  } finally {
    store.f();
  }
}

// Component with mutation in try-catch - should trigger warning
export function TestMutationInTryCatch(): JSX.Element {
  const store = useSignals(1);

  try {
    const errorSignal = signal<string | null>(null);

    try {
      // This should trigger a warning - mutation in try block during render
      errorSignal.value = 'no error';
      // oxlint-disable-next-line no-unused-vars
    } catch (_error) {
      // This should also trigger a warning - mutation in catch block during render
      errorSignal.value = 'error occurred';
    }

    return <div>{errorSignal}</div>;
  } finally {
    store.f();
  }
}

// Class component with mutation in render - should trigger warning
export class ClassComponentWithMutation extends Component {
  private countSignal = signal(0);

  render() {
    // This should trigger a warning - mutation in class component render
    this.countSignal.value = 42;
    return <div>{this.countSignal}</div>;
  }
}

// Component with Map/Set mutations - should trigger warnings
export function TestComplexDataStructures(): JSX.Element {
  const store = useSignals(1);

  try {
    const mapSignal = signal(new Map<string, number>());
    const setSignal = signal(new Set<number>());

    // These should trigger warnings - mutations of complex data structures during render
    mapSignal.value.set('key', 42);
    setSignal.value.add(42);
    mapSignal.value.delete('key');
    setSignal.value.clear();

    return (
      <div>
        {mapSignal.value.size} {setSignal.value.size}
      </div>
    );
  } finally {
    store.f();
  }
}

// Component with nested signals - should trigger warning
export function TestNestedSignals(): JSX.Element {
  const store = useSignals(1);

  try {
    const nestedSignal = signal({
      count: signal(0),
      data: signal({
        items: signal<string[]>([]),
      }),
    });

    // These should trigger warnings - nested signal mutations during render
    nestedSignal.value.count.value = 42;
    nestedSignal.value.data.value.items.value.push('test');

    return <div>{nestedSignal.value.count}</div>;
  } finally {
    store.f();
  }
}

// Component with TypeScript type assertions - should trigger warning
export function TestTypeAssertions(): JSX.Element {
  const store = useSignals(1);

  try {
    const countSignal = signal<number | null>(0);
    const userSignal = signal<{ name: string; age: number } | null>(null);

    // Type assertions with mutations - should trigger warnings
    (countSignal as Signal<number>).value = 42;
    (userSignal as Signal<{ name: string }>).value = { name: 'John' };

    return <div>{(countSignal as Signal<number>).value}</div>;
  } finally {
    store.f();
  }
}

// Component with type guards - should trigger warning
export function TestTypeGuards(): JSX.Element {
  const store = useSignals(1);

  try {
    const dataSignal = signal<string | number>('test');

    // Type guard with mutation - should trigger warning
    if (typeof dataSignal.value === 'string') {
      dataSignal.value = 'modified';
    }

    return <div>{dataSignal.value}</div>;
  } finally {
    store.f();
  }
}

// Component with mutation in optional chaining - should trigger warning
export function TestOptionalChainingMutation(): JSX.Element {
  const store = useSignals(1);

  try {
    const userSignal = signal<{ name?: string } | null>(null);

    // This should trigger a warning - mutation in optional chaining
    userSignal.value?.name && (userSignal.value.name = 'Updated');

    return <div>{userSignal.value?.name || 'No name'}</div>;
  } finally {
    store.f();
  }
}

// Component with mutation in template literal - should trigger warning
export function TestTemplateLiteralMutation(): JSX.Element {
  const store = useSignals(1);

  try {
    const nameSignal = signal('Alice');
    const greeting = `Hello, ${(nameSignal.value = 'Bob')}`; // This should trigger a warning

    return <div>{greeting}</div>;
  } finally {
    store.f();
  }
}

// Component with mutation in array destructuring - should trigger warning
export function TestArrayDestructuringMutation(): JSX.Element {
  const store = useSignals(1);

  try {
    const signals = [signal(1), signal(2), signal(3)];

    // This should trigger a warning - mutation in array destructuring
    const [first] = signals.map((s, i) => (s.value = i));

    return <div>{first}</div>;
  } finally {
    store.f();
  }
}

// Component with mutation in object destructuring - should trigger warning
export function TestObjectDestructuringMutation(): JSX.Element {
  const store = useSignals(1);

  try {
    const obj = { a: signal(1), b: signal(2) };

    // This should trigger a warning - mutation in object destructuring
    const { a: aSignal } = { a: (obj.a.value = 10) };

    return <div>{aSignal}</div>;
  } finally {
    store.f();
  }
}

// Component with mutation in IIFE - should trigger warning
export function TestIIFEMutation(): JSX.Element {
  const store = useSignals(1);

  try {
    const counterSignal = signal(0);

    // This should trigger a warning - mutation in IIFE
    (() => {
      counterSignal.value = 42;
    })();

    return <div>{counterSignal.value}</div>;
  } finally {
    store.f();
  }
}

// Component with mutation in switch case - should trigger warning
export function TestSwitchCaseMutation(): JSX.Element {
  const store = useSignals(1);

  try {
    const modeSignal = signal('read');
    const counterSignal = signal(0);

    switch (modeSignal.value) {
      case 'read':
        // This should trigger a warning - mutation in switch case
        counterSignal.value = 1;
        break;
      case 'write':
        // This should trigger a warning - mutation in switch case
        counterSignal.value = 2;
        break;
      default:
        // This should trigger a warning - mutation in switch case
        counterSignal.value = 3;
    }

    return <div>{counterSignal.value}</div>;
  } finally {
    store.f();
  }
}

// Component with mutation in for loop - should trigger warning
export function TestForLoopMutation(): JSX.Element {
  const store = useSignals(1);

  try {
    const signals = [signal(1), signal(2), signal(3)];

    // This should trigger a warning - mutation in for loop
    for (let i = 0; i < signals.length; i++) {
      // @ts-expect-error
      signals[i].value = i * 10;
    }

    return <div>{signals.map((s) => s.value).join(', ')}</div>;
  } finally {
    store.f();
  }
}

// Component with mutation in for...of loop - should trigger warning
export function TestForOfLoopMutation(): JSX.Element {
  const store = useSignals(1);

  try {
    const signals = [signal(1), signal(2), signal(3)];

    // This should trigger a warning - mutation in for...of loop
    for (const s of signals) {
      s.value = s.value * 2;
    }

    return <div>{signals.map((s) => s.value).join(', ')}</div>;
  } finally {
    store.f();
  }
}

// Component with mutation in for...in loop - should trigger warning
export function TestForInLoopMutation(): JSX.Element {
  const store = useSignals(1);

  try {
    const obj = { a: signal(1), b: signal(2) };

    // This should trigger a warning - mutation in for...in loop
    for (const key in obj) {
      // @ts-expect-error
      obj[key].value = obj[key].value * 2;
    }

    return (
      <div>
        {Object.values(obj)
          .map((s) => s.value)
          .join(', ')}
      </div>
    );
  } finally {
    store.f();
  }
}

// Component with mutation in while loop - should trigger warning
export function TestWhileLoopMutation(): JSX.Element {
  const store = useSignals(1);

  try {
    const counterSignal = signal(0);
    let i = 0;

    // This should trigger a warning - mutation in while loop
    while (i < 3) {
      counterSignal.value = i++;
    }

    return <div>{counterSignal.value}</div>;
  } finally {
    store.f();
  }
}

// Component with mutation in do...while loop - should trigger warning
export function TestDoWhileLoopMutation(): JSX.Element {
  const store = useSignals(1);

  try {
    const counterSignal = signal(0);
    let i = 0;

    // This should trigger a warning - mutation in do...while loop
    do {
      counterSignal.value = i++;
    } while (i < 3);

    return <div>{counterSignal.value}</div>;
  } finally {
    store.f();
  }
}

// Component with mutation in nested functions - should trigger warning
export function TestNestedFunctionMutation(): JSX.Element {
  const store = useSignals(1);

  try {
    const counterSignal = signal(0);

    function outer() {
      function inner() {
        // This should trigger a warning - mutation in nested function
        counterSignal.value = 42;
      }
      inner();
    }
    outer();

    return <div>{counterSignal.value}</div>;
  } finally {
    store.f();
  }
}

// Component with mutation in computed signal - should NOT trigger warning
export function TestComputedSignal(): JSX.Element {
  const store = useSignals(1);

  try {
    const countSignal = signal(0);

    // This should NOT trigger a warning - computed values are allowed
    const doubleCount = computed(() => countSignal.value * 2);

    return <div>{doubleCount.value}</div>;
  } finally {
    store.f();
  }
}

// Component with mutation in useLayoutEffect - should NOT trigger warning
export function TestUseLayoutEffect(): JSX.Element {
  const store = useSignals(1);

  try {
    const counterSignal = signal(0);

    useLayoutEffect(() => {
      // This should NOT trigger a warning - mutation in useLayoutEffect
      counterSignal.value = 42;
    }, []);

    return <div>{counterSignal.value}</div>;
  } finally {
    store.f();
  }
}

// Component with mutation in useImperativeHandle - should NOT trigger warning
export const TestUseImperativeHandle = forwardRef((_props, ref) => {
  const store = useSignals(1);

  try {
    const counterSignal = signal(0);

    useImperativeHandle(ref, () => ({
      increment() {
        // This should NOT trigger a warning - mutation in useImperativeHandle
        counterSignal.value++;
      },
    }));

    return <div>{counterSignal.value}</div>;
  } finally {
    store.f();
  }
});

// Component with mutation in useReducer - should NOT trigger warning
export function TestUseReducer(): JSX.Element {
  const store = useSignals(1);

  try {
    const counterSignal = signal(0);

    const [_state, _dispatch] = useReducer((s, _action): number => {
      // This should NOT trigger a warning - mutation in reducer
      counterSignal.value = s + 1;
      return s + 1;
    }, 0);

    return <div>{counterSignal.value}</div>;
  } finally {
    store.f();
  }
}

// Component with mutation in useSyncExternalStore - should NOT trigger warning
export function TestUseSyncExternalStore(): JSX.Element {
  const store = useSignals(1);

  try {
    const counterSignal = signal(0);

    const _count = useSyncExternalStore(
      () => () => {},
      () => {
        // This should NOT trigger a warning - mutation in useSyncExternalStore
        counterSignal.value = 42;
        return 42;
      }
    );

    return <div>{counterSignal.value}</div>;
  } finally {
    store.f();
  }
}

// Component with mutation in flushSync - should trigger warning
export function TestFlushSyncMutation(): JSX.Element {
  const store = useSignals(1);

  try {
    const counterSignal = signal(0);

    // This should trigger a warning - mutation in render, even with flushSync
    flushSync(() => {
      counterSignal.value = 42;
    });

    return <div>{counterSignal.value}</div>;
  } finally {
    store.f();
  }
}

// Component with mutation in useTransition - should NOT trigger warning
export function TestUseTransition(): JSX.Element {
  const store = useSignals(1);

  try {
    const counterSignal = signal(0);
    const [isPending, startTransition] = useTransition();

    startTransition(() => {
      // This should NOT trigger a warning - mutation in transition
      counterSignal.value = 42;
    });

    return <div>{isPending ? 'Loading...' : counterSignal.value}</div>;
  } finally {
    store.f();
  }
}

// Component with mutation in useDeferredValue - should NOT trigger warning
export function TestUseDeferredValue(): JSX.Element {
  const store = useSignals(1);

  try {
    const counterSignal = signal(0);
    const deferredValue = useDeferredValue(counterSignal.value);

    // This should NOT trigger a warning - mutation in effect
    useEffect(() => {
      counterSignal.value = 42;
    }, []);

    return <div>{deferredValue}</div>;
  } finally {
    store.f();
  }
}

// Component with mutation in useId - should NOT trigger warning
export function TestUseId(): JSX.Element {
  const store = useSignals(1);

  try {
    const id = useId();
    const counterSignal = useSignal(0);

    // This should NOT trigger a warning - mutation in effect
    useEffect(() => {
      counterSignal.value = 42;
    }, []);

    return <div id={id}>{counterSignal.value}</div>;
  } finally {
    store.f();
  }
}

// Component with StrictMode - should still trigger warning
export function TestStrictMode(): JSX.Element {
  const store = useSignals(1);

  try {
    const countSignal = signal(0);

    // Should still warn in StrictMode
    countSignal.value = 42;

    return (
      <StrictMode>
        <div>{countSignal}</div>
      </StrictMode>
    );
  } finally {
    store.f();
  }
}

// Component with Suspense - should still trigger warning
export function TestSuspense(): JSX.Element {
  const store = useSignals(1);

  try {
    const dataSignal = signal<string | null>(null);

    // Should still warn in Suspense
    dataSignal.value = 'loaded';

    return (
      <Suspense fallback={<div>Loading...</div>}>
        <div>{dataSignal}</div>
      </Suspense>
    );
  } finally {
    store.f();
  }
}

// Component with Error Boundary - should still trigger warning
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong</div>;
    }
    return this.props.children;
  }
}

export function TestErrorBoundary(): JSX.Element {
  const store = useSignals(1);

  try {
    const countSignal = signal(0);

    // Should still warn in ErrorBoundary
    countSignal.value = 42;

    return (
      <ErrorBoundary>
        <div>{countSignal}</div>
      </ErrorBoundary>
    );
  } finally {
    store.f();
  }
}

// Component with custom hook containing mutation - should trigger warning
function useCustomHook(): Signal<number> {
  const store = useSignals(2);

  try {
    const signal = useSignal(0);
    // This should trigger a warning - mutation in custom hook during render
    signal.value = 100;
    return signal;
  } finally {
    store.f();
  }
}

export function TestCustomHook(): JSX.Element {
  const store = useSignals(1);
  try {
    // Should  NOT warn as it has type Signal<number>
    const countSignal = useCustomHook();
    return <div>{countSignal}</div>;
  } finally {
    store.f();
  }
}

// Component with mutation in ternary - should trigger warning
export function TestTernaryMutation(): JSX.Element {
  const store = useSignals(1);

  try {
    const showSignal = signal(true);
    const countSignal = signal(0);

    // This should trigger a warning - mutation in ternary
    showSignal.value ? (countSignal.value = 1) : (countSignal.value = 2);

    return <div>{countSignal}</div>;
  } finally {
    store.f();
  }
}

// Component with mutation in logical expression - should trigger warning
export function TestLogicalExpressionMutation(): JSX.Element {
  const store = useSignals(1);

  try {
    const counterSignal = signal(0);
    const condition = true;

    // This should trigger a warning - mutation in logical expression
    condition && (counterSignal.value = 42);

    return <div>{counterSignal.value}</div>;
  } finally {
    store.f();
  }
}

// Performance test component - should track performance metrics
export function TestPerformanceTracking(): JSX.Element {
  const store = useSignals(1);

  try {
    const counterSignal = signal(0);
    const itemsSignal = signal<number[]>([]);

    // This will trigger performance tracking
    counterSignal.value = 1;

    // Simulate some work
    for (let i = 0; i < 10; i++) {
      itemsSignal.value = [...itemsSignal.value, i];
    }

    return (
      <div>
        <div>Counter: {counterSignal.value}</div>
        <div>Items: {itemsSignal.value.join(', ')}</div>
      </div>
    );
  } finally {
    store.f();
  }
}

// Component with many nodes to test performance with large components
export function TestLargeComponent(): JSX.Element {
  const store = useSignals(1);

  try {
    const signals = Array.from({ length: 10 }, (_, i) => signal(i));

    // This will be caught by the performance tracking
    signals.forEach((s, i) => {
      s.value = i * 2;
    });

    return (
      <div>
        {signals.map((s, i) => (
          <div key={i}>
            Signal {i}: {s.value}
          </div>
        ))}
      </div>
    );
  } finally {
    store.f();
  }
}
