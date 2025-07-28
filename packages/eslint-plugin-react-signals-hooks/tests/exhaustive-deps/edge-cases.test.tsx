/* eslint-disable react-signals-hooks/prefer-signal-effect */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: not relevant */
/** biome-ignore-all lint/correctness/useExhaustiveDependencies: not relevant */
/** biome-ignore-all assist/source/organizeImports: off */
import { signal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import { useEffect, useMemo, type JSX } from "react";

// Test case 1: Nested dependency objects
export function TestNestedObjects(): JSX.Element {
	useSignals();

	const user = signal({
		id: 1,
		name: "John",
		address: {
			street: "123 Main St",
			city: "Anytown",
			coordinates: {
				lat: 40.7128,
				lng: -74.006,
			},
		},
	});

	// Should warn about missing user.address dependency
	useEffect(() => {
		console.info(user.value.address.city);
	}, [user.value]); // Missing user.address

	// Should warn about missing user.address.coordinates dependency
	useEffect(() => {
		console.info(user.value.address.coordinates.lat);
	}, [user.value.address]); // Missing user.address.coordinates

	return <div>{user.value.name}</div>;
}

// Test case 2: Various whitespace patterns
export function TestWhitespacePatterns(): JSX.Element {
	useSignals();

	const data = signal({
		count: 0,
		items: [1, 2, 3],
		user: { name: "Alice" },
	});

	// Different whitespace patterns in dependency arrays
	useEffect(() => {
		console.info(data.value.count);
	}, [data.value.count]); // Normal space

	useEffect(() => {
		console.info(data.value.items);
	}, [data.value.items]); // Extra spaces

	useEffect(() => {
		console.info(data.value.user);
	}, [data.value.user]); // Newlines

	return <div>Whitespace Test</div>;
}

// Test case 3: Special characters in dependency names
export function TestSpecialCharacters(): JSX.Element {
	useSignals();

	const specialData = signal({
		"user-name": "special-user",
		"user@email": "test@example.com",
		"user.id": "12345",
		user_data: { value: 42 },
	});

	// Should handle special characters in property names
	useEffect(() => {
		console.info(specialData.value["user-name"]);
	}, [specialData.value["user-name"]]);

	// Should handle @ symbol in property names
	useEffect(() => {
		console.info(specialData.value["user@email"]);
	}, [specialData.value["user@email"]]);

	// Should handle dot in property names
	useEffect(() => {
		console.info(specialData.value["user.id"]);
	}, [specialData.value["user.id"]]);

	// Should handle underscore in property names
	useEffect(() => {
		console.info(specialData.value.user_data.value);
	}, [specialData.value.user_data]); // Should suggest adding .value

	return <div>Special Chars Test</div>;
}

// Test case 4: Complex expressions in dependency arrays
export function TestComplexExpressions(): JSX.Element {
	useSignals();

	const data = signal({
		items: [
			{ id: 1, value: "a" },
			{ id: 2, value: "b" },
			{ id: 3, value: "c" },
		],
		filter: signal("a"),
		config: {
			maxItems: 10,
			enabled: true,
		},
	});

	// Complex expression with array methods
	const filteredItems = useMemo(() => {
		return data.value.items.filter(
			(item) => item.value === data.value.filter.value,
		);
	}, [data.value.items, data.value.filter.value]);

	// Complex expression with ternary
	const status = useMemo(() => {
		return data.value.config.enabled
			? `Enabled with max ${data.value.config.maxItems} items`
			: "Disabled";
	}, [data.value.config.enabled, data.value.config.maxItems]);

	// Complex expression with object spread
	const processedData = useMemo(() => {
		return {
			...data.value,
			timestamp: Date.now(),
			processed: true,
		};
	}, [data.value]);

	return (
		<div>
			<div>Filtered: {filteredItems.length} items</div>
			<div>Status: {status}</div>
			<div>Processed: {processedData.timestamp}</div>
		</div>
	);
}

// Test case 5: Array indices in dependency paths
export function TestArrayIndices(): JSX.Element {
	useSignals();

	const matrix = signal([
		[1, 2, 3],
		[4, 5, 6],
		[7, 8, 9],
	]);

	// Accessing array elements by index
	const sum = useMemo(() => {
		return matrix.value[0][0] + matrix.value[1][1] + matrix.value[2][2]; // 1 + 5 + 9 = 15
	}, [matrix.value[0][0], matrix.value[1][1], matrix.value[2][2]]);

	// Dynamic index access
	const getRowSum = (rowIndex: number) => {
		return useMemo(() => {
			return matrix.value[rowIndex].reduce((sum, num) => sum + num, 0);
		}, [matrix.value[rowIndex]]); // Should handle dynamic indices
	};

	return (
		<div>
			<div>Sum of diagonal: {sum}</div>

			<div>Row 0 sum: {getRowSum(0)}</div>
		</div>
	);
}

// Test case 6: Template literals in dependency paths
export function TestTemplateLiterals(): JSX.Element {
	useSignals();

	const data = signal({
		user1: { name: "Alice" },
		user2: { name: "Bob" },
		user3: { name: "Charlie" },
	});

	const userId = "user1";

	// Using template literals in dependency paths
	useEffect(() => {
		console.info(data.value[`${userId}`].name);
	}, [data.value[`${userId}`]]); // Should handle template literals

	return <div>Template Literal Test</div>;
}
