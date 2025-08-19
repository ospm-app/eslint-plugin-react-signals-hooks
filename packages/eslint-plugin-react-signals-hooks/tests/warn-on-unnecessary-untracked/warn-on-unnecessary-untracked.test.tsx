/** biome-ignore-all assist/source/organizeImports: off */
/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <explanation> */
import { signal, untracked } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import { useEffect, useCallback, type JSX } from "react";

// This component should trigger ESLint warning for unnecessary untracked usage
export function TestUnnecessaryUntracked(): JSX.Element {
	useSignals();

	const countSignal = signal(0);
	const nameSignal = signal("");

	const handleClick = useCallback(() => {
		// This should trigger a warning - unnecessary untracked
		const currentCount = untracked(() => countSignal.value);
		console.info(currentCount);
	}, [countSignal.value]);

	return (
		<div>
			<button type="button" onClick={handleClick}>
				Log Count
			</button>

			<div>Count: {countSignal}</div>

			<div>Name: {nameSignal}</div>
		</div>
	);
}

// This component should NOT trigger warning - proper usage of untracked
export function TestNecessaryUntracked(): JSX.Element {
	useSignals();

	const countSignal = signal(0);
	const nameSignal = signal("");

	const handleClick = useCallback(() => {
		// This should NOT trigger a warning - necessary untracked
		untracked(() => {
			console.info("Count will not trigger updates:", countSignal.value);
			console.info("Name will not trigger updates:", nameSignal.value);
		});
	}, [countSignal.value, nameSignal.value]);

	return (
		<div>
			<button type="button" onClick={handleClick}>
				Log Without Tracking
			</button>

			<div>Count: {countSignal}</div>

			<div>Name: {nameSignal}</div>
		</div>
	);
}

// This component should trigger warning for unnecessary untracked in effect
export function TestUnnecessaryUntrackedInEffect(): JSX.Element {
	useSignals();

	const countSignal = signal(0);
	const nameSignal = signal("");

	// biome-ignore lint/correctness/useExhaustiveDependencies: false positive
	useEffect(() => {
		// This should trigger a warning - unnecessary untracked in effect
		const currentCount = untracked(() => countSignal.value);
		console.info("Effect running with count:", currentCount);
		// eslint-disable-next-line react-signals-hooks/exhaustive-deps
	}, []);

	return (
		<div>
			<div>Count: {countSignal}</div>

			<div>Name: {nameSignal}</div>
		</div>
	);
}

// This component should NOT trigger warning - proper usage of untracked in effect
export function TestNecessaryUntrackedInEffect(): JSX.Element {
	useSignals();

	const countSignal = signal(0);
	const nameSignal = signal("");

	// biome-ignore lint/correctness/useExhaustiveDependencies: false positive
	useEffect(() => {
		// This should NOT trigger a warning - necessary untracked in effect
		const unsubscribe = someExternalLibrary.subscribe((): void => {
			untracked(() => {
				console.info("External update:", {
					count: countSignal.value,
					name: nameSignal.value,
				});
			});
		});

		return (): void => {
			if (unsubscribe) {
				unsubscribe();
			}
		};
		// eslint-disable-next-line react-signals-hooks/exhaustive-deps
	}, []);

	return (
		<div>
			<div>Count: {countSignal}</div>

			<div>Name: {nameSignal}</div>
		</div>
	);
}

// This component should trigger warning for unnecessary untracked in callback
export function TestUnnecessaryUntrackedInCallback(): JSX.Element {
	useSignals();

	const countSignal = signal(0);
	const nameSignal = signal("");

	const handleClick = useCallback(() => {
		// This should trigger a warning - unnecessary untracked in callback
		const currentCount = untracked(() => countSignal.value);
		console.info("Button clicked with count:", currentCount);
	}, [countSignal.value]);

	return (
		<div>
			<button type="button" onClick={handleClick}>
				Click Me
			</button>

			<div>Count: {countSignal}</div>

			<div>Name: {nameSignal}</div>
		</div>
	);
}

// This component should NOT trigger warning - proper usage of untracked in callback
export function TestNecessaryUntrackedInCallback(): JSX.Element {
	useSignals();

	const countSignal = signal(0);
	const nameSignal = signal("");

	const handleClick = useCallback(() => {
		// This should NOT trigger a warning - necessary untracked in callback
		someExternalLibrary.doSomething({
			onSuccess: untracked<() => void>(() => {
				console.info("Success with current values:", {
					count: countSignal.value,
					name: nameSignal.value,
				});

				return () => {
					console.info("Callback untracked");
				};
			}),
		});
	}, [countSignal.value, nameSignal.value]);

	return (
		<div>
			<button type="button" onClick={handleClick}>
				Submit
			</button>

			<div>Count: {countSignal}</div>

			<div>Name: {nameSignal}</div>
		</div>
	);
}

// This component should trigger warning for unnecessary direct `.peek()` in render
export function TestUnnecessaryPeekDirectInRender(): JSX.Element {
	useSignals();

	const countSignal = signal(0);

	return (
		<div>
			{/* This should trigger a warning - unnecessary direct `.peek()` in reactive JSX */}
			<div>Count: {countSignal.peek()}</div>
		</div>
	);
}

// This component should trigger warning for unnecessary direct `.peek()` in a callback used by JSX
export function TestUnnecessaryPeekDirectInCallback(): JSX.Element {
	useSignals();

	const countSignal = signal(0);

	const handleClick = useCallback(() => {
		// This should trigger a warning - unnecessary direct `.peek()` in reactive callback usage
		console.info("Peeked count:", countSignal.peek());
	}, []);

	return (
		<div>
			<button type="button" onClick={handleClick}>
				Peek Count
			</button>
		</div>
	);
}

// Mock external library for testing
declare const someExternalLibrary: {
	subscribe: (callback: () => void) => () => void;
	doSomething: (options: { onSuccess: () => void }) => void;
};
