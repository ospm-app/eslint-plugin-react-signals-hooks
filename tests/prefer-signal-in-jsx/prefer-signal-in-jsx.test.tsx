import { signal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import { Fragment, type JSX } from "react";

// This component should trigger ESLint warnings for using .value in JSX
export function TestSignalValueInJSX(): JSX.Element {
	useSignals();
	const messageSignal = signal("Hello World");

	// This should trigger a warning - using .value in JSX
	return <div>{messageSignal.value}</div>;
}

// This component should trigger warnings for multiple signal.value usages in JSX
export function TestMultipleSignalValuesInJSX(): JSX.Element {
	useSignals();
	const nameSignal = signal("John");
	const ageSignal = signal(25);

	// These should trigger warnings - using .value in JSX
	return (
		<div>
			<span>Name: {nameSignal.value}</span>
			<span>Age: {ageSignal.value}</span>
		</div>
	);
}

// This component should trigger warning for signal.value in JSX attributes
export function TestSignalValueInJSXAttribute(): JSX.Element {
	useSignals();
	const classNameSignal = signal("active");
	const titleSignal = signal("Click me");

	// These should trigger warnings - using .value in JSX attributes
	return (
		<button className={classNameSignal.value} title={titleSignal.value}>
			Button
		</button>
	);
}

// This component should trigger warning for signal.value in conditional JSX
export function TestSignalValueInConditionalJSX(): JSX.Element {
	useSignals();
	const visibleSignal = signal(true);
	const contentSignal = signal("Content");

	// These should trigger warnings - using .value in JSX conditionals
	return <div>{visibleSignal.value && <span>{contentSignal.value}</span>}</div>;
}

// This component should trigger warning for signal.value in JSX expressions
export function TestSignalValueInJSXExpressions(): JSX.Element {
	useSignals();
	const countSignal = signal(5);
	const multiplierSignal = signal(2);

	// These should trigger warnings - using .value in JSX expressions
	return <div>Result: {countSignal.value * multiplierSignal.value}</div>;
}

// This component should NOT trigger warnings - using signals directly in JSX
export function TestCorrectSignalUsageInJSX(): JSX.Element {
	useSignals();
	const messageSignal = signal("Hello World");
	const visibleSignal = signal(true);

	// These should NOT trigger warnings - using signals directly
	return <div>{visibleSignal && <span>{messageSignal}</span>}</div>;
}

// This component should NOT trigger warnings - signal.value outside JSX
export function TestSignalValueOutsideJSX(): JSX.Element {
	useSignals();
	const dataSignal = signal({ name: "John", age: 25 });

	// This should NOT trigger a warning - .value used outside JSX
	const userData = dataSignal.value;
	console.log("User data:", userData);

	return <div>{dataSignal}</div>;
}

// This component should trigger warning for nested JSX with signal.value
export function TestNestedJSXWithSignalValue(): JSX.Element {
	useSignals();
	const itemsSignal = signal(["apple", "banana", "cherry"]);

	// This should trigger a warning - using .value in nested JSX
	return (
		<ul>
			{itemsSignal.value.map((item, index) => (
				<li key={index}>{item}</li>
			))}
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
	const labelSignal = signal("Label");

	// This should trigger a warning - using .value in JSX
	return <label>{labelSignal.value}</label>;
};

// Component with signal.value in JSX callback - should trigger warning
export function TestSignalValueInJSXCallback(): JSX.Element {
	useSignals();
	const itemsSignal = signal([1, 2, 3, 4, 5]);

	// This should trigger a warning - using .value in JSX callback
	return (
		<div>
			{itemsSignal.value
				.filter((x) => x > 2)
				.map((item) => (
					<span key={item}>{item}</span>
				))}
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
