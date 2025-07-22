// test-autofix.tsx - Test file for autofix functionality
import { type JSX, useCallback, useEffect } from "react";
import { counterSignal, nameSignal } from "./signals.ts";
import { useSignals } from "@preact/signals-react/runtime";
import { computed } from "@preact/signals-react";

export function TestAutoFixUseMemo(): JSX.Element {
	// This useMemo should be auto-fixed when enableAutoFixForMemoAndCallback is true
	const expensiveValue = computed(() => {
		return counterSignal.value * 2 + nameSignal.value.length;
	}); // Missing counterSignal and nameSignal - should be auto-fixed

	return <div>{expensiveValue}</div>;
}

export function TestAutoFixUseCallback() {
	// This useCallback should be auto-fixed when enableAutoFixForMemoAndCallback is true
	const handleClick = useCallback(() => {
		console.log("Counter:", counterSignal.value);
		console.log("Name:", nameSignal.value);
	}, [counterSignal, nameSignal]); // Missing counterSignal and nameSignal - should be auto-fixed

	return <button onClick={handleClick}>Click me</button>;
}

export function TestNoAutoFixUseEffect() {
	// This useEffect should NOT be auto-fixed (only suggested)
	useSignals();
	useEffect(() => {
		console.log("Counter:", counterSignal.value);
		console.log("Name:", nameSignal.value);
	}, []); // Missing counterSignal and nameSignal - should only suggest, not auto-fix

	return <div>Effect component</div>;
}
