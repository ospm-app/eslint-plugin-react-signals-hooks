import { useSignals } from "@preact/signals-react/runtime";
import type { JSX } from "react";

// Should NOT flag: suffix-only variable that is not a real signal
export function SuffixOnlyVariableNotSignal(): JSX.Element {
	const store = useSignals(1);

	try {
		const userSignal = { id: 1, name: "Bob" } as const;
		const { name } = userSignal; // ✅ should not be flagged when enableSuffixHeuristic=false (default)
		return <div>{name}</div>;
	} finally {
		store.f();
	}
}

// Should NOT flag: local functions named signal/computed/effect (not imported)
function signal<T>(v: T) {
	return { v };
}
function computed<T>(fn: () => T) {
	return {
		get value() {
			return fn();
		},
	};
}
function effect(fn: () => void) {
	fn();
}

export function LocalFunctionsSameNames(): JSX.Element {
	const store = useSignals(1);

	try {
		const { v } = signal(1); // ✅ local function, not imported creator
		const { value } = computed(() => 2); // ✅ local function, not imported creator
		effect(() => {}); // ✅ no destructuring here
		return <div>{v + value}</div>;
	} finally {
		store.f();
	}
}
