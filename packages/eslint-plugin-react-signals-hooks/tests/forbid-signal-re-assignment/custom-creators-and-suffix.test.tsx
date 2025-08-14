/** biome-ignore-all lint/correctness/useExhaustiveDependencies: not relevant */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: off */
/** biome-ignore-all assist/source/organizeImports: off */
import { signal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import type { JSX } from "react";

// Custom creators for this test suite (non-existent module is fine for lint tests)
// @ts-expect-error
import { makeSignal } from "my-signals";
// @ts-expect-error
import * as S from "my-other-signals";

// =============================
// Custom creatorNames: named import
// =============================
export function CustomCreatorNamedImport(): JSX.Element {
	const store = useSignals(1);
	try {
		const c = makeSignal(0);

		// Should error: aliasing a signal created by custom creator
		const alias = c;

		return (
			<div>
				{c} {alias}
			</div>
		);
	} finally {
		store.f();
	}
}

// =============================
// Custom creatorNames: namespace import
// =============================
export function CustomCreatorNamespaceImport(): JSX.Element {
	const store = useSignals(1);
	try {
		const c = S.buildSignal(1);

		// Should error: aliasing a signal created by namespaced custom creator
		let a = c;
		a = c;

		return <div>{a}</div>;
	} finally {
		store.f();
	}
}

// =============================
// Suffix heuristic: gated by presence of creator import
// =============================
export function SuffixHeuristicWithCreatorImport(): JSX.Element {
	const store = useSignals(1);
	try {
		// Heuristic ON (import of creators present in file). Aliasing a non-signal with Signal suffix should error
		const userSignal = { id: 1 };
		const x = userSignal; // Should error due to suffix heuristic

		// Still OK to read .value from an actual signal
		const countSignal = signal(0);
		const v = countSignal.value;

		return (
			<div>
				{x.id} {v}
			</div>
		);
	} finally {
		store.f();
	}
}

// Note: the negative case for suffix heuristic is validated in a separate file
