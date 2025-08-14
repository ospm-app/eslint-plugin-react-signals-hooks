/** biome-ignore-all lint/correctness/useExhaustiveDependencies: not relevant */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: off */
/** biome-ignore-all assist/source/organizeImports: off */
import { useSignals } from "@preact/signals-react/runtime";
import type { JSX } from "react";

// Intentionally DO NOT import any signal creators here

export function SuffixHeuristicShouldNotTrigger(): JSX.Element {
	const store = useSignals(1);
	try {
		// Variable ends with Signal but is NOT a signal; without creator imports, heuristic should be OFF
		const userSignal = { id: 1 };
		const alias = userSignal; // Should NOT be reported

		return <div>{alias.id}</div>;
	} finally {
		store.f();
	}
}
