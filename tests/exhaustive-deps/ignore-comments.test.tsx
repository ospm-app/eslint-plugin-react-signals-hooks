// test-ignore-comments.tsx - Test file for ignore comment functionality
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	type JSX,
} from "react";
import { counterSignal, nameSignal } from "./signals.ts";
import { useSignals } from "@preact/signals-react/runtime";

export function TestIgnoreCommentsUseMemo(): JSX.Element | null {
	// Test 1: useMemo with ignore comment - should NOT warn
	const expensiveValue1 = useMemo(() => {
		return counterSignal.value * 2 + nameSignal.value.length;
		// eslint-disable-next-line react-signals-hooks/exhaustive-deps
	}, []); // Missing counterSignal and nameSignal - should be ignored

	// Test 2: useMemo without ignore comment - should warn and autofix
	const expensiveValue2 = useMemo(() => {
		return counterSignal.value * 3 + nameSignal.value.length;
	}, [counterSignal, nameSignal]); // Missing counterSignal and nameSignal - should warn and autofix

	return <div>{expensiveValue1 + expensiveValue2}</div>;
}

export function TestIgnoreCommentsUseCallback(): JSX.Element | null {
	// Test 3: useCallback with ignore comment - should NOT warn
	const handleClick1 = useCallback(() => {
		console.log("Counter:", counterSignal.value);
		console.log("Name:", nameSignal.value);
		// eslint-disable-next-line react-signals-hooks/exhaustive-deps
	}, []); // Missing counterSignal and nameSignal - should be ignored

	// Test 4: useCallback without ignore comment - should warn and autofix
	const handleClick2 = useCallback(() => {
		console.log("Counter:", counterSignal.value);
		console.log("Name:", nameSignal.value);
	}, [counterSignal, nameSignal]); // Missing counterSignal and nameSignal - should warn and autofix

	return (
		<div>
			<button onClick={handleClick1}>Click 1</button>
			<button onClick={handleClick2}>Click 2</button>
		</div>
	);
}

export function TestIgnoreCommentsUseEffect(): JSX.Element | null {
	// Test 5: useEffect with ignore comment - should NOT warn
	useEffect(() => {
		console.log("Counter:", counterSignal.value);
		console.log("Name:", nameSignal.value);
		// eslint-disable-next-line react-signals-hooks/exhaustive-deps
	}, []); // Missing counterSignal and nameSignal - should be ignored

	// Test 6: useEffect without ignore comment - should warn but NOT autofix
	useEffect(() => {
		console.log("Counter:", counterSignal.value);
		console.log("Name:", nameSignal.value);
	}, []); // Missing counterSignal and nameSignal - should warn but not autofix

	return <div>Effect component</div>;
}

export function TestIgnoreCommentsUseLayoutEffect(): JSX.Element | null {
	// Test 7: useLayoutEffect with ignore comment - should NOT warn
	useSignals();

	useLayoutEffect(() => {
		console.log("Counter:", counterSignal.value);
		console.log("Name:", nameSignal.value);
		// eslint-disable-next-line react-signals-hooks/exhaustive-deps
	}, []); // Missing counterSignal and nameSignal - should be ignored

	// Test 8: useLayoutEffect without ignore comment - should warn but NOT autofix
	useLayoutEffect(() => {
		console.log("Counter:", counterSignal.value);
		console.log("Name:", nameSignal.value);
	}, []); // Missing counterSignal and nameSignal - should warn but not autofix

	return <div>Layout effect component</div>;
}
