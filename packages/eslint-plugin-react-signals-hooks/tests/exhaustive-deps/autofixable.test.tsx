/** biome-ignore-all assist/source/organizeImports: off */
import { useCallback, useMemo, useEffect, useState } from "react";
import { Pressable } from "react-native";

// Test file to demonstrate autofixable error indicators
export function TestAutofixableComponent() {
	const [count, setCount] = useState(0);
	const name = "test";

	// This should trigger a missing dependency error with suggestions
	// biome-ignore lint/correctness/useExhaustiveDependencies: false positive
	const memoizedValue = useMemo(() => {
		return count * 2 + name.length;
	}, []); // Missing dependencies: count, name

	// This should trigger a missing dependency error with suggestions
	// biome-ignore lint/correctness/useExhaustiveDependencies: false positive
	const callback = useCallback(() => {
		console.info(count, name);

		setCount(count + 1);
	}, []); // Missing dependencies: count, name

	// biome-ignore lint/correctness/useExhaustiveDependencies: false positive
	useEffect(() => {
		console.info(count, name);
		// This should trigger a missing dependency error with suggestions
	}, []); // Missing dependencies: count, name

	return <Pressable onPress={callback}>{memoizedValue}</Pressable>;
}
