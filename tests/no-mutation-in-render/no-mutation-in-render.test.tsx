import { signal } from "@preact/signals-react";
import { useEffect, useCallback, useMemo, type JSX } from "react";
import { useSignals } from "@preact/signals-react/runtime";

// This component should trigger ESLint warnings for signal mutation during render
export function TestMutationInRender(): JSX.Element {
	useSignals();
	const counterSignal = signal(0);

	// This should trigger a warning - direct mutation during render
	counterSignal.value = 42;

	return <div>{counterSignal}</div>;
}

// This component should trigger warning for signal array mutation during render
export function TestArrayMutationInRender(): JSX.Element {
	useSignals();
	const itemsSignal = signal<string[]>([]);

	// This should trigger a warning - array mutation during render
	itemsSignal.value[0] = "new item";

	return <div>{itemsSignal.value.length}</div>;
}

// This component should trigger warning for signal object mutation during render
export function TestObjectMutationInRender(): JSX.Element {
	useSignals();
	const userSignal = signal({ name: "John", age: 25 });

	// This should trigger a warning - object property mutation during render
	userSignal.value["name"] = "Jane";

	return <div>{userSignal.value.name}</div>;
}

// This component should trigger warning for increment/decrement during render
export function TestIncrementInRender(): JSX.Element {
	useSignals();
	const counterSignal = signal(0);

	// These should trigger warnings - increment/decrement during render
	counterSignal.value++;
	++counterSignal.value;
	counterSignal.value--;
	--counterSignal.value;

	return <div>{counterSignal}</div>;
}

// This component should NOT trigger warnings - mutations in useEffect
export function TestMutationInEffect(): JSX.Element {
	useSignals();
	const counterSignal = signal(0);

	// eslint-disable-next-line react-signals-hooks/prefer-signal-effect
	useEffect(() => {
		// This should NOT trigger a warning - mutation inside useEffect
		counterSignal.value = 42;
		counterSignal.value++;
	}, [counterSignal.value]);

	return <div>{counterSignal}</div>;
}

// This component should NOT trigger warnings - mutations in useCallback
export function TestMutationInCallback(): JSX.Element {
	useSignals();
	const counterSignal = signal(0);

	const handleClick = useCallback(() => {
		// This should NOT trigger a warning - mutation inside useCallback
		counterSignal.value = counterSignal.value + 1;
	}, [counterSignal.value]);

	return <button onClick={handleClick}>{counterSignal}</button>;
}

// This component should NOT trigger warnings - mutations in useMemo
export function TestMutationInMemo(): JSX.Element {
	useSignals();
	const dataSignal = signal<number[]>([]);

	const processedData = useMemo(() => {
		// This should NOT trigger a warning - mutation inside useMemo
		dataSignal.value = [1, 2, 3];
		return dataSignal.value.map((x) => x * 2);
	}, []);

	return <div>{processedData.length}</div>;
}

// This component should NOT trigger warnings - mutations in event handlers
export function TestMutationInEventHandler(): JSX.Element {
	useSignals();
	const messageSignal = signal("");

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		// This should NOT trigger a warning - mutation in event handler
		messageSignal.value = event.target.value;
	};

	return (
		<div>
			<input onChange={handleInputChange} />
			<span>{messageSignal}</span>
		</div>
	);
}

// Arrow function component with mutation - should trigger warning
export const TestArrowFunctionMutation = (): JSX.Element => {
	useSignals();
	const stateSignal = signal("initial");

	// This should trigger a warning - mutation during render in arrow function
	stateSignal.value = "modified";

	return <div>{stateSignal}</div>;
};

// Nested function with mutation - should trigger warning
export function TestNestedMutation(): JSX.Element {
	useSignals();
	const flagSignal = signal(false);

	function nestedFunction() {
		// This should trigger a warning - mutation in nested function during render
		flagSignal.value = true;
	}

	nestedFunction();

	return <div>{flagSignal ? "true" : "false"}</div>;
}

// Component with conditional mutation - should trigger warning
export function TestConditionalMutation(): JSX.Element {
	useSignals();
	const counterSignal = signal(0);
	const shouldUpdate = true;

	if (shouldUpdate) {
		// This should trigger a warning - conditional mutation during render
		counterSignal.value = 100;
	}

	return <div>{counterSignal}</div>;
}

// Component with mutation in try-catch - should trigger warning
export function TestMutationInTryCatch(): JSX.Element {
	useSignals();
	const errorSignal = signal<string | null>(null);

	try {
		// This should trigger a warning - mutation in try block during render
		errorSignal.value = "no error";
	} catch (_error) {
		// This should also trigger a warning - mutation in catch block during render
		errorSignal.value = "error occurred";
	}

	return <div>{errorSignal}</div>;
}
