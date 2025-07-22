import { signal, computed } from "@preact/signals-react";
import { useMemo, useState, type JSX } from "react";
import { useSignals } from "@preact/signals-react/runtime";

// This component should trigger ESLint warning for useMemo with signal dependencies
export function TestUseMemoWithSignalDeps(): JSX.Element {
	useSignals();

	const baseSignal = signal(10);
	const multiplierSignal = signal(2);

	// This should trigger a warning - useMemo with signal dependencies
	const result = useMemo(() => {
		return baseSignal.value * multiplierSignal.value;
	}, [baseSignal.value, multiplierSignal.value]);

	return (
		<div>
			<p>Base: {baseSignal}</p>
			<p>Multiplier: {multiplierSignal}</p>
			<p>Result: {result}</p>
		</div>
	);
}

// This component should trigger warning for useMemo with direct signal dependencies
export function TestUseMemoWithDirectSignalDeps(): JSX.Element {
	useSignals();

	const itemsSignal = signal([1, 2, 3, 4, 5]);
	const filterSignal = signal(3);

	// This should trigger a warning - useMemo with direct signal dependencies
	const filteredItems = useMemo(() => {
		return itemsSignal.value.filter((item) => item > filterSignal.value);
	}, [itemsSignal, filterSignal]);

	return (
		<div>
			<p>All items: {itemsSignal.value.join(", ")}</p>
			<p>Filtered items: {filteredItems.join(", ")}</p>
		</div>
	);
}

// This component should trigger warning for useMemo with complex signal computation
export function TestUseMemoComplexSignalComputation(): JSX.Element {
	useSignals();

	const userSignal = signal({ name: "John", age: 25, salary: 50000 });
	const taxRateSignal = signal(0.2);
	const bonusSignal = signal(5000);

	// This should trigger a warning - complex computation with signals
	const netIncome = useMemo(() => {
		const gross = userSignal.value.salary + bonusSignal.value;
		const tax = gross * taxRateSignal.value;
		return gross - tax;
	}, [userSignal.value, taxRateSignal.value, bonusSignal.value]);

	return (
		<div>
			<p>Name: {userSignal.value.name}</p>
			<p>Salary: ${userSignal.value.salary}</p>
			<p>Bonus: ${bonusSignal}</p>
			<p>Tax Rate: {taxRateSignal.value * 100}%</p>
			<p>Net Income: ${netIncome}</p>
		</div>
	);
}

// This component should trigger warning for useMemo with signal array processing
export function TestUseMemoSignalArrayProcessing(): JSX.Element {
	useSignals();

	const numbersSignal = signal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
	const thresholdSignal = signal(5);

	// This should trigger a warning - array processing with signals
	const processedData = useMemo(() => {
		return numbersSignal.value
			.filter((num) => num > thresholdSignal.value)
			.map((num) => num * 2)
			.reduce((sum, num) => sum + num, 0);
	}, [numbersSignal.value, thresholdSignal.value]);

	return (
		<div>
			<p>Numbers: {numbersSignal.value.join(", ")}</p>
			<p>Threshold: {thresholdSignal}</p>
			<p>Processed Result: {processedData}</p>
		</div>
	);
}

// This component should NOT trigger warnings - useMemo with mixed dependencies
export function TestUseMemoMixedDeps(): JSX.Element {
	useSignals();

	const valueSignal = signal(10);
	const [regularState, setRegularState] = useState(5);

	// This should NOT trigger a warning - mixed signal and regular dependencies
	const result = useMemo(() => {
		return valueSignal.value + regularState;
	}, [valueSignal.value, regularState]);

	return (
		<div>
			<p>Signal: {valueSignal}</p>
			<p>State: {regularState}</p>
			<p>Result: {result}</p>
			<button onClick={() => setRegularState((prev) => prev + 1)}>
				Increment State
			</button>
		</div>
	);
}

// This component should NOT trigger warnings - useMemo without signal dependencies
export function TestUseMemoNoSignalDeps(): JSX.Element {
	useSignals();

	const [count, setCount] = useState(0);
	const [multiplier, setMultiplier] = useState(2);

	// This should NOT trigger a warning - no signal dependencies
	const result = useMemo(() => {
		return count * multiplier;
	}, [count, multiplier]);

	return (
		<div>
			<p>Count: {count}</p>
			<p>Multiplier: {multiplier}</p>
			<p>Result: {result}</p>
			<button onClick={() => setCount((prev) => prev + 1)}>
				Increment Count
			</button>
			<button onClick={() => setMultiplier((prev) => prev + 1)}>
				Increment Multiplier
			</button>
		</div>
	);
}

