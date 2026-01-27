import React, { useMemo } from 'react';

function computeExpensiveValue(a: any, b: any) {
  return a + b;
}

const a = 1;
const b = 2;

// This should be flagged and fixed
const memoizedValue = React.useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

// This should also be flagged and fixed
const memoizedValue2 = useMemo(() => computeExpensiveValue(a, b), [a, b]);

// This should be flagged and fixed (concise arrow)
const memoizedValue3 = React.useMemo(() => computeExpensiveValue(a, b), [a, b]);

// This should be flagged and fixed (function expression)
const memoizedValue4 = React.useMemo(function() {
  return computeExpensiveValue(a, b);
}, [a, b]);

// This should be flagged and fixed (empty deps array)
const memoizedValue5 = React.useMemo(() => computeExpensiveValue(a, b), []);

// This should not be flagged (wrong signature - missing deps)
const notMemoized = React.useMemo(() => computeExpensiveValue(a, b));

// This should not be flagged (not useMemo)
const regularFunction = () => computeExpensiveValue(a, b);

// This should not be flagged (contains hooks - should be skipped for safety)
const memoizedWithHooks = React.useMemo(() => {
  const [state, setState] = React.useState(0);
  return state;
}, []);

// This should not be flagged (complex expression with hooks)
const complexMemoized = React.useMemo(() => {
  const ref = React.useRef(null);
  return ref.current;
}, []);
