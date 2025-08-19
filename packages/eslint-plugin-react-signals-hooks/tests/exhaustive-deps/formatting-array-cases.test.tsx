/* eslint-disable react-signals-hooks/prefer-batch-updates */
/* eslint-disable react-signals-hooks/prefer-computed */
/* eslint-disable react-signals-hooks/prefer-signal-methods */
/* eslint-disable react-signals-hooks/prefer-signal-effect */
/** biome-ignore-all lint/correctness/useExhaustiveDependencies: off */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: off */
import { useEffect, useMemo, useCallback } from 'react';
import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';

// This file exercises multi-line dependency arrays, trailing commas, and inline comments
// to lock the formatting-preserving behavior of autofixes in exhaustive-deps.

const aSignal = signal(0);
const bSignal = signal('');

export function MultiLineArray_WithComments_And_TrailingComma(): JSX.Element {
  const value = useMemo(() => {
    return aSignal.value + 1;
  }, [
    aSignal.value, // keep comment after item
    // keep this standalone comment
    bSignal.value, // another comment
  ]); // trailing comma should be preserved when replacing

  useEffect(() => {
    console.info(value);
  }, [
    value, // ok
  ]);

  return <div>{value}</div>;
}

export function MultiLineArray_RemoveUnnecessary_BaseSignals(): JSX.Element | null {
  // Unnecessary base signals should be removed; formatting must be preserved
  useEffect(() => {
    console.info(aSignal.value, bSignal.value);
  }, [
    aSignal, // unnecessary
    bSignal, // unnecessary
  ]);

  return null;
}

export function InsertDeps_For_MultiLine_Call(): JSX.Element | null {
  // When there is no deps array and the call is multi-line, insertion should use a new line + indent
  useEffect(
    () => {
      console.info(aSignal.value);
      console.info(bSignal.value);
    }
    // deps will be inserted here on a new line before the closing paren
  );

  return null;
}

export function InsertDeps_For_MultiLine_Assign(): JSX.Element | null {
  // When there is no deps array and the call is multi-line, insertion should use a new line + indent
  useEffect(
    () => {
      aSignal.value++;
      bSignal.value = 'update';
    }
    // deps will be inserted here on a new line before the closing paren
  );

  return null;
}

export function MixedCommentsInsideArray(): JSX.Element {
  const store = useSignals(1);

  try {
    const compute = useCallback(() => {
      return `${aSignal.value}:${bSignal.value}`;
    }, [
      // preserve me: header comment
      aSignal.value,
      /* block comment */ bSignal.value,
      // tail comment
    ]);

    return <span>{compute()}</span>;
  } finally {
    store.f();
  }
}
