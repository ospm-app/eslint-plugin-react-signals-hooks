import { signal, effect } from "@preact/signals-react";
import { useEffect, useState, type JSX } from "react";
import { useSignals } from "@preact/signals-react/runtime";

// This component should trigger ESLint warning for useEffect with signal-only dependencies
export function TestUseEffectWithSignalDeps(): JSX.Element {
	useSignals();
	const counterSignal = signal(0);
	const nameSignal = signal("John");

	// This should trigger a warning - useEffect with only signal dependencies
	useEffect(() => {
		console.log("Counter:", counterSignal.value);
		console.log("Name:", nameSignal.value);
	}, [counterSignal.value, nameSignal.value]);

	return (
		<div>
			<p>{counterSignal.value}</p>
			<p>{nameSignal.value}</p>
		</div>
	);
}

// This component should trigger warning for useEffect with direct signal dependencies
export function TestUseEffectWithDirectSignalDeps(): JSX.Element {
	useSignals();
	const statusSignal = signal("active");
	const flagSignal = signal(true);

	// This should trigger a warning - useEffect with direct signal dependencies
	useEffect(() => {
		if (flagSignal.value) {
			console.log("Status:", statusSignal.value);
		}
	}, [statusSignal, flagSignal]);

	return (
		<div>
			<p>Status: {statusSignal.value}</p>
			<p>Flag: {flagSignal.value ? "true" : "false"}</p>
		</div>
	);
}

// This component should trigger warning for useEffect with mixed signal.value dependencies
export function TestUseEffectMixedSignalValueDeps(): JSX.Element {
	useSignals();
	const dataSignal = signal({ count: 0, message: "hello" });
	const enabledSignal = signal(true);

	// This should trigger a warning - all dependencies are signals
	useEffect(() => {
		if (enabledSignal.value) {
			console.log("Data:", dataSignal.value);
		}
	}, [dataSignal.value, enabledSignal.value]);

	return (
		<div>
			<p>Count: {dataSignal.value.count}</p>
			<p>Message: {dataSignal.value.message}</p>
			<p>Enabled: {enabledSignal ? "yes" : "no"}</p>
		</div>
	);
}

// This component should NOT trigger warnings - useEffect with mixed dependencies
export function TestUseEffectMixedDeps(): JSX.Element {
	useSignals();
	const valueSignal = signal(0);
	const [regularState, setRegularState] = useState(0);

	// This should NOT trigger a warning - mixed signal and regular dependencies
	useEffect(() => {
		console.log("Signal:", valueSignal.value);
		console.log("State:", regularState);
	}, [valueSignal.value, regularState]);

	return (
		<div>
			<p>Signal: {valueSignal}</p>
			<p>State: {regularState}</p>
			<button onClick={() => setRegularState((prev) => prev + 1)}>
				Increment State
			</button>
		</div>
	);
}

// This component should NOT trigger warnings - useEffect with no dependencies
export function TestUseEffectNoDeps(): JSX.Element {
	useSignals();
	const messageSignal = signal("Hello");

	// This should NOT trigger a warning - no dependency array
	useEffect(() => {
		console.log("Effect runs on every render");
		console.log("Message:", messageSignal.value);
	});

	return <div>{messageSignal}</div>;
}

// This component should NOT trigger warnings - useEffect with empty dependencies
export function TestUseEffectEmptyDeps(): JSX.Element {
	useSignals();
	const initialSignal = signal("initial");

	// This should NOT trigger a warning - empty dependency array
	useEffect(() => {
		console.log("Effect runs once on mount");
		console.log("Initial:", initialSignal.value);
	}, []);

	return <div>{initialSignal}</div>;
}

// This component should NOT trigger warnings - already using effect()
export function TestCorrectEffectUsage(): JSX.Element {
	useSignals();
	const counterSignal = signal(0);
	const nameSignal = signal("John");

	// This should NOT trigger a warning - already using effect()
	effect(() => {
		console.log("Counter:", counterSignal.value);
		console.log("Name:", nameSignal.value);
	});

	return (
		<div>
			<p>{counterSignal}</p>
			<p>{nameSignal}</p>
		</div>
	);
}

