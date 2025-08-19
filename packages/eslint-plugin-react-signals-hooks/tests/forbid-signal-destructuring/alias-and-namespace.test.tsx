/** biome-ignore-all assist/source/organizeImports: off */
import { useSignals } from "@preact/signals-react/runtime";
import { signal as create } from "@preact/signals-react";
import * as SR from "@preact/signals-react";
import type { JSX } from "react";

// Incorrect: aliased named import
export function AliasedNamedImport(): JSX.Element {
	const store = useSignals(1);

	try {
		const { value } = create(0); // ❌ should be flagged
		return <div>{value}</div>;
	} finally {
		store.f();
	}
}

// Incorrect: namespaced import
export function NamespacedImport(): JSX.Element {
	const store = useSignals(1);

	try {
		const { value } = SR.signal(1); // ❌ should be flagged
		return <div>{value}</div>;
	} finally {
		store.f();
	}
}
