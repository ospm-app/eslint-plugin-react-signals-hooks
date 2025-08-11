/** biome-ignore-all lint/correctness/useExhaustiveDependencies: not relevant */
import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  useState,
  type JSX,
  useCallback,
  memo,
} from 'react';

// =============================
// Incorrect: Direct aliasing
// =============================
export function DirectAlias(): JSX.Element {
  useSignals();
  const countSignal = signal(0);

  // Should error: aliasing a signal
  const s = countSignal;

  return <div>{countSignal} {s}</div>;
}

// =============================
// Incorrect: Assignment aliasing
// =============================
export function AssignmentAlias(): JSX.Element {
  useSignals();
  const userSignal = signal({ id: 1 });

  // Should error: aliasing a signal via assignment
  let alias: typeof userSignal | undefined;
  alias = userSignal;

  return <div>{userSignal} {alias}</div>;
}

// =============================
// Incorrect: Re-assignment of a signal-holding variable
// =============================
export function Reassignment(): JSX.Element {
  useSignals();
  const aSignal = signal(1);
  const bSignal = signal(2);

  // Should error: re-binding to another signal
  let s = aSignal;
  s = bSignal;

  return <div>{aSignal} {bSignal} {s}</div>;
}

// =============================
// Incorrect: Aliasing via collections
// =============================
export function AliasingViaCollections(): JSX.Element {
  useSignals();
  const countSignal = signal(0);

  const arr = [countSignal];
  // Should error: aliasing through index access
  const sFromArr = arr[0];

  const obj = { s: countSignal };
  // Should error: aliasing through property access
  const sFromObj = obj.s;

  return <div>{countSignal} {sFromArr} {sFromObj}</div>;
}

// =============================
// Incorrect: Destructuring that aliases the signal itself
// =============================
export function DestructuringAlias(): JSX.Element {
  useSignals();
  const countSignal = signal(0);

  // Should error: destructuring creates a new signal alias
  const { s } = { s: countSignal };
  // Should error: array destructuring to a new alias
  const [first] = [countSignal];

  return <div>{countSignal} {s} {first}</div>;
}

// =============================
// Correct: Read .value instead of aliasing signal
// =============================
export function ReadValueIsOk(): JSX.Element {
  useSignals();
  const countSignal = signal(0);

  // OK: Only reading value
  const v = countSignal.value;
  let v2: number | undefined;
  v2 = countSignal.value;

  return <div>{v} {v2}</div>;
}

// =============================
// Correct: Passing signal without aliasing
// =============================
function usesSignal(x: unknown): void {
  void x;
}

export const PassSignalNoAlias = memo(function PassSignalNoAlias(): JSX.Element {
  useSignals();
  const countSignal = signal(0);

  // OK: Passed as argument, no local alias created
  usesSignal(countSignal);

  const onClick = useCallback(() => {
    // OK: Directly use .value
    // eslint-disable-next-line no-console
    console.log(countSignal.value);
  }, []);

  const [state] = useState(0);
  return (
    <button type="button" onClick={onClick}>
      {state}
    </button>
  );
});
