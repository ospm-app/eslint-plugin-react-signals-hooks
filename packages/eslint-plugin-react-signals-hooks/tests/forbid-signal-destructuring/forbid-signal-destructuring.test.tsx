/** biome-ignore-all lint/correctness/useExhaustiveDependencies: relevant,but we testing eslint */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: off */
/** biome-ignore-all assist/source/organizeImports: off */
/** biome-ignore-all lint/suspicious/noArrayIndexKey: not relevant */
/** biome-ignore-all lint/suspicious/noAssignInExpressions: relevant,but we testing eslint */
import { signal, type Signal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import type { JSX } from "react";

// Incorrect: direct destructuring from a signal
export function DirectDestructureObject(): JSX.Element {
	const store = useSignals(1);

	try {
		const countSignal = signal(0);
		const { value } = countSignal; // ❌ should be flagged by forbid-signal-destructuring

		return <div>{value}</div>;
	} finally {
		store.f();
	}
}

// Incorrect: array destructuring holding a signal
export function ArrayDestructureFromArrayHoldingSignal(): JSX.Element {
	const store = useSignals(1);

	try {
		const userSignal = signal({ name: "John" });
		const [s] = [userSignal]; // ❌ should be flagged

		return <div>{s.value.name}</div>;
	} finally {
		store.f();
	}
}

// Incorrect: assignment pattern destructuring from a signal container
export function AssignmentPatternDestructure(): JSX.Element {
	const store = useSignals(1);

	try {
		const userSignal = signal({ name: "Jane" });
		let s: Signal<{ name: string }> | undefined;
		({ s } = { s: userSignal }); // ❌ should be flagged

		return <div>{s ? s.value.name : ""}</div>;
	} finally {
		store.f();
	}
}

// Incorrect: nested destructuring that aliases a signal
export function NestedDestructureAlias(): JSX.Element {
	const store = useSignals(1);

	try {
		const countSignal = signal(0);
		const { s } = { s: countSignal }; // ❌ should be flagged

		return <div>{s.value}</div>;
	} finally {
		store.f();
	}
}

// Incorrect: deeper nesting where a signal is destructured
export function DeepNestedDestructure(): JSX.Element {
	const store = useSignals(1);

	try {
		const data = { user: { signal: signal({ id: 1 }) } };
		const {
			user: { signal: s },
		} = data; // ❌ should be flagged

		return <div>{s.value.id}</div>;
	} finally {
		store.f();
	}
}

// Incorrect: destructuring from a function/hook that returns a signal
function useCountSignal() {
	return { signal: signal(0) } as { signal: Signal<number> };
}

export function DestructureFromHookReturn(): JSX.Element {
	const store = useSignals(1);

	try {
		const { signal: s } = useCountSignal(); // ❌ should be flagged

		return <div>{s.value}</div>;
	} finally {
		store.f();
	}
}

// Correct: plain member access without destructuring
export function PlainMemberAccessOk(): JSX.Element {
	const store = useSignals(1);

	try {
		const countSignal = signal(0);
		const v = countSignal.value; // ✅ allowed

		return <div>{v}</div>;
	} finally {
		store.f();
	}
}

// Correct: using signal.value directly in calls
function doSomething(n: number): number {
	return n + 1;
}

export function DirectUsageOk(): JSX.Element {
	const store = useSignals(1);

	try {
		const countSignal = signal(1);
		const r = doSomething(countSignal.value); // ✅ allowed

		return <div>{r}</div>;
	} finally {
		store.f();
	}
}

// Correct: destructuring of non-signal values
export function DestructureNonSignalOk(): JSX.Element {
	const store = useSignals(1);

	try {
		const user = { id: 1, name: "Alice" };
		const { id } = user; // ✅ allowed

		return <div>{id}</div>;
	} finally {
		store.f();
	}
}

// Correct: passing signals without binding new names via destructuring
function fn<T>(_s: Signal<T>): void {}

export function PassingSignalOk(): JSX.Element {
	const store = useSignals(1);

	try {
		const s = signal(0);
		fn(s); // ✅ allowed

		return <div>{s.value}</div>;
	} finally {
		store.f();
	}
}

// --- Advanced: custom creator names (requires rule option `creatorNames: ['createSig']`) ---
function createSig<T>(v: T) {
	// local wrapper; test harness should set creatorNames to detect this
	return signal(v);
}

export function CustomCreatorDestructure(): JSX.Element {
	const store = useSignals(1);

	try {
		// ❌ should be flagged when creatorNames includes 'createSig'
		const { value } = createSig(1);

		return <div>{value}</div>;
	} finally {
		store.f();
	}
}
