/* eslint-disable react-signals-hooks/prefer-signal-reads */
/* eslint-disable eslint-rule/consistent-rule-structure */
/* eslint-disable react-signals-hooks/signal-variable-name */
/* eslint-disable react-signals-hooks/restrict-signal-locations */
/** biome-ignore-all lint/correctness/noUnusedVariables: test fixture code */
/** biome-ignore-all lint/suspicious/noRedeclare: test fixture code */
import { signal, computed } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { memo, forwardRef, type JSX } from 'react';

// ====================================
// FunctionDeclaration component (Should Warn)
// ====================================
export function ComponentDecl(): JSX.Element {
  useSignals();
  const s = signal(0); // Should warn: signal in component body
  return <div>{s}</div>;
}

// ====================================
// FunctionDeclaration custom hook (Allowed)
// ====================================
export function useThing(): { s: ReturnType<typeof signal<number>> } {
  const s = signal(1); // Allowed in custom hook
  return { s };
}

// ====================================
// React.memo-wrapped component (Should Warn)
// ====================================
export const MemoComp = memo(function MemoComp(): JSX.Element {
  useSignals();
  const s = signal(0); // Should warn: memo-wrapped component body
  return <div>{s}</div>;
});

// ====================================
// React.forwardRef-wrapped component (Should Warn)
// ====================================
export const FwdRefComp = forwardRef<HTMLDivElement, { label?: string }>(
  function FwdRefCompInner(_props, _ref): JSX.Element {
    useSignals();
    const s = signal(0); // Should warn: forwardRef-wrapped component body
    return <div>{s}</div>;
  },
);

// ====================================
// Default exports of signals/computed (Should Warn)
// ====================================
// @ts-expect-error default-exported computed
export default computed(() => 42); // Should warn: default-exported computed

const defaultSig = signal('x');
export { defaultSig as alsoExported }; // Named export should warn elsewhere

// @ts-expect-error default-exported signal identifier
export default defaultSig;
