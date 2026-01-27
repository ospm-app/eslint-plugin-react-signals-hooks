import React, { useCallback } from 'react';

const doSomething = () => console.log('doing something');

// This should be flagged and fixed
const handleClick = React.useCallback(() => {
  doSomething();
}, [doSomething]);

// This should also be flagged and fixed
const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
  console.log(event.target.value);
}, []);

// This should be flagged and fixed (concise arrow)
const handleSubmit = React.useCallback(() => doSomething(), [doSomething]);

// This should be flagged and fixed (function expression)
const handleFocus = React.useCallback(function() {
  doSomething();
}, [doSomething]);

// This should not be flagged (wrong signature - missing deps)
const notCallback = React.useCallback(() => {
  doSomething();
}, []); // Add empty deps array to make it valid but still flaggable

// This should not be flagged (not useCallback)
const regularFunction = () => doSomething();

// This should be flagged and fixed (with parameters)
const handleCustom = useCallback((a: number, b: string) => {
  return a + b;
}, []);
