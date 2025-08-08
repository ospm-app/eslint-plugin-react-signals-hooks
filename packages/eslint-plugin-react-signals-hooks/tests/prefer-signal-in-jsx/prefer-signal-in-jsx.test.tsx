/** biome-ignore-all assist/source/organizeImports: off */
import { signal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import { Fragment, type JSX } from "react";
import { useId, useMemo } from "react";

// This component should trigger ESLint warnings for using .value in JSX
const messageSignal = signal("Hello World");

export function TestSignalValueInJSX(): JSX.Element {
	useSignals();

	// This should trigger a warning - using .value in JSX
	return <div>{messageSignal.value}</div>;
}

const nameSignal = signal("John");
const ageSignal = signal(25);

// This component should trigger warnings for multiple signal.value usages in JSX
export function TestMultipleSignalValuesInJSX(): JSX.Element {
	useSignals();

	// These should trigger warnings - using .value in JSX
	return (
		<div>
			<span>Name: {nameSignal.value}</span>

			<span>Age: {ageSignal.value}</span>
		</div>
	);
}

const classNameSignal = signal("active");

const titleSignal = signal("Click me");

// This component should trigger warning for signal.value in JSX attributes
export function TestSignalValueInJSXAttribute(): JSX.Element {
	useSignals();

	// These should trigger warnings - using .value in JSX attributes
	return (
		<button
			type="button"
			className={classNameSignal.value}
			title={titleSignal.value}
		>
			Button
		</button>
	);
}

const visibleSignal = signal(true);

const contentSignal = signal("Content");

// This component should trigger warning for signal.value in conditional JSX
export function TestSignalValueInConditionalJSX(): JSX.Element {
	useSignals();

	// These should trigger warnings - using .value in JSX conditionals
	return <div>{visibleSignal.value && <span>{contentSignal.value}</span>}</div>;
}

const countSignal = signal(5);

const multiplierSignal = signal(2);

// This component should trigger warning for signal.value in JSX expressions
export function TestSignalValueInJSXExpressions(): JSX.Element {
	useSignals();

	// These should trigger warnings - using .value in JSX expressions
	return <div>Result: {countSignal.value * multiplierSignal.value}</div>;
}

const message2Signal = signal("Hello World");

const visible2Signal = signal(true);

// This component should NOT trigger warnings - using signals directly in JSX
export function TestCorrectSignalUsageInJSX(): JSX.Element {
	useSignals();

	// These should NOT trigger warnings - using signals directly
	return <div>{visible2Signal ? <span>{message2Signal}</span> : null}</div>;
}

const dataSignal = signal({ name: "John", age: 25 });

// This component should NOT trigger warnings - signal.value outside JSX
export function TestSignalValueOutsideJSX(): JSX.Element {
	useSignals();

	// This should NOT trigger a warning - .value used outside JSX
	const userData = dataSignal.value;

	console.info("User data:", userData);

	return <div>{dataSignal}</div>;
}

const itemsSignal = signal(["apple", "banana", "cherry"]);

// This component should trigger warning for nested JSX with signal.value
export function TestNestedJSXWithSignalValue(): JSX.Element {
	useSignals();

	// This should trigger a warning - using .value in nested JSX
	return (
		<ul>
			{itemsSignal.value.map((item: string, index: number): JSX.Element => {
				// biome-ignore lint/suspicious/noArrayIndexKey: not relevant
				return <li key={index}>{item}</li>;
			})}
		</ul>
	);
}

// This component should trigger warning for signal.value in JSX fragments
export function TestSignalValueInJSXFragment(): JSX.Element {
	useSignals();

	const headerSignal = signal("Title");

	const bodySignal = signal("Content");

	// These should trigger warnings - using .value in JSX fragments
	return (
		<Fragment>
			<h1>{headerSignal.value}</h1>

			<p>{bodySignal.value}</p>
		</Fragment>
	);
}

// This component should trigger warning for signal.value in complex JSX expressions
export function TestSignalValueInComplexJSX(): JSX.Element {
	useSignals();

	const userSignal = signal({ name: "John", isActive: true });

	const statusSignal = signal("online");

	// These should trigger warnings for statusSignal.value - using .value in complex JSX
	// Should not trigger warning for userSignal.value.isActive and userSignal.value.name
	return (
		<div>
			<span className={userSignal.value.isActive ? "active" : "inactive"}>
				{userSignal.value.name} is {statusSignal.value}
			</span>
		</div>
	);
}

// Arrow function component with signal.value in JSX - should trigger warning
export const TestArrowFunctionSignalValue = (): JSX.Element => {
	useSignals();

	const id = useId();

	const labelSignal = signal("Label");

	// This should trigger a warning - using .value in JSX
	return <label htmlFor={id}>{labelSignal.value}</label>;
};

// Component with signal.value in JSX callback - should trigger warning
export function TestSignalValueInJSXCallback(): JSX.Element {
	useSignals();

	const itemsSignal = signal([1, 2, 3, 4, 5]);

	// This should trigger a warning - using .value in JSX callback
	return (
		<div>
			{itemsSignal.value
				.filter((x: number): boolean => {
					return x > 2;
				})
				.map((item: number, index: number): JSX.Element => {
					// biome-ignore lint/suspicious/noArrayIndexKey: not relevant
					return <span key={index}>{item}</span>;
				})}
		</div>
	);
}

// Component with signal.value in JSX ternary - should trigger warning
export function TestSignalValueInJSXTernary(): JSX.Element {
	useSignals();

	const loadingSignal = signal(false);

	const dataSignal = signal("Loaded data");

	const errorSignal = signal("Error message");

	// These should trigger warnings - using .value in JSX ternary
	return (
		<div>
			{loadingSignal.value
				? "Loading..."
				: dataSignal.value || errorSignal.value}
		</div>
	);
}

// This component should NOT trigger warnings for JSON.stringify with signal.value
export function TestJSONStringifyWithSignalValue(): JSX.Element {
	useSignals();

	interface UserData {
		name: string;
		age: number;
	}

	const dataSignal = signal<UserData>({ name: "John", age: 30 });
	const jsonString = JSON.stringify(dataSignal.value);
	const parsedData = JSON.parse(jsonString) as UserData;

	return (
		<div>
			<div>JSON String: {jsonString}</div>

			<div>Name: {parsedData.name}</div>

			<div>Age: {parsedData.age}</div>
		</div>
	);
}

// This component should NOT trigger warnings for JSON.stringify in useMemo with signal.value
export function TestJSONInUseMemoWithSignalValue(): JSX.Element {
	useSignals();

	interface ItemsData {
		items: number[];
	}

	const dataSignal = signal<ItemsData>({ items: [1, 2, 3] });

	const formattedData = useMemo<ItemsData>(() => {
		const jsonString = JSON.stringify(dataSignal.value);
		return JSON.parse(jsonString) as ItemsData;
	}, [dataSignal.value]);

	return (
		<div>
			<div>Items Count: {formattedData.items.length}</div>
		</div>
	);
}

// This component should NOT trigger warnings for JSON.stringify in callback with signal.value
export function TestJSONInCallbackWithSignalValue(): JSX.Element {
	useSignals();

	interface ConfigData {
		config: {
			theme: string;
		};
	}

	const dataSignal = signal<ConfigData>({ config: { theme: "dark" } });

	const handleClick = () => {
		const jsonString = JSON.stringify(dataSignal.value);
		const parsedData = JSON.parse(jsonString) as ConfigData;
		console.info("Config:", parsedData.config);
	};

	return (
		<button type="button" onClick={handleClick}>
			Log Config
		</button>
	);
}

// This component should trigger warning for direct JSON.stringify in JSX with signal
export function TestDirectJSONStringifyInJSX(): JSX.Element {
	useSignals();

	interface SimpleData {
		name: string;
	}

	const dataSignal = signal<SimpleData>({ name: "Alice" });

	// This should trigger a warning - using JSON.stringify with signal.value directly in JSX
	return <div>{JSON.stringify(dataSignal.value)}</div>;
}