// This component should trigger warning for useEffect with single signal dependency
export function TestUseEffectSingleSignalDep(): JSX.Element {
	useSignals();
	const themeSignal = signal("dark");

	// This should trigger a warning - single signal dependency
	useEffect(() => {
		document.body.className = themeSignal.value;
	}, [themeSignal.value]);

	return <div className={themeSignal.value}>Content</div>;
}

// This component should trigger warning for useEffect with computed signal dependency
export function TestUseEffectComputedSignalDep(): JSX.Element {
	useSignals();
	const baseSignal = signal(10);
	const multiplierSignal = signal(2);

	// This should trigger a warning - computed from signals
	useEffect(() => {
		const result = baseSignal.value * multiplierSignal.value;
		console.log("Result:", result);
	}, [baseSignal.value, multiplierSignal.value]);

	return (
		<div>
			<p>Base: {baseSignal}</p>
			<p>Multiplier: {multiplierSignal}</p>
			<p>Result: {baseSignal.value * multiplierSignal.value}</p>
		</div>
	);
}

// Arrow function component with useEffect and signal deps - should trigger warning
export const TestArrowFunctionUseEffect = (): JSX.Element => {
	useSignals();
	const stateSignal = signal("ready");

	// This should trigger a warning - useEffect with signal dependency in arrow function
	useEffect(() => {
		console.log("State changed:", stateSignal.value);
	}, [stateSignal.value]);

	return <div>State: {stateSignal}</div>;
};

// Component with useEffect and nested signal access
export function TestUseEffectNestedSignalAccess(): JSX.Element {
	useSignals();
	const userSignal = signal({ profile: { name: "John", age: 25 } });
	const settingsSignal = signal({ theme: "dark", language: "en" });

	// This should trigger a warning - nested signal access in dependencies
	useEffect(() => {
		console.log("User:", userSignal.value.profile.name);
		console.log("Theme:", settingsSignal.value.theme);
	}, [userSignal.value, settingsSignal.value]);

	return (
		<div>
			<p>Name: {userSignal.value.profile.name}</p>
			<p>Age: {userSignal.value.profile.age}</p>
			<p>Theme: {settingsSignal.value.theme}</p>
		</div>
	);
}

// Component with useEffect and signal array dependency
export function TestUseEffectSignalArrayDep(): JSX.Element {
	useSignals();
	const itemsSignal = signal<string[]>([]);
	const filterSignal = signal("");

	// This should trigger a warning - signal array dependencies
	useEffect(() => {
		const filtered = itemsSignal.value.filter((item) =>
			item.includes(filterSignal.value),
		);
		console.log("Filtered items:", filtered);
	}, [itemsSignal.value, filterSignal.value]);

	return (
		<div>
			<p>Items: {itemsSignal.value.length}</p>
			<p>Filter: {filterSignal}</p>
		</div>
	);
}

// Component with multiple useEffect calls with signal dependencies
export function TestMultipleUseEffectsWithSignals(): JSX.Element {
	useSignals();
	const countSignal = signal(0);
	const nameSignal = signal("test");
	const enabledSignal = signal(true);

	// These should trigger warnings - multiple useEffect with signal dependencies
	useEffect(() => {
		console.log("Count changed:", countSignal.value);
	}, [countSignal.value]);

	useEffect(() => {
		console.log("Name changed:", nameSignal.value);
	}, [nameSignal.value]);

	useEffect(() => {
		if (enabledSignal.value) {
			console.log("Feature enabled");
		}
	}, [enabledSignal.value]);

	return (
		<div>
			<p>Count: {countSignal}</p>
			<p>Name: {nameSignal}</p>
			<p>Enabled: {enabledSignal ? "yes" : "no"}</p>
		</div>
	);
}
