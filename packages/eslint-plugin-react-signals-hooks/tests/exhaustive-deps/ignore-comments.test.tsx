/** biome-ignore-all assist/source/organizeImports: off */
import {
	useMemo,
	type JSX,
	useEffect,
	useCallback,
	useLayoutEffect,
} from "react";
import { counterSignal, nameSignal } from "./signals";
import { useSignals } from "@preact/signals-react/runtime";

export function TestIgnoreCommentsUseMemo(): JSX.Element | null {
	// Test 1: useMemo with ignore comment - should NOT warn
	const expensiveValue1 = useMemo(() => {
		return counterSignal.value * 2 + nameSignal.value.length;
		// eslint-disable-next-line react-signals-hooks/exhaustive-deps
	}, []); // Missing counterSignal and nameSignal - should be ignored

	// Test 2: useMemo without ignore comment - should warn and autofix
	// biome-ignore lint/correctness/useExhaustiveDependencies: false positive
	const expensiveValue2 = useMemo(() => {
		return counterSignal.value * 3 + nameSignal.value.length;
	}, [counterSignal, nameSignal]); // Missing counterSignal and nameSignal - should warn and autofix

	return <div>{expensiveValue1 + expensiveValue2}</div>;
}

export function TestIgnoreCommentsUseCallback(): JSX.Element | null {
	// Test 3: useCallback with ignore comment - should NOT warn
	const handleClick1 = useCallback(() => {
		console.info("Counter:", counterSignal.value);
		console.info("Name:", nameSignal.value);
		// eslint-disable-next-line react-signals-hooks/exhaustive-deps
	}, []); // Missing counterSignal and nameSignal - should be ignored

	// Test 4: useCallback without ignore comment - should warn and autofix
	// biome-ignore lint/correctness/useExhaustiveDependencies: false positive
	const handleClick2 = useCallback(() => {
		console.info("Counter:", counterSignal.value);
		console.info("Name:", nameSignal.value);
	}, [counterSignal, nameSignal]); // Missing counterSignal.value and nameSignal.value - should warn and autofix

	return (
		<div>
			<button type="button" onClick={handleClick1}>
				Click 1
			</button>

			<button type="button" onClick={handleClick2}>
				Click 2
			</button>
		</div>
	);
}

export function TestIgnoreCommentsUseEffect(): JSX.Element | null {
	// Test 5: useEffect with ignore comment - should NOT warn
	useEffect(() => {
		console.info("Counter:", counterSignal.value);
		console.info("Name:", nameSignal.value);
		// eslint-disable-next-line react-signals-hooks/exhaustive-deps
	}, []); // Missing counterSignal and nameSignal - should be ignored

	// Test 6: useEffect without ignore comment - should warn but NOT autofix
	useEffect(() => {
		console.info("Counter:", counterSignal.value);
		console.info("Name:", nameSignal.value);
	}, []); // Missing counterSignal and nameSignal - should warn but not autofix

	return <div>Effect component</div>;
}

export function TestIgnoreCommentsUseLayoutEffect(): JSX.Element | null {
	// Test 7: useLayoutEffect with ignore comment - should NOT warn
	useSignals();

	useLayoutEffect(() => {
		console.info("Counter:", counterSignal.value);
		console.info("Name:", nameSignal.value);
		// eslint-disable-next-line react-signals-hooks/exhaustive-deps
	}, []); // Missing counterSignal and nameSignal - should be ignored

	// Test 8: useLayoutEffect without ignore comment - should warn but NOT autofix
	useLayoutEffect(() => {
		console.info("Counter:", counterSignal.value);
		console.info("Name:", nameSignal.value);
	}, []); // Missing counterSignal and nameSignal - should warn but not autofix

	return <div>Layout effect component</div>;
}
