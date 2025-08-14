/** biome-ignore-all lint/correctness/useHookAtTopLevel: off */
import { useSignals } from "@preact/signals-react/runtime";
import { type JSX, useCallback, useEffect, useMemo } from "react";
import { Pressable, View } from "react-native";
import { counterSignal, nameSignal } from "./signals";

export function TestAutoFixUseMemo(): JSX.Element {
	// This useMemo should be auto-fixed when enableAutoFixForMemoAndCallback is true
	const expensiveValue = useMemo(() => {
		return counterSignal.value * 2 + nameSignal.value.length;
	}, []); // Missing counterSignal.value and nameSignal.value.length - should be auto-fixed

	return <View>{expensiveValue}</View>;
}

export function TestAutoFixUseCallback() {
	// This useCallback should be auto-fixed when enableAutoFixForMemoAndCallback is true
	const onPress = useCallback(() => {
		console.info("Counter:", counterSignal.value);
		console.info("Name:", nameSignal.value);
	}, []); // Missing counterSignal.value and nameSignal.value - should be auto-fixed

	return <Pressable onPress={onPress}>Click me</Pressable>;
}

export function TestNoAutoFixUseEffect() {
	const store = useSignals(1);

	try {
		useEffect(() => {
			console.info("Counter:", counterSignal.value);
			console.info("Name:", nameSignal.value);
			// This useEffect should NOT be auto-fixed (only suggested)
		}, []); // Missing counterSignal.value and nameSignal.value - should only suggest, not auto-fix

		return <View>Effect component</View>;
	} finally {
		store.f();
	}
}