// This component should NOT trigger warnings - already using computed()
export function TestCorrectComputedUsage(): JSX.Element {
	useSignals();
	const baseSignal = signal(10);
	const multiplierSignal = signal(2);

	// This should NOT trigger a warning - already using computed()
	const result = computed(() => {
		return baseSignal.value * multiplierSignal.value;
	});

	return (
		<div>
			<p>Base: {baseSignal}</p>
			<p>Multiplier: {multiplierSignal}</p>
			<p>Result: {result}</p>
		</div>
	);
}

// This component should trigger warning for useMemo with single signal dependency
export function TestUseMemoSingleSignalDep(): JSX.Element {
	useSignals();
	const textSignal = signal("hello world");

	// This should trigger a warning - single signal dependency
	const upperCaseText = useMemo(() => {
		return textSignal.value.toUpperCase();
	}, [textSignal.value]);

	return (
		<div>
			<p>Original: {textSignal}</p>
			<p>Uppercase: {upperCaseText}</p>
		</div>
	);
}

// Arrow function component with useMemo and signal deps - should trigger warning
export const TestArrowFunctionUseMemo = (): JSX.Element => {
	useSignals();
	const dataSignal = signal([10, 20, 30, 40, 50]);

	// This should trigger a warning - useMemo with signal dependency in arrow function
	const sum = useMemo(() => {
		return dataSignal.value.reduce((acc, val) => acc + val, 0);
	}, [dataSignal.value]);

	return (
		<div>
			<p>Data: {dataSignal.value.join(", ")}</p>
			<p>Sum: {sum}</p>
		</div>
	);
};

// Component with useMemo and nested signal object access
export function TestUseMemoNestedSignalAccess(): JSX.Element {
	useSignals();
	const configSignal = signal({
		api: { baseUrl: "https://api.example.com", timeout: 5000 },
		ui: { theme: "dark", language: "en" },
	});

	// This should trigger a warning - nested signal object access
	const apiConfig = useMemo(() => {
		return {
			url: configSignal.value.api.baseUrl,
			timeout: configSignal.value.api.timeout,
			headers: {
				"Accept-Language": configSignal.value.ui.language,
			},
		};
	}, [configSignal.value]);

	return (
		<div>
			<p>Base URL: {apiConfig.url}</p>
			<p>Timeout: {apiConfig.timeout}ms</p>
			<p>Language: {apiConfig.headers["Accept-Language"]}</p>
		</div>
	);
}

// Component with useMemo and signal-derived boolean logic
export function TestUseMemoSignalBooleanLogic(): JSX.Element {
	useSignals();
	const userSignal = signal({ age: 25, isActive: true, role: "user" });
	const permissionsSignal = signal(["read", "write"]);

	// This should trigger a warning - boolean logic with signals
	const canEdit = useMemo(() => {
		return (
			userSignal.value.isActive &&
			userSignal.value.age >= 18 &&
			permissionsSignal.value.includes("write")
		);
	}, [userSignal.value, permissionsSignal.value]);

	return (
		<div>
			<p>Age: {userSignal.value.age}</p>
			<p>Active: {userSignal.value.isActive ? "Yes" : "No"}</p>
			<p>Permissions: {permissionsSignal.value.join(", ")}</p>
			<p>Can Edit: {canEdit ? "Yes" : "No"}</p>
		</div>
	);
}

// Component with multiple useMemo calls with signal dependencies
export function TestMultipleUseMemoWithSignals(): JSX.Element {
	useSignals();
	const priceSignal = signal(100);
	const discountSignal = signal(0.1);
	const taxSignal = signal(0.08);

	// These should trigger warnings - multiple useMemo with signal dependencies
	const discountedPrice = useMemo(() => {
		return priceSignal.value * (1 - discountSignal.value);
	}, [priceSignal.value, discountSignal.value]);

	const finalPrice = useMemo(() => {
		return discountedPrice * (1 + taxSignal.value);
	}, [discountedPrice, taxSignal.value]);

	const savings = useMemo(() => {
		return priceSignal.value - finalPrice;
	}, [priceSignal.value, finalPrice]);

	return (
		<div>
			<p>Original Price: ${priceSignal}</p>
			<p>Discount: {discountSignal.value * 100}%</p>
			<p>Tax: {taxSignal.value * 100}%</p>
			<p>Final Price: ${finalPrice.toFixed(2)}</p>
			<p>You Save: ${savings.toFixed(2)}</p>
		</div>
	);
}
