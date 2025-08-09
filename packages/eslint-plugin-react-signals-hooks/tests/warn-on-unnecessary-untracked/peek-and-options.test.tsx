/** biome-ignore-all lint/correctness/useExhaustiveDependencies: off */
import { signal, untracked } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { useEffect, type JSX } from 'react';

// Unnecessary .peek() in reactive context (should warn with suggestion to use .value)
export function TestPeekInRender(): JSX.Element {
  useSignals();
  const countSignal = signal(0);
  // @ts-expect-error
  return <div>{countSignal.value.peek()}</div>;
}

// .peek() used during write context; should be allowed only when allowForSignalWrites === true
export function TestPeekDuringWrite(): JSX.Element {
  useSignals();
  const countSignal = signal(0);
  // depending on rule options, may or may not warn
  // @ts-expect-error
  countSignal.value = countSignal.value.peek() + 1;
  return <div>{countSignal}</div>;
}

// untracked(() => ...) disallowed in reactive context when allowInEffects === false
export function TestUntrackedInEffectDisallowed(): JSX.Element {
  useSignals();
  const countSignal = signal(0);
  useEffect(() => {
    const v = untracked(() => countSignal.value);
    console.info(v);
  }, []);
  return <div>{countSignal}</div>;
}

// untracked allowed in event handlers when allowInEventHandlers === true (default)
export function TestUntrackedInEventAllowed(): JSX.Element {
  useSignals();
  const countSignal = signal(0);
  return (
    <button
      type='button'
      onClick={() => {
        const v = untracked(() => countSignal.value);
        console.info(v);
      }}>
      ok
    </button>
  );
}
